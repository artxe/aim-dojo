import constants from "../constants.js"
import {
	accuracy_el,
	aim_booster_score_el,
	crit_rate_el,
	peak_score_el,
	send_toast,
	set_attr_if_changed,
	set_text_if_changed
} from "../controller/dom.js"
import {
	clamp,
	max,
	random,
	round,
	round_to,
	sqrt
} from "../math.js"
import {
	context_2d,
	draw_crosshair,
	draw_impacts,
	draw_target,
	grid_pattern
} from "../render/renderer_2d.js"
import { create_pool } from "../pool.js"
import { play_hit, play_miss } from "../sfx.js"
import state, { impacts_pool } from "../state.js"
const STORAGE_KEY = "aim_booster#best_score"
let best_score = Number(
	localStorage.getItem(STORAGE_KEY) || 0
)
let count = 0
let end_ms = 0
let peak_score = 0
let start_ms = 0
/** @type {(Target & { t: number })[]} */
const targets = []
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
aim_booster_score_el.textContent = String(best_score)
/** @returns {void} */
function clear_best_score() {
	best_score = 0
	localStorage.removeItem(STORAGE_KEY)
	set_text_if_changed(aim_booster_score_el, 0)
	send_toast(
		"Aim Booster score has been reset!",
		1_500
	)
}
/** @returns {void} */
function dispose() {
	const { impacts } = state
	const { rewind_s } = constants.mode.aim_booster
	const { shoots } = state.stats
	const { now_ms } = state.timer
	const dispose_end_ms = now_ms - rewind_s * 1_000
	let cut_to = shoots.length
	for (let i = 0; i < shoots.length; i++) {
		if (shoots.at(i).e > dispose_end_ms) {
			cut_to = i
			break
		}
	}
	state.camera.x = 0
	state.camera.y = 0
	state.game.mode = null
	count = 0
	peak_score = 0
	targets.length = 0
	target_pool.clear()
	state.stats.count_hit = 0
	state.stats.count_shoot = 0
	shoots.array.length = shoots.array.length - (shoots.length - cut_to)
	if (shoots.length) {
		end_ms = dispose_end_ms
	}
	impacts.clear()
	impacts_pool.clear()
	accuracy_el.removeAttribute("value")
	crit_rate_el.removeAttribute("value")
	crit_rate_el.textContent = "Critical"
	peak_score_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	const {
		inc_target_per_sec,
		start_target_per_sec
	} = constants.mode.aim_booster
	const { start_ms: timer_start_ms } = state.timer
	const { shoots } = state.stats
	const dt = shoots.length
		? max(0, (end_ms - start_ms) / 1_000)
		: 0
	const m = dt / 60
	const tps = start_target_per_sec + inc_target_per_sec * m
	state.camera.dimension = "2d"
	start_ms = timer_start_ms - dt * 1_000
	count = dt ? (start_target_per_sec + tps) / 2 * dt + 1 | 0 : 0
	state.stats.count_crit = 0
	state.stats.count_hit = 0
	state.stats.count_shoot = shoots.length
	for (let i = 0; i < shoots.length; i++) {
		if (shoots.at(i).h) {
			state.stats.count_hit++
		}
	}
	crit_rate_el.textContent = "Targets"
}
/** @returns {void} */
function on_frame() {
	const { base_radius } = constants.target
	const {
		inc_target_per_sec,
		rewind_s,
		start_target_per_sec,
		target_radius_mul,
		target_radius_per_dist
	} = constants.mode.aim_booster
	const { height, width, x, y } = state.camera
	state.camera.x = clamp(-width / 2, x, width / 2)
	state.camera.y = clamp(-height / 2, y, height / 2)
	const { shoots } = state.stats
	const { now_ms } = state.timer
	const dt = (now_ms - start_ms) / 1_000
	const m = dt / 60
	const tps = start_target_per_sec + inc_target_per_sec * m
	const total = (start_target_per_sec + tps) / 2 * dt + 1 | 0
	if (total - count + targets.length > tps * 2) {
		const t2 = max(0, dt - rewind_s)
		const m2 = t2 / 60
		const tps2 = start_target_per_sec + inc_target_per_sec * m2
		const new_count = (start_target_per_sec + tps2) / 2 * t2 + 1 | 0
		let count_hit = state.stats.count_hit
		let count_shoot = state.stats.count_shoot
		let cut_to = 0
		for (let i = shoots.length - 1; count_hit > new_count; i--) {
			count_shoot--
			if (shoots.at(i).h) {
				count_hit--
			}
			cut_to = i
		}
		shoots.array.length = shoots.array.length - (shoots.length - cut_to)
		start_ms = now_ms - t2 * 1_000
		count = new_count
		state.stats.count_shoot = count_shoot
		state.stats.count_hit = count_hit
		for (const t of targets) {
			target_pool.recycle(t)
		}
		targets.length = 0
	} else {
		for (let i = count; i < total; i++) {
			const target_x = (random() + random() + random() + random() - 2) * width / 8
			const target_y = (random() + random() + random() + random() - 2) * height / 8
			const dist = sqrt(target_x ** 2 + target_y ** 2)
			const t = target_pool.obtain()
			t.cr = 0
			t.cx = 0
			t.cy = 0
			t.r = target_radius_mul * base_radius + target_radius_per_dist * dist
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
	const {
		inc_target_per_sec,
		start_target_per_sec
	} = constants.mode.aim_booster
	const { height, width, x, y } = state.camera
	const { now_ms } = state.timer
	const dt = (now_ms - start_ms) / 1_000
	const m = dt / 60
	const tps = round_to(
		start_target_per_sec + inc_target_per_sec * m,
		2
	)
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	context_2d.translate(x, y)
	context_2d.save()
	context_2d.translate(-x, -y)
	context_2d.font = "bold 120px monospace"
	context_2d.textAlign = "center"
	context_2d.textBaseline = "middle"
	context_2d.fillStyle = "rgba(255, 255, 255, 0.15)"
	context_2d.fillText(`${tps}/s`, 0, 0)
	context_2d.fillStyle = grid_pattern
	context_2d.fillRect(
		-width / 2,
		-height / 2,
		width,
		height
	)
	context_2d.restore()
	for (let i = targets.length - 1; i >= 0; i--) {
		draw_target(targets[i], 1)
	}
	draw_impacts()
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { impacts } = state
	const { x, y } = state.camera
	const { px_size } = state.impact
	const { now_ms, now_s, prev_ms } = state.timer
	let is_hit = false
	for (let i = 0; i < targets.length; i++) {
		const { r, x: target_x, y: target_y } = targets[i]
		const dx = target_x - x
		if (dx ** 2 + (target_y - y) ** 2 <= r * r) {
			play_hit()
			const impact = impacts_pool.obtain()
			impact.c = false
			impact.r = px_size
			impact.t = now_s
			impact.x = x
			impact.y = y
			impacts.push(impact)
			target_pool.recycle(targets[i])
			for (let j = i; j < targets.length - 1; j++) {
				targets[j] = targets[j + 1]
			}
			targets.length--
			is_hit = true
			break
		}
	}
	if (!is_hit) {
		play_miss()
		const impact = impacts_pool.obtain()
		impact.c = void 0
		impact.r = px_size
		impact.t = now_s
		impact.x = x
		impact.y = y
		impacts.push(impact)
	}
	state.stats.shoots.push(
		{
			c: false,
			e: now_ms,
			h: is_hit,
			s: prev_ms
		}
	)
	state.stats.count_shoot++
	if (is_hit) {
		state.stats.count_hit++
	}
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
	const score = count_hit * 100
	const dt = (now_ms - start_ms) / 1_000
	const m = (dt / 60)
	const tps = round_to(
		start_target_per_sec + inc_target_per_sec * m,
		2
	)
	if (score > peak_score) {
		peak_score = score
		if (score > best_score) {
			best_score = score
			localStorage.setItem(STORAGE_KEY, String(score))
			set_text_if_changed(aim_booster_score_el, score)
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
	set_attr_if_changed(crit_rate_el, "value", `${tps}/s`)
}
/** @type {GameMode} */
export default {
	clear_best_score,
	dispose,
	init,
	on_frame,
	render,
	shoot,
	update_hud
}