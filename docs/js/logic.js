import { update_hud } from "./controller/screen.js"
import game_mode from "./game_mode/index.js"
import {
	atan,
	convert_deg_across_aspect,
	tan,
	to_deg,
	to_rad
} from "./math.js"
import { now } from "./sfx.js"
import state from "./state.js"
/**
 * @param {number} now_ms
 * @returns {void}
 */
function on_frame(now_ms) {
	const { mode } = state.game
	const { next_update_ms } = state.hud
	if (!mode) {
		throw Error()
	}
	state.timer.prev_ms = state.timer.now_ms
	state.timer.now_ms = now_ms
	state.timer.now_s = now()
	game_mode[mode].on_frame()
	if (now_ms >= next_update_ms) {
		game_mode[mode].check_stats()
		update_hud()
	}
	game_mode[mode].render()
	state.game.raf_id = requestAnimationFrame(on_frame)
}
/** @returns {Promise<void>} */
export async function start_game() {
	const { mode } = state.game
	if (!mode) {
		throw Error()
	}
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
	const { mode, raf_id } = state.game
	if (!mode) {
		throw Error()
	}
	cancelAnimationFrame(raf_id)
	game_mode[mode].dispose()
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
		state.camera.fov = convert_deg_across_aspect(99, height, width)
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