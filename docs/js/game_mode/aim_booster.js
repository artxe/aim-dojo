import constants from "../constants.js"
import {
	accuracy_el,
	aim_booster_score_el,
	clear_aim_booster_btn,
	crit_rate_el,
	reset_hud_labels,
	run_score_el,
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
import { abs, clamp, max, random, round, round_to } from "../math.js"
import {
	context_2d,
	draw_crosshair,
	draw_impacts,
	draw_target,
	grid_pattern
} from "../render/renderer_2d.js"
import { play_hit, play_miss } from "../sfx.js"
import state, { impacts_pool, shoots_pool } from "../state.js"
import { create_fitts } from "../struct/fitts.js"
import { create_pool } from "../struct/pool.js"
import { create_queue } from "../struct/queue.js"
import { create_record } from "../struct/record.js"
const LIFE_TEXT = Array.from(
	{
		length: constants.mode.aim_booster.lives + 1
	},
	(ignore, i) => (
		"♥ ".repeat(i)
			+ "♡ ".repeat(
				constants.mode.aim_booster.lives - i
			)
	).trim()
)
const STORAGE_KEY = "aim_booster#runs"
let count = 0
let end_ms = 0
let lives = 0
let run_count = 0
let run_sum = 0
let spawn_text = ""
let start_ms = 0
const fitts = create_fitts()
const record = create_record(
	localStorage.getItem(STORAGE_KEY) || ""
)
/** @type {ReturnType<typeof create_queue<number>>} */
const history = create_queue()
const target_pool = create_pool(
	() => /** @type {Target & { t: number }} */({
		cr: 0,
		cx: 0,
		cy: 0,
		r: 0,
		t: 0,
		x: 0,
		y: 0
	})/**/
)
/** @type {(Target & { t: number })[]} */
const targets = []
set_mode_score(
	aim_booster_score_el,
	clear_aim_booster_btn,
	record.value
)
/** @returns {void} */
function check_stats() {
	const { shoots } = state.stats
	const { now_ms } = state.timer
	const window_ms = now_ms - constants.hud.window_ms
	while (shoots.length) {
		const first = shoots.at()
		const { e, h } = first
		if (window_ms >= e) {
			state.stats.count_shoot--
			if (h) {
				state.stats.count_hit--
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
		aim_booster_score_el,
		clear_aim_booster_btn,
		0
	)
	send_toast(
		lang_text(
			{
				en: "Aim Booster score has been reset!",
				ko: "Aim Booster 점수를 초기화했습니다!"
			}
		),
		1_500
	)
}
/** @returns {void} */
function dispose() {
	const { rewind_s } = constants.mode.aim_booster
	const { now_ms } = state.timer
	const dispose_end_ms = now_ms - rewind_s * 1_000
	state.game.mode = null
	reset_hud_labels()
	count = 0
	lives = 0
	fitts.clear()
	targets.length = 0
	target_pool.clear()
	trim_history(dispose_end_ms)
	if (history.length) {
		end_ms = dispose_end_ms
	}
	if (run_count) {
		record.push(run_sum / run_count)
		localStorage.setItem(
			STORAGE_KEY,
			String(record.value)
		)
		set_mode_score(
			aim_booster_score_el,
			clear_aim_booster_btn,
			record.value
		)
	}
	run_count = 0
	run_sum = 0
	reset_run_state()
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
	run_score_el.removeAttribute("value")
}
/** @returns {void} */
function draw_lives() {
	context_2d.font = "bold 40px monospace"
	context_2d.fillText(LIFE_TEXT[lives], 0, 96)
}
/** @returns {void} */
function init() {
	const {
		inc_target_per_sec,
		lives: max_lives,
		start_target_per_sec
	} = constants.mode.aim_booster
	const { start_ms: timer_start_ms } = state.timer
	const dt = history.length
		? max(0, (end_ms - start_ms) / 1_000)
		: 0
	const m = dt / 60
	const tps = start_target_per_sec + inc_target_per_sec * m
	reset_run_state()
	update_camera_view()
	state.camera.dimension = "2d"
	start_ms = timer_start_ms - dt * 1_000
	count = dt ? (start_target_per_sec + tps) / 2 * dt + 1 | 0 : 0
	lives = max_lives
	spawn_text = `${round_to(tps, 2)}/s`
	set_hud_labels("Bit/s", "Accuracy", "Spawn")
}
/** @returns {void} */
function on_frame() {
	const {
		grid_height,
		grid_width,
		core_ratio,
		inc_target_per_sec,
		lives: max_lives,
		rewind_s,
		start_target_per_sec,
		target_diameter,
		target_grow_ms
	} = constants.mode.aim_booster
	const { px_size } = constants.impact
	const { impacts } = state
	const { height, width, x, y } = state.camera
	state.camera.x = clamp(-width / 2, x, width / 2)
	state.camera.y = clamp(-height / 2, y, height / 2)
	const { now_ms } = state.timer
	const dt = (now_ms - start_ms) / 1_000
	const m = dt / 60
	const tps = start_target_per_sec + inc_target_per_sec * m
	const total = (start_target_per_sec + tps) / 2 * dt + 1 | 0
	for (let i = targets.length - 1; i >= 0; i--) {
		const t = targets[i]
		const age = now_ms - t.t
		if (age >= target_grow_ms * 2) {
			play_miss()
			const impact = impacts_pool.obtain()
			impact.c = void 0
			impact.r = px_size
			impact.t = now_ms
			impact.x = t.x
			impact.y = t.y
			impacts.push(impact)
			target_pool.recycle(t)
			for (let j = i; j < targets.length - 1; j++) {
				targets[j] = targets[j + 1]
			}
			targets.length--
			lives--
		} else {
			const r = target_diameter / 2
				* (1 - abs(age / target_grow_ms - 1))
			t.cr = r * core_ratio
			t.r = r
		}
	}
	if (lives <= 0) {
		const t2 = max(0, dt - rewind_s)
		const m2 = t2 / 60
		const tps2 = start_target_per_sec + inc_target_per_sec * m2
		const new_count = (start_target_per_sec + tps2) / 2 * t2 + 1 | 0
		trim_history(now_ms - rewind_s * 1_000)
		start_ms = now_ms - t2 * 1_000
		count = new_count
		lives = max_lives
		for (const t of targets) {
			target_pool.recycle(t)
		}
		targets.length = 0
	} else {
		for (let i = count; i < total; i++) {
			const target_x = (random() - .5) * (grid_width - target_diameter)
			const target_y = (random() - .5) * (grid_height - target_diameter)
			const t = target_pool.obtain()
			t.cr = 0
			t.cx = target_x
			t.cy = target_y
			t.r = 0
			t.t = now_ms
			t.x = target_x
			t.y = target_y
			targets.push(t)
			count++
		}
	}
}
/** @returns {void} */
function render() {
	const { height, width, x, y } = state.camera
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	context_2d.save()
	context_2d.font = "bold 120px monospace"
	context_2d.textAlign = "center"
	context_2d.textBaseline = "middle"
	context_2d.fillStyle = "rgba(255, 255, 255, 0.15)"
	context_2d.fillText(spawn_text, 0, 0)
	draw_lives()
	context_2d.fillStyle = grid_pattern
	context_2d.fillRect(
		-width / 2,
		-height / 2,
		width,
		height
	)
	for (let i = targets.length - 1; i >= 0; i--) {
		draw_target(targets[i], 1)
	}
	draw_impacts()
	context_2d.restore()
	context_2d.translate(x, y)
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { px_size } = constants.impact
	const { impacts } = state
	const { x, y } = state.camera
	const { now_ms, prev_ms } = state.timer
	let hit_i = -1
	let near_dist2 = 0
	let near_i = -1
	for (let i = 0; i < targets.length; i++) {
		const { r, x: target_x, y: target_y } = targets[i]
		const dist2 = (target_x - x) ** 2 + (target_y - y) ** 2
		if (near_i < 0 || dist2 < near_dist2) {
			near_dist2 = dist2
			near_i = i
		}
		if (hit_i < 0 && dist2 <= r * r) {
			hit_i = i
		}
	}
	const is_hit = hit_i >= 0
	const aim_i = is_hit ? hit_i : near_i
	if (aim_i >= 0) {
		const { x: target_x, y: target_y } = targets[aim_i]
		fitts.trial(target_x, target_y, x, y, now_ms)
	} else {
		fitts.click(x, y, now_ms)
	}
	if (is_hit) {
		play_hit()
		const impact = impacts_pool.obtain()
		impact.c = false
		impact.r = px_size
		impact.t = now_ms
		impact.x = x
		impact.y = y
		impacts.push(impact)
		target_pool.recycle(targets[hit_i])
		for (let j = hit_i; j < targets.length - 1; j++) {
			targets[j] = targets[j + 1]
		}
		targets.length--
	} else {
		play_miss()
		const impact = impacts_pool.obtain()
		impact.c = void 0
		impact.r = px_size
		impact.t = now_ms
		impact.x = x
		impact.y = y
		impacts.push(impact)
	}
	history.push(now_ms)
	const shoot_entry = shoots_pool.obtain()
	shoot_entry.c = false
	shoot_entry.d = 0
	shoot_entry.e = now_ms
	shoot_entry.h = is_hit
	shoot_entry.s = prev_ms
	state.stats.shoots.push(shoot_entry)
	state.stats.count_shoot++
	if (is_hit) {
		state.stats.count_hit++
	}
}
/**
 * @param {number} until_ms
 * @returns {void}
 */
function trim_history(until_ms) {
	const count_all = history.length
	let cut_to = count_all
	for (let i = 0; i < count_all; i++) {
		if (history.at(i) > until_ms) {
			cut_to = i
			break
		}
	}
	history.array.length = history.array.length - (count_all - cut_to)
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const {
		inc_target_per_sec,
		start_target_per_sec
	} = constants.mode.aim_booster
	const { count_hit, count_shoot } = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const dt = (now_ms - start_ms) / 1_000
	const m = dt / 60
	const score = fitts.throughput()
	spawn_text = `${round_to(start_target_per_sec + inc_target_per_sec * m, 2)}/s`
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
	set_attr_if_changed(crit_rate_el, "value", spawn_text)
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
	update_hud
}