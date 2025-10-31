import constants from "./constants.js"
import { canvas_el } from "./document.js"
import { ceil, floor, max, min, round, TAU } from "./math.js"
import { image, resize_3d } from "./renderer3d.js"
import state from "./state.js"
const context = /** @type {CanvasRenderingContext2D} */(canvas_el.getContext("2d"))/**/
const off = new OffscreenCanvas(1, 1)
const off_context = /** @type {OffscreenCanvasRenderingContext2D} */(off.getContext("2d"))/**/
const crosshair_image = (() => {
	const { height, width } = constants.crosshair
	off.height = height
	off.width = width
	context.save()
	off_context.lineWidth = 2
	off_context.strokeStyle = "lime"
	off_context.beginPath()
	off_context.moveTo(14, 12)
	off_context.lineTo(14, 0)
	off_context.moveTo(16, 14)
	off_context.lineTo(28, 14)
	off_context.moveTo(14, 16)
	off_context.lineTo(14, 28)
	off_context.moveTo(12, 14)
	off_context.lineTo(0, 14)
	off_context.moveTo
	off_context.stroke()
	off_context.restore()
	return off.transferToImageBitmap()
})()
const grid_pattern = (() => {
	const { major_every, size } = constants.grid
	const pattern_size = size * major_every
	off.height = off.width = pattern_size
	off_context.save()
	off_context.lineWidth = 1
	off_context.strokeStyle = "rgba(58,74,104,.3)"
	off_context.beginPath()
	for (let x = size; x <= pattern_size; x += size) {
		off_context.moveTo(x, 0)
		off_context.lineTo(x, pattern_size)
	}
	for (let y = size; y <= pattern_size; y += size) {
		off_context.moveTo(0, y)
		off_context.lineTo(pattern_size, y)
	}
	off_context.stroke()
	off_context.lineWidth = 2
	off_context.strokeStyle = "rgba(58,74,104,.6)"
	off_context.beginPath()
	off_context.moveTo(0, 0)
	off_context.lineTo(0, pattern_size)
	off_context.lineTo(pattern_size, pattern_size)
	off_context.lineTo(pattern_size, 0)
	off_context.lineTo(0, 0)
	off_context.stroke()
	off_context.restore()
	return /** @type {CanvasPattern} */(off_context.createPattern(off, "repeat"))/**/
})()
const { text_data, text_image } = (() => {
	const { size } = constants.grid
	const { offset_x, text } = constants.mode.writing
	const lines = text.split("\n")
	const rows = lines.length
	const font_px = floor(size * .78)
	off_context.font = `${font_px}px bold monospace`
	let max_w = 0
	for (const line of lines) {
		max_w = max(
			max_w,
			ceil(
				off_context.measureText(line).width
			)
		)
	}
	off.height = rows * size
	off.width = max_w + offset_x * 2
	off_context.save()
	off_context.fillStyle = "white"
	off_context.font = `${font_px}px bold monospace`
	off_context.globalAlpha = .5
	off_context.textAlign = "left"
	off_context.textBaseline = "middle"
	for (let r = 0; r < rows; r++) {
		const line = lines[r]
		if (!line) continue
		const cy = r * size + size / 2
		off_context.fillText(line, offset_x, cy)
	}
	off_context.restore()
	return {
		text_data: off_context.getImageData(0, 0, off.width, off.height).data,
		text_image: off.transferToImageBitmap()
	}
})()
/** @returns {void} */
export function check_writing_stats() {
	const { line_width } = constants.mode.writing
	const { lines } = state.mode.writing
	off.height = text_image.height
	off.width = text_image.width
	off_context.save()
	off_context.lineWidth = line_width
	off_context.beginPath()
	let l = lines.length
	let b = null
	for (let i = 0; i < l; i++) {
		const { e, s } = lines.at(i)
		if (b != s) {
			off_context.moveTo(s.x, s.y)
		}
		off_context.lineTo(e.x, e.y)
		b = e
	}
	off_context.stroke()
	off_context.restore()
	const lines_data = off_context.getImageData(
		0,
		0,
		text_image.width,
		text_image.height
	).data
	let count_hit = 0
	let count_shoot = 0
	l = text_data.length
	for (let i = 0; i < l; i += 4) {
		if (lines_data[i + 3]) {
			count_shoot++
			if (text_data[i + 3]) {
				count_hit++
			}
		}
	}
	state.stats.count_hit = count_hit
	state.stats.count_shoot = count_shoot
}
/** @returns {void} */
export function draw() {
	const { dimension, height, width } = state.camera
	const { mode, sens } = state.game
	context.save()
	context.clearRect(0, 0, width, height)
	context.translate(
		round(width / 2),
		round(height / 2)
	)
	if (dimension == "2d") {
		draw_grid()
		if (mode == "writing") {
			draw_text()
			draw_lines()
		} else if (mode) {
			draw_paths()
			draw_targets()
			draw_impacts()
		}
	} else {
		context.drawImage(
			image(),
			-round(width / 2),
			-round(height / 2)
		)
	}
	draw_crosshair()
	if (sens == "sa") {
		context.fillStyle = "#000"
		if (width > height * 4 / 3) {
			context.fillRect(
				-width / 2,
				-height / 2,
				(width - height * 4 / 3) / 2,
				height
			)
			context.fillRect(
				height * 2 / 3,
				-height / 2,
				(width - height * 4 / 3) / 2,
				height
			)
		}
	}
	context.restore()
}
/** @returns {void} */
function draw_crosshair() {
	const { height, width } = constants.crosshair
	off.height = height
	off.width = width
	context.save()
	context.drawImage(
		crosshair_image,
		-round(width / 2),
		-round(height / 2)
	)
	context.restore()
}
/** @returns {void} */
function draw_grid() {
	const { height, width, x, y } = state.camera
	context.save()
	context.translate(-x, -y)
	context.fillStyle = grid_pattern
	context.fillRect(
		x - width / 2,
		y - height / 2,
		width,
		height
	)
	context.restore()
}
/** @returns {void} */
function draw_impacts() {
	const { impacts } = state
	if (!impacts.length) return
	const {
		duration_s,
		fade_factor,
		rings,
		spacing
	} = constants.impact
	const { x, y } = state.camera
	const { now_s } = state.timer
	const alpha = .9
	const max_life = duration_s + spacing * (rings - 1)
	context.save()
	context.translate(-x, -y)
	context.lineWidth = 2
	while (impacts.length) {
		if (now_s - impacts.at().t > max_life) {
			impacts.drop()
		}
		break
	}
	let index = 0
	while (index < impacts.length) {
		const { c, r, t, x: impact_x, y: impact_y } = impacts.at(index)
		const p = (now_s - t) / duration_s
		const base = c ? "red" : "white"
		const dot_alpha = alpha * (1 - fade_factor * min(1, p))
		if (p <= 1) {
			context.fillStyle = base
			context.globalAlpha = dot_alpha
			context.beginPath()
			context.arc(impact_x, impact_y, 2, 0, TAU)
			context.fill()
		}
		for (let k = 0; k < rings; k++) {
			const p2 = p - k * spacing
			if (p2 <= 0 || p2 > 1) continue
			const pr = r * p2
			const ring_alpha = alpha * (1 - fade_factor * p2)
			if (ring_alpha <= 0 || pr <= 0) continue
			context.globalAlpha = ring_alpha
			context.strokeStyle = base
			context.beginPath()
			context.arc(impact_x, impact_y, pr, 0, TAU)
			context.stroke()
		}
		index++
	}
	context.restore()
}
function draw_lines() {
	const { line_width } = constants.mode.writing
	const { x, y } = state.camera
	const { lines } = state.mode.writing
	context.save()
	context.translate(-x, -y)
	context.lineWidth = line_width
	context.strokeStyle = "black"
	context.beginPath()
	/** @type {{ x: number, y: number }?} */
	let b = null
	for (let i = 0; i < lines.length; i++) {
		const { e, s } = lines.at(i)
		if (b != s) {
			context.moveTo(s.x, s.y)
		}
		context.lineTo(e.x, e.y)
		b = e
	}
	context.stroke()
	context.restore()
}
/** @returns {void} */
function draw_paths() {
	const { x, y } = state.camera
	const { mode } = state.game
	const { target } = state.mode.aiming
	const { targets } = state.mode.flick
	const { target: tracking_target } = state.mode.tracking
	const { target: twitch_target } = state.mode.twitch
	context.save()
	context.translate(-x, -y)
	context.globalAlpha = .2
	context.lineWidth = 2
	context.strokeStyle = "white"
	context.beginPath()
	context.moveTo(x, y)
	if (mode == "aiming") {
		const { cy, x: target_x } = target
		context.lineTo(target_x, cy)
	} else if (mode == "flick") {
		for (let i = targets.length - 1; i >= 0; i--) {
			const { cy, x: target_x } = targets[i]
			context.lineTo(target_x, cy)
		}
	} else if (mode == "tracking") {
		const { cy, x: target_x } = tracking_target
		context.lineTo(target_x, cy)
	} else if (mode == "twitch") {
		if (twitch_target) {
			const { cy, x: target_x } = twitch_target
			context.lineTo(target_x, cy)
		}
	} else {
		throw Error(String(mode))
	}
	context.stroke()
	context.restore()
}
/**
 * @param {Target} target
 * @param {number} alpha
 * @returns {void}
 */
