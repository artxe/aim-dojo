import {
	camera_to_2d,
	camera_to_3d,
	px_to_rad,
	target_to_2d,
	target_to_3d
} from "../render/camera.js"
import constants from "../constants.js"
import { set_text_if_changed } from "../controller/index.js"
import {
	accuracy_el,
	crit_rate_el,
	peak_score_el,
	twitch_score_el
} from "../document.js"
import mat4 from "../render/mat4.js"
import {
	abs,
	calc_core_radius,
	convert_deg_across_aspect,
	cos,
	dir_from_yaw_pitch,
	dot,
	random,
	round,
	round_to,
	to_rad
} from "../math.js"
import {
	context_2d,
	draw_crosshair,
	draw_grid,
	draw_impacts,
	draw_target
} from "../render/renderer.js"
import {
	build_stroke_vbo,
	context_3d,
	draw_grid_3d,
	draw_impacts_3d,
	draw_stroke,
	draw_target_3d,
	render_to_2d
} from "../render/renderer3d.js"
import { play_crit, play_hit, play_miss } from "../sfx.js"
import state from "../state.js"
import { update_fov } from "../logic.js"
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
	const { targets, targets_3d } = state.mode.twitch
	state.game.mode = null
	state.mode.twitch.peak_score = 0
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
		targets.length = 0
		impacts.clear()
	} else {
		state.camera.pitch = 0
		state.camera.yaw = 0
		targets_3d.length = 0
		impacts_3d.clear()
	}
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
	peak_score_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	const { target_hide_duration_ms } = constants.mode.twitch
	const { now_ms } = state.timer
	state.mode.twitch.next_hide_ms = 0
	state.mode.twitch.next_show_ms = now_ms + target_hide_duration_ms / 2
	update_fov()
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
	const {
		next_hide_ms,
		next_show_ms,
		targets,
		targets_3d
	} = state.mode.twitch
	const { now_ms, prev_ms } = state.timer
	if (dimension == "2d") {
		if (targets.length) {
			if (next_hide_ms <= now_ms) {
				const l = targets.length
				targets.length = 0
				state.mode.twitch.next_show_ms = now_ms + target_hide_duration_ms
				for (let i = 0; i < l; i++) {
					shoots.push(
						{
							c: false,
							e: now_ms,
							h: false,
							s: prev_ms
						}
					)
				}
				state.stats.count_shoot += l
			}
		} else if (next_show_ms <= now_ms) {
			targets.push(
				create_target_2d(),
				create_target_2d()
			)
			state.mode.twitch.next_hide_ms = now_ms + target_show_duration_ms
		}
	} else if (targets_3d.length) {
		if (next_hide_ms <= now_ms) {
			const l = targets_3d.length
			targets_3d.length = 0
			state.mode.twitch.next_show_ms = now_ms + target_hide_duration_ms
			for (let i = 0; i < l; i++) {
				shoots.push(
					{
						c: false,
						e: now_ms,
						h: false,
						s: prev_ms
					}
				)
			}
			state.stats.count_shoot += l
		}
	} else if (next_show_ms <= now_ms) {
		targets_3d.push(
			create_target_3d(),
			create_target_3d()
		)
		state.mode.twitch.next_hide_ms = now_ms + target_show_duration_ms
	}
	/** @returns {Target} */
	function create_target_2d() {
		const random_x = random() - .5
		const r = base_radius * (1 + abs(random_x) * 2 * (target_radius_mul_max - 1))
		const cr = calc_core_radius(r, base_radius)
		const tx = width / width_div * random_x
		const ty = height / height_div * (random() - .5)
		return {
			cr,
			cx: x + tx,
			cy: ty - r + cr,
			r,
			x: x + tx,
			y: ty
		}
	}
	/** @returns {Target3D} */
	function create_target_3d() {
		const base_radius_rad = px_to_rad(base_radius)
		const random_x = random() - .5
		const r = base_radius_rad * (1 + abs(random_x) * 2)
		const cr = calc_core_radius(r, base_radius_rad)
		const tp = to_rad(
			convert_deg_across_aspect(fov, width, height)
		) / height_div * (random() - .5)
		const ty = to_rad(fov / width_div) * random_x
		return {
			cp: tp + r - cr,
			cr,
			cy: yaw + ty,
			p: tp,
			r,
			y: yaw + ty
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
	const { targets, targets_3d } = state.mode.twitch
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	if (dimension == "2d") {
		draw_grid()
		if (targets.length) {
			const ordered = get_ordered_targets_2d(targets)
			const nearest = ordered[0]
			context_2d.save()
			context_2d.translate(-x, -y)
			context_2d.globalAlpha = .2
			context_2d.lineWidth = 2
			context_2d.strokeStyle = "white"
			context_2d.beginPath()
			context_2d.moveTo(x, y)
			context_2d.lineTo(nearest.x, nearest.cy)
			for (let i = 1; i < ordered.length; i++) {
				context_2d.lineTo(ordered[i].x, ordered[i].cy)
			}
			context_2d.stroke()
			context_2d.restore()
			for (const target of targets) {
				draw_target(target, 1)
			}
		}
		draw_impacts()
	} else {
		const aspect = width / height
		const vfov_deg = convert_deg_across_aspect(fov, width, height)
		context_3d.clear(context_3d.COLOR_BUFFER_BIT)
		const { tps_dist } = constants.camera
		state.camera.proj = mat4.perspective(vfov_deg, aspect, .1, 2_000)
		state.camera.view = mat4.view(
			yaw,
			pitch,
			0,
			dimension == "tps" ? tps_dist : 0
		)
		draw_grid_3d()
		if (targets_3d.length) {
			const ordered = get_ordered_targets_3d(targets_3d)
			/** @type {number[]} */
			const segments = []
			/** @type {number[]} */
			let from = dir_from_yaw_pitch(yaw, pitch)
			for (const target of ordered) {
				const dir = dir_from_yaw_pitch(target.cy, target.cp)
				const to = [ dir[0] * d, dir[1] * d, dir[2] * d ]
				segments.push(
					from[0],
					from[1],
					from[2],
					to[0],
					to[1],
					to[2]
				)
				from = to
			}
			const vbo_info = build_stroke_vbo(
				new Float32Array(segments),
				context_3d.DYNAMIC_DRAW
			)
			draw_stroke([ 1, 1, 1, .2 ], 2, vbo_info)
			context_3d.deleteBuffer(vbo_info.vbo)
			for (const target of targets_3d) {
				draw_target_3d(target, 1)
			}
		}
		draw_impacts_3d()
		render_to_2d()
	}
	draw_crosshair()
	context_2d.restore()
	/**
	 * @param {Target[]} values
	 * @returns {Target[]}
	 */
	function get_ordered_targets_2d(values) {
		return [ ...values ].sort(
			(a, b) => {
				const ax = a.x - x
				const ay = a.y - y
				const bx = b.x - x
				const by = b.y - y
				return ax ** 2 + ay ** 2 - (bx ** 2 + by ** 2)
			}
		)
	}
	/**
	 * @param {Target3D[]} values
	 * @returns {Target3D[]}
	 */
	function get_ordered_targets_3d(values) {
		const d_cam = dir_from_yaw_pitch(yaw, pitch)
		return [ ...values ].sort(
			(a, b) => {
				const a_body = dir_from_yaw_pitch(a.y, a.p)
				const b_body = dir_from_yaw_pitch(b.y, b.p)
				return dot(d_cam, b_body) - dot(d_cam, a_body)
			}
		)
	}
}
/** @returns {void} */
function shoot() {
	const { target_hide_duration_ms } = constants.mode.twitch
	const { impacts, impacts_3d } = state
	const { dimension, pitch, x, y, yaw } = state.camera
	const { px_size, rad_size } = state.impact
	const { next_hide_ms, targets, targets_3d } = state.mode.twitch
	const { shoots } = state.stats
	const { now_ms, now_s } = state.timer
	let is_hit = false
	let is_crit = false
	if (dimension == "2d") {
		let hit_i = -1
		for (let i = 0; i < targets.length; i++) {
			const target = targets[i]
			const { cr, cy, r, x: target_x, y: target_y } = target
			const dx = target_x - x
			is_hit = dx ** 2 + (target_y - y) ** 2 <= r * r
			is_crit = dx ** 2 + (cy - y) ** 2 <= cr * cr
			if (is_hit) {
				hit_i = i
				break
			}
		}
		if (hit_i >= 0) {
			if (is_crit) {
				play_crit()
			} else {
				play_hit()
			}
			impacts.push(
				{ c: is_crit, r: px_size, t: now_s, x, y }
			)
			targets.splice(hit_i, 1)
			state.mode.twitch.next_show_ms = now_ms + target_hide_duration_ms
		} else if (targets.length) {
			play_miss()
			impacts.push({ r: px_size, t: now_s, x, y })
			targets.length = 0
			state.mode.twitch.next_show_ms = now_ms + target_hide_duration_ms
		}
	} else {
		let hit_i = -1
		for (let i = 0; i < targets_3d.length; i++) {
			const target_3d = targets_3d[i]
			const { cp, cr, cy, p, r, y: target_y } = target_3d
			const d_cam = dir_from_yaw_pitch(yaw, pitch)
			const d_body = dir_from_yaw_pitch(target_y, p)
			const d_core = dir_from_yaw_pitch(cy, cp)
			is_hit = dot(d_cam, d_body) >= cos(r)
			is_crit = dot(d_cam, d_core) >= cos(cr)
			if (is_hit) {
				hit_i = i
				break
			}
		}
		if (hit_i >= 0) {
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
			targets_3d.splice(hit_i, 1)
			state.mode.twitch.next_show_ms = now_ms + target_hide_duration_ms
		} else if (targets_3d.length) {
			play_miss()
			impacts_3d.push(
				{
					p: pitch,
					r: rad_size,
					t: now_s,
					y: yaw
				}
			)
			targets_3d.length = 0
			state.mode.twitch.next_show_ms = now_ms + target_hide_duration_ms
		}
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
function update_dimension() {
	const { dimension, pitch, x, y, yaw } = state.camera
	const { targets, targets_3d } = state.mode.twitch
	update_fov()
	if (dimension == "2d") {
		if (pitch || yaw) {
			camera_to_2d()
		}
		if (targets_3d.length) {
			targets.push(
				...targets_3d.map(target_to_2d)
			)
			targets_3d.length = 0
		}
	} else {
		if (x || y) {
			camera_to_3d()
		}
		if (targets.length) {
			targets_3d.push(...targets.map(target_to_3d))
			targets.length = 0
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
	if (score > state.mode.twitch.peak_score) {
		state.mode.twitch.peak_score = score
		if (score > state.mode.twitch.best_score) {
			localStorage.setItem(
				"twitch.best_score",
				String(score)
			)
			set_text_if_changed(
				twitch_score_el,
				state.mode.twitch.best_score = score
			)
		}
	}
	peak_score_el.setAttribute(
		"value",
		`${score} / ${state.mode.twitch.peak_score}`
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
	update_dimension,
	update_hud
}