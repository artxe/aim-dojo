
import {
	camera_to_2d,
	camera_to_3d,
	px_to_rad,
	rad_to_px
} from "./camera.js"
import config from "./config.js"
import { toast, update_hud } from "./hud.js"
import {
	abs,
	atan,
	clamp,
	convert_deg_across_aspect,
	cos,
	dot,
	lerp,
	max,
	random,
	sin,
	sqrt,
	tan,
	TAU,
	to_deg,
	to_rad
} from "./math.js"
import state from "./state.js"
import { now, play_crit, play_hit } from "./sfx.js"
import { check_writing_stats, draw } from "./renderer.js"
import { message_el } from "./document.js"
/**
 * @param {number} r
 * @param {number} base
 * @returns {number}
 */
function calc_core_radius(r, base) {
	return max(r / 3, base / 2)
}
/** @returns {void} */
function cycle_game_mode() {
	const { mode } = state.game
	if (!mode) throw Error()
	const { peak_score } = state[mode]
	/** @type {GameMode} */
	const next_mode = mode == "warmup"
		? "writing"
		: mode == "writing"
			? "tracking"
			: mode == "tracking"
				? "flick"
				: "warmup"
	toast(`SCORE: ${peak_score}!`, 2000)
	dispose_game()
	init_game(next_mode)
}
/**
 * @param {number} yaw
 * @param {number} pitch
 * @returns {[ number, number, number ]}
 */
export function dir_from_yaw_pitch(yaw, pitch) {
	const cx = cos(yaw)
	const sx = sin(yaw)
	const cy = cos(pitch)
	const sy = sin(pitch)
	return [ sx * cy, sy, -cx * cy ]
}
/** @returns {void} */
function dispose_game() {
	const { impacts, impacts_3d } = state
	const { dimension } = state.camera
	const { mode } = state.game
	const { shoots } = state.stats
	const { lines } = state.writing
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
	if (mode == "flick") {
		if (dimension == "2d") {
			state.flick.targets = []
		} else {
			state.flick.targets_3d = []
		}
	} else if (mode == "tracking") {
		state.tracking.size_lerp.active = false
		state.tracking.speed_lerp.active = false
	} else if (mode == "warmup") {
		// no-op
	} else if (mode == "writing") {
		lines.clear()
		state.writing.pointer = null
	} else {
		throw Error(String(mode))
	}
}
/**
 * @param {GameMode} mode
 * @returns {void}
 */
function init_game(mode) {
	const { base_radius: r } = config.target
	const {
		move_change_interval_ms,
		size_change_interval_ms
	} = config.tracking
	const { cycle_id, sens } = state.game
	const { now_ms } = state.timer
	const { target, target_3d } = state.tracking
	const { target: warmup_target } = state.warmup
	if (mode == "flick" || mode == "tracking") {
		state.camera.dimension = sens == "lol" ? "2d" : "3d"
	} else if (mode == "warmup") {
		state.camera.dimension = "3d"
	} else if (mode == "writing") {
		state.camera.dimension = "2d"
	} else {
		throw Error(mode)
	}
	state.game.mode = mode
	if (mode == "flick") {
		state.flick.peak_score = 0
	} else if (mode == "tracking") {
		state.tracking.next_change_size_ms = now_ms + size_change_interval_ms
		state.tracking.next_change_move_ms = now_ms + move_change_interval_ms
		state.tracking.next_impact_s = 0
		state.tracking.move.direction = 1
		state.tracking.move.speed = config.tracking.base_speed
		state.tracking.move.direction_change_rate = 0
		state.tracking.peak_score = 0
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
	} else if (mode == "warmup") {
		state.warmup.peak_score = 0
		const rr = px_to_rad(r)
		const cr = calc_core_radius(rr, rr)
		warmup_target.cp = atan(max(0, tan(rr) - tan(cr)))
		warmup_target.cr = cr
		warmup_target.cy = 0
		warmup_target.p = 0
		warmup_target.r = rr
		warmup_target.y = 0
	} else if (mode == "writing") {
		state.writing.peak_score = 0
	} else {
		throw Error(String(mode))
	}
	if (cycle_id) {
		state.game.cycle_id = setTimeout(cycle_game_mode, 50_000)
	}
}
/**
 * @param {number} now_ms
 * @returns {void}
 */
