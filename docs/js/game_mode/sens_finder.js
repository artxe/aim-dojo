import constants from "../constants.js"
import {
	accuracy_el,
	crit_rate_el,
	peak_score_el
} from "../document.js"
import {
	abs,
	EPS,
	min,
	random,
	round,
	round_to,
	sign,
	TAU
} from "../math.js"
import { context_2d, draw_crosshair } from "../renderer.js"
import { play_crit, play_hit } from "../sfx.js"
import state from "../state.js"
/** @returns {void} */
function _draw_impacts() {
	const { impacts } = state
	if (!impacts.length) {
		return
	}
	const {
		duration_s,
		fade_factor,
		rings,
		spacing
	} = constants.impact
	const { now_s } = state.timer
	const alpha = .9
	const max_life = duration_s + spacing * (rings - 1)
	context_2d.save()
	context_2d.lineWidth = 2
	while (impacts.length) {
		if (now_s - impacts.at().t > max_life) {
			impacts.drop()
		}
		break
	}
	let index = 0
	while (index < impacts.length) {
		const { c, r, t, x: impact_x, y: impact_y } = impacts.at(index)
		const p = (now_s - t) / duration_s
		const base = c ? "red" : "white"
		const dot_alpha = alpha * (1 - fade_factor * min(1, p))
		if (p <= 1) {
			context_2d.fillStyle = base
			context_2d.globalAlpha = dot_alpha
			context_2d.beginPath()
			context_2d.arc(impact_x, impact_y, 2, 0, TAU)
			context_2d.fill()
		}
		for (let k = 0; k < rings; k++) {
			const p2 = p - k * spacing
			if (p2 <= 0 || p2 > 1) {
				continue
			}
			const pr = r * p2
			const ring_alpha = alpha * (1 - fade_factor * p2)
			if (ring_alpha <= 0 || pr <= 0) {
				continue
			}
			context_2d.globalAlpha = ring_alpha
			context_2d.strokeStyle = base
			context_2d.beginPath()
			context_2d.arc(impact_x, impact_y, pr, 0, TAU)
			context_2d.stroke()
		}
		index++
	}
	context_2d.restore()
}
/**
 * @param {{ x: number, y: number }} target
 * @param {boolean} is_active
 * @returns {void}
 */
