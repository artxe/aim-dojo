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
	timing_score_el
} from "../document.js"
import mat4 from "../mat4.js"
import {
	calc_core_radius,
	convert_deg_across_aspect,
	cos,
	dir_from_yaw_pitch,
	dot,
	random,
	round,
	round_to
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
import { play_crit, play_hit, play_miss } from "../sfx.js"
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
	shoots.clear()
	if (dimension == "2d") {
		state.camera.x = 0
		state.camera.y = 0
		state.camera.yaw = 0
		state.mode.timing.target = null
		impacts.clear()
	} else {
		state.camera.pitch = 0
		state.camera.yaw = 0
		state.mode.timing.target_3d = null
		impacts_3d.clear()
	}
	peak_score_el.removeAttribute("value")
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	const { target_hide_duration_ms } = constants.mode.timing
	const { sens } = state.game
	const { now_ms } = state.timer
	state.camera.dimension = sens == "lol" ? "2d" : "3d"
	state.mode.timing.peak_score = 0
	state.mode.timing.next_hide_ms = 0
	state.mode.timing.next_show_ms = now_ms + target_hide_duration_ms / 2
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
	const {
		next_hide_ms,
		next_show_ms,
		speed,
		target,
		target_3d
	} = state.mode.timing
	const { shoots } = state.stats
	const { now_ms, prev_ms } = state.timer
	if (dimension == "2d") {
		if (target) {
			const dt = now_ms - prev_ms
			target.x += speed * dt
			target.cx += speed * dt
			if (next_hide_ms <= now_ms) {
				state.mode.timing.target = null
				state.mode.timing.next_show_ms = now_ms + target_hide_duration_ms
				shoots.push(
					{
						c: false,
						e: now_ms,
						h: false,
						s: prev_ms
					}
				)
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
			const tx = x + offset
			const ty = (random() - .5) * 2 * y_range_mul * base_radius
			state.mode.timing.speed = -sign * raw_speed
			state.mode.timing.target = {
				cr,
				cx: tx,
				cy: ty - r + cr,
				r,
				x: tx,
				y: ty
			}
			state.mode.timing.next_hide_ms = now_ms + target_show_duration_ms
		}
	} else if (target_3d) {
		const dt = now_ms - prev_ms
		target_3d.y += speed * dt
		target_3d.cy += speed * dt
		if (next_hide_ms <= now_ms) {
			state.mode.timing.target_3d = null
			state.mode.timing.next_show_ms = now_ms + target_hide_duration_ms
			shoots.push(
				{
					c: false,
					e: now_ms,
					h: false,
					s: prev_ms
				}
			)
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
		const ty = yaw + yaw_offset
		const tp = (random() - .5) * 2 * y_range_mul * base_radius_rad
		state.mode.timing.speed = -sign * raw_speed
		state.mode.timing.target_3d = {
			cp: tp + r - cr,
			cr,
			cy: ty,
			p: tp,
			r,
			y: ty
		}
		state.mode.timing.next_hide_ms = now_ms + target_show_duration_ms
	}
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
	const { target, target_3d } = state.mode.timing
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	if (dimension == "2d") {
		draw_grid()
		if (target) {
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
		}
		draw_impacts()
	} else {
		const aspect = width / height
		const vfov_deg = convert_deg_across_aspect(fov, width, height)
		context_3d.clear(context_3d.COLOR_BUFFER_BIT)
		state.camera.proj = mat4.perspective(vfov_deg, aspect, .1, 2_000)
		state.camera.view = mat4.view(yaw, pitch)
		draw_grid_3d()
		if (target_3d) {
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
		}
		draw_impacts_3d()
		render_to_2d()
	}
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { target_hide_duration_ms } = constants.mode.timing
	const { impacts, impacts_3d } = state
	const { dimension, pitch, x, y, yaw } = state.camera
	const { px_size, rad_size } = state.impact
	const { next_hide_ms, target, target_3d } = state.mode.timing
	const { shoots } = state.stats
	const { now_ms, now_s } = state.timer
	let is_hit = false
	let is_crit = false
	if (dimension == "2d") {
		if (target) {
			const { cr, cy, r, x: target_x, y: target_y } = target
			const dx = target_x - x
			is_hit = dx ** 2 + (target_y - y) ** 2 <= r * r
			is_crit = dx ** 2 + (cy - y) ** 2 <= cr * cr
			if (is_hit) {
				if (is_crit) {
					play_crit()
				} else {
					play_hit()
				}
				impacts.push(
					{ c: is_crit, r: px_size, t: now_s, x, y }
				)
			} else {
				play_miss()
				impacts.push({ r: px_size, t: now_s, x, y })
			}
			state.mode.timing.target = null
			state.mode.timing.next_show_ms = now_ms + target_hide_duration_ms
		}
	} else if (target_3d) {
		const { cp, cr, cy, p, r, y: target_y } = target_3d
		const d_cam = dir_from_yaw_pitch(yaw, pitch)
		const d_body = dir_from_yaw_pitch(target_y, p)
		const d_core = dir_from_yaw_pitch(cy, cp)
		is_hit = dot(d_cam, d_body) >= cos(r)
		is_crit = dot(d_cam, d_core) >= cos(cr)
		if (is_hit) {
			if (is_crit) {
				play_crit()
			} else {
				play_hit()
			}
			impacts_3d.push(
				{
					c: is_crit,
					p: pitch,
					r: rad_size,
					t: now_s,
					y: yaw
				}
			)
		} else {
			play_miss()
			impacts_3d.push(
				{
					p: pitch,
					r: rad_size,
					t: now_s,
					y: yaw
				}
			)
		}
		state.mode.timing.target_3d = null
		state.mode.timing.next_show_ms = now_ms + target_hide_duration_ms
	}
	shoots.push(
		{
			c: is_crit,
			e: next_hide_ms,
			h: is_hit,
			s: now_ms
		}
	)
	state.stats.count_shoot++
	if (is_hit) {
		state.stats.count_hit++
		state.stats.sum_hit_ms += next_hide_ms - now_ms
		if (is_crit) {
			state.stats.count_crit++
			state.stats.sum_crit_ms += next_hide_ms - now_ms
		}
	}
}
/** @returns {void} */
function update_fov() {
	const { dimension } = state.camera
	const { sens } = state.game
	const { mb_right } = state.input
	const { speed, target, target_3d } = state.mode.timing
	if (sens == "lol" && !mb_right && dimension == "3d") {
		camera_to_2d()
		if (target_3d) {
			state.mode.timing.speed = rad_to_px(speed)
			state.mode.timing.target = target_to_2d(target_3d)
			state.mode.timing.target_3d = null
		}
	} else if ((sens != "lol" || mb_right) && dimension == "2d") {
		camera_to_3d()
		if (target) {
			state.mode.timing.speed = px_to_rad(speed)
			state.mode.timing.target = null
			state.mode.timing.target_3d = target_to_3d(target)
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
	if (score > state.mode.timing.peak_score) {
		state.mode.timing.peak_score = score
		if (score > state.mode.timing.best_score) {
			localStorage.setItem(
				"timing.best_score",
				String(score)
			)
			set_text_if_changed(
				timing_score_el,
				state.mode.timing.best_score = score
			)
		}
	}
	peak_score_el.setAttribute(
		"value",
		`${score} / ${state.mode.timing.peak_score}`
	)
	accuracy_el.setAttribute(
		"value",
		`${(count_shoot ? round_to(count_hit / count_shoot * 100, 2) : 0)}%`
	)
	crit_rate_el.setAttribute(
		"value",
		`${(count_hit ? round_to(count_crit / count_hit * 100, 2) : 0)}%`
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