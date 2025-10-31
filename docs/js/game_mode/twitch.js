import {
	camera_to_2d,
	camera_to_3d,
	px_to_rad
} from "../camera.js"
import constants from "../constants.js"
import { send_toast, set_text_if_changed } from "../controller/index.js"
import {
	accuracy_el,
	crit_rate_el,
	peak_score_el,
	twitch_score_el
} from "../document.js"
import {
	check_stats,
	dir_from_yaw_pitch,
	target_to_2d,
	target_to_3d
} from "../logic.js"
import {
	abs,
	calc_core_radius,
	convert_deg_across_aspect,
	cos,
	dot,
	random,
	round_to,
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
	const next_mode = "writing"
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
		state.mode.twitch.target = null
		impacts.clear()
	} else {
		state.camera.pitch = 0
		state.camera.yaw = 0
		state.mode.twitch.target_3d = null
		impacts_3d.clear()
	}
}
/** @returns {void} */
function init() {
	const { target_hide_duration_ms } = constants.mode.twitch
	const { cycle_timeout: cycle_id, sens } = state.game
	const { now_ms } = state.timer
	state.camera.dimension = sens == "lol" ? "2d" : "3d"
	state.mode.twitch.peak_score = 0
	state.mode.twitch.next_hide_ms = 0
	state.mode.twitch.next_show_ms = now_ms + target_hide_duration_ms / 2
	if (cycle_id) {
		state.game.cycle_timeout = setTimeout(change_to_next_mode, 50_000)
	}
}
/** @returns {void} */
function on_frame() {
	const { base_radius } = constants.target
	const {
		target_hide_duration_ms,
		target_show_duration_ms
	} = constants.mode.twitch
	const { dimension, fov, height, width, x, yaw } = state.camera
	const { shoots } = state.stats
	const {
		next_hide_ms,
		next_show_ms,
		target,
		target_3d
	} = state.mode.twitch
	const { now_ms, prev_ms } = state.timer
	if (dimension == "2d") {
		if (target) {
			if (next_hide_ms <= now_ms) {
				state.mode.twitch.target = null
				state.mode.twitch.next_show_ms = now_ms + target_hide_duration_ms
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
			const random_x = random() - .5
			const r = base_radius * (1 + abs(random_x) * 2)
			const cr = calc_core_radius(r, base_radius)
			const tx = width / 3 * random_x
			const ty = height / 6 * (random() - .5)
			state.mode.twitch.target = {
				cr,
				cx: x + tx,
				cy: ty - r + cr,
				r,
				x: x + tx,
				y: ty
			}
			state.mode.twitch.next_hide_ms = now_ms + target_show_duration_ms
		}
	} else if (target_3d) {
		if (next_hide_ms <= now_ms) {
			state.mode.twitch.target_3d = null
			state.mode.twitch.next_show_ms = now_ms + target_hide_duration_ms
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
		const base_radius_rad = px_to_rad(base_radius)
		const random_x = random() - .5
		const r = base_radius_rad * (1 + abs(random_x) * 2)
		const cr = calc_core_radius(r, base_radius_rad)
		const tp = to_rad(
			convert_deg_across_aspect(fov, width, height)
		) / 6 * (random() - .5)
		const ty = to_rad(fov / 3) * random_x
		state.mode.twitch.target_3d = {
			cp: tp + r - cr,
			cr,
			cy: yaw + ty,
			p: tp,
			r: r,
			y: yaw + ty
		}
		state.mode.twitch.next_hide_ms = now_ms + target_show_duration_ms
	}
}
/** @returns {void} */
function shoot() {
	const { target_hide_duration_ms } = constants.mode.twitch
	const { impacts, impacts_3d } = state
	const { dimension, pitch, x, y, yaw } = state.camera
	const { target, target_3d } = state.mode.twitch
	const { shoots } = state.stats
	const { now_ms, now_s, prev_ms } = state.timer
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
					{ c: is_crit, r, t: now_s, x: x, y: y }
				)
			}
			state.mode.twitch.target = null
			state.mode.twitch.next_show_ms = now_ms + target_hide_duration_ms
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
					r,
					t: now_s,
					y: yaw
				}
			)
		}
		state.mode.twitch.target_3d = null
		state.mode.twitch.next_show_ms = now_ms + target_hide_duration_ms
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
	const { target, target_3d } = state.mode.twitch
	if (sens == "lol" && dimension == "3d") {
		camera_to_2d()
		if (target_3d) {
			state.mode.twitch.target = target_to_2d(target_3d)
			state.mode.twitch.target_3d = null
		}
	} else if (sens != "lol" && dimension == "2d") {
		camera_to_3d()
		if (target) {
			state.mode.twitch.target = null
			state.mode.twitch.target_3d = target_to_3d(target)
		}
	}
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const { score_mul } = constants.mode.twitch
	const { count_crit, count_hit, count_shoot } = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const score = (score_mul * count_crit + score_mul * count_hit * (count_hit / count_shoot)) | 0
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
	set_text_if_changed(
		peak_score_el,
		`${score} / ${state.mode.twitch.peak_score}`
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