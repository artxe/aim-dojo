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
	flick_score_el,
	peak_score_el,
	send_toast,
	set_attr_if_changed,
	set_text_if_changed
} from "../controller/dom.js"
import {
	acos,
	atan2,
	calc_core_radius,
	clamp,
	cos,
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
import { create_pool } from "../pool.js"
import state, { shoots_pool } from "../state.js"
const STORAGE_KEY = "flick#best_score"
let best_score = Number(
	localStorage.getItem(STORAGE_KEY) || 0
)
let peak_score = 0
/** @type {Target[]} */
const targets = []
/** @type {Target3D[]} */
const targets_3d = []
/** @type {Target[]} */
const ghost_chain_2d = []
/** @type {Target3D[]} */
const ghost_chain_3d = []
const scratch_ghost_2d = /** @type {Target} */({ cr: 0, cx: 0, cy: 0, r: 0, x: 0, y: 0 })/**/
const scratch_ghost_3d = /** @type {Target3D} */({ cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 })/**/
const target_pool_2d = create_pool(
	() => /** @type {Target} */({ cr: 0, cx: 0, cy: 0, r: 0, x: 0, y: 0 })/**/
)
const target_pool_3d = create_pool(
	() => /** @type {Target3D} */({ cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 })/**/
)
flick_score_el.textContent = String(best_score)
/**
 * @param {Target} t
 * @returns {Target}
 */
function as_ghost_2d(t) {
	scratch_ghost_2d.cr = 0
	scratch_ghost_2d.cx = t.cx
	scratch_ghost_2d.cy = t.cy
	scratch_ghost_2d.r = t.r * 2
	scratch_ghost_2d.x = t.x
	scratch_ghost_2d.y = t.y
	return scratch_ghost_2d
}
/**
 * @param {Target3D} t
 * @returns {Target3D}
 */
function as_ghost_3d(t) {
	scratch_ghost_3d.cp = t.cp
	scratch_ghost_3d.cr = 0
	scratch_ghost_3d.cy = t.cy
	scratch_ghost_3d.p = t.p
	scratch_ghost_3d.r = t.r * 2
	scratch_ghost_3d.y = t.y
	return scratch_ghost_3d
}
/** @returns {void} */
function check_stats() {
	const { shoots } = state.stats
	const { now_ms } = state.timer
	const window_ms = now_ms - constants.hud.window_ms
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
			shoots_pool.recycle(first)
		} else {
			break
		}
	}
}
/** @returns {void} */
function clear_best_score() {
	best_score = 0
	localStorage.removeItem(STORAGE_KEY)
	set_text_if_changed(flick_score_el, 0)
	send_toast(
		"Flick score has been reset!",
		1_500
	)
}
/** @returns {void} */
function dispose() {
	state.game.mode = null
	peak_score = 0
	targets.length = 0
	targets_3d.length = 0
	target_pool_2d.clear()
	target_pool_3d.clear()
	reset_run_state()
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
	peak_score_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	reset_run_state()
	update_camera_view()
}
/** @returns {void} */
function on_frame() {
	const {
		first_dist_mul,
		num_targets,
		pitch_limit,
		target_radius_mul
	} = constants.mode.flick
	const { base_radius } = constants.target
	const { dimension, pitch, x, y, yaw } = state.camera
	if (dimension == "2d") {
		if (!targets.length) {
			const range_px = rad_to_px(to_rad(pitch_limit))
			const base_d = first_dist_mul * base_radius
			const r = base_radius * target_radius_mul
			const cr = calc_core_radius(r, base_radius)
			let cx = x
			let cy = y
			let i = 1
			while (i <= num_targets) {
				const dist = base_d * i
				let theta
				if (cy + dist >= range_px) {
					const t = clamp((range_px - cy) / dist, -1, 1)
					const cap = 2 * acos(t)
					theta = random() * (TAU - cap)
					if (theta > PI * .5 - cap / 2) {
						theta += cap
					}
				} else if (cy - dist <= -range_px) {
					const t = clamp((-range_px - cy) / dist, -1, 1)
					const cap = 2 * acos(t)
					theta = random() * (TAU - cap)
					if (theta > PI * 1.5 - cap / 2) {
						theta += cap
					}
				} else {
					theta = random() * TAU
					theta = atan2(sin(theta) * .2, cos(theta))
				}
				cx += cos(theta) * dist
				cy += sin(theta) * dist
				const target_y = cy + r - cr
				const t = target_pool_2d.obtain()
				t.cr = cr
				t.cx = cx
				t.cy = cy
				t.r = r
				t.x = cx
				t.y = target_y
				targets[num_targets - i++] = t
			}
		}
	} else if (!targets_3d.length) {
		const base_radius_rad = px_to_rad(base_radius)
		const range_rad = to_rad(pitch_limit)
		const base_d = first_dist_mul * base_radius_rad
		const r = base_radius_rad * target_radius_mul
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
				theta = atan2(sin(theta) * .2, cos(theta))
			}
			cy += cos(theta) * dist
			cp += sin(theta) * dist
			const p = cp - r + cr
			const t = target_pool_3d.obtain()
			t.cp = cp
			t.cr = cr
			t.cy = cy
			t.p = p
			t.r = r
			t.y = cy
			targets_3d[num_targets - i++] = t
		}
	}
}
/** @returns {void} */
function render() {
	const { dimension, height, pitch, width, x, y, yaw } = state.camera
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	if (dimension == "2d") {
		draw_grid()
		if (targets.length) {
			ghost_chain_2d.length = 0
			for (let i = targets.length - 1; i >= 0; i--) {
				ghost_chain_2d.push(targets[i])
			}
			draw_aim_guides_2d(ghost_chain_2d)
			for (let i = 0; i + 1 < targets.length; i++) {
				draw_target(
					as_ghost_2d(targets[i]),
					1 / 2 ** (targets.length - i - 1)
				)
			}
			const t = targets[targets.length - 1]
			const dx = t.x - x
			if (dx ** 2 + (t.y - y) ** 2 <= (t.r * 2) * (t.r * 2)) {
				draw_target(t, 1)
			} else {
				draw_target(as_ghost_2d(t), 1)
			}
		}
		draw_impacts()
	} else {
		prepare_3d_view()
		draw_grid_3d()
		if (targets_3d.length) {
			ghost_chain_3d.length = 0
			for (let i = targets_3d.length - 1; i >= 0; i--) {
				ghost_chain_3d.push(targets_3d[i])
			}
			draw_aim_guides_3d(ghost_chain_3d)
			for (let i = 0; i + 1 < targets_3d.length; i++) {
				draw_target_3d(
					as_ghost_3d(targets_3d[i]),
					1 / 2 ** (targets_3d.length - i - 1)
				)
			}
			const t = targets_3d[targets_3d.length - 1]
			const cam_cos_pitch = cos(pitch)
			const cam_x = sin(yaw) * cam_cos_pitch
			const cam_y = sin(pitch)
			const cam_z = -cos(yaw) * cam_cos_pitch
			const body_cos_pitch = cos(t.p)
			const body_x = sin(t.y) * body_cos_pitch
			const body_y = sin(t.p)
			const body_z = -cos(t.y) * body_cos_pitch
			if (
				cam_x * body_x + cam_y * body_y + cam_z * body_z
					>= cos(t.r * 2)
			) {
				draw_target_3d(t, 1)
			} else {
				draw_target_3d(as_ghost_3d(t), 1)
			}
		}
		draw_impacts_3d()
	}
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { dimension, pitch, x, y, yaw } = state.camera
	const { shoots } = state.stats
	const { now_ms, prev_ms } = state.timer
	let is_crit = false
	let is_hit = false
	if (dimension == "2d") {
		if (targets.length) {
			({ is_crit, is_hit } = hit_test_2d(targets[targets.length - 1], x, y))
			if (is_hit) {
				target_pool_2d.recycle(targets[targets.length - 1])
				targets.length--
			}
		}
	} else if (targets_3d.length) {
		({ is_crit, is_hit } = hit_test_3d(
			targets_3d[targets_3d.length - 1],
			yaw,
			pitch
		))
		if (is_hit) {
			target_pool_3d.recycle(
				targets_3d[targets_3d.length - 1]
			)
			targets_3d.length--
		}
	}
	record_shot(is_hit, is_crit)
	const shoot_entry = shoots_pool.obtain()
	shoot_entry.c = is_crit
	shoot_entry.e = now_ms
	shoot_entry.h = is_hit
	shoot_entry.s = prev_ms
	shoots.push(shoot_entry)
	state.stats.count_shoot++
	if (is_hit) {
		state.stats.count_hit++
		if (is_crit) {
			state.stats.count_crit++
		}
	}
}
/** @returns {void} */
function update_dimension() {
	const { dimension, pitch, x, y, yaw } = state.camera
	update_camera_view()
	if (dimension == "2d") {
		if (state.camera.dimension == "2d") {
			return
		}
		if (x || y) {
			convert_camera_to_3d()
		}
		if (targets.length) {
			for (const t of targets) {
				targets_3d.push(
					convert_target_to_3d(t, target_pool_3d.obtain())
				)
				target_pool_2d.recycle(t)
			}
			targets.length = 0
		}
	} else if (state.camera.dimension == "2d") {
		if (pitch || yaw) {
			convert_camera_to_2d()
		}
		if (targets_3d.length) {
			for (const t of targets_3d) {
				targets.push(
					convert_target_to_2d(t, target_pool_2d.obtain())
				)
				target_pool_3d.recycle(t)
			}
			targets_3d.length = 0
		}
	}
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const { count_crit, count_hit, count_shoot } = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const score = 100 * (count_crit + count_hit) * count_hit / count_shoot | 0
	if (score > peak_score) {
		peak_score = score
		if (score > best_score) {
			best_score = score
			localStorage.setItem(STORAGE_KEY, String(score))
			set_text_if_changed(flick_score_el, score)
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
		`${(count_shoot ? round_to(count_hit / count_shoot * 100, 2) : 0)}%`
	)
	set_attr_if_changed(
		crit_rate_el,
		"value",
		`${(count_hit ? round_to(count_crit / count_hit * 100, 2) : 0)}%`
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