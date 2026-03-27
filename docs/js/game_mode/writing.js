import constants from "../constants.js"
import { set_text_if_changed } from "../controller/index.js"
import {
	accuracy_el,
	peak_score_el,
	writing_score_el
} from "../document.js"
import { round, round_to } from "../math.js"
import {
	context_2d,
	draw_crosshair,
	draw_grid
} from "../renderer.js"
import state from "../state.js"
import { post_worker_message } from "../worker_manager.js"
/** @returns {void} */
function check_stats() {
	const { line_width } = constants.mode.writing
	const { lines, text_data, text_image } = state.mode.writing
	post_worker_message(
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
/** @returns {void} */
function dispose() {
	const { lines } = state.mode.writing
	state.stats.count_hit = 0
	state.stats.count_shoot = 0
	state.camera.x = 0
	state.camera.y = 0
	state.game.mode = null
	state.input.mb_left = false
	state.mode.writing.pointer = null
	lines.clear()
	peak_score_el.removeAttribute("value")
	accuracy_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	state.camera.dimension = "2d"
	state.mode.writing.peak_score = 0
}
/** @returns {void} */
function on_frame() {
	const { mb_left } = state.input
	const { now_ms } = state.timer
	const { lines, pointer } = state.mode.writing
	const window_ms = now_ms - constants.stats.window_ms
	while (lines.length && lines.at().t <= window_ms) {
		lines.drop()
	}
	if (mb_left) {
		shoot()
	} else if (pointer) {
		state.mode.writing.pointer = null
	}
}
/** @returns {void} */
function render() {
	const { line_width } = constants.mode.writing
	const { height, width, x, y } = state.camera
	const { lines, text_image } = state.mode.writing
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
	/** @type {{ x: number, y: number }?} */
	let b = null
	for (let i = 0; i < lines.length; i++) {
		const { e, s } = lines.at(i)
		if (b != s) {
			context_2d.moveTo(s.x, s.y)
		}
		context_2d.lineTo(e.x, e.y)
		b = e
	}
	context_2d.stroke()
	context_2d.restore()
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { x, y } = state.camera
	const { lines, pointer } = state.mode.writing
	const { now_ms } = state.timer
	const e = { x, y }
	if (pointer) {
		lines.push({ e, s: pointer, t: now_ms })
	}
	state.mode.writing.pointer = e
}
/** @returns {void} */
function update_fov() {
	// no-op
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const { count_hit, count_shoot } = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const score = (7 * count_hit * (count_hit / count_shoot) ** 4) | 0
	if (score > state.mode.writing.peak_score) {
		state.mode.writing.peak_score = score
		if (score > state.mode.writing.best_score) {
			localStorage.setItem(
				"writing.best_score",
				String(score)
			)
			set_text_if_changed(
				writing_score_el,
				state.mode.writing.best_score = score
			)
		}
	}
	peak_score_el.setAttribute(
		"value",
		`${score} / ${state.mode.writing.peak_score}`
	)
	accuracy_el.setAttribute(
		"value",
		`${(count_shoot ? round_to(count_hit / count_shoot * 100, 2) : 0)}%`
	)
}
/** @type {GameMode} */
export default {
	check_stats,
	dispose,
	init,
	on_frame,
	render,
	shoot,
	update_fov,
	update_hud
}