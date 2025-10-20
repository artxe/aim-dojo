import {
	camera_to_2d,
	camera_to_3d,
	px_to_rad
} from "../camera.js"
import constants from "../constants.js"
import {
	accuracy_el,
	aiming_score_el,
	crit_rate_el,
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
	abs,
	atan,
	calc_core_radius,
	clamp,
	convert_deg_across_aspect,
	cos,
	dot,
	max,
	random,
	round_to,
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
	const next_mode = "flick"
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
}
/** @returns {void} */
function init() {
	const { base_radius: r } = constants.target
	const { cycle_id, sens } = state.game
	const { target, target_3d } = state.mode.aiming
	state.camera.dimension = sens == "lol" ? "2d" : "3d"
	state.mode.aiming.peak_score = 0
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
		state.game.cycle_id = setTimeout(change_to_next_mode, 50_000)
	}
}
/** @returns {void} */
function on_frame() {
	const { base_radius } = constants.target
	const { base_speed } = constants.mode.aiming
	const { dimension, fov, x, yaw } = state.camera
	const { width } = state.device
	const { now_ms, prev_ms } = state.timer
	const { target, target_3d } = state.mode.aiming
	const dt = now_ms - prev_ms
	if (dimension == "2d") {
		target.r = abs(x - target.x) / (width / 4) * base_radius * 4 + base_radius * 2
		target.cr = calc_core_radius(target.r, base_radius)
		const direction = x < target.x ? 1 : -1
		const speed = target.r * base_speed * direction
		target.cx = target.x = clamp(
			x - width / 2,
			target.cx + speed * dt,
			x + width / 2
		)
		target.cy = target.y - target.r + target.cr
	} else {
		const base_radius_rad = px_to_rad(base_radius)
		const fov_rad = to_rad(fov)
		target_3d.r = abs(yaw - target_3d.y) / (fov_rad / 4) * base_radius_rad * 4 + base_radius_rad * 2
		target_3d.cr = calc_core_radius(target_3d.r, base_radius_rad)
		const direction = yaw < target_3d.y ? 1 : -1
		const speed = target_3d.r * base_speed * direction
		target_3d.cy = target_3d.y = clamp(
			yaw - fov_rad / 2,
			target_3d.y + speed * dt,
			yaw + fov_rad / 2
		)
		target_3d.cp = target_3d.p + target_3d.r - target_3d.cr
	}
}
/** @returns {void} */
function shoot() {
	const { impacts, impacts_3d } = state
	const { dimension, fov, pitch, x, y, yaw } = state.camera
	const { height, width } = state.device
	const { target, target_3d } = state.mode.aiming
	const { shoots } = state.stats
	const { now_ms, now_s, prev_ms } = state.timer
	let is_hit = false
	let is_crit = false
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
	const { sens } = state.game
	const { target, target_3d } = state.mode.aiming
	if (sens == "lol" && dimension == "3d") {
		camera_to_2d()
		state.mode.aiming.target = target_to_2d(target_3d)
	} else if (sens != "lol" && dimension == "2d") {
		camera_to_3d()
		state.mode.aiming.target_3d = target_to_3d(target)
	}
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const { count_crit, count_hit, count_shoot } = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const score = (800 * count_crit + 700 * count_hit * (count_hit / count_shoot)) | 0
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
	set_text_if_changed(
		peak_score_el,
		`${score} / ${state.mode.aiming.peak_score}`
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