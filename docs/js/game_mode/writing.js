import constants from "../constants.js"
import {
	accuracy_el,
	peak_score_el,
	send_toast,
	set_attr_if_changed,
	set_text_if_changed,
	writing_score_el
} from "../controller/dom.js"
import { ceil, max, round, round_to } from "../math.js"
import {
	context_2d,
	draw_crosshair,
	draw_grid
} from "../render/renderer_2d.js"
import state, { create_queue } from "../state.js"
import { post_calc_worker_message } from "../worker/manager.js"
const STORAGE_KEY = "writing#best_score"
let best_score = Number(
	localStorage.getItem(STORAGE_KEY) || 0
)
/** @type {ReturnType<typeof create_queue<Line>>} */
const lines = create_queue()
let has_pointer = false
let peak_score = 0
let pointer_x = 0
let pointer_y = 0
const { text_data, text_image } = (() => {
	const { size } = constants.grid
	const { offset_x, text } = constants.mode.writing
	const text_lines = text.split("\n")
	const rows = text_lines.length
	const font_px = size * .78 | 0
	const off = new OffscreenCanvas(1, 1)
	const off_context = /** @type {OffscreenCanvasRenderingContext2D} */(off.getContext("2d"))/**/
	off_context.font = `${font_px}px bold monospace`
	let max_w = 0
	for (const line of text_lines) {
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
		const line = text_lines[r]
		if (!line) {
			continue
		}
		const cy = r * size + size / 2
		off_context.fillText(line, offset_x, cy)
	}
	off_context.restore()
	return {
		text_data: off_context.getImageData(0, 0, off.width, off.height).data,
		text_image: off.transferToImageBitmap()
	}
})()
{
	writing_score_el.textContent = String(best_score)
}
/** @returns {void} */
function check_stats() {
	const { line_width } = constants.mode.writing
	post_calc_worker_message(
		{
			fn: "check_writing_stats",
			height: text_image.height,
			line_width,
			lines: lines.array,
			text_data: text_data,
			width: text_image.width
		}
	)
}
/**
 * @param {number} count_hit
 * @param {number} count_shoot
 * @returns {void}
 */
export function check_writing_stats(count_hit, count_shoot) {
	if (state.game.mode == "writing") {
		state.stats.count_hit = count_hit
		state.stats.count_shoot = count_shoot
	}
}
/** @returns {void} */
function clear_best_score() {
	best_score = 0
	localStorage.removeItem(STORAGE_KEY)
	set_text_if_changed(writing_score_el, 0)
	send_toast(
		"Writing score has been reset!",
		1_500
	)
}
/** @returns {void} */
function dispose() {
	state.camera.x = 0
	state.camera.y = 0
	state.game.mode = null
	has_pointer = false
	state.stats.count_hit = 0
	state.stats.count_shoot = 0
	lines.clear()
	accuracy_el.removeAttribute("value")
	peak_score_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	state.camera.dimension = "2d"
	peak_score = 0
}
/** @returns {void} */
function on_frame() {
	const {
		key_a,
		key_e,
		key_q,
		key_r,
		key_w,
		mb_left,
		mb_right
	} = state.input
	const { now_ms } = state.timer
	const window_ms = now_ms - constants.hud.window_ms
	while (lines.length && lines.at().t <= window_ms) {
		lines.drop()
	}
	if (key_a || key_e || key_q || key_r || key_w || mb_left || mb_right) {
		shoot()
	} else if (has_pointer) {
		has_pointer = false
	}
}
/** @returns {void} */
function render() {
	const { line_width } = constants.mode.writing
	const { height, width, x, y } = state.camera
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	draw_grid()
	context_2d.drawImage(text_image, -x, -y)
	context_2d.save()
	context_2d.translate(-x, -y)
	context_2d.lineWidth = line_width
	context_2d.strokeStyle = "black"
	context_2d.beginPath()
	let has_prev = false
	let prev_x = 0
	let prev_y = 0
	for (let i = 0; i < lines.length; i++) {
		const { ex, ey, sx, sy } = lines.at(i)
		if (!has_prev || prev_x != sx || prev_y != sy) {
			context_2d.moveTo(sx, sy)
		}
		context_2d.lineTo(ex, ey)
		has_prev = true
		prev_x = ex
		prev_y = ey
	}
	context_2d.stroke()
	context_2d.restore()
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { x, y } = state.camera
	const { now_ms } = state.timer
	if (has_pointer) {
		lines.push(
			{
				ex: x,
				ey: y,
				sx: pointer_x,
				sy: pointer_y,
				t: now_ms
			}
		)
	}
	has_pointer = true
	pointer_x = x
	pointer_y = y
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const { count_hit, count_shoot } = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const score = 7 * count_hit * (count_hit / count_shoot) ** 4 | 0
	if (score > peak_score) {
		peak_score = score
		if (score > best_score) {
			best_score = score
			localStorage.setItem(STORAGE_KEY, String(score))
			set_text_if_changed(writing_score_el, score)
		}
	}
	set_attr_if_changed(
		peak_score_el,
		"value",
		`${score} / ${peak_score}`
	)
	set_attr_if_changed(
		accuracy_el,
		"value",
		`${(count_shoot ? round_to(count_hit / count_shoot * 100, 2) : 0)}%`
	)
}
/** @type {GameMode} */
export default {
	check_stats,
	clear_best_score,
	dispose,
	init,
	on_frame,
	render,
	shoot,
	update_hud
}