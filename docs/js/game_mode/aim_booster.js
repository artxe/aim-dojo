import constants from "../constants.js"
import { set_text_if_changed } from "../controller/index.js"
import {
	accuracy_el,
	aim_booster_score_el,
	crit_rate_el,
	peak_score_el
} from "../document.js"
import { random, round, round_to } from "../math.js"
import {
	context_2d,
	draw_crosshair,
	draw_impacts,
	draw_target,
	grid_pattern
} from "../renderer.js"
import { play_hit } from "../sfx.js"
import state from "../state.js"
/** @returns {void} */
function check_stats() {
	// no-op
}
/** @returns {void} */
function dispose() {
	const { impacts } = state
	state.camera.x = 0
	state.camera.y = 0
	state.game.mode = null
	state.input.mb_left = false
	state.mode.aim_booster.targets.length = 0
	state.stats.count_hit = 0
	state.stats.count_shoot = 0
	impacts.clear()
	peak_score_el.removeAttribute("value")
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
	crit_rate_el.textContent = "Critical"
}
/** @returns {void} */
function init() {
	const { start_ms } = state.timer
	state.camera.dimension = "2d"
	state.mode.aim_booster.count = 0
	state.mode.aim_booster.peak_score = 0
	state.mode.aim_booster.start_ms = start_ms
	crit_rate_el.textContent = "Targets"
}
/** @returns {void} */
function on_frame() {
	const {
		inc_target_per_sec,
		start_target_per_sec,
		target_height,
		target_radius,
		target_width
	} = constants.mode.aim_booster
	const { count, start_ms, targets } = state.mode.aim_booster
	const { now_ms } = state.timer
	const dt = (now_ms - start_ms) / 1_000
	const m = dt / 60
	const tps = start_target_per_sec + inc_target_per_sec * m
	const total = ((start_target_per_sec + tps) / 2 * dt + 1) | 0
	if (total - count + targets.length > tps * 2) {
		const remain = targets.length
		const effective_count = Math.max(0, count - remain)
		const t_effective = (-start_target_per_sec + Math.sqrt(
			start_target_per_sec * start_target_per_sec + (inc_target_per_sec / 30) * effective_count
		)) / (inc_target_per_sec / 60)
		const t2 = t_effective * (2 / 3)
		const m2 = t2 / 60
		const tps2 = start_target_per_sec + inc_target_per_sec * m2
		state.mode.aim_booster.start_ms = now_ms - t2 * 1000
		state.mode.aim_booster.count
			= state.stats.count_hit
			= state.stats.count_shoot
			= ((start_target_per_sec + tps2) / 2 * t2 + 1) | 0
		targets.length = 0
	} else {
		for (let i = count; i < total; i++) {
			targets.push(
				{
					cr: 0,
					cx: 0,
					cy: 0,
					r: target_radius,
					t: now_ms,
					x: random() * target_width - target_width / 2,
					y: random() * target_height - target_height / 2
				}
			)
			state.mode.aim_booster.count++
		}
	}
}
/** @returns {void} */
function render() {
	const {
		inc_target_per_sec,
		start_target_per_sec
	} = constants.mode.aim_booster
	const { height, width, x, y } = state.camera
	const { start_ms, targets } = state.mode.aim_booster
	const { now_ms } = state.timer
	const dt = (now_ms - start_ms) / 1_000
	const m = dt / 60
	const tps = round_to(
		start_target_per_sec + inc_target_per_sec * m,
		2
	)
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	context_2d.translate(x, y)
	context_2d.save()
	context_2d.translate(-x, -y)
	context_2d.font = "bold 120px monospace"
	context_2d.textAlign = "center"
	context_2d.textBaseline = "middle"
	context_2d.fillStyle = "rgba(255, 255, 255, 0.15)"
	context_2d.fillText(`${tps}/s`, 0, 0)
	context_2d.fillStyle = grid_pattern
	context_2d.fillRect(
		-width / 2,
		-height / 2,
		width,
		height
	)
	context_2d.restore()
	for (let i = targets.length - 1; i >= 0; i--) {
		draw_target(targets[i], 1)
	}
	draw_impacts()
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { impacts } = state
	const { x, y } = state.camera
	const { targets } = state.mode.aim_booster
	const { now_s } = state.timer
	let is_hit = false
	for (let i = 0; i < targets.length; i++) {
		const { r, x: target_x, y: target_y } = targets[i]
		const dx = target_x - x
		if (dx ** 2 + (target_y - y) ** 2 <= r * r) {
			play_hit()
			impacts.push(
				{ c: false, r, t: now_s, x: x, y: y }
			)
			targets.splice(i, 1)
			is_hit = true
			break
		}
	}
	state.stats.count_shoot++
	if (is_hit) {
		state.stats.count_hit++
	}
}
/** @returns {void} */
function update_fov() {
	// no-op
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const {
		inc_target_per_sec,
		score_mul,
		start_target_per_sec
	} = constants.mode.aim_booster
	const { start_ms } = state.mode.aim_booster
	const { count_hit, count_shoot } = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const score = (score_mul * count_hit ** .9) | 0
	const dt = (now_ms - start_ms) / 1_000
	const m = (dt / 60)
	const tps = round_to(
		start_target_per_sec + inc_target_per_sec * m,
		2
	)
	if (score > state.mode.aim_booster.peak_score) {
		state.mode.aim_booster.peak_score = score
		if (score > state.mode.aim_booster.best_score) {
			localStorage.setItem(
				"aim_booster.best_score",
				String(score)
			)
			set_text_if_changed(
				aim_booster_score_el,
				state.mode.aim_booster.best_score = score
			)
		}
	}
	peak_score_el.setAttribute(
		"value",
		`${score} / ${state.mode.aim_booster.peak_score}`
	)
	accuracy_el.setAttribute(
		"value",
		`${(count_shoot ? round_to(count_hit / count_shoot * 100, 2) : 0)}%`
	)
	crit_rate_el.setAttribute("value", `${tps}/s`)
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