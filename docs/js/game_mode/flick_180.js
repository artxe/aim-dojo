import { hit_test_3d, px_to_rad } from "../render/camera.js"
import constants from "../constants.js"
import {
	accuracy_el,
	clear_flick_180_btn,
	crit_rate_el,
	flick_180_score_el,
	peak_score_el,
	send_toast,
	set_attr_if_changed,
	set_best_score
} from "../controller/dom.js"
import {
	calc_core_radius,
	PI,
	random,
	round,
	round_to,
	sin,
	to_rad
} from "../math.js"
import { context_2d, draw_crosshair } from "../render/renderer_2d.js"
import {
	draw_aim_guides_3d,
	draw_grid_3d,
	draw_impacts_3d,
	draw_target_3d,
	draw_target_sphere_3d,
	prepare_3d_view,
	record_shot
} from "../render/renderer_3d.js"
import {
	reset_run_state,
	update_camera_view
} from "../logic.js"
import state, { shoots_pool } from "../state.js"
const STORAGE_KEY = "flick_180#best_score"
let best_score = Number(
	localStorage.getItem(STORAGE_KEY) || 0
)
let has_target = false
let peak_score = 0
let spawn_opposite = false
let travel_active = false
let travel_dist = 0
let travel_from_pitch = 0
let travel_from_radius = 0
let travel_from_yaw = 0
let travel_pitch = 0
let travel_radius = 0
let travel_start_ms = 0
let travel_to_radius = 0
let travel_yaw = 0
const guide_chain = /** @type {Target3D[]} */([])/**/
const target = /** @type {Target3D} */({ cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 })/**/
set_best_score(
	flick_180_score_el,
	clear_flick_180_btn,
	best_score
)
/** @returns {void} */
function check_stats() {
	const { shoots } = state.stats
	const { now_ms } = state.timer
	const window_ms = now_ms - constants.hud.window_ms
	while (shoots.length) {
		const first = shoots.at()
		const { c, e, h } = first
		if (window_ms >= e) {
			state.stats.count_shoot--
			if (h) {
				state.stats.count_hit--
				if (c) {
					state.stats.count_crit--
				}
			}
			shoots.drop()
			shoots_pool.recycle(first)
		} else {
			break
		}
	}
}
/** @returns {void} */
function clear_best_score() {
	best_score = 0
	localStorage.removeItem(STORAGE_KEY)
	set_best_score(
		flick_180_score_el,
		clear_flick_180_btn,
		0
	)
	send_toast(
		"180° Flick score has been reset!",
		1_500
	)
}
/** @returns {void} */
function dispose() {
	state.game.mode = null
	has_target = false
	peak_score = 0
	spawn_opposite = false
	travel_active = false
	travel_dist = 0
	travel_from_pitch = 0
	travel_from_radius = 0
	travel_from_yaw = 0
	travel_pitch = 0
	travel_radius = 0
	travel_start_ms = 0
	travel_to_radius = 0
	travel_yaw = 0
	reset_run_state()
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
	peak_score_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	reset_run_state()
	update_camera_view()
	state.camera.dimension = "fpp"
	state.camera.dist = 0
	state.impact.rad_size = px_to_rad(constants.impact.px_size)
}
/** @returns {void} */
function on_frame() {
	if (travel_active) {
		const { sky_sphere_radius } = constants.grid
		const { travel_duration_ms } = constants.mode.flick_180
		const { now_ms } = state.timer
		const linear_p = (now_ms - travel_start_ms) / travel_duration_ms
		if (linear_p >= 1) {
			has_target = true
			travel_active = false
			return
		}
		const p = linear_p * linear_p * (3 - 2 * linear_p)
		if (p < .5) {
			travel_dist = sky_sphere_radius * (1 - 2 * p)
			travel_pitch = travel_from_pitch
			travel_radius = travel_from_radius
			travel_yaw = travel_from_yaw
		} else {
			travel_dist = sky_sphere_radius * (2 * p - 1)
			travel_pitch = target.p
			travel_radius = travel_to_radius
			travel_yaw = target.y
		}
		return
	}
	if (!has_target) {
		const { yaw } = state.camera
		place_target(
			yaw + random_spread(),
			random_spread(),
			constants.mode.flick_180.random_radius_mul
		)
		has_target = true
		spawn_opposite = true
	}
}
/**
 * @param {number} y
 * @param {number} p
 * @param {number} radius_mul
 * @returns {void}
 */
function place_target(y, p, radius_mul) {
	const { base_radius } = constants.target
	const base_radius_rad = px_to_rad(base_radius)
	const r = base_radius_rad * radius_mul
	const cr = calc_core_radius(r, base_radius_rad)
	target.cp = p
	target.cr = cr
	target.cy = y
	target.p = p - r + cr
	target.r = r
	target.y = y
}
/** @returns {number} */
function random_spread() {
	const range = to_rad(
		constants.mode.flick_180.spawn_range
	)
	return range * (random() * 2 - 1)
}
/** @returns {void} */
function render() {
	const { height, width } = state.camera
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	prepare_3d_view()
	draw_grid_3d()
	if (travel_active) {
		draw_target_sphere_3d(
			travel_yaw,
			travel_pitch,
			travel_dist,
			travel_radius,
			1
		)
	} else if (has_target) {
		guide_chain[0] = target
		draw_aim_guides_3d(guide_chain)
		draw_target_3d(target, 1)
	}
	draw_impacts_3d()
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { pitch, yaw } = state.camera
	const { shoots } = state.stats
	const { now_ms, prev_ms } = state.timer
	let is_crit = false
	let is_hit = false
	if (has_target) {
		({ is_crit, is_hit } = hit_test_3d(target, yaw, pitch))
	}
	if (is_hit) {
		if (spawn_opposite) {
			const { sky_sphere_radius } = constants.grid
			has_target = false
			travel_active = true
			travel_dist = sky_sphere_radius
			travel_from_pitch = target.p
			travel_from_radius = sin(target.r) * sky_sphere_radius
			travel_from_yaw = target.y
			travel_start_ms = now_ms
			place_target(
				yaw + PI,
				-pitch,
				constants.mode.flick_180.opposite_radius_mul
			)
			travel_to_radius = sin(target.r) * sky_sphere_radius
		} else {
			place_target(
				target.cy + random_spread(),
				random_spread(),
				constants.mode.flick_180.random_radius_mul
			)
		}
		spawn_opposite = !spawn_opposite
	}
	record_shot(is_hit, is_crit)
	const shoot_entry = shoots_pool.obtain()
	shoot_entry.c = is_crit
	shoot_entry.e = now_ms
	shoot_entry.h = is_hit
	shoot_entry.s = prev_ms
	shoots.push(shoot_entry)
	state.stats.count_shoot++
	if (is_hit) {
		state.stats.count_hit++
		if (is_crit) {
			state.stats.count_crit++
		}
	}
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const { count_crit, count_hit, count_shoot } = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const score = 100 * (count_crit + count_hit) * count_hit / count_shoot | 0
	if (score > peak_score) {
		peak_score = score
		if (score > best_score) {
			best_score = score
			localStorage.setItem(STORAGE_KEY, String(score))
			set_best_score(
				flick_180_score_el,
				clear_flick_180_btn,
				score
			)
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
	set_attr_if_changed(
		crit_rate_el,
		"value",
		`${(count_hit ? round_to(count_crit / count_hit * 100, 2) : 0)}%`
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