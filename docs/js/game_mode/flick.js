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
	flick_score_el,
	peak_score_el
} from "../document.js"
import mat4 from "../mat4.js"
import {
	acos,
	calc_core_radius,
	clamp,
	convert_deg_across_aspect,
	cos,
	dir_from_yaw_pitch,
	dot,
	PI,
	random,
	round,
	round_to,
	sin,
	TAU,
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
	shoots.clear()
	if (dimension == "2d") {
		state.camera.x = 0
		state.camera.y = 0
		state.camera.yaw = 0
		state.mode.flick.targets.length = 0
		impacts.clear()
	} else {
		state.camera.pitch = 0
		state.camera.yaw = 0
		state.mode.flick.targets_3d.length = 0
		impacts_3d.clear()
	}
	peak_score_el.removeAttribute("value")
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	const { sens } = state.game
	state.camera.dimension = sens == "lol" ? "2d" : "3d"
	state.mode.flick.peak_score = 0
}
/** @returns {void} */
function on_frame() {
	const {
		first_dist_mul,
		num_targets,
		pitch_limit
	} = constants.mode.flick
	const { base_radius } = constants.target
	const { dimension, pitch, x, y, yaw } = state.camera
	const { targets, targets_3d } = state.mode.flick
	if (dimension == "2d") {
		if (!targets.length) {
			const range_px = rad_to_px(to_rad(pitch_limit))
			const base_d = constants.mode.flick.first_dist_mul * base_radius
			const r = base_radius * 1.5
			const cr = calc_core_radius(r, base_radius)
			let cx = x
			let cy = y
			let i = 1
			while (i <= num_targets) {
				const dist = base_d * i
				let theta
				if (y + dist >= range_px) {
					const t = clamp((range_px - y) / dist, -1, 1)
					const cap = 2 * acos(t)
					theta = random() * (TAU - cap)
					if (theta > PI * .5 - cap / 2) {
						theta += cap
					}
				} else if (y - dist <= -range_px) {
					const t = clamp((-range_px - y) / dist, -1, 1)
					const cap = 2 * acos(t)
					theta = random() * (TAU - cap)
					if (theta > PI * 1.5 - cap / 2) {
						theta += cap
					}
				} else {
					theta = random() * TAU
				}
				cx += cos(theta) * dist
				cy += sin(theta) * dist
				const ty = cy + r - cr
				targets[num_targets - i++] = { cr, cx, cy, r, x: cx, y: ty }
			}
		}
	} else if (!targets_3d.length) {
		const base_radius_rad = px_to_rad(base_radius)
		const range_rad = to_rad(pitch_limit)
		const base_d = first_dist_mul * base_radius_rad
		const r = base_radius_rad * 1.5
		const cr = calc_core_radius(r, base_radius_rad)
		let cp = pitch
		let cy = yaw
		let i = 1
		while (i <= num_targets) {
			const dist = base_d * i
			let theta
			if (cp + dist >= range_rad) {
				const t = clamp((range_rad - cp) / dist, -1, 1)
				const cap = 2 * acos(t)
				theta = random() * (TAU - cap)
				if (theta > PI * .5 - cap / 2) {
					theta += cap
				}
			} else if (cp - dist <= -range_rad) {
				const t = clamp((-range_rad - cp) / dist, -1, 1)
				const cap = 2 * acos(t)
				theta = random() * (TAU - cap)
				if (theta > PI * 1.5 - cap / 2) {
					theta += cap
				}
			} else {
				theta = random() * TAU
			}
			cy += cos(theta) * dist
			cp += sin(theta) * dist
			const p = cp - r + cr
			targets_3d[num_targets - i++] = { cp, cr, cy, p, r, y: cy }
		}
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
	const { targets, targets_3d } = state.mode.flick
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	if (dimension == "2d") {
		draw_grid()
		if (targets.length) {
			context_2d.save()
			context_2d.translate(-x, -y)
			context_2d.globalAlpha = .2
			context_2d.lineWidth = 2
			context_2d.strokeStyle = "white"
			context_2d.beginPath()
			context_2d.moveTo(x, y)
			for (let i = targets.length - 1; i >= 0; i--) {
				const t = targets[i]
				context_2d.lineTo(t.x, t.cy)
			}
			context_2d.stroke()
			context_2d.restore()
			for (let i = 0; i + 1 < targets.length; i++) {
				draw_target(
					{
						...targets[i],
						cr: 0,
						r: targets[i].r * 2
					},
					1 / 2 ** (targets.length - i - 1)
				)
			}
			const t = targets[targets.length - 1]
			const dx = t.x - x
			if (dx ** 2 + (t.y - y) ** 2 <= (t.r * 2) * (t.r * 2)) {
				draw_target(t, 1)
			} else {
				draw_target({ ...t, cr: 0, r: t.r * 2 }, 1)
			}
		}
		draw_impacts()
	} else {
		const aspect = width / height
		const vfov_deg = convert_deg_across_aspect(fov, width, height)
		context_3d.clear(context_3d.COLOR_BUFFER_BIT)
		state.camera.proj = mat4.perspective(vfov_deg, aspect, .1, 2_000)
		state.camera.view = mat4.view(yaw, pitch)
		draw_grid_3d()
		if (targets_3d.length) {
			/** @type {number[]} */
			const segments = []
			const cam_dir = dir_from_yaw_pitch(
				state.camera.yaw,
				state.camera.pitch
			)
			let prev = [
				cam_dir[0] * d,
				cam_dir[1] * d,
				cam_dir[2] * d
			]
			for (let i = targets_3d.length - 1; i >= 0; i--) {
				const t = targets_3d[i]
				const dir = dir_from_yaw_pitch(t.y, t.cp)
				const pos = [ dir[0] * d, dir[1] * d, dir[2] * d ]
				segments.push(
					prev[0],
					prev[1],
					prev[2],
					pos[0],
					pos[1],
					pos[2]
				)
				prev = pos
			}
			const vbo_info = build_stroke_vbo(
				new Float32Array(segments),
				context_3d.DYNAMIC_DRAW
			)
			draw_stroke([ 1, 1, 1, .2 ], 2, vbo_info)
			context_3d.deleteBuffer(vbo_info.vbo)
			for (let i = 0; i + 1 < targets_3d.length; i++) {
				draw_target_3d(
					{
						...targets_3d[i],
						cr: 0,
						r: targets_3d[i].r * 2
					},
					1 / 2 ** (targets_3d.length - i - 1)
				)
			}
			const t = targets_3d[targets_3d.length - 1]
			const d_cam = dir_from_yaw_pitch(yaw, pitch)
			const d_body = dir_from_yaw_pitch(t.y, t.p)
			if (dot(d_cam, d_body) >= cos(t.r * 2)) {
				draw_target_3d(t, 1)
			} else {
				draw_target_3d({ ...t, cr: 0, r: t.r * 2 }, 1)
			}
		}
		draw_impacts_3d()
		render_to_2d()
	}
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { impacts, impacts_3d } = state
	const { dimension, pitch, x, y, yaw } = state.camera
	const { targets, targets_3d } = state.mode.flick
	const { shoots } = state.stats
	const { now_ms, now_s, prev_ms } = state.timer
	let is_hit = false
	let is_crit = false
	if (dimension == "2d") {
		const { cr, cy, r, x: target_x, y: target_y } = targets[targets.length - 1]
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
			targets.length--
		}
	} else {
		const { cr, cp, p, r, y: target_y } = targets_3d[targets_3d.length - 1]
		const d_cam = dir_from_yaw_pitch(yaw, pitch)
		const d_body = dir_from_yaw_pitch(target_y, p)
		const d_core = dir_from_yaw_pitch(target_y, cp)
		const hit_body = dot(d_cam, d_body) >= cos(r)
		const hit_core = dot(d_cam, d_core) >= cos(cr)
		is_hit = hit_body
		is_crit = hit_core
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
			targets_3d.length--
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
	const { targets, targets_3d } = state.mode.flick
	if (sens == "lol" && !mb_right && dimension == "3d") {
		camera_to_2d()
		for (const t of targets_3d) {
			targets.push(target_to_2d(t))
		}
		state.mode.flick.targets_3d.length = 0
	} else if ((sens != "lol" || mb_right) && dimension == "2d") {
		camera_to_3d()
		for (const t of targets) {
			targets_3d.push(target_to_3d(t))
		}
		state.mode.flick.targets.length = 0
	}
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const { score_mul } = constants.mode.flick
	const { count_crit, count_hit, count_shoot } = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const score = (score_mul * (count_crit + count_hit) * (count_hit / count_shoot)) | 0
	if (score > state.mode.flick.peak_score) {
		state.mode.flick.peak_score = score
		if (score > state.mode.flick.best_score) {
			localStorage.setItem(
				"flick.best_score",
				String(score)
			)
			set_text_if_changed(
				flick_score_el,
				state.mode.flick.best_score = score
			)
		}
	}
	peak_score_el.setAttribute(
		"value",
		`${score} / ${state.mode.flick.peak_score}`
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