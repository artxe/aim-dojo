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
	const { now_ms, prev_ms, start_ms } = state.timer
	let { fps } = state.timer
	mode.update_hud()
	const dt = now_ms - prev_ms
	const frame_fps = dt > 0 ? 1_000 / dt : 0
	const sens_error_pct = round_to(sens_error * 100, 2)
	state.timer.fps = fps = fps ? fps * .9 + frame_fps * .1 : frame_fps
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
		`error ${sens_error_pct > 0 ? "+" : ""}${sens_error_pct}%`
	)
}