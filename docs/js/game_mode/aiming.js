import {
	camera_to_2d,
	camera_to_3d,
	px_to_rad,
	target_to_2d,
	target_to_3d
} from "../camera.js"
import constants from "../constants.js"
import { send_toast, set_text_if_changed } from "../controller/index.js"
import {
	accuracy_el,
	aiming_score_el,
	crit_rate_el,
	peak_score_el
} from "../document.js"
import { check_stats, dir_from_yaw_pitch } from "../logic.js"
import mat4 from "../mat4.js"
import {
	abs,
	atan,
	calc_core_radius,
	clamp,
	convert_deg_across_aspect,
	cos,
	dot,
	max,
	min,
	random,
	round,
	round_to,
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
import game_mode from "./index.js"
/** @returns {void} */
function _change_to_next_mode() {
	const { mode } = state.game
	if (!mode) {
		throw Error()
	}
	const { peak_score } = state.mode[mode]
	/** @type {GameModeName} */
	const next_mode = "flick"
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
	state.stats.count_crit = 0
	state.stats.count_hit = 0
	state.stats.count_shoot = 0
	state.game.mode = null
	state.input.mb_left = false
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
	peak_score_el.removeAttribute("value")
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	const { base_radius } = constants.target
	const { cycle_timeout: cycle_id, sens } = state.game
	const { target, target_3d } = state.mode.aiming
	state.camera.dimension = sens == "lol" ? "2d" : "3d"
	state.mode.aiming.peak_score = 0
	if (state.camera.dimension == "2d") {
		const r = base_radius
		target.cr = calc_core_radius(r, r)
		target.cx = 0
		target.cy = target.cr - r
		target.r = r
		target.x = 0
		target.y = 0
	} else {
		const r = px_to_rad(base_radius)
		const cr = calc_core_radius(r, r)
		target_3d.cp = atan(max(0, tan(r) - tan(cr)))
		target_3d.cr = cr
		target_3d.cy = 0
		target_3d.p = 0
		target_3d.r = r
		target_3d.y = 0
	}
	if (cycle_id) {
		state.game.cycle_timeout = setTimeout(_change_to_next_mode, 50_000)
	}
}
/** @returns {void} */
function on_frame() {
	const { required_dwell_ms } = constants.mode.aiming
	const { base_radius } = constants.target
	const { base_speed } = constants.mode.aiming
	const { dimension, fov, pitch, width, x, y, yaw } = state.camera
	const {
		aim_dwell_ms,
		direction,
		target,
		target_3d
	} = state.mode.aiming
	const { now_ms, prev_ms } = state.timer
	const dt = now_ms - prev_ms
	if (dimension == "2d") {
		target.r = abs(x - target.x) / (width / 4) * base_radius * 4 + base_radius * 2
		target.cr = calc_core_radius(target.r, base_radius)
		const speed = target.r * base_speed * direction
		target.cx = target.x = clamp(
			x - width / 2,
			target.cx + speed * dt,
			x + width / 2
		)
		target.cy = target.y - target.r + target.cr
		const { cr, cy, r, x: target_x, y: target_y } = target
		const dx = target_x - x
		if (dx ** 2 + (target_y - y) ** 2 <= r * r) {
			state.mode.aiming.aim_dwell_ms = min(
				required_dwell_ms,
				aim_dwell_ms + dt
			)
			if (dx ** 2 + (cy - y) ** 2 <= cr * cr) {
				return
			}
		} else {
			state.mode.aiming.aim_dwell_ms = max(0, aim_dwell_ms - dt)
		}
		state.mode.aiming.direction = x < target_x ? 1 : -1
	} else {
		const base_radius_rad = px_to_rad(base_radius)
		const fov_rad = to_rad(fov)
		target_3d.r = abs(yaw - target_3d.y) / (fov_rad / 4) * base_radius_rad * 4 + base_radius_rad * 2
		target_3d.cr = calc_core_radius(target_3d.r, base_radius_rad)
		const speed = target_3d.r * base_speed * direction
		target_3d.cy = target_3d.y = clamp(
			yaw - fov_rad / 2,
			target_3d.y + speed * dt,
			yaw + fov_rad / 2
		)
		target_3d.cp = target_3d.p + target_3d.r - target_3d.cr
		const { cp, cr, cy, p, r, y: target_y } = target_3d
		const d_cam = dir_from_yaw_pitch(yaw, pitch)
		const d_body = dir_from_yaw_pitch(target_y, p)
		const d_core = dir_from_yaw_pitch(cy, cp)
		if (dot(d_cam, d_body) >= cos(r)) {
			state.mode.aiming.aim_dwell_ms = min(
				required_dwell_ms,
				aim_dwell_ms + dt
			)
			if (dot(d_cam, d_core) >= cos(cr)) {
				return
			}
		} else {
			state.mode.aiming.aim_dwell_ms = max(0, aim_dwell_ms - dt)
		}
		state.mode.aiming.direction = yaw < target_y ? 1 : -1
	}
}
/** @returns {void} */
function render() {
	const { required_dwell_ms } = constants.mode.aiming
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
	const { aim_dwell_ms, target, target_3d } = state.mode.aiming
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
		draw_target(
			target,
			aim_dwell_ms >= required_dwell_ms ? 1 : .5
		)
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
		draw_target_3d(
			target_3d,
			aim_dwell_ms >= required_dwell_ms ? 1 : .5
		)
		draw_impacts_3d()
		render_to_2d()
	}
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { required_dwell_ms } = constants.mode.aiming
	const { impacts, impacts_3d } = state
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
	const { aim_dwell_ms, target, target_3d } = state.mode.aiming
	const { shoots } = state.stats
	const { now_ms, now_s, prev_ms } = state.timer
	let is_hit = false
	let is_crit = false
	if (aim_dwell_ms >= required_dwell_ms) {
		if (dimension == "2d") {
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
					{ c: is_crit, r, t: now_s, x: x, y: y }
				)
				const tx = width / 4 * (random() < .5 ? -1 : 1)
				const ty = height / 2 * (random() - .5)
				target.cx += tx
				target.cy = ty - r + cr
				target.x += tx
				target.y = ty
			}
		} else {
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
						r,
						t: now_s,
						y: yaw
					}
				)
				const tp = to_rad(
					convert_deg_across_aspect(fov, width, height)
				) / 2 * (random() - .5)
				const ty = to_rad(fov / 4) * (random() < .5 ? -1 : 1)
				target_3d.cp = tp + r - cr
				target_3d.cy += ty
				target_3d.p = tp
				target_3d.y += ty
			}
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
	state.stats.count_shoot++
	if (is_hit) {
		state.stats.count_hit++
		if (is_crit) {
			state.stats.count_crit++
		}
	}
}
/** @returns {void} */
function update_fov() {
	const { dimension } = state.camera
	const { sens } = state.game
	const { mb_right } = state.input
	const { target, target_3d } = state.mode.aiming
	if (sens == "lol" && !mb_right && dimension == "3d") {
		camera_to_2d()
		state.mode.aiming.target = target_to_2d(target_3d)
	} else if ((sens != "lol" || mb_right) && dimension == "2d") {
		camera_to_3d()
		state.mode.aiming.target_3d = target_to_3d(target)
	}
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const { score_mul } = constants.mode.aiming
	const { count_crit, count_hit, count_shoot } = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const score = (score_mul * count_crit + score_mul * count_hit * (count_hit / count_shoot)) | 0
	if (score > state.mode.aiming.peak_score) {
		state.mode.aiming.peak_score = score
		if (score > state.mode.aiming.best_score) {
			localStorage.setItem(
				"aiming.best_score",
				String(score)
			)
			set_text_if_changed(
				aiming_score_el,
				state.mode.aiming.best_score = score
			)
		}
	}
	peak_score_el.setAttribute(
		"value",
		`${score} / ${state.mode.aiming.peak_score}`
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