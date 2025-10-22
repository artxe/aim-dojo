import { set_text_if_changed, send_toast } from "../ui.js"
import state from "../state.js"
import constants from "../constants.js"
import game_mode from "./index.js"
import {
	accuracy_el,
	crit_rate_el,
	peak_score_el,
	writing_score_el
} from "../document.js"
import { round_to } from "../math.js"
import { check_writing_stats } from "../renderer.js"
/** @returns {void} */
function change_to_next_mode() {
	const { mode } = state.game
	if (!mode) throw Error()
	const { peak_score } = state.mode[mode]
	/** @type {GameModeName} */
	const next_mode = "aiming"
	send_toast(`SCORE: ${peak_score}!`, 2500)
	dispose()
	state.game.mode = next_mode
	game_mode[next_mode].init()
}
/** @returns {void} */
function dispose() {
	const { lines } = state.mode.writing
	state.camera.x = 0
	state.camera.y = 0
	state.game.mode = null
	state.input.mb_left = false
	state.mode.writing.pointer = null
	state.stats.count_crit = 0
	state.stats.count_hit = 0
	state.stats.count_shoot = 0
	state.stats.sum_crit_ms = 0
	state.stats.sum_hit_ms = 0
	state.stats.sum_shoot_ms = 0
	lines.clear()
}
/** @returns {void} */
function init() {
	const { cycle_id } = state.game
	state.camera.dimension = "2d"
	state.mode.writing.peak_score = 0
	if (cycle_id) {
		state.game.cycle_id = setTimeout(change_to_next_mode, 50_000)
	}
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
				state.mode.writing.best_score
			)
		}
	}
	set_text_if_changed(
		peak_score_el,
		`${score} / ${state.mode.writing.peak_score}`
	)
	set_text_if_changed(
		accuracy_el,
		count_shoot ? round_to(count_hit / count_shoot * 100, 2) : 0
	)
	set_text_if_changed(crit_rate_el, "—")
}
/** @type {GameMode} */
export default {
	check_stats: check_writing_stats,
	dispose,
	init,
	on_frame,
	shoot,
	update_fov,
	update_hud
}