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
	h_tracking_score_el,
	peak_score_el,
	send_toast,
	set_attr_if_changed,
	set_text_if_changed
} from "../controller/dom.js"
import {
	calc_core_radius,
	clamp,
	cos,
	lerp,
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
import state, { shoots_pool } from "../state.js"
const STORAGE_KEY = "h_tracking#best_score"
let best_score = Number(
	localStorage.getItem(STORAGE_KEY) || 0
)
const move = {
	core_angle: 0,
	core_from: 0,
	core_to: 0,
	/** @type {1|-1} */
	direction: 1,
	direction_change_rate: 0,
	speed: 0
}
let next_change_move_ms = 0
let next_change_size_ms = 0
let next_impact_s = 0
let peak_score = 0
const size_lerp = {
	active: false,
	from: 0,
	start_ms: 0,
	to: 0
}
const speed_lerp = {
	active: false,
	from: 0,
	start_ms: 0,
	to: 0
}
/** @type {Target} */
const target = { cr: 0, cx: 0, cy: 0, r: 0, x: 0, y: 0 }
/** @type {Target3D} */
const target_3d = { cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 }
/** @type {Target[]} */
const aim_chain_2d = [ target ]
/** @type {Target3D[]} */
const aim_chain_3d = [ target_3d ]
h_tracking_score_el.textContent = String(best_score)
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
			state.stats.sum_shoot_ms -= ms
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
			state.stats.sum_shoot_ms -= ms
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
	set_text_if_changed(h_tracking_score_el, 0)
	send_toast(
		"H-Tracking score has been reset!",
		1_500
	)
}
/** @returns {void} */
function dispose() {
	state.game.mode = null
	peak_score = 0
	size_lerp.active = false
	speed_lerp.active = false
	reset_run_state()
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
	peak_score_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	const { base_radius: r } = constants.target
	const { base_speed } = constants.mode.h_tracking
	const {
		move_change_interval_ms,
		size_change_interval_ms
	} = constants.mode.h_tracking
	const { now_ms } = state.timer
	reset_run_state()
	next_change_size_ms = now_ms + size_change_interval_ms
	next_change_move_ms = now_ms + move_change_interval_ms
	next_impact_s = 0
	move.direction = 1
	move.direction_change_rate = 0
	move.speed = base_speed
	move.core_angle = to_rad(move.direction * 30 - 90)
	update_camera_view()
	if (state.camera.dimension == "2d") {
		const cr = calc_core_radius(r)
		const core_offset = r - cr
		target.cr = cr
		target.cx = core_offset * cos(move.core_angle)
		target.cy = core_offset * sin(move.core_angle)
		target.r = r
		target.x = 0
		target.y = 0
	} else {
		const radius_rad = px_to_rad(r)
		const cr = calc_core_radius(radius_rad)
		const alpha = radius_rad - cr
		target_3d.cp = -alpha * sin(move.core_angle)
		target_3d.cr = cr
		target_3d.cy = alpha * cos(move.core_angle)
		target_3d.p = 0
		target_3d.r = radius_rad
		target_3d.y = 0
	}
}
/** @returns {void} */
function on_frame() {
	const { base_radius } = constants.target
	const {
		base_speed,
		move_change_interval_ms,
		size_change_interval_ms,
		size_lerp_ms,
		size_steps,
		speed_lerp_ms,
		speed_steps
	} = constants.mode.h_tracking
	const { dimension } = state.camera
	const {
		key_a,
		key_e,
		key_q,
		key_r,
		key_w,
		mb_left
	} = state.input
	const { now_ms, prev_ms } = state.timer
	if (key_a || key_e || key_q || key_r || key_w || mb_left) {
		const dt = now_ms - prev_ms
		if (dimension == "2d") {
			const speed = target.r * move.speed
			target.x += speed * dt
			if (size_lerp.active) {
				const p = clamp(
					0,
					(now_ms - size_lerp.start_ms) / size_lerp_ms,
					1
				)
				if (p == 1) {
					size_lerp.active = false
					target.r = size_lerp.to
				} else {
					target.r = lerp(size_lerp.from, size_lerp.to, p)
				}
				target.cr = calc_core_radius(target.r, base_radius)
			} else if (now_ms >= next_change_size_ms) {
				const index = random() * size_steps.length | 0
				size_lerp.active = true
				size_lerp.from = target.r
				size_lerp.start_ms = now_ms
				size_lerp.to = base_radius * size_steps[index]
				next_change_size_ms = now_ms + size_change_interval_ms
			}
			if (speed_lerp.active) {
				const p = clamp(
					0,
					(now_ms - speed_lerp.start_ms) / speed_lerp_ms,
					1
				)
				if (p == 1) {
					speed_lerp.active = false
					move.core_angle = move.core_to
					move.speed = speed_lerp.to
				} else {
					move.core_angle = lerp(move.core_from, move.core_to, p)
					move.speed = lerp(speed_lerp.from, speed_lerp.to, p)
				}
			} else if (now_ms >= next_change_move_ms) {
				if (random() < (move.direction_change_rate += .2)) {
					move.direction *= -1
					move.direction_change_rate = 0
				}
				const index = random() * speed_steps.length | 0
				move.core_from = move.core_angle
				move.core_to = to_rad(move.direction * 30 - 90)
				speed_lerp.active = true
				speed_lerp.from = move.speed
				speed_lerp.start_ms = now_ms
				speed_lerp.to = base_speed * speed_steps[index] * move.direction
				next_change_move_ms = now_ms + move_change_interval_ms
			}
			const core_offset = target.r - target.cr
			target.cx = target.x + core_offset * cos(move.core_angle)
			target.cy = target.y + core_offset * sin(move.core_angle)
		} else {
			const base_radius_rad = px_to_rad(base_radius)
			const speed = target_3d.r * move.speed
			target_3d.y += speed * dt
			if (size_lerp.active) {
				const p = clamp(
					0,
					(now_ms - size_lerp.start_ms) / size_lerp_ms,
					1
				)
				if (p == 1) {
					size_lerp.active = false
					target_3d.r = size_lerp.to
				} else {
					target_3d.r = lerp(size_lerp.from, size_lerp.to, p)
				}
				target_3d.cr = calc_core_radius(target_3d.r, base_radius_rad)
			} else if (now_ms >= next_change_size_ms) {
				const index = random() * size_steps.length | 0
				size_lerp.active = true
				size_lerp.from = target_3d.r
				size_lerp.start_ms = now_ms
				size_lerp.to = px_to_rad(
					base_radius * size_steps[index]
				)
				next_change_size_ms = now_ms + size_change_interval_ms
			}
			if (speed_lerp.active) {
				const p = clamp(
					0,
					(now_ms - speed_lerp.start_ms) / speed_lerp_ms,
					1
				)
				if (p == 1) {
					speed_lerp.active = false
					move.core_angle = move.core_to
					move.speed = speed_lerp.to
				} else {
					move.core_angle = lerp(move.core_from, move.core_to, p)
					move.speed = lerp(speed_lerp.from, speed_lerp.to, p)
				}
			} else if (now_ms >= next_change_move_ms) {
				if (random() < (move.direction_change_rate += .2)) {
					move.direction *= -1
					move.direction_change_rate = 0
				}
				const index = random() * speed_steps.length | 0
				move.core_from = move.core_angle
				move.core_to = to_rad(move.direction * 30 - 90)
				speed_lerp.active = true
				speed_lerp.from = move.speed
				speed_lerp.start_ms = now_ms
				speed_lerp.to = base_speed * speed_steps[index] * move.direction
				next_change_move_ms = now_ms + move_change_interval_ms
			}
			const alpha = target_3d.r - target_3d.cr
			target_3d.cp = target_3d.p - alpha * sin(move.core_angle)
			target_3d.cy = target_3d.y + alpha * cos(move.core_angle)
		}
		shoot()
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
		aim_chain_2d[0] = target
		draw_aim_guides_2d(aim_chain_2d)
		draw_target(target, 1)
		draw_impacts()
	} else {
		prepare_3d_view()
		draw_grid_3d()
		aim_chain_3d[0] = target_3d
		draw_aim_guides_3d(aim_chain_3d)
		draw_target_3d(target_3d, 1)
		draw_impacts_3d()
	}
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { impact_interval_s } = constants.mode.h_tracking
	const { dimension, pitch, x, y, yaw } = state.camera
	const { shoots } = state.stats
	const { now_ms, now_s, prev_ms } = state.timer
	const { is_crit, is_hit } = dimension == "2d"
		? hit_test_2d(target, x, y)
		: hit_test_3d(target_3d, yaw, pitch)
	if (is_hit && now_s >= next_impact_s) {
		record_shot(true, is_crit)
		next_impact_s = now_s + impact_interval_s
	}
	const shoot_entry = shoots_pool.obtain()
	shoot_entry.c = is_crit
	shoot_entry.e = now_ms
	shoot_entry.h = is_hit
	shoot_entry.s = prev_ms
	shoots.push(shoot_entry)
	state.stats.count_shoot++
	state.stats.sum_shoot_ms += now_ms - prev_ms
	if (is_hit) {
		state.stats.count_hit++
		state.stats.sum_hit_ms += now_ms - prev_ms
		if (is_crit) {
			state.stats.count_crit++
			state.stats.sum_crit_ms += now_ms - prev_ms
		}
	}
}
/** @returns {void} */
function update_dimension() {
	const { dimension, pitch, x, y, yaw } = state.camera
	const { active } = size_lerp
	update_camera_view()
	if (dimension == "2d") {
		if (state.camera.dimension == "2d") {
			return
		}
		if (x || y) {
			convert_camera_to_3d()
		}
		convert_target_to_3d(target, target_3d)
		if (active) {
			size_lerp.from = px_to_rad(size_lerp.from)
			size_lerp.to = px_to_rad(size_lerp.to)
		}
	} else if (state.camera.dimension == "2d") {
		if (pitch || yaw) {
			convert_camera_to_2d()
		}
		convert_target_to_2d(target_3d, target)
		if (active) {
			size_lerp.from = rad_to_px(size_lerp.from)
			size_lerp.to = rad_to_px(size_lerp.to)
		}
	}
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const {
		sum_crit_ms,
		sum_hit_ms,
		sum_shoot_ms
	} = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const score = sum_crit_ms + sum_hit_ms | 0
	if (score > peak_score) {
		peak_score = score
		if (score > best_score) {
			best_score = score
			localStorage.setItem(STORAGE_KEY, String(score))
			set_text_if_changed(h_tracking_score_el, score)
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
		`${(
			sum_shoot_ms
				? round_to(
					sum_hit_ms / sum_shoot_ms * 100,
					2
				)
				: 0
		)}%`
	)
	set_attr_if_changed(
		crit_rate_el,
		"value",
		`${(
			sum_hit_ms
				? round_to(
					sum_crit_ms / sum_hit_ms * 100,
					2
				)
				: 0
		)}%`
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