import constants from "../constants.js"
import { round, round_to } from "../math.js"
import state from "../state.js"
import {
	fov_el,
	sens_error_el,
	set_text_if_changed,
	timer_el
} from "./dom.js"
/**
 * @param {number} ms
 * @returns {string}
 */
function format_duration_ms(ms) {
	const total_sec = ms / 1_000 | 0
	const s = total_sec % 60
	const m = (total_sec / 60 | 0) % 60
	const h = total_sec / 3_600 | 0
	return h > 0 ? `${h}:${pad_two(m)}:${pad_two(s)}` : `${pad_two(m)}:${pad_two(s)}`
}
/**
 * @param {number} ratio
 * @returns {string}
 */
function format_error(ratio) {
	const pct = round_to(ratio * 100, 2)
	return `${pct > 0 ? "+" : ""}${pct}%`
}
/**
 * @param {number} n
 * @returns {string}
 */
function pad_two(n) {
	return n < 10 ? "0" + n : "" + n
}
/**
 * @param {GameMode} mode
 * @returns {void}
 */
export function update_hud(mode) {
	const { dimension, fov, sens_error } = state.camera
	const {
		frame_count,
		fps_ms,
		now_ms,
		start_ms
	} = state.timer
	let { fps } = state.timer
	mode.update_hud()
	const fps_dt = now_ms - fps_ms
	if (fps_dt >= constants.hud.fps_interval_ms) {
		state.timer.fps = fps = frame_count * 1_000 / fps_dt
		state.timer.fps_ms = now_ms
		state.timer.frame_count = 0
	}
	set_text_if_changed(
		timer_el,
		`${round(fps)} / ${format_duration_ms(now_ms - start_ms)}`
	)
	set_text_if_changed(
		fov_el,
		dimension == "2d" ? "2D" : `${dimension} ${round_to(fov, 2)}°`
	)
	set_text_if_changed(
		sens_error_el,
		`error: ${format_error(sens_error)}`
	)
}