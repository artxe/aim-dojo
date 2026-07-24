import constants from "../constants.js"
import { canvas_el, crosshair_preview_el } from "../controller/dom.js"
import { min, round, TAU } from "../math.js"
import { play_shot } from "../sfx.js"
import state, { impacts_pool } from "../state.js"
const context_2d_raw = canvas_el.getContext("2d", { desynchronized: true })
export const context_2d = /** @type {CanvasRenderingContext2D} */(context_2d_raw)/**/
const off = new OffscreenCanvas(1, 1)
const off_context = /** @type {OffscreenCanvasRenderingContext2D} */(off.getContext("2d"))/**/
let crosshair_image = create_crosshair_image()
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
/** @returns {ImageBitmap} */
function create_crosshair_image() {
	const {
		color,
		dot,
		gap,
		height,
		thickness,
		width
	} = state.crosshair
	off.height = height
	off.width = width
	off_context.save()
	off_context.fillStyle = color
	off_context.lineWidth = thickness
	off_context.strokeStyle = color
	off_context.fillRect(
		(width - dot) / 2,
		(height - dot) / 2,
		dot,
		dot
	)
	off_context.beginPath()
	off_context.moveTo(0, height / 2)
	off_context.lineTo((width - gap) / 2, height / 2)
	off_context.moveTo((width + gap) / 2, height / 2)
	off_context.lineTo(width, height / 2)
	off_context.moveTo(width / 2, 0)
	off_context.lineTo(width / 2, (height - gap) / 2)
	off_context.moveTo(width / 2, (height + gap) / 2)
	off_context.lineTo(width / 2, height)
	off_context.stroke()
	off_context.restore()
	return off.transferToImageBitmap()
}
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
/**
 * @param {Target[]} chain
 * @returns {void}
 */
export function draw_aim_guides_2d(chain) {
	if (!chain.length) {
		return
	}
	const { x, y } = state.camera
	context_2d.save()
	context_2d.translate(-x, -y)
	context_2d.globalAlpha = .2
	context_2d.lineWidth = 2
	context_2d.strokeStyle = "white"
	context_2d.beginPath()
	context_2d.moveTo(x, y)
	for (const t of chain) {
		context_2d.lineTo(t.x, t.cy)
	}
	context_2d.stroke()
	context_2d.restore()
}
/** @returns {void} */
export function draw_crosshair() {
	const { height, width } = state.crosshair
	context_2d.drawImage(
		crosshair_image,
		-round(width / 2),
		-round(height / 2)
	)
	crop_sa_aspect_side()
}
/** @returns {void} */
export function draw_crosshair_preview() {
	const context = /** @type {CanvasRenderingContext2D} */(crosshair_preview_el.getContext("2d"))/**/
	const { height: h, width: w } = crosshair_preview_el
	const { height, width } = state.crosshair
	context.clearRect(0, 0, w, h)
	context.fillStyle = "rgba(255,255,255,.08)"
	context.fillRect(0, 0, w, h)
	context.strokeStyle = "rgba(255,255,255,.18)"
	context.lineWidth = 1
	context.beginPath()
	context.moveTo(w / 2, 0)
	context.lineTo(w / 2, h)
	context.moveTo(0, h / 2)
	context.lineTo(w, h / 2)
	context.stroke()
	context.drawImage(
		crosshair_image,
		round((w - width) / 2),
		round((h - height) / 2)
	)
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
		const first = impacts.at()
		if (now_s - first.t > max_life) {
			impacts_pool.recycle(first)
			impacts.drop()
		} else {
			break
		}
	}
	let index = 0
	while (index < impacts.length) {
		const { c, r, t, x: impact_x, y: impact_y } = impacts.at(index)
		const progress = (now_s - t) / duration_s
		const base = c == null ? "black" : c ? "red" : "white"
		const dot_alpha = alpha * (1 - fade_factor * min(1, progress))
		if (progress <= 1) {
			context_2d.fillStyle = base
			context_2d.globalAlpha = dot_alpha
			context_2d.beginPath()
			context_2d.arc(impact_x, impact_y, 2, 0, TAU)
			context_2d.fill()
		}
		for (let k = 0; k < rings; k++) {
			const ring_progress = progress - k * spacing
			if (ring_progress <= 0 || ring_progress > 1) {
				continue
			}
			const ring_radius = r * ring_progress
			const ring_alpha = alpha * (1 - fade_factor * ring_progress)
			if (ring_alpha <= 0 || ring_radius <= 0) {
				continue
			}
			context_2d.globalAlpha = ring_alpha
			context_2d.strokeStyle = base
			context_2d.beginPath()
			context_2d.arc(
				impact_x,
				impact_y,
				ring_radius,
				0,
				TAU
			)
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
	const {
		core_fill_style,
		fill_style,
		line_width,
		stroke_style
	} = constants.target
	const { x, y } = state.camera
	const { cr, cx, cy, r, x: target_x, y: target_y } = target
	context_2d.save()
	context_2d.translate(-x, -y)
	context_2d.globalAlpha = alpha
	context_2d.lineWidth = line_width
	context_2d.strokeStyle = stroke_style
	context_2d.beginPath()
	context_2d.arc(
		target_x,
		target_y,
		r + line_width,
		0,
		TAU
	)
	context_2d.stroke()
	context_2d.fillStyle = fill_style
	context_2d.beginPath()
	context_2d.arc(target_x, target_y, r, 0, TAU)
	context_2d.fill()
	if (cr) {
		context_2d.beginPath()
		context_2d.arc(cx, cy, cr + line_width, 0, TAU)
		context_2d.stroke()
		context_2d.fillStyle = core_fill_style
		context_2d.beginPath()
		context_2d.arc(cx, cy, cr, 0, TAU)
		context_2d.fill()
	}
	context_2d.restore()
}
/**
 * @param {boolean} is_hit
 * @param {boolean} is_crit
 * @returns {void}
 */
export function record_shot_2d(is_hit, is_crit) {
	const { px_size } = constants.impact
	const { x, y } = state.camera
	const { now_s } = state.timer
	play_shot(is_hit, is_crit)
	const impact = impacts_pool.obtain()
	impact.c = is_hit ? is_crit : void 0
	impact.r = px_size
	impact.t = now_s
	impact.x = x
	impact.y = y
	state.impacts.push(impact)
}
/** @returns {void} */
export function resize_2d() {
	const width = canvas_el.width = state.camera.width = innerWidth * devicePixelRatio
	const height = canvas_el.height = state.camera.height = innerHeight * devicePixelRatio
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
/** @returns {void} */
export function update_crosshair() {
	crosshair_image.close()
	crosshair_image = create_crosshair_image()
	draw_crosshair_preview()
}