function on_frame(now_ms) {
	const { mode } = state.game
	const { next_update_ms } = state.hud
	const { shoots } = state.stats
	state.timer.prev_ms = state.timer.now_ms
	state.timer.now_ms = now_ms
	state.timer.now_s = now()
	if (mode == "flick") {
		on_frame_flick()
	} else if (mode == "tracking") {
		on_frame_tracking()
	} else if (mode == "warmup") {
		on_frame_warmup()
	} else if (mode == "writing") {
		on_frame_writing()
	} else {
		throw Error(String(mode))
	}
	if (now_ms >= next_update_ms) {
		if (mode == "writing") {
			check_writing_stats()
		} else {
			const window_ms = now_ms - config.stats.window_ms
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
		update_hud()
	}
	draw()
	state.game.raf_id = requestAnimationFrame(on_frame)
}
/** @returns {void} */
function on_frame_flick() {
	const {
		first_dist_mul,
		num_targets,
		pitch_limit
	} = config.flick
	const { base_radius } = config.target
	const { dimension } = state.camera
	const { targets, targets_3d } = state.flick
	if (dimension == "2d") {
		if (!targets.length) {
			const range_px = rad_to_px(to_rad(pitch_limit))
			const base_d = config.flick.first_dist_mul * base_radius
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
/** @returns {void} */
function on_frame_tracking() {
	const { base_radius } = config.target
	const {
		base_speed,
		size_lerp_ms,
		size_steps,
		speed_lerp_ms,
		speed_steps
	} = config.tracking
	const { dimension } = state.camera
	const { now_ms, prev_ms } = state.timer
	const { mb_left } = state.input
	const {
		size_lerp,
		speed_lerp,
		target,
		target_3d
	} = state.tracking
	if (!mb_left) return
	const dt = now_ms - prev_ms
	if (dimension == "2d") {
		const speed = target.r * state.tracking.move.speed * state.tracking.move.direction
		target.x += speed * dt
		if (speed_lerp.active) {
			const p = clamp(
				0,
				(now_ms - speed_lerp.start_ms) / speed_lerp_ms,
				1
			)
			if (p == 1) {
				speed_lerp.active = false
				state.tracking.move.speed = speed_lerp.to
			} else {
				state.tracking.move.speed = lerp(speed_lerp.from, speed_lerp.to, p)
			}
		} else if (now_ms >= state.tracking.next_change_move_ms) {
			if (random() < (state.tracking.move.direction_change_rate += .2)) {
				state.tracking.move.direction *= -1
				state.tracking.move.direction_change_rate = 0
			}
			const index = (random() * speed_steps.length) | 0
			speed_lerp.active = true
			speed_lerp.from = state.tracking.move.speed
			speed_lerp.start_ms = now_ms
			speed_lerp.to = base_speed * speed_steps[index]
			state.tracking.next_change_move_ms = now_ms + config.tracking.move_change_interval_ms
		}
		if (size_lerp.active) {
			const p = clamp(
				0,
				(now_ms - size_lerp.start_ms) / size_lerp_ms,
				1
			)
			if (p == 1) {
				size_lerp.active = false
				target.r = size_lerp.to
			} else {
				target.r = lerp(size_lerp.from, size_lerp.to, p)
			}
			target.cr = calc_core_radius(target.r, base_radius)
		} else if (now_ms >= state.tracking.next_change_size_ms) {
			const index = (random() * size_steps.length) | 0
			size_lerp.active = true
			size_lerp.from = target.r
			size_lerp.start_ms = now_ms
			size_lerp.to = base_radius * size_steps[index]
			state.tracking.next_change_size_ms = now_ms + config.tracking.size_change_interval_ms
		}
		const theta = to_rad(
			state.tracking.move.direction * 30 - 90
		)
		const cd = target.r - target.cr
		target.cx = target.x + cd * cos(theta)
		target.cy = target.y + cd * sin(theta)
	} else {
		const base_radius_rad = px_to_rad(base_radius)
		const speed = target_3d.r * state.tracking.move.speed * state.tracking.move.direction
		target_3d.y += speed * dt
		if (speed_lerp.active) {
			const p = clamp(
				0,
				(now_ms - speed_lerp.start_ms) / speed_lerp_ms,
				1
			)
			if (p == 1) {
				speed_lerp.active = false
				state.tracking.move.speed = speed_lerp.to
			} else {
				state.tracking.move.speed = lerp(speed_lerp.from, speed_lerp.to, p)
			}
		} else if (now_ms >= state.tracking.next_change_move_ms) {
			if (random() < (state.tracking.move.direction_change_rate += .2)) {
				state.tracking.move.direction *= -1
				state.tracking.move.direction_change_rate = 0
			}
			const index = (random() * speed_steps.length) | 0
			speed_lerp.active = true
			speed_lerp.from = state.tracking.move.speed
			speed_lerp.start_ms = now_ms
			speed_lerp.to = base_speed * speed_steps[index]
			state.tracking.next_change_move_ms = now_ms + config.tracking.move_change_interval_ms
		}
		if (size_lerp.active) {
			const p = clamp(
				0,
				(now_ms - size_lerp.start_ms) / size_lerp_ms,
				1
			)
			if (p == 1) {
				size_lerp.active = false
				target_3d.r = size_lerp.to
			} else {
				target_3d.r = lerp(size_lerp.from, size_lerp.to, p)
			}
			target_3d.cr = calc_core_radius(target_3d.r, base_radius_rad)
			target_3d.cp = target_3d.p + target_3d.r - target_3d.cr
		} else if (now_ms >= state.tracking.next_change_size_ms) {
			const index = (random() * size_steps.length) | 0
			size_lerp.active = true
			size_lerp.from = target_3d.r
			size_lerp.start_ms = now_ms
			size_lerp.to = px_to_rad(
				base_radius * size_steps[index]
			)
			state.tracking.next_change_size_ms = now_ms + config.tracking.size_change_interval_ms
		}
		const theta = to_rad(
			state.tracking.move.direction * 30 - 90
		)
		const alpha = target_3d.r - target_3d.cr
		target_3d.cp = target_3d.p - alpha * sin(theta)
		target_3d.cy = target_3d.y + alpha * cos(theta)
	}
	shoot()
}
/** @returns {void} */
function on_frame_warmup() {
	const { base_radius } = config.target
	const { base_speed } = config.warmup
	const { fov, yaw } = state.camera
	const { now_ms, prev_ms } = state.timer
	const { target } = state.warmup
	const base_radius_rad = px_to_rad(base_radius)
	target.r = abs(yaw - target.y) / to_rad(fov / 4) * base_radius_rad * 4 + base_radius_rad * 2
	target.cr = calc_core_radius(target.r, base_radius_rad)
	const dt = now_ms - prev_ms
	const direction = yaw < target.y ? 1 : -1
	const speed = target.r * base_speed * direction
	target.cy = target.y += speed * dt
	target.cp = target.p + target.r - target.cr
}
/** @returns {void} */
function on_frame_writing() {
	const { mb_left } = state.input
	const { now_ms } = state.timer
	const { lines, pointer } = state.writing
	const window_ms = now_ms - config.stats.window_ms
	while (lines.length && lines.at().t <= window_ms) {
		lines.drop()
	}
	if (mb_left) {
		shoot()
	} else if (pointer) {
		state.writing.pointer = null
	}
}
/** @returns {void} */
export function shoot() {
	const { impact_interval_s } = config.tracking
	const { impacts, impacts_3d } = state
	const { dimension, fov, pitch, x, y, yaw } = state.camera
	const { height, width } = state.device
	const { targets, targets_3d } = state.flick
	const { mode } = state.game
	const { shoots } = state.stats
	const { now_ms, now_s, prev_ms } = state.timer
	const { next_impact_s, target, target_3d } = state.tracking
	const { target: warmup_target } = state.warmup
	const { lines, pointer } = state.writing
	let is_hit = false
	let is_crit = false
	if (mode == "flick") {
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
	} else if (mode == "tracking") {
		if (dimension == "2d") {
			const { cr, cy, r, x: target_x, y: target_y } = target
			const dx = target_x - x
			is_hit = dx ** 2 + (target_y - y) ** 2 <= r * r
			is_crit = dx ** 2 + (cy - y) ** 2 <= cr * cr
			if (is_hit && now_s >= next_impact_s) {
				if (is_crit) {
					play_crit()
				} else {
					play_hit()
				}
				impacts.push(
					{ c: is_crit, r, t: now_s, x: x, y: y }
				)
				state.tracking.next_impact_s = now_s + impact_interval_s
			}
		} else {
			const { cp, cr, cy, p, r, y: target_y } = target_3d
			const d_cam = dir_from_yaw_pitch(yaw, pitch)
			const d_body = dir_from_yaw_pitch(target_y, p)
			const d_core = dir_from_yaw_pitch(cy, cp)
			is_hit = dot(d_cam, d_body) >= cos(r)
			is_crit = dot(d_cam, d_core) >= cos(cr)
			if (is_hit && now_s >= next_impact_s) {
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
				state.tracking.next_impact_s = now_s + impact_interval_s
			}
		}
	} else if (mode == "warmup") {
		const { cp, cr, cy, p, r, y: target_y } = warmup_target
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
			warmup_target.cp = tp + r - cr
			warmup_target.cy += ty
			warmup_target.p = tp
			warmup_target.y += ty
		}
	} else if (mode == "writing") {
		const e = { x, y }
		if (pointer) {
			lines.push({ e, s: pointer, t: now_ms })
		}
		state.writing.pointer = e
	} else {
		throw Error(String(mode))
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
/**
 * @param {GameMode} mode
 * @returns {Promise<void>}
 */
export async function start_game(mode) {
	try {
		await document.body.requestPointerLock({ unadjustedMovement: true })
		await document.body.requestFullscreen()
	} catch {
		document.exitPointerLock()
		document.exitFullscreen()
	}
	const now_ms = state.timer.now_ms = state.timer.start_ms = performance.now()
	init_game(mode)
	state.game.raf_id = requestAnimationFrame(() => on_frame(now_ms))
}
/** @returns {void} */
export function stop_game() {
	const { cycle_id, raf_id } = state.game
	cancelAnimationFrame(raf_id)
	if (cycle_id) {
		clearTimeout(cycle_id)
		for (const span of message_el.children) {
			clearTimeout(
				Number(span.getAttribute("timer"))
			)
		}
		message_el.textContent = ""
	}
	dispose_game()
	draw()
}
/**
 * @param {Target3D} t3
 * @returns {Target}
 */
function target_to_2d(t3) {
	const { yaw, pitch } = state.camera
	const cr = rad_to_px(t3.cr)
	const cx = rad_to_px(t3.cy - yaw)
	const cy = -rad_to_px(t3.cp - pitch)
	const r = rad_to_px(t3.r)
	const x = rad_to_px(t3.y - yaw)
	const y = -rad_to_px(t3.p - pitch)
	return { cr, cx, cy, r, x, y }
}

/**
 * @param {Target} t2
 * @returns {Target3D}
 */
function target_to_3d(t2) {
	const { x, y } = state.camera
	const cp = -px_to_rad(t2.cy - y)
	const cr = px_to_rad(t2.cr)
	const cy = px_to_rad(t2.cx - x)
	const p = -px_to_rad(t2.y - y)
	const r = px_to_rad(t2.r)
	const yaw = px_to_rad(t2.x - x)
	return { cp, cr, cy, p, r, y: yaw }
}
/** @returns {void} */
export function update_fov() {
	const { dimension } = state.camera
	const { height, width } = state.device
	const { targets, targets_3d } = state.flick
	const { mode, sens } = state.game
	const { mb_right } = state.input
	const { target, target_3d } = state.tracking
	const { active } = state.tracking.size_lerp
	if (sens == "lol") {
		state.camera.fov = 103
	} else if (sens == "val") {
		if (mb_right) {
			const half_rad = to_rad(51.5)
			const zoom_rad = 2 * atan(tan(half_rad) / 2.5)
			state.camera.fov = to_deg(zoom_rad)
		} else {
			state.camera.fov = 103
		}
	} else if (sens == "cs2") {
		if (mb_right) {
			const vfov_deg = convert_deg_across_aspect(40, height * 4 / 3, height)
			state.camera.fov = convert_deg_across_aspect(vfov_deg, height, width)
		} else {
			const vfov_deg = convert_deg_across_aspect(90, height * 4 / 3, height)
			state.camera.fov = convert_deg_across_aspect(vfov_deg, height, width)
		}
	} else if (sens == "pubg") {
		if (mb_right) {
			state.camera.fov = 40
		} else {
			state.camera.fov = 80
		}
	} else if (sens == "ow") {
		if (mb_right) {
			state.camera.fov = convert_deg_across_aspect(30, height, width)
		} else {
			state.camera.fov = 103
		}
	} else if (sens == "mc") {
		state.camera.fov = convert_deg_across_aspect(110, height, width)
	} else if (sens == "sa") {
		state.camera.fov = convert_deg_across_aspect(85, 1280, width)
	} else {
		throw Error(sens)
	}
	if (mode == "flick") {
		if (sens == "lol" && dimension == "3d") {
			camera_to_2d()
			for (const t of targets_3d) {
				targets.push(target_to_2d(t))
			}
			state.flick.targets_3d = []
		} else if (sens != "lol" && dimension == "2d") {
			camera_to_3d()
			for (const t of targets) {
				targets_3d.push(target_to_3d(t))
			}
			state.flick.targets = []
		}
	} else if (mode == "tracking") {
		if (sens == "lol" && dimension == "3d") {
			camera_to_2d()
			state.tracking.target = target_to_2d(target_3d)
			if (active) {
				state.tracking.size_lerp.from = rad_to_px(state.tracking.size_lerp.from)
				state.tracking.size_lerp.to = rad_to_px(state.tracking.size_lerp.to)
			}
		} else if (sens != "lol" && dimension == "2d") {
			camera_to_3d()
			state.tracking.target_3d = target_to_3d(target)
			if (active) {
				state.tracking.size_lerp.from = px_to_rad(state.tracking.size_lerp.from)
				state.tracking.size_lerp.to = px_to_rad(state.tracking.size_lerp.to)
			}
		}
	}
}