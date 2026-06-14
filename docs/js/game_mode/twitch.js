import {
	convert_camera_to_2d,
	convert_camera_to_3d,
	hit_test_2d,
	hit_test_3d,
	px_to_rad,
	convert_target_to_2d,
	convert_target_to_3d
} from "../render/camera.js"
import constants from "../constants.js"
import {
	accuracy_el,
	crit_rate_el,
	peak_score_el,
	send_toast,
	set_attr_if_changed,
	set_text_if_changed,
	twitch_score_el
} from "../controller/dom.js"
import {
	abs,
	calc_core_radius,
	convert_deg_across_aspect,
	cos,
	random,
	round,
	round_to,
	sin,
	to_rad
} from "../math.js"
import {
	context_2d,
	draw_aim_guides_2d,
	draw_crosshair,
	draw_grid,
	draw_impacts,
	draw_target
} from "../render/renderer_2d.js"
import {
	draw_aim_guides_3d,
	draw_grid_3d,
	draw_impacts_3d,
	draw_target_3d,
	prepare_3d_view,
	record_shot
} from "../render/renderer_3d.js"
import {
	reset_run_state,
	update_camera_view
} from "../logic.js"
import { create_pool } from "../pool.js"
import state, { shoots_pool } from "../state.js"
const STORAGE_KEY = "twitch#best_score"
let best_score = Number(
	localStorage.getItem(STORAGE_KEY) || 0
)
let cam_dir_x = 0
let cam_dir_y = 0
let cam_dir_z = 0
let next_hide_ms = 0
let next_show_ms = 0
let order_origin_x = 0
let order_origin_y = 0
let peak_score = 0
/** @type {Target[]} */
const targets = []
/** @type {Target3D[]} */
const targets_3d = []
/** @type {Target[]} */
const order_2d = []
/** @type {Target3D[]} */
const order_3d = []
const target_pool_2d = create_pool(
	() => /** @type {Target} */({ cr: 0, cx: 0, cy: 0, r: 0, x: 0, y: 0 })/**/
)
const target_pool_3d = create_pool(
	() => /** @type {Target3D} */({ cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 })/**/
)
twitch_score_el.textContent = String(best_score)
/** @returns {void} */
function check_stats() {
	const { shoots } = state.stats
	const { now_ms } = state.timer
	const window_ms = now_ms - constants.hud.window_ms
	while (shoots.length) {
		const first = shoots.at()
		const { c, e, h, s } = first
		if (window_ms >= e) {
			const ms = e - s
			state.stats.count_shoot--
			if (h) {
				state.stats.count_hit--
				state.stats.sum_hit_ms -= ms
				if (c) {
					state.stats.count_crit--
					state.stats.sum_crit_ms -= ms
				}
			}
			shoots.drop()
			shoots_pool.recycle(first)
		} else if (window_ms >= s) {
			const ms = window_ms - s
			if (h) {
				state.stats.sum_hit_ms -= ms
				if (c) {
					state.stats.sum_crit_ms -= ms
				}
			}
			first.s = window_ms
			break
		} else {
			break
		}
	}
}
/** @returns {void} */
function clear_best_score() {
	best_score = 0
	localStorage.removeItem(STORAGE_KEY)
	set_text_if_changed(twitch_score_el, 0)
	send_toast(
		"Twitch score has been reset!",
		1_500
	)
}
/**
 * @param {Target} a
 * @param {Target} b
 * @returns {number}
 */
function compare_targets_2d(a, b) {
	const ax = a.x - order_origin_x
	const ay = a.y - order_origin_y
	const bx = b.x - order_origin_x
	const by = b.y - order_origin_y
	return ax ** 2 + ay ** 2 - (bx ** 2 + by ** 2)
}
/**
 * @param {Target3D} a
 * @param {Target3D} b
 * @returns {number}
 */
