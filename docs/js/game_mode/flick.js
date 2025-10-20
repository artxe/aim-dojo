import {
	camera_to_2d,
	camera_to_3d,
	px_to_rad,
	rad_to_px
} from "../camera.js"
import constants from "../constants.js"
import {
	accuracy_el,
	crit_rate_el,
	flick_score_el,
	peak_score_el
} from "../document.js"
import { set_text_if_changed, toast } from "../hud.js"
import {
	check_stats,
	dir_from_yaw_pitch,
	target_to_2d,
	target_to_3d
} from "../logic.js"
import {
	calc_core_radius,
	clamp,
	cos,
	dot,
	random,
	round_to,
	sin,
	sqrt,
	TAU,
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
	const next_mode = "tracking"
	toast(`SCORE: ${peak_score}!`, 2500)
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
	if (dimension == "2d") {
		state.mode.flick.targets = []
	} else {
		state.mode.flick.targets_3d = []
	}
}
/** @returns {void} */
function init() {
	const { cycle_id, sens } = state.game
	state.camera.dimension = sens == "lol" ? "2d" : "3d"
	state.mode.flick.peak_score = 0
	if (cycle_id) {
		state.game.cycle_id = setTimeout(change_to_next_mode, 50_000)
	}
}
/** @returns {void} */
function on_frame() {
	const {
		first_dist_mul,
		num_targets,
		pitch_limit
	} = constants.mode.flick
	const { base_radius } = constants.target
	const { dimension } = state.camera
	const { targets, targets_3d } = state.mode.flick
	if (dimension == "2d") {
		if (!targets.length) {
			const range_px = rad_to_px(to_rad(pitch_limit))
			const base_d = constants.mode.flick.first_dist_mul * base_radius
			let { x, y } = state.camera
			let i = 1
			while (i <= num_targets) {
				const dist = base_d * i
				let theta
				if (y + dist >= range_px) {
					const t = clamp((range_px - y) / dist, -1, 1)
					const cap = 2 * Math.acos(t)
					theta = Math.random() * (TAU - cap)
					if (theta > Math.PI * 0.5 - cap / 2) {
						theta += cap
					}
				} else if (y - dist <= -range_px) {
					const t = clamp((-range_px - y) / dist, -1, 1)
					const cap = 2 * Math.acos(t)
					theta = Math.random() * (TAU - cap)
					if (theta > Math.PI * 1.5 - cap / 2) {
						theta += cap
					}
				} else {
					theta = random() * TAU
				}
				x += cos(theta) * dist
				y += sin(theta) * dist
				const r = base_radius * sqrt(i)
				const cr = calc_core_radius(r, base_radius)
				const cy = y - r + cr
				targets[num_targets - i++] = { cr, cx: x, cy, r, x, y }
			}
		}
	} else if (!targets_3d.length) {
		const base_radius_rad = px_to_rad(base_radius)
		const range_rad = to_rad(pitch_limit)
		const base_d = first_dist_mul * base_radius_rad
		let { pitch: p, yaw: y } = state.camera
		let i = 1
		while (i <= num_targets) {
			const dist = base_d * i
			let theta
			if (p + dist >= range_rad) {
				const t = clamp((range_rad - p) / dist, -1, 1)
				const cap = 2 * Math.acos(t)
				theta = Math.random() * (TAU - cap)
				if (theta > Math.PI * 0.5 - cap / 2) {
					theta += cap
				}
			} else if (p - dist <= -range_rad) {
				const t = clamp((-range_rad - p) / dist, -1, 1)
				const cap = 2 * Math.acos(t)
				theta = Math.random() * (TAU - cap)
				if (theta > Math.PI * 1.5 - cap / 2) {
					theta += cap
				}
			} else {
				theta = random() * TAU
			}
			y += cos(theta) * dist
			p += sin(theta) * dist
			const r = base_radius_rad * sqrt(i)
			const cr = calc_core_radius(r, base_radius_rad)
			const cp = p + r - cr
			targets_3d[num_targets - i++] = { cp, cr, cy: y, p, r, y: y }
		}
	}
}
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
			if (is_crit) play_crit()
			else play_hit()
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
function update_fov() {
	const { dimension } = state.camera
	const { targets, targets_3d } = state.mode.flick
	const { sens } = state.game
	if (sens == "lol" && dimension == "3d") {
		camera_to_2d()
		for (const t of targets_3d) {
			targets.push(target_to_2d(t))
		}
		state.mode.flick.targets_3d = []
	} else if (sens != "lol" && dimension == "2d") {
		camera_to_3d()
		for (const t of targets) {
			targets_3d.push(target_to_3d(t))
		}
		state.mode.flick.targets = []
	}
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const { count_crit, count_hit, count_shoot } = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const score = (150 * count_crit + 200 * count_hit * (count_hit / count_shoot)) | 0
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
	set_text_if_changed(
		peak_score_el,
		`${score} / ${state.mode.flick.peak_score}`
	)
	set_text_if_changed(
		accuracy_el,
		count_shoot ? round_to(count_hit / count_shoot * 100, 2) : 0
	)
	set_text_if_changed(
		crit_rate_el,
		count_hit ? round_to(count_crit / count_hit * 100, 2) : 0
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