function _draw_target({ x, y }, is_active) {
	const { target_radius } = constants.mode.sens_finder
	const line_width = 1
	context_2d.save()
	context_2d.globalAlpha = is_active ? 1 : .5
	context_2d.lineWidth = line_width
	context_2d.strokeStyle = "red"
	context_2d.beginPath()
	context_2d.arc(
		x,
		y,
		(is_active ? target_radius : target_radius * .8) + line_width,
		0,
		TAU
	)
	context_2d.stroke()
	context_2d.fillStyle = is_active ? "#385978" : "#6A839A"
	context_2d.beginPath()
	context_2d.arc(
		x,
		y,
		(is_active ? target_radius : target_radius * .8),
		0,
		TAU
	)
	context_2d.fill()
	context_2d.restore()
}
/** @returns {void} */
function check_stats() {
	const { shoots } = state.stats
	const { now_ms } = state.timer
	const window_ms = now_ms - constants.mode.sens_finder.window_ms
	while (shoots.length) {
		const first = shoots.at()
		const { c, e, h, s } = first
		if (window_ms >= e) {
			const ms = e - s
			state.stats.count_shoot--
			state.stats.sum_shoot_ms -= ms
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
			state.stats.sum_shoot_ms -= ms
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
	const { impacts } = state
	const { shoots } = state.stats
	state.stats.count_hit = 0
	state.stats.count_shoot = 0
	state.camera.x = 0
	state.camera.y = 0
	state.game.mode = null
	state.input.mb_left = false
	impacts.clear()
	shoots.clear()
	peak_score_el.textContent = "Score/Peak"
	accuracy_el.textContent = "Accuracy"
	crit_rate_el.textContent = "Critical"
}
/** @returns {void} */
function init() {
	const { target_zone } = constants.sens
	state.camera.dimension = "2d"
	state.mode.writing.peak_score = 0
	state.mode.sens_finder.next_target = {
		x: random() * target_zone - target_zone / 2,
		y: random() * target_zone / 2 - target_zone / 4
	}
	state.mode.sens_finder.prev_shot = { x: 0, y: 0 }
	state.mode.sens_finder.sens_mult = 1
	state.mode.sens_finder.target = {
		x: random() * target_zone - target_zone / 2,
		y: random() * target_zone / 2 - target_zone / 4
	}
	state.mode.sens_finder.y_ratio = 1
	peak_score_el.textContent = "Sens Multiplier"
	accuracy_el.textContent = "Y/X Ratio"
	crit_rate_el.textContent = "Accuracy"
}
/** @returns {void} */
function on_frame() {
	// no-op
}
/** @returns {void} */
function render() {
	const { height, width, x, y } = state.camera
	const { next_target, target } = state.mode.sens_finder
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	context_2d.save()
	context_2d.globalAlpha = .2
	context_2d.lineWidth = 4
	context_2d.strokeStyle = "white"
	context_2d.beginPath()
	context_2d.moveTo(x, y)
	context_2d.lineTo(target.x, target.y)
	context_2d.lineTo(next_target.x, next_target.y)
	context_2d.stroke()
	context_2d.restore()
	_draw_target(next_target, false)
	_draw_target(target, true)
	_draw_impacts()
	context_2d.translate(x, y)
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { target_radius: r } = constants.mode.sens_finder
	const { target_zone } = constants.sens
	const { impacts } = state
	const { x, y } = state.camera
	const { next_target, prev_shot, target } = state.mode.sens_finder
	const { shoots } = state.stats
	const { now_ms, now_s, prev_ms } = state.timer
	const dx = target.x - x
	const dy = target.y - y
	let is_hit
	if (is_hit = dx * dx + dy * dy <= r * r) {
		play_crit()
	} else {
		play_hit()
	}
	impacts.push(
		{ c: is_hit, r, t: now_s, x, y }
	)
	shoots.push(
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
	} else {
		const corr = 1 - state.stats.count_hit / (state.stats.count_shoot || EPS)
		const dx_t = target.x - prev_shot.x
		const dy_t = target.y - prev_shot.y
		const dx_c = x - prev_shot.x
		const dy_c = y - prev_shot.y
		let x_mult = 1
		let y_mult = 1
		if (abs(dx_t) > r / 2) {
			const same_dir_x = sign(dx_t) === sign(dx_c) && sign(dx_c) !== 0
			const x_move = abs(dx_c) / (abs(dx_t) || EPS)
			if (same_dir_x) {
				if (x_move > 1) {
					x_mult = 1 / (1 + (x_move - 1) * corr / 3)
				} else {
					x_mult = 1 / (1 - (1 - x_move) * corr / 3)
				}
			}
		}
		if (abs(dy_t) > r / 2) {
			const same_dir_y = sign(dy_t) === sign(dy_c) && sign(dy_c) !== 0
			const y_move = abs(dy_c) / (abs(dy_t) || EPS)
			if (same_dir_y) {
				if (y_move > 1) {
					y_mult = 1 / (1 + (y_move - 1) * corr / 3)
				} else {
					y_mult = 1 / (1 - (1 - y_move) * corr / 3)
				}
			}
		}
		state.mode.sens_finder.sens_mult *= x_mult
		state.mode.sens_finder.y_ratio *= y_mult / x_mult
	}
	state.mode.sens_finder.next_target = {
		x: random() * target_zone - target_zone / 2,
		y: random() * target_zone / 2 - target_zone / 4
	}
	state.mode.sens_finder.prev_shot = { x, y }
	state.mode.sens_finder.target = next_target
}
/** @returns {void} */
function update_fov() {
	// no-op
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms } = constants.hud
	const { sens_mult, y_ratio } = state.mode.sens_finder
	const { count_hit, count_shoot } = state.stats
	const { now_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	peak_score_el.setAttribute(
		"value",
		String(round_to(sens_mult, 5))
	)
	accuracy_el.setAttribute(
		"value",
		String(round_to(y_ratio, 5))
	)
	crit_rate_el.setAttribute(
		"value",
		count_hit
			? String(
				round_to(count_hit / count_shoot * 100, 1)
			)
			: "0"
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