import {
	camera_to_2d,
	camera_to_3d,
	px_to_rad,
	rad_to_px,
	target_to_2d,
	target_to_3d
} from "../camera.js"
import constants from "../constants.js"
import { set_text_if_changed } from "../controller/index.js"
import {
	accuracy_el,
	crit_rate_el,
	peak_score_el,
	v_tracking_score_el
} from "../document.js"
import mat4 from "../mat4.js"
import {
	atan,
	calc_core_radius,
	clamp,
	convert_deg_across_aspect,
	cos,
	dir_from_yaw_pitch,
	dot,
	lerp,
	max,
	random,
	round,
	round_to,
	sin,
	tan,
	to_rad
} from "../math.js"
import {
	context_2d,
	draw_crosshair,
	draw_grid,
	draw_impacts,
	draw_target
} from "../renderer.js"
import {
	build_stroke_vbo,
	context_3d,
	draw_grid_3d,
	draw_impacts_3d,
	draw_stroke,
	draw_target_3d,
	render_to_2d
} from "../renderer3d.js"
import { play_crit, play_hit } from "../sfx.js"
import state from "../state.js"
/** @returns {void} */
function check_stats() {
	const { shoots } = state.stats
	const { now_ms } = state.timer
	const window_ms = now_ms - constants.stats.window_ms
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
function dispose() {
	const { impacts, impacts_3d } = state
	const { dimension } = state.camera
	const { shoots } = state.stats
	state.game.mode = null
	state.input.mb_left = false
	state.stats.count_crit = 0
	state.stats.count_hit = 0
	state.stats.count_shoot = 0
	state.stats.sum_crit_ms = 0
	state.stats.sum_hit_ms = 0
	state.stats.sum_shoot_ms = 0
	shoots.clear()
	if (dimension == "2d") {
		state.camera.x = 0
		state.camera.y = 0
		state.camera.yaw = 0
		impacts.clear()
	} else {
		state.camera.pitch = 0
		state.camera.yaw = 0
		impacts_3d.clear()
	}
	state.mode.v_tracking.size_lerp.active = false
	state.mode.v_tracking.speed_lerp.active = false
	peak_score_el.removeAttribute("value")
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	const { base_radius: r } = constants.target
	const { base_speed } = constants.mode.v_tracking
	const {
		move_change_interval_ms,
		size_change_interval_ms
	} = constants.mode.v_tracking
	const { sens } = state.game
	const { target, target_3d } = state.mode.v_tracking
	const { now_ms } = state.timer
	state.camera.dimension = sens == "lol" ? "2d" : "3d"
	state.mode.v_tracking.next_change_size_ms = now_ms + size_change_interval_ms
	state.mode.v_tracking.next_change_move_ms = now_ms + move_change_interval_ms
	state.mode.v_tracking.next_change_v_move_ms = now_ms + move_change_interval_ms
	state.mode.v_tracking.next_impact_s = 0
	state.mode.v_tracking.move.direction = 1
	state.mode.v_tracking.move.direction_change_rate = 0
	state.mode.v_tracking.move.speed = base_speed
	state.mode.v_tracking.v_move.direction = 1
	state.mode.v_tracking.v_move.direction_change_rate = 0
	state.mode.v_tracking.v_move.speed = base_speed
	state.mode.v_tracking.peak_score = 0
	if (state.camera.dimension == "2d") {
		target.cr = calc_core_radius(r)
		target.cx = 0
		target.cy = target.cr - r
		target.r = r
		target.x = 0
		target.y = 0
	} else {
		const rr = px_to_rad(r)
		const cr = calc_core_radius(rr)
		target_3d.cp = atan(max(0, tan(rr) - tan(cr)))
		target_3d.cr = cr
		target_3d.cy = 0
		target_3d.p = 0
		target_3d.r = rr
		target_3d.y = 0
	}
}
/** @returns {void} */
function on_frame() {
	const { base_radius } = constants.target
	const {
		base_speed,
		pitch_limit,
		size_lerp_ms,
		size_steps,
		speed_lerp_ms,
		speed_steps,
		v_speed_steps
	} = constants.mode.v_tracking
	const { dimension } = state.camera
	const { now_ms, prev_ms } = state.timer
	const { mb_left } = state.input
	const {
		size_lerp,
		speed_lerp,
		target,
		target_3d,
		v_speed_lerp
	} = state.mode.v_tracking
	if (!mb_left) {
		return
	}
	const dt = now_ms - prev_ms
	if (dimension == "2d") {
		const speed = target.r * state.mode.v_tracking.move.speed
		const v_speed = target.r * state.mode.v_tracking.v_move.speed
		target.x += speed * dt
		target.y += v_speed * dt
		const range_px = rad_to_px(to_rad(pitch_limit))
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
		} else if (now_ms >= state.mode.v_tracking.next_change_size_ms) {
			const index = (random() * size_steps.length) | 0
			size_lerp.active = true
			size_lerp.from = target.r
			size_lerp.start_ms = now_ms
			size_lerp.to = base_radius * size_steps[index]
			state.mode.v_tracking.next_change_size_ms = now_ms + constants.mode.v_tracking.size_change_interval_ms
		}
		if (speed_lerp.active) {
			const p = clamp(
				0,
				(now_ms - speed_lerp.start_ms) / speed_lerp_ms,
				1
			)
			if (p == 1) {
				speed_lerp.active = false
				state.mode.v_tracking.move.speed = speed_lerp.to
			} else {
				state.mode.v_tracking.move.speed = lerp(speed_lerp.from, speed_lerp.to, p)
			}
		} else if (now_ms >= state.mode.v_tracking.next_change_move_ms) {
			if (random() < (state.mode.v_tracking.move.direction_change_rate += .2)) {
				state.mode.v_tracking.move.direction *= -1
				state.mode.v_tracking.move.direction_change_rate = 0
			}
			const index = (random() * speed_steps.length) | 0
			speed_lerp.active = true
			speed_lerp.from = state.mode.v_tracking.move.speed
			speed_lerp.start_ms = now_ms
			speed_lerp.to = base_speed * speed_steps[index] * state.mode.v_tracking.move.direction
			state.mode.v_tracking.next_change_move_ms = now_ms + constants.mode.v_tracking.move_change_interval_ms
		}
		if (v_speed_lerp.active) {
			const p = clamp(
				0,
				(now_ms - v_speed_lerp.start_ms) / speed_lerp_ms,
				1
			)
			if (p == 1) {
				v_speed_lerp.active = false
				state.mode.v_tracking.v_move.speed = v_speed_lerp.to
			} else {
				state.mode.v_tracking.v_move.speed = lerp(
					v_speed_lerp.from,
					v_speed_lerp.to,
					p
				)
			}
		} else if (
			target.y >= range_px && state.mode.v_tracking.v_move.direction > 0
			|| target.y <= -range_px && state.mode.v_tracking.v_move.direction < 0
		) {
			state.mode.v_tracking.v_move.direction *= -1
			state.mode.v_tracking.v_move.direction_change_rate = 0
			v_speed_lerp.active = true
			v_speed_lerp.from = state.mode.v_tracking.v_move.speed
			v_speed_lerp.start_ms = now_ms
			v_speed_lerp.to = -state.mode.v_tracking.v_move.speed
			state.mode.v_tracking.next_change_v_move_ms = now_ms + constants.mode.v_tracking.move_change_interval_ms
		} else if (now_ms >= state.mode.v_tracking.next_change_v_move_ms) {
			if (random() < (state.mode.v_tracking.v_move.direction_change_rate += .2)) {
				state.mode.v_tracking.v_move.direction *= -1
				state.mode.v_tracking.v_move.direction_change_rate = 0
			}
			const index = (random() * v_speed_steps.length) | 0
			v_speed_lerp.active = true
			v_speed_lerp.from = state.mode.v_tracking.v_move.speed
			v_speed_lerp.start_ms = now_ms
			v_speed_lerp.to = base_speed * v_speed_steps[index] * state.mode.v_tracking.v_move.direction
			state.mode.v_tracking.next_change_v_move_ms = now_ms + constants.mode.v_tracking.move_change_interval_ms
		}
		const theta = to_rad(
			state.mode.v_tracking.move.direction * 30 - 90
		)
		const cd = target.r - target.cr
		target.cx = target.x + cd * cos(theta)
		target.cy = target.y + cd * sin(theta)
	} else {
		const base_radius_rad = px_to_rad(base_radius)
		const speed = target_3d.r * state.mode.v_tracking.move.speed
		const v_speed = target_3d.r * state.mode.v_tracking.v_move.speed
		target_3d.y += speed * dt
		target_3d.p += v_speed * dt
		const range_rad = to_rad(pitch_limit)
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
		} else if (now_ms >= state.mode.v_tracking.next_change_size_ms) {
			const index = (random() * size_steps.length) | 0
			size_lerp.active = true
			size_lerp.from = target_3d.r
			size_lerp.start_ms = now_ms
			size_lerp.to = px_to_rad(
				base_radius * size_steps[index]
			)
			state.mode.v_tracking.next_change_size_ms = now_ms + constants.mode.v_tracking.size_change_interval_ms
		}
		if (speed_lerp.active) {
			const p = clamp(
				0,
				(now_ms - speed_lerp.start_ms) / speed_lerp_ms,
				1
			)
			if (p == 1) {
				speed_lerp.active = false
				state.mode.v_tracking.move.speed = speed_lerp.to
			} else {
				state.mode.v_tracking.move.speed = lerp(speed_lerp.from, speed_lerp.to, p)
			}
		} else if (now_ms >= state.mode.v_tracking.next_change_move_ms) {
			if (random() < (state.mode.v_tracking.move.direction_change_rate += .2)) {
				state.mode.v_tracking.move.direction *= -1
				state.mode.v_tracking.move.direction_change_rate = 0
			}
			const index = (random() * speed_steps.length) | 0
			speed_lerp.active = true
			speed_lerp.from = state.mode.v_tracking.move.speed
			speed_lerp.start_ms = now_ms
			speed_lerp.to = base_speed * speed_steps[index] * state.mode.v_tracking.move.direction
			state.mode.v_tracking.next_change_move_ms = now_ms + constants.mode.v_tracking.move_change_interval_ms
		}
		if (v_speed_lerp.active) {
			const p = clamp(
				0,
				(now_ms - v_speed_lerp.start_ms) / speed_lerp_ms,
				1
			)
			if (p == 1) {
				v_speed_lerp.active = false
				state.mode.v_tracking.v_move.speed = v_speed_lerp.to
			} else {
				state.mode.v_tracking.v_move.speed = lerp(
					v_speed_lerp.from,
					v_speed_lerp.to,
					p
				)
			}
		} else if (
			target_3d.p >= range_rad && state.mode.v_tracking.v_move.direction > 0
			|| target_3d.p <= -range_rad && state.mode.v_tracking.v_move.direction < 0
		) {
			state.mode.v_tracking.v_move.direction *= -1
			state.mode.v_tracking.v_move.direction_change_rate = 0
			v_speed_lerp.active = true
			v_speed_lerp.from = state.mode.v_tracking.v_move.speed
			v_speed_lerp.start_ms = now_ms
			v_speed_lerp.to = -state.mode.v_tracking.v_move.speed
			state.mode.v_tracking.next_change_v_move_ms = now_ms + constants.mode.v_tracking.move_change_interval_ms
		} else if (now_ms >= state.mode.v_tracking.next_change_v_move_ms) {
			if (random() < (state.mode.v_tracking.v_move.direction_change_rate += .2)) {
				state.mode.v_tracking.v_move.direction *= -1
				state.mode.v_tracking.v_move.direction_change_rate = 0
			}
			const index = (random() * v_speed_steps.length) | 0
			v_speed_lerp.active = true
			v_speed_lerp.from = state.mode.v_tracking.v_move.speed
			v_speed_lerp.start_ms = now_ms
			v_speed_lerp.to = base_speed * v_speed_steps[index] * state.mode.v_tracking.v_move.direction
			state.mode.v_tracking.next_change_v_move_ms = now_ms + constants.mode.v_tracking.move_change_interval_ms
		}
		const theta = to_rad(
			state.mode.v_tracking.move.direction * 30 - 90
		)
		const alpha = target_3d.r - target_3d.cr
		target_3d.cp = target_3d.p - alpha * sin(theta)
		target_3d.cy = target_3d.y + alpha * cos(theta)
	}
	shoot()
}
/** @returns {void} */
function render() {
	const { sky_sphere_radius: d } = constants.grid
	const {
		dimension,
		fov,
		height,
		pitch,
		width,
		x,
		y,
		yaw
	} = state.camera
	const { target, target_3d } = state.mode.v_tracking
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	if (dimension == "2d") {
		draw_grid()
		context_2d.save()
		context_2d.translate(-x, -y)
		context_2d.globalAlpha = .2
		context_2d.lineWidth = 2
		context_2d.strokeStyle = "white"
		context_2d.beginPath()
		context_2d.moveTo(x, y)
		context_2d.lineTo(target.x, target.cy)
		context_2d.stroke()
		context_2d.restore()
		draw_target(target, 1)
		draw_impacts()
	} else {
		const aspect = width / height
		const vfov_deg = convert_deg_across_aspect(fov, width, height)
		context_3d.clear(context_3d.COLOR_BUFFER_BIT)
		state.camera.proj = mat4.perspective(vfov_deg, aspect, .1, 2_000)
		state.camera.view = mat4.view(yaw, pitch)
		draw_grid_3d()
		/** @type {number[]} */
		const segments = []
		const cam_dir = dir_from_yaw_pitch(
			state.camera.yaw,
			state.camera.pitch
		)
		const prev = [
			cam_dir[0] * d,
			cam_dir[1] * d,
			cam_dir[2] * d
		]
		const dir = dir_from_yaw_pitch(target_3d.cy, target_3d.cp)
		const pos = [ dir[0] * d, dir[1] * d, dir[2] * d ]
		segments.push(
			prev[0],
			prev[1],
			prev[2],
			pos[0],
			pos[1],
			pos[2]
		)
		if (segments.length === 0) {
			return
		}
		const vbo_info = build_stroke_vbo(
			new Float32Array(segments),
			context_3d.DYNAMIC_DRAW
		)
		draw_stroke([ 1, 1, 1, .2 ], 2, vbo_info)
		context_3d.deleteBuffer(vbo_info.vbo)
		draw_target_3d(target_3d, 1)
		draw_impacts_3d()
		render_to_2d()
	}
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { impact_interval_s } = constants.mode.v_tracking
	const { impacts, impacts_3d } = state
	const { dimension, pitch, x, y, yaw } = state.camera
	const { next_impact_s, target, target_3d } = state.mode.v_tracking
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
			state.mode.v_tracking.next_impact_s = now_s + impact_interval_s
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
			state.mode.v_tracking.next_impact_s = now_s + impact_interval_s
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
	const { mb_right } = state.input
	const { target, target_3d } = state.mode.v_tracking
	const { active } = state.mode.v_tracking.size_lerp
	if (sens == "lol" && !mb_right && dimension == "3d") {
		camera_to_2d()
		state.mode.v_tracking.target = target_to_2d(target_3d)
		if (active) {
			state.mode.v_tracking.size_lerp.from = rad_to_px(
				state.mode.v_tracking.size_lerp.from
			)
			state.mode.v_tracking.size_lerp.to = rad_to_px(
				state.mode.v_tracking.size_lerp.to
			)
		}
	} else if ((sens != "lol" || mb_right) && dimension == "2d") {
		camera_to_3d()
		state.mode.v_tracking.target_3d = target_to_3d(target)
		if (active) {
			state.mode.v_tracking.size_lerp.from = px_to_rad(
				state.mode.v_tracking.size_lerp.from
			)
			state.mode.v_tracking.size_lerp.to = px_to_rad(
				state.mode.v_tracking.size_lerp.to
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
	if (score > state.mode.v_tracking.peak_score) {
		state.mode.v_tracking.peak_score = score
		if (score > state.mode.v_tracking.best_score) {
			state.mode.v_tracking.best_score = score
			localStorage.setItem(
				"v_tracking.best_score",
				String(score)
			)
			set_text_if_changed(
				v_tracking_score_el,
				state.mode.v_tracking.best_score = score
			)
		}
	}
	peak_score_el.setAttribute(
		"value",
		`${score} / ${state.mode.v_tracking.peak_score}`
	)
	accuracy_el.setAttribute(
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
	crit_rate_el.setAttribute(
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
	dispose,
	init,
	on_frame,
	render,
	shoot,
	update_fov,
	update_hud
}