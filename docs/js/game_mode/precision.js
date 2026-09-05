import constants from "../constants.js"
import {
	accuracy_el,
	clear_precision_btn,
	crit_rate_el,
	level_el,
	precision_score_el,
	run_score_el,
	reset_hud_labels,
	send_toast,
	set_attr_if_changed,
	set_hud_labels,
	set_mode_score
} from "../controller/dom.js"
import { lang_text } from "../i18n.js"
import {
	reset_run_state,
	update_camera_view
} from "../logic.js"
import {
	acos,
	atan2,
	calc_core_radius,
	clamp,
	cos,
	lerp,
	PI,
	random,
	round,
	round_to,
	sin,
	TAU,
	to_rad
} from "../math.js"
import {
	convert_camera_to_2d,
	convert_camera_to_3d,
	convert_target_to_2d,
	convert_target_to_3d,
	hit_test_2d,
	hit_test_3d,
	is_target_visible_2d,
	is_target_visible_3d,
	px_to_rad,
	rad_to_px
} from "../render/camera.js"
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
import state, { shoots_pool } from "../state.js"
import { create_fitts } from "../struct/fitts.js"
import { create_pool } from "../struct/pool.js"
import { create_record } from "../struct/record.js"
import { create_staircase } from "../struct/staircase.js"
const LEVEL_KEY = "precision#level"
const STORAGE_KEY = "precision#runs"
let guide_lost_ms = 0
let guide_shown = false
let level_dirty = false
let run_count = 0
let run_sum = 0
let trial_hit = 0
let trial_shoot = 0
const fitts = create_fitts()
const record = create_record(
	localStorage.getItem(STORAGE_KEY) || ""
)
const staircase = create_staircase(
	Number(
		localStorage.getItem(LEVEL_KEY) || constants.staircase.start_level
	)
)
const target_pool_2d = create_pool(
	() => /** @type {Target} */({ cr: 0, cx: 0, cy: 0, r: 0, x: 0, y: 0 })/**/
)
const target_pool_3d = create_pool(
	() => /** @type {Target3D} */({ cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 })/**/
)
/** @type {Target[]} */
const targets = []
/** @type {Target3D[]} */
const targets_3d = []
set_mode_score(
	precision_score_el,
	clear_precision_btn,
	record.value
)
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
	fitts.expire(window_ms)
}
/** @returns {void} */
function clear_score() {
	record.clear()
	localStorage.removeItem(STORAGE_KEY)
	set_mode_score(
		precision_score_el,
		clear_precision_btn,
		0
	)
	send_toast(
		lang_text(
			{
				en: "Precision score has been reset!",
				ko: "Precision 점수를 초기화했습니다!"
			}
		),
		1_500
	)
}
/** @returns {void} */
function dispose() {
	state.game.mode = null
	reset_hud_labels()
	guide_lost_ms = 0
	guide_shown = false
	fitts.clear()
	targets.length = 0
	targets_3d.length = 0
	trial_hit = 0
	trial_shoot = 0
	target_pool_2d.clear()
	target_pool_3d.clear()
	if (run_count) {
		record.push(run_sum / run_count)
		localStorage.setItem(
			STORAGE_KEY,
			String(record.value)
		)
		set_mode_score(
			precision_score_el,
			clear_precision_btn,
			record.value
		)
	}
	run_count = 0
	run_sum = 0
	if (level_dirty) {
		level_dirty = false
		localStorage.setItem(
			LEVEL_KEY,
			String(staircase.level)
		)
	}
	reset_run_state()
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
	level_el.removeAttribute("value")
	run_score_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	set_hud_labels("Bit/s", "Accuracy", "Critical")
	reset_run_state()
	update_camera_view()
}
/** @returns {void} */
function on_frame() {
	const {
		far_dist_mul,
		near_dist_mul,
		pitch_limit
	} = constants.mode.precision
	const { base_radius } = constants.target
	const { dimension, pitch, x, y, yaw } = state.camera
	if (dimension == "2d") {
		if (!targets.length) {
			const dist = (near_dist_mul + random() * (far_dist_mul - near_dist_mul)) * base_radius
			const r = base_radius * radius_mul()
			const cr = calc_core_radius(r)
			const theta = random_theta(
				y,
				dist,
				rad_to_px(to_rad(pitch_limit))
			)
			const cx = x + cos(theta) * dist
			const cy = y + sin(theta) * dist
			const t = target_pool_2d.obtain()
			t.cr = cr
			t.cx = cx
			t.cy = cy
			t.r = r
			t.x = cx
			t.y = cy + r - cr
			targets[0] = t
		}
	} else if (!targets_3d.length) {
		const base_radius_rad = px_to_rad(base_radius)
		const dist = (near_dist_mul + random() * (far_dist_mul - near_dist_mul)) * base_radius_rad
		const r = base_radius_rad * radius_mul()
		const cr = calc_core_radius(r)
		const theta = random_theta(pitch, dist, to_rad(pitch_limit))
		const cp = pitch + sin(theta) * dist
		const cy = yaw + cos(theta) * dist
		const t = target_pool_3d.obtain()
		t.cp = cp
		t.cr = cr
		t.cy = cy
		t.p = cp - r + cr
		t.r = r
		t.y = cy
		targets_3d[0] = t
	}
	update_aim_guide()
}
/** @returns {number} */
function radius_mul() {
	const {
		target_radius_mul_max,
		target_radius_mul_min
	} = constants.mode.precision
	return lerp(
		target_radius_mul_max,
		target_radius_mul_min,
		staircase.level
	)
}
/**
 * @param {number} origin
 * @param {number} dist
 * @param {number} range
 * @returns {number}
 */
