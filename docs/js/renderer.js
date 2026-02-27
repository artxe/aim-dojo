import constants from "./constants.js"
import { canvas_el } from "./document.js"
import { min, round, TAU } from "./math.js"
import { resize_3d } from "./renderer3d.js"
import state from "./state.js"
export const context_2d = /** @type {CanvasRenderingContext2D} */(canvas_el.getContext("2d"))/**/
const off = new OffscreenCanvas(1, 1)
const off_context = /** @type {OffscreenCanvasRenderingContext2D} */(off.getContext("2d"))/**/
export const crosshair_image = (() => {
	const { color, height, gap, width } = constants.crosshair
	off.height = height
	off.width = width
	context_2d.save()
	off_context.lineWidth = width
	off_context.strokeStyle = color
	off_context.beginPath()
	off_context.moveTo(width / 2, 0)
	off_context.lineTo(width / 2, (height - gap) / 2)
	off_context.moveTo(width / 2, (height + gap) / 2)
	off_context.lineTo(width / 2, height)
	off_context.stroke()
	off_context.restore()
	return off.transferToImageBitmap()
})()
export const grid_pattern = (() => {
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
/** @returns {void} */
function crop_sa_aspect_side() {
	const { height, width } = state.camera
	const { mode, sens } = state.game
	if (sens == "sa" && mode && mode != "aim_booster") {
		context_2d.fillStyle = "#000"
		if (width > height * 4 / 3) {
			context_2d.fillRect(
				-width / 2,
				-height / 2,
				(width - height * 4 / 3) / 2,
				height
			)
			context_2d.fillRect(
				height * 2 / 3,
				-height / 2,
				(width - height * 4 / 3) / 2,
				height
			)
		}
	}
}
/** @returns {void} */
export function draw_crosshair() {
	const { height, width } = constants.crosshair
	context_2d.drawImage(
		crosshair_image,
		-round(width / 2),
		-round(height / 2)
	)
	crop_sa_aspect_side()
}
/** @returns {void} */
export function draw_grid() {
	const { height, width, x, y } = state.camera
	context_2d.save()
	context_2d.translate(-x, -y)
	context_2d.fillStyle = grid_pattern
	context_2d.fillRect(
		x - width / 2,
		y - height / 2,
		width,
		height
	)
	context_2d.restore()
}
/** @returns {void} */
export function draw_impacts() {
	const { impacts } = state
	if (!impacts.length) {
		return
	}
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
	context_2d.save()
	context_2d.translate(-x, -y)
	context_2d.lineWidth = 2
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
			context_2d.fillStyle = base
			context_2d.globalAlpha = dot_alpha
			context_2d.beginPath()
			context_2d.arc(impact_x, impact_y, 2, 0, TAU)
			context_2d.fill()
		}
		for (let k = 0; k < rings; k++) {
			const p2 = p - k * spacing
			if (p2 <= 0 || p2 > 1) {
				continue
			}
			const pr = r * p2
			const ring_alpha = alpha * (1 - fade_factor * p2)
			if (ring_alpha <= 0 || pr <= 0) {
				continue
			}
			context_2d.globalAlpha = ring_alpha
			context_2d.strokeStyle = base
			context_2d.beginPath()
			context_2d.arc(impact_x, impact_y, pr, 0, TAU)
			context_2d.stroke()
		}
		index++
	}
	context_2d.restore()
}
/**
 * @param {Target} target
 * @param {number} alpha
 * @returns {void}
 */
export function draw_target(target, alpha) {
	const { x, y } = state.camera
	const { cr, cx, cy, r, x: target_x, y: target_y } = target
	const line_width = 1
	context_2d.save()
	context_2d.translate(-x, -y)
	context_2d.globalAlpha = alpha
	context_2d.lineWidth = line_width
	context_2d.strokeStyle = "#ffff40"
	context_2d.beginPath()
	context_2d.arc(
		target_x,
		target_y,
		r + line_width,
		0,
		TAU
	)
	context_2d.stroke()
	context_2d.fillStyle = "#385978"
	context_2d.beginPath()
	context_2d.arc(target_x, target_y, r, 0, TAU)
	context_2d.fill()
	if (cr) {
		context_2d.beginPath()
		context_2d.arc(cx, cy, cr + line_width, 0, TAU)
		context_2d.stroke()
		context_2d.fillStyle = "#1c344a"
		context_2d.beginPath()
		context_2d.arc(cx, cy, cr, 0, TAU)
		context_2d.fill()
	}
	context_2d.restore()
}
/** @returns {void} */
export function resize_2d() {
	const width = canvas_el.width = state.camera.width = innerWidth * devicePixelRatio
	const height = canvas_el.height = state.camera.height = innerHeight * devicePixelRatio
	resize_3d()
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	draw_grid()
	draw_crosshair()
	context_2d.restore()
}