import { px_to_rad, rad_to_px } from "./camera.js"
import constants from "./constants.js"
import game_mode from "./game_mode/index.js"
import {
	atan,
	convert_deg_across_aspect,
	cos,
	sin,
	tan,
	to_deg,
	to_rad
} from "./math.js"
import state from "./state.js"
import { now } from "./sfx.js"
import { draw } from "./renderer.js"
import { update_hud } from "./controller/screen.js"
/** @returns {void} */
export function check_stats() {
	const { shoots } = state.stats
	const { now_ms } = state.timer
	const window_ms = now_ms - constants.stats.window_ms
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
/**
 * @param {number} now_ms
 * @returns {void}
 */
function on_frame(now_ms) {
	const { mode } = state.game
	const { next_update_ms } = state.hud
	if (!mode) throw Error()
	state.timer.prev_ms = state.timer.now_ms
	state.timer.now_ms = now_ms
	state.timer.now_s = now()
	game_mode[mode].on_frame()
	if (now_ms >= next_update_ms) {
		game_mode[mode].check_stats()
		update_hud()
	}
	draw()
	state.game.raf_id = requestAnimationFrame(on_frame)
}
/** @returns {Promise<void>} */
export async function start_game() {
	const { mode } = state.game
	if (!mode) throw Error()
	try {
		await document.body.requestPointerLock({ unadjustedMovement: true })
		await document.body.requestFullscreen()
	} catch {
		document.exitPointerLock()
		document.exitFullscreen()
	}
	const now_ms = state.timer.now_ms = state.timer.start_ms = performance.now()
	game_mode[mode].init()
	state.game.raf_id = requestAnimationFrame(() => on_frame(now_ms))
}
/** @returns {void} */
export function stop_game() {
	const { cycle_id, mode, raf_id } = state.game
	if (!mode) throw Error()
	cancelAnimationFrame(raf_id)
	if (cycle_id) {
		clearTimeout(cycle_id)
	}
	game_mode[mode].dispose()
	draw()
}
/**
 * @param {Target3D} t3
 * @returns {Target}
 */
export function target_to_2d(t3) {
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
export function target_to_3d(t2) {
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
	const { height, width } = state.camera
	const { mode, sens } = state.game
	const { mb_right } = state.input
	if (sens == "cs2") {
		if (mb_right) {
			const vfov_deg = convert_deg_across_aspect(40, height * 4 / 3, height)
			state.camera.fov = convert_deg_across_aspect(vfov_deg, height, width)
		} else {
			const vfov_deg = convert_deg_across_aspect(90, height * 4 / 3, height)
			state.camera.fov = convert_deg_across_aspect(vfov_deg, height, width)
		}
	} else if (sens == "fn") {
		state.camera.fov = 80
	} else if (sens == "lol") {
		state.camera.fov = 103
	} else if (sens == "mc") {
		state.camera.fov = convert_deg_across_aspect(110, height, width)
	} else if (sens == "ow") {
		if (mb_right) {
			state.camera.fov = convert_deg_across_aspect(30, height, width)
		} else {
			state.camera.fov = 103
		}
	} else if (sens == "pubg") {
		if (mb_right) {
			state.camera.fov = 40
		} else {
			state.camera.fov = 80
		}
	} else if (sens == "sa") {
		state.camera.fov = convert_deg_across_aspect(85, height * 4 / 3, width)
	} else if (sens == "val") {
		if (mb_right) {
			const half_rad = to_rad(51.5)
			const zoom_rad = 2 * atan(tan(half_rad) / 2.5)
			state.camera.fov = to_deg(zoom_rad)
		} else {
			state.camera.fov = 103
		}
	} else {
		throw Error(sens)
	}
	if (mode) {
		game_mode[mode].update_fov()
	}
}