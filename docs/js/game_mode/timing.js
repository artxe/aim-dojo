import {
	convert_camera_to_2d,
	convert_camera_to_3d,
	hit_test_2d,
	hit_test_3d,
	px_to_rad,
	rad_to_px,
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
	timing_score_el
} from "../controller/dom.js"
import {
	calc_core_radius,
	random,
	round,
	round_to
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
import state, { shoots_pool } from "../state.js"
const STORAGE_KEY = "timing#best_score"
let best_score = Number(
	localStorage.getItem(STORAGE_KEY) || 0
)
let next_hide_ms = 0
let next_show_ms = 0
let peak_score = 0
let speed = 0
/** @type {Target?} */
let target = null
/** @type {Target3D?} */
let target_3d = null
/** @type {Target} */
const target_store = { cr: 0, cx: 0, cy: 0, r: 0, x: 0, y: 0 }
/** @type {Target3D} */
const target_3d_store = { cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 }
/** @type {Target[]} */
const aim_chain_2d = []
/** @type {Target3D[]} */
const aim_chain_3d = []
timing_score_el.textContent = String(best_score)
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
	set_text_if_changed(timing_score_el, 0)
	send_toast(
		"Timing score has been reset!",
		1_500
	)
}
/** @returns {void} */
function dispose() {
	state.game.mode = null
	target = null
	target_3d = null
	peak_score = 0
	reset_run_state()
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
	peak_score_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	const { target_hide_duration_ms } = constants.mode.timing
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
		base_speed,
		cross_time_max,
		cross_time_min,
		size_steps,
		speed_steps,
		target_hide_duration_ms,
		target_show_duration_ms,
		y_range_mul
	} = constants.mode.timing
	const { dimension, x, yaw } = state.camera
	const { shoots } = state.stats
	const { now_ms, prev_ms } = state.timer
	if (dimension == "2d") {
		if (target) {
			const dt = now_ms - prev_ms
			target.x += speed * dt
			target.cx += speed * dt
			if (next_hide_ms <= now_ms) {
				target = null
				next_show_ms = now_ms + target_hide_duration_ms
				const miss = shoots_pool.obtain()
				miss.c = false
				miss.e = now_ms
				miss.h = false
				miss.s = prev_ms
				shoots.push(miss)
				state.stats.count_shoot++
			}
		} else if (next_show_ms <= now_ms) {
			const sign = /** @type {1|-1} */(random() < .5 ? 1 : -1)/**/
			const r = base_radius * size_steps[random() * size_steps.length | 0]
			const cr = calc_core_radius(r, base_radius)
			const speed_step = speed_steps[random() * speed_steps.length | 0]
			const t_cross = (cross_time_min + random() * (cross_time_max - cross_time_min)) * target_show_duration_ms
			const raw_speed = r * base_speed * speed_step
			const offset = sign * raw_speed * t_cross
			const target_x = x + offset
			const target_y = (random() - .5) * 2 * y_range_mul * base_radius
			speed = -sign * raw_speed
			target_store.cr = cr
			target_store.cx = target_x
			target_store.cy = target_y - r + cr
			target_store.r = r
			target_store.x = target_x
			target_store.y = target_y
			target = target_store
			next_hide_ms = now_ms + target_show_duration_ms
		}
	} else if (target_3d) {
		const dt = now_ms - prev_ms
		target_3d.y += speed * dt
		target_3d.cy += speed * dt
		if (next_hide_ms <= now_ms) {
			target_3d = null
			next_show_ms = now_ms + target_hide_duration_ms
			const miss = shoots_pool.obtain()
			miss.c = false
			miss.e = now_ms
			miss.h = false
			miss.s = prev_ms
			shoots.push(miss)
			state.stats.count_shoot++
		}
	} else if (next_show_ms <= now_ms) {
		const sign = /** @type {1|-1} */(random() < .5 ? 1 : -1)/**/
		const base_radius_rad = px_to_rad(base_radius)
		const r = base_radius_rad * size_steps[random() * size_steps.length | 0]
		const cr = calc_core_radius(r, base_radius_rad)
		const speed_step = speed_steps[random() * speed_steps.length | 0]
		const raw_speed = r * base_speed * speed_step
		const t_cross = (cross_time_min + random() * (cross_time_max - cross_time_min)) * target_show_duration_ms
		const yaw_offset = sign * raw_speed * t_cross
		const pitch = (random() - .5) * 2 * y_range_mul * base_radius_rad
		const target_yaw = yaw + yaw_offset
		speed = -sign * raw_speed
		target_3d_store.cp = pitch + r - cr
		target_3d_store.cr = cr
		target_3d_store.cy = target_yaw
		target_3d_store.p = pitch
		target_3d_store.r = r
		target_3d_store.y = target_yaw
		target_3d = target_3d_store
		next_hide_ms = now_ms + target_show_duration_ms
	}
}
/** @returns {void} */
function render() {
	const { dimension, height, width } = state.camera
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	if (dimension == "2d") {
		draw_grid()
		if (target) {
			aim_chain_2d[0] = target
			draw_aim_guides_2d(aim_chain_2d)
			draw_target(target, 1)
		}
		draw_impacts()
	} else {
		prepare_3d_view()
		draw_grid_3d()
		if (target_3d) {
			aim_chain_3d[0] = target_3d
			draw_aim_guides_3d(aim_chain_3d)
			draw_target_3d(target_3d, 1)
		}
		draw_impacts_3d()
	}
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { target_hide_duration_ms } = constants.mode.timing
	const { dimension, pitch, x, y, yaw } = state.camera
	const { shoots } = state.stats
	const { now_ms } = state.timer
	const shot_hide_ms = next_hide_ms
	let is_crit = false
	let is_hit = false
	if (dimension == "2d") {
		if (target) {
			({ is_crit, is_hit } = hit_test_2d(target, x, y))
			record_shot(is_hit, is_crit)
			target = null
			next_show_ms = now_ms + target_hide_duration_ms
		}
	} else if (target_3d) {
		({ is_crit, is_hit } = hit_test_3d(target_3d, yaw, pitch))
		record_shot(is_hit, is_crit)
		target_3d = null
		next_show_ms = now_ms + target_hide_duration_ms
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
		if (target) {
			speed = px_to_rad(speed)
			target_3d = convert_target_to_3d(target, target_3d_store)
			target = null
		}
	} else if (state.camera.dimension == "2d") {
		if (pitch || yaw) {
			convert_camera_to_2d()
		}
		if (target_3d) {
			speed = rad_to_px(speed)
			target = convert_target_to_2d(target_3d, target_store)
			target_3d = null
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
			set_text_if_changed(timing_score_el, score)
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