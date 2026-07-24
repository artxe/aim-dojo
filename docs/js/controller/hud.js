import {
	fov_el,
	set_text_if_changed,
	timer_el
} from "./dom.js"
import game_mode from "../game_mode/index.js"
import { round, round_to } from "../math.js"
import state from "../state.js"
/**
 * @param {number} ms
 * @returns {string}
 */
function format_duration_ms(ms) {
	const total_sec = ms / 1_000 | 0
	const s = total_sec % 60
	const m = (total_sec / 60 | 0) % 60
	const h = total_sec / 3_600 | 0
	return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`
	/**
	 * @param {number} n
	 * @returns {string}
	 */
	function two(n) {
		return n < 10 ? "0" + n : "" + n
	}
}
/** @returns {void} */
export function update_hud() {
	const { dimension, fov } = state.camera
	const { mode } = state.game
	const { now_ms, prev_ms, start_ms } = state.timer
	let { fps } = state.timer
	if (!mode) {
		throw Error()
	}
	game_mode[mode].update_hud()
	const dt = now_ms - prev_ms
	const frame_fps = dt > 0 ? 1_000 / dt : 0
	state.timer.fps = fps = fps ? fps * .9 + frame_fps * .1 : frame_fps
	set_text_if_changed(
		timer_el,
		`${round(fps)} / ${format_duration_ms(now_ms - start_ms)}`
	)
	set_text_if_changed(
		fov_el,
		dimension == "2d" ? "2D" : `${dimension} ${round_to(fov, 2)}°`
	)
}