function draw_target(target, alpha) {
	const { x, y } = state.camera
	const { cr, cx, cy, r, x: target_x, y: target_y } = target
	const line_width = 1
	context.save()
	context.translate(-x, -y)
	context.globalAlpha = alpha
	context.lineWidth = line_width
	context.strokeStyle = "red"
	context.beginPath()
	context.arc(
		target_x,
		target_y,
		r + line_width,
		0,
		TAU
	)
	context.stroke()
	context.fillStyle = "#385978"
	context.beginPath()
	context.arc(target_x, target_y, r, 0, TAU)
	context.fill()
	context.beginPath()
	context.arc(cx, cy, cr + line_width, 0, TAU)
	context.stroke()
	context.fillStyle = "#1c344a"
	context.beginPath()
	context.arc(cx, cy, cr, 0, TAU)
	context.fill()
	context.restore()
}
/** @returns {void} */
function draw_targets() {
	const { required_dwell_ms } = constants.mode.aiming
	const { mode } = state.game
	const { aim_dwell_ms, target } = state.mode.aiming
	const { targets } = state.mode.flick
	const { target: tracking_target } = state.mode.tracking
	const { target: twitch_target } = state.mode.twitch
	if (mode == "aiming") {
		draw_target(
			target,
			aim_dwell_ms >= required_dwell_ms ? 1 : .5
		)
	} else if (mode == "flick") {
		if (!targets.length) return
		for (let i = 0; i + 1 < targets.length; i++) {
			draw_target(
				targets[i],
				1 / 2 ** (targets.length - i - 1)
			)
		}
		draw_target(targets[targets.length - 1], 1)
	} else if (mode == "tracking") {
		draw_target(tracking_target, 1)
	} else if (mode == "twitch") {
		if (twitch_target) {
			draw_target(twitch_target, 1)
		}
	} else {
		throw Error(String(mode))
	}
}
/** @returns {void} */
function draw_text() {
	const { x, y } = state.camera
	context.drawImage(text_image, -x, -y)
}
/** @returns {void} */
export function resize_2d() {
	canvas_el.width = state.camera.width = innerWidth * devicePixelRatio
	canvas_el.height = state.camera.height = innerHeight * devicePixelRatio
	resize_3d()
	draw()
}