function compare_targets_3d(a, b) {
	const a_cos_pitch = cos(a.p)
	const a_x = sin(a.y) * a_cos_pitch
	const a_y = sin(a.p)
	const a_z = -cos(a.y) * a_cos_pitch
	const b_cos_pitch = cos(b.p)
	const b_x = sin(b.y) * b_cos_pitch
	const b_y = sin(b.p)
	const b_z = -cos(b.y) * b_cos_pitch
	return cam_dir_x * b_x + cam_dir_y * b_y + cam_dir_z * b_z
		- (cam_dir_x * a_x + cam_dir_y * a_y + cam_dir_z * a_z)
}
/** @returns {void} */
function dispose() {
	state.game.mode = null
	peak_score = 0
	targets.length = 0
	targets_3d.length = 0
	target_pool_2d.clear()
	target_pool_3d.clear()
	reset_run_state()
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
	peak_score_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	const { target_hide_duration_ms } = constants.mode.twitch
	const { now_ms } = state.timer
	reset_run_state()
	next_hide_ms = 0
	next_show_ms = now_ms + target_hide_duration_ms / 2
	update_camera_view()
}
/** @returns {void} */
function on_frame() {
	const { base_radius } = constants.target
	const {
		height_div,
		target_hide_duration_ms,
		target_radius_mul_max,
		target_show_duration_ms,
		width_div
	} = constants.mode.twitch
	const { dimension, fov, height, width, x, yaw } = state.camera
	const { shoots } = state.stats
	const { now_ms, prev_ms } = state.timer
	if (dimension == "2d") {
		if (targets.length) {
			if (next_hide_ms <= now_ms) {
				const target_count = targets.length
				for (const t of targets) {
					target_pool_2d.recycle(t)
				}
				targets.length = 0
				next_show_ms = now_ms + target_hide_duration_ms
				for (let i = 0; i < target_count; i++) {
					const miss = shoots_pool.obtain()
					miss.c = false
					miss.e = now_ms
					miss.h = false
					miss.s = prev_ms
					shoots.push(miss)
				}
				state.stats.count_shoot += target_count
			}
		} else if (next_show_ms <= now_ms) {
			targets.push(
				create_target_2d(),
				create_target_2d()
			)
			next_hide_ms = now_ms + target_show_duration_ms
		}
	} else if (targets_3d.length) {
		if (next_hide_ms <= now_ms) {
			const target_count = targets_3d.length
			for (const t of targets_3d) {
				target_pool_3d.recycle(t)
			}
			targets_3d.length = 0
			next_show_ms = now_ms + target_hide_duration_ms
			for (let i = 0; i < target_count; i++) {
				const miss = shoots_pool.obtain()
				miss.c = false
				miss.e = now_ms
				miss.h = false
				miss.s = prev_ms
				shoots.push(miss)
			}
			state.stats.count_shoot += target_count
		}
	} else if (next_show_ms <= now_ms) {
		targets_3d.push(
			create_target_3d(),
			create_target_3d()
		)
		next_hide_ms = now_ms + target_show_duration_ms
	}
	/** @returns {Target} */
	function create_target_2d() {
		const random_x = random() - .5
		const r = base_radius * (1 + abs(random_x) * 2 * (target_radius_mul_max - 1))
		const cr = calc_core_radius(r, base_radius)
		const offset_x = width / width_div * random_x
		const target_y = height / height_div * (random() - .5)
		const t = target_pool_2d.obtain()
		t.cr = cr
		t.cx = x + offset_x
		t.cy = target_y - r + cr
		t.r = r
		t.x = x + offset_x
		t.y = target_y
		return t
	}
	/** @returns {Target3D} */
	function create_target_3d() {
		const base_radius_rad = px_to_rad(base_radius)
		const random_x = random() - .5
		const r = base_radius_rad * (1 + abs(random_x) * 2)
		const cr = calc_core_radius(r, base_radius_rad)
		const pitch = to_rad(
			convert_deg_across_aspect(fov, width, height)
		) / height_div * (random() - .5)
		const yaw_offset = to_rad(fov / width_div) * random_x
		const t = target_pool_3d.obtain()
		t.cp = pitch + r - cr
		t.cr = cr
		t.cy = yaw + yaw_offset
		t.p = pitch
		t.r = r
		t.y = yaw + yaw_offset
		return t
	}
}
/** @returns {void} */
function render() {
	const { dimension, height, pitch, width, x, y, yaw } = state.camera
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	if (dimension == "2d") {
		draw_grid()
		if (targets.length) {
			draw_aim_guides_2d(
				get_ordered_targets_2d(targets)
			)
			for (const target of targets) {
				draw_target(target, 1)
			}
		}
		draw_impacts()
	} else {
		prepare_3d_view()
		draw_grid_3d()
		if (targets_3d.length) {
			draw_aim_guides_3d(
				get_ordered_targets_3d(targets_3d)
			)
			for (const target of targets_3d) {
				draw_target_3d(target, 1)
			}
		}
		draw_impacts_3d()
	}
	draw_crosshair()
	context_2d.restore()
	/**
	 * @param {Target[]} values
	 * @returns {Target[]}
	 */
	function get_ordered_targets_2d(values) {
		order_origin_x = x
		order_origin_y = y
		order_2d.length = 0
		for (const v of values) {
			order_2d.push(v)
		}
		return order_2d.sort(compare_targets_2d)
	}
	/**
	 * @param {Target3D[]} values
	 * @returns {Target3D[]}
	 */
	function get_ordered_targets_3d(values) {
		const cam_cos_pitch = cos(pitch)
		cam_dir_x = sin(yaw) * cam_cos_pitch
		cam_dir_y = sin(pitch)
		cam_dir_z = -cos(yaw) * cam_cos_pitch
		order_3d.length = 0
		for (const v of values) {
			order_3d.push(v)
		}
		return order_3d.sort(compare_targets_3d)
	}
}
/** @returns {void} */
function shoot() {
	const {
		target_hide_duration_ms,
		target_show_duration_ms
	} = constants.mode.twitch
	const { dimension, pitch, x, y, yaw } = state.camera
	const { shoots } = state.stats
	const { now_ms } = state.timer
	const shot_hide_ms = next_hide_ms
	let is_crit = false
	let is_hit = false
	if (dimension == "2d") {
		let hit_i = -1
		for (let i = 0; i < targets.length; i++) {
			({ is_crit, is_hit } = hit_test_2d(targets[i], x, y))
			if (is_hit) {
				hit_i = i
				break
			}
		}
		if (hit_i >= 0) {
			const removed = targets[hit_i]
			for (let i = hit_i; i < targets.length - 1; i++) {
				targets[i] = targets[i + 1]
			}
			targets.length--
			target_pool_2d.recycle(removed)
			if (targets.length) {
				next_hide_ms = shot_hide_ms + target_show_duration_ms * .5
			} else {
				next_show_ms = now_ms + target_hide_duration_ms
			}
			record_shot(true, is_crit)
		} else if (targets.length) {
			for (const t of targets) {
				target_pool_2d.recycle(t)
			}
			targets.length = 0
			next_show_ms = now_ms + target_hide_duration_ms
			record_shot(false, false)
		}
	} else {
		let hit_i = -1
		for (let i = 0; i < targets_3d.length; i++) {
			({ is_crit, is_hit } = hit_test_3d(targets_3d[i], yaw, pitch))
			if (is_hit) {
				hit_i = i
				break
			}
		}
		if (hit_i >= 0) {
			const removed = targets_3d[hit_i]
			for (let i = hit_i; i < targets_3d.length - 1; i++) {
				targets_3d[i] = targets_3d[i + 1]
			}
			targets_3d.length--
			target_pool_3d.recycle(removed)
			if (targets_3d.length) {
				next_hide_ms = shot_hide_ms + target_show_duration_ms * .5
			} else {
				next_show_ms = now_ms + target_hide_duration_ms
			}
			record_shot(true, is_crit)
		} else if (targets_3d.length) {
			for (const t of targets_3d) {
				target_pool_3d.recycle(t)
			}
			targets_3d.length = 0
			next_show_ms = now_ms + target_hide_duration_ms
			record_shot(false, false)
		}
	}
	const shoot_entry = shoots_pool.obtain()
	shoot_entry.c = is_crit
	shoot_entry.e = shot_hide_ms
	shoot_entry.h = is_hit
	shoot_entry.s = now_ms
	shoots.push(shoot_entry)
	state.stats.count_shoot++
	if (is_hit) {
		state.stats.count_hit++
		state.stats.sum_hit_ms += shot_hide_ms - now_ms
		if (is_crit) {
			state.stats.count_crit++
			state.stats.sum_crit_ms += shot_hide_ms - now_ms
		}
	}
}
/** @returns {void} */
function update_dimension() {
	const { dimension, pitch, x, y, yaw } = state.camera
	update_camera_view()
	if (dimension == "2d") {
		if (x || y) {
			convert_camera_to_3d()
		}
		if (targets.length) {
			for (const t of targets) {
				targets_3d.push(
					convert_target_to_3d(t, target_pool_3d.obtain())
				)
				target_pool_2d.recycle(t)
			}
			targets.length = 0
		}
	} else if (state.camera.dimension == "2d") {
		if (pitch || yaw) {
			convert_camera_to_2d()
		}
		if (targets_3d.length) {
			for (const t of targets_3d) {
				targets.push(
					convert_target_to_2d(t, target_pool_2d.obtain())
				)
				target_pool_3d.recycle(t)
			}
			targets_3d.length = 0
		}
	}
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const {
		count_crit,
		count_hit,
		count_shoot,
		sum_crit_ms,
		sum_hit_ms
	} = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const score = (sum_crit_ms + sum_hit_ms) * count_hit / count_shoot | 0
	if (score > peak_score) {
		peak_score = score
		if (score > best_score) {
			best_score = score
			localStorage.setItem(STORAGE_KEY, String(score))
			set_text_if_changed(twitch_score_el, score)
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
	update_dimension,
	update_hud
}