function random_theta(origin, dist, range) {
	if (origin + dist >= range) {
		const cap = 2 * acos(
			clamp((range - origin) / dist, -1, 1)
		)
		const theta = random() * (TAU - cap)
		return theta > PI * .5 - cap / 2 ? theta + cap : theta
	}
	if (origin - dist <= -range) {
		const cap = 2 * acos(
			clamp((-range - origin) / dist, -1, 1)
		)
		const theta = random() * (TAU - cap)
		return theta > PI * 1.5 - cap / 2 ? theta + cap : theta
	}
	const theta = random() * TAU
	return atan2(sin(theta) * .2, cos(theta))
}
/** @returns {void} */
function render() {
	const { dimension, height, width, x, y } = state.camera
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	if (dimension == "2d") {
		context_2d.save()
		context_2d.translate(-x, -y)
		draw_grid()
		if (targets.length) {
			if (guide_shown) {
				draw_aim_guides_2d(targets)
			}
			draw_target(targets[0], 1)
		}
		draw_impacts()
		context_2d.restore()
	} else {
		prepare_3d_view()
		draw_grid_3d()
		if (targets_3d.length) {
			if (guide_shown) {
				draw_aim_guides_3d(targets_3d)
			}
			draw_target_3d(targets_3d[0], 1)
		}
		draw_impacts_3d()
	}
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { trial_shots } = constants.mode.precision
	const { dimension, pitch, x, y, yaw } = state.camera
	const { shoots } = state.stats
	const { now_ms, prev_ms } = state.timer
	let is_crit = false
	let is_hit = false
	if (dimension == "2d") {
		const t = targets[0]
		if (t) {
			({ is_crit, is_hit } = hit_test_2d(t, x, y))
			fitts.trial(t.cx, t.cy, x, y, now_ms)
			if (is_hit) {
				target_pool_2d.recycle(t)
				targets.length = 0
			}
		} else {
			fitts.click(x, y, now_ms)
		}
	} else {
		const t = targets_3d[0]
		if (t) {
			({ is_crit, is_hit } = hit_test_3d(t, yaw, pitch))
			fitts.trial(t.cy, t.cp, yaw, pitch, now_ms)
			if (is_hit) {
				target_pool_3d.recycle(t)
				targets_3d.length = 0
			}
		} else {
			fitts.click(yaw, pitch, now_ms)
		}
	}
	record_shot(is_hit, is_crit)
	const shoot_entry = shoots_pool.obtain()
	shoot_entry.c = is_crit
	shoot_entry.d = 0
	shoot_entry.e = now_ms
	shoot_entry.h = is_hit
	shoot_entry.s = prev_ms
	shoots.push(shoot_entry)
	state.stats.count_shoot++
	trial_shoot++
	if (is_hit) {
		state.stats.count_hit++
		trial_hit++
		if (is_crit) {
			state.stats.count_crit++
		}
	}
	if (trial_shoot >= trial_shots) {
		staircase.feed(trial_hit / trial_shoot)
		level_dirty = true
		trial_hit = 0
		trial_shoot = 0
	}
}
/** @returns {void} */
function update_aim_guide() {
	const { delay_ms } = constants.guide
	const { dimension, pitch, x, y, yaw } = state.camera
	const { now_ms } = state.timer
	const has_target = dimension == "2d" ? targets.length : targets_3d.length
	if (
		!has_target
			|| (
				dimension == "2d"
					? is_target_visible_2d(targets[0], x, y)
					: is_target_visible_3d(targets_3d[0], yaw, pitch)
			)
	) {
		guide_lost_ms = 0
		guide_shown = false
		return
	}
	if (!guide_lost_ms) {
		guide_lost_ms = now_ms
	}
	guide_shown = now_ms - guide_lost_ms >= delay_ms
}
/** @returns {void} */
function update_dimension() {
	const { dimension, pitch, x, y, yaw } = state.camera
	fitts.reset()
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
	const score = fitts.throughput()
	if (score) {
		run_count++
		run_sum += score
	}
	set_attr_if_changed(
		run_score_el,
		"value",
		`${score ? round_to(score, 2) : "-"} / ${run_count ? round_to(run_sum / run_count, 2) : "-"}`
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
	set_attr_if_changed(
		level_el,
		"value",
		`${round(staircase.level * 100)}`
	)
}
/** @type {GameMode} */
export default {
	check_stats,
	clear_score,
	dispose,
	init,
	on_frame,
	render,
	shoot,
	update_dimension,
	update_hud
}