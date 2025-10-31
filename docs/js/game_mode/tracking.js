import {
	camera_to_2d,
	camera_to_3d,
	px_to_rad,
	rad_to_px
} from "../camera.js"
import constants from "../constants.js"
import { send_toast, set_text_if_changed } from "../controller/index.js"
import {
	accuracy_el,
	crit_rate_el,
	peak_score_el,
	tracking_score_el
} from "../document.js"
import {
	check_stats,
	dir_from_yaw_pitch,
	target_to_2d,
	target_to_3d
} from "../logic.js"
import {
	atan,
	calc_core_radius,
	clamp,
	cos,
	dot,
	lerp,
	max,
	random,
	round_to,
	sin,
	tan,
	to_rad
} from "../math.js"
import { play_crit, play_hit } from "../sfx.js"
import state from "../state.js"
import game_mode from "./index.js"
/** @returns {void} */
function change_to_next_mode() {
	const { mode } = state.game
	if (!mode) throw Error()
	const { peak_score } = state.mode[mode]
	/** @type {GameModeName} */
	const next_mode = "twitch"
	send_toast(`SCORE: ${peak_score}!`, 2_500)
	dispose()
	state.game.mode = next_mode
	game_mode[next_mode].init()
}
/** @returns {void} */
function dispose() {
	const { impacts, impacts_3d } = state
	const { dimension } = state.camera
	const { shoots } = state.stats
	state.game.mode = null
	state.input.mb_left = false
	state.stats.sum_crit_ms = 0
	state.stats.sum_hit_ms = 0
	state.stats.sum_shoot_ms = 0
	shoots.clear()
	if (dimension == "2d") {
		state.camera.x = 0
		state.camera.y = 0
		impacts.clear()
	} else {
		state.camera.pitch = 0
		state.camera.yaw = 0
		impacts_3d.clear()
	}
	state.mode.tracking.size_lerp.active = false
	state.mode.tracking.speed_lerp.active = false
}
/** @returns {void} */
function init() {
	const { base_radius: r } = constants.target
	const { base_speed } = constants.mode.tracking
	const {
		move_change_interval_ms,
		size_change_interval_ms
	} = constants.mode.tracking
	const { cycle_timeout: cycle_id, sens } = state.game
	const { target, target_3d } = state.mode.tracking
	const { now_ms } = state.timer
	state.camera.dimension = sens == "lol" ? "2d" : "3d"
	state.mode.tracking.next_change_size_ms = now_ms + size_change_interval_ms
	state.mode.tracking.next_change_move_ms = now_ms + move_change_interval_ms
	state.mode.tracking.next_impact_s = 0
	state.mode.tracking.move.direction = 1
	state.mode.tracking.move.speed = base_speed
	state.mode.tracking.move.direction_change_rate = 0
	state.mode.tracking.peak_score = 0
	if (state.camera.dimension == "2d") {
		target.cr = calc_core_radius(r, r)
		target.cx = 0
		target.cy = target.cr - r
		target.r = r
		target.x = 0
		target.y = 0
	} else {
		const rr = px_to_rad(r)
		const cr = calc_core_radius(rr, rr)
		target_3d.cp = atan(max(0, tan(rr) - tan(cr)))
		target_3d.cr = cr
		target_3d.cy = 0
		target_3d.p = 0
		target_3d.r = rr
		target_3d.y = 0
	}
	if (cycle_id) {
		state.game.cycle_timeout = setTimeout(change_to_next_mode, 50_000)
	}
}
/** @returns {void} */
function on_frame() {
	const { base_radius } = constants.target
	const {
		base_speed,
		size_lerp_ms,
		size_steps,
		speed_lerp_ms,
		speed_steps
	} = constants.mode.tracking
	const { dimension } = state.camera
	const { now_ms, prev_ms } = state.timer
	const { mb_left } = state.input
	const {
		size_lerp,
		speed_lerp,
		target,
		target_3d
	} = state.mode.tracking
	if (!mb_left) return
	const dt = now_ms - prev_ms
	if (dimension == "2d") {
		const speed = target.r * state.mode.tracking.move.speed * state.mode.tracking.move.direction
		target.x += speed * dt
		if (speed_lerp.active) {
			const p = clamp(
				0,
				(now_ms - speed_lerp.start_ms) / speed_lerp_ms,
				1
			)
			if (p == 1) {
				speed_lerp.active = false
				state.mode.tracking.move.speed = speed_lerp.to
			} else {
				state.mode.tracking.move.speed = lerp(speed_lerp.from, speed_lerp.to, p)
			}
		} else if (now_ms >= state.mode.tracking.next_change_move_ms) {
			if (random() < (state.mode.tracking.move.direction_change_rate += .2)) {
				state.mode.tracking.move.direction *= -1
				state.mode.tracking.move.direction_change_rate = 0
			}
			const index = (random() * speed_steps.length) | 0
			speed_lerp.active = true
			speed_lerp.from = state.mode.tracking.move.speed
			speed_lerp.start_ms = now_ms
			speed_lerp.to = base_speed * speed_steps[index]
			state.mode.tracking.next_change_move_ms = now_ms + constants.mode.tracking.move_change_interval_ms
		}
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
		} else if (now_ms >= state.mode.tracking.next_change_size_ms) {
			const index = (random() * size_steps.length) | 0
			size_lerp.active = true
			size_lerp.from = target.r
			size_lerp.start_ms = now_ms
			size_lerp.to = base_radius * size_steps[index]
			state.mode.tracking.next_change_size_ms = now_ms + constants.mode.tracking.size_change_interval_ms
		}
		const theta = to_rad(
			state.mode.tracking.move.direction * 30 - 90
		)
		const cd = target.r - target.cr
		target.cx = target.x + cd * cos(theta)
		target.cy = target.y + cd * sin(theta)
	} else {
		const base_radius_rad = px_to_rad(base_radius)
		const speed = target_3d.r * state.mode.tracking.move.speed * state.mode.tracking.move.direction
		target_3d.y += speed * dt
		if (speed_lerp.active) {
			const p = clamp(
				0,
				(now_ms - speed_lerp.start_ms) / speed_lerp_ms,
				1
			)
			if (p == 1) {
				speed_lerp.active = false
				state.mode.tracking.move.speed = speed_lerp.to
			} else {
				state.mode.tracking.move.speed = lerp(speed_lerp.from, speed_lerp.to, p)
			}
		} else if (now_ms >= state.mode.tracking.next_change_move_ms) {
			if (random() < (state.mode.tracking.move.direction_change_rate += .2)) {
				state.mode.tracking.move.direction *= -1
				state.mode.tracking.move.direction_change_rate = 0
			}
			const index = (random() * speed_steps.length) | 0
			speed_lerp.active = true
			speed_lerp.from = state.mode.tracking.move.speed
			speed_lerp.start_ms = now_ms
			speed_lerp.to = base_speed * speed_steps[index]
			state.mode.tracking.next_change_move_ms = now_ms + constants.mode.tracking.move_change_interval_ms
		}
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
			target_3d.cp = target_3d.p + target_3d.r - target_3d.cr
		} else if (now_ms >= state.mode.tracking.next_change_size_ms) {
			const index = (random() * size_steps.length) | 0
			size_lerp.active = true
			size_lerp.from = target_3d.r
			size_lerp.start_ms = now_ms
			size_lerp.to = px_to_rad(
				base_radius * size_steps[index]
			)
			state.mode.tracking.next_change_size_ms = now_ms + constants.mode.tracking.size_change_interval_ms
		}
		const theta = to_rad(
			state.mode.tracking.move.direction * 30 - 90
		)
		const alpha = target_3d.r - target_3d.cr
		target_3d.cp = target_3d.p - alpha * sin(theta)
		target_3d.cy = target_3d.y + alpha * cos(theta)
	}
	shoot()
}
function shoot() {
	const { impact_interval_s } = constants.mode.tracking
	const { impacts, impacts_3d } = state
	const { dimension, pitch, x, y, yaw } = state.camera
	const { next_impact_s, target, target_3d } = state.mode.tracking
	const { shoots } = state.stats
	const { now_ms, now_s, prev_ms } = state.timer
	let is_hit = false
	let is_crit = false
	if (dimension == "2d") {
		const { cr, cy, r, x: target_x, y: target_y } = target
		const dx = target_x - x
		is_hit = dx ** 2 + (target_y - y) ** 2 <= r * r
		is_crit = dx ** 2 + (cy - y) ** 2 <= cr * cr
		if (is_hit && now_s >= next_impact_s) {
			if (is_crit) {
				play_crit()
			} else {
				play_hit()
			}
			impacts.push(
				{ c: is_crit, r, t: now_s, x: x, y: y }
			)
			state.mode.tracking.next_impact_s = now_s + impact_interval_s
		}
	} else {
		const { cp, cr, cy, p, r, y: target_y } = target_3d
		const d_cam = dir_from_yaw_pitch(yaw, pitch)
		const d_body = dir_from_yaw_pitch(target_y, p)
		const d_core = dir_from_yaw_pitch(cy, cp)
		is_hit = dot(d_cam, d_body) >= cos(r)
		is_crit = dot(d_cam, d_core) >= cos(cr)
		if (is_hit && now_s >= next_impact_s) {
			if (is_crit) {
				play_crit()
			} else {
				play_hit()
			}
			impacts_3d.push(
				{
					c: is_crit,
					p: pitch,
					r,
					t: now_s,
					y: yaw
				}
			)
			state.mode.tracking.next_impact_s = now_s + impact_interval_s
		}
	}
	shoots.push(
		{
			c: is_crit,
			e: now_ms,
			h: is_hit,
			s: prev_ms
		}
	)
	state.stats.sum_shoot_ms += now_ms - prev_ms
	if (is_hit) {
		state.stats.sum_hit_ms += now_ms - prev_ms
		if (is_crit) {
			state.stats.sum_crit_ms += now_ms - prev_ms
		}
	}
}
/** @returns {void} */
function update_fov() {
	const { dimension } = state.camera
	const { sens } = state.game
	const { target, target_3d } = state.mode.tracking
	const { active } = state.mode.tracking.size_lerp
	if (sens == "lol" && dimension == "3d") {
		camera_to_2d()
		state.mode.tracking.target = target_to_2d(target_3d)
		if (active) {
			state.mode.tracking.size_lerp.from = rad_to_px(
				state.mode.tracking.size_lerp.from
			)
			state.mode.tracking.size_lerp.to = rad_to_px(
				state.mode.tracking.size_lerp.to
			)
		}
	} else if (sens != "lol" && dimension == "2d") {
		camera_to_3d()
		state.mode.tracking.target_3d = target_to_3d(target)
		if (active) {
			state.mode.tracking.size_lerp.from = px_to_rad(
				state.mode.tracking.size_lerp.from
			)
			state.mode.tracking.size_lerp.to = px_to_rad(
				state.mode.tracking.size_lerp.to
			)
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
	const score = (sum_crit_ms + sum_hit_ms) | 0
	if (score > state.mode.tracking.peak_score) {
		state.mode.tracking.peak_score = score
		if (score > state.mode.tracking.best_score) {
			state.mode.tracking.best_score = score
			localStorage.setItem(
				"tracking.best_score",
				String(score)
			)
			set_text_if_changed(
				tracking_score_el,
				state.mode.tracking.best_score = score
			)
		}
	}
	set_text_if_changed(
		peak_score_el,
		`${score} / ${state.mode.tracking.peak_score}`
	)
	set_text_if_changed(
		accuracy_el,
		sum_shoot_ms
			? round_to(
				sum_hit_ms / sum_shoot_ms * 100,
				2
			)
			: 0
	)
	set_text_if_changed(
		crit_rate_el,
		sum_hit_ms
			? round_to(
				sum_crit_ms / sum_hit_ms * 100,
				2
			)
			: 0
	)
}
/** @type {GameMode} */
export default {
	check_stats,
	dispose,
	init,
	on_frame,
	shoot,
	update_fov,
	update_hud
}