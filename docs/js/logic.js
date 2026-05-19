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
import constants from "./constants.js"
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
	if (state.input.key_space) {
		if (now_ms + .5 < state.timer.next_frame_ms) {
			state.game.raf_id = requestAnimationFrame(on_frame)
			return
		}
		state.timer.next_frame_ms = now_ms + constants.frame_limit.space_hold_interval_ms
	} else {
		state.timer.next_frame_ms = now_ms
	}
	state.timer.prev_ms = state.timer.now_ms
	state.timer.now_ms = now_ms
	state.timer.now_s = now()
	game_mode[mode].on_frame()
	if (now_ms >= next_update_ms) {
		game_mode[mode].check_stats?.()
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
	state.timer.next_frame_ms = now_ms
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
	const { sens } = state.game
	const { mb_right } = state.input
	if (sens == "al") {
		state.camera.dimension = "fps"
		if (mb_right) {
			state.camera.fov = convert_deg_across_aspect(60 * 1.55, 4 / 3, width / height)
		} else {
			state.camera.fov = convert_deg_across_aspect(70 * 1.55, 4 / 3, width / height)
		}
	} else if (sens == "cs2") {
		state.camera.dimension = "fps"
		if (mb_right) {
			state.camera.fov = convert_deg_across_aspect(40, 4 / 3, width / height)
		} else {
			state.camera.fov = convert_deg_across_aspect(90, 4 / 3, width / height)
		}
	} else if (sens == "fn") {
		state.camera.fov = 80
		if (mb_right) {
			state.camera.dimension = "fps"
		} else {
			state.camera.dimension = "tps"
		}
	} else if (sens == "lol") {
		state.camera.fov = 103
		if (mb_right) {
			state.camera.dimension = "fps"
		} else {
			state.camera.dimension = "2d"
		}
	} else if (sens == "mc") {
		state.camera.fov = convert_deg_across_aspect(110, height, width)
		if (mb_right) {
			state.camera.dimension = "fps"
		} else {
			state.camera.dimension = "tps"
		}
	} else if (sens == "ow") {
		state.camera.dimension = "fps"
		if (mb_right) {
			state.camera.fov = convert_deg_across_aspect(30, height, width)
		} else {
			state.camera.fov = 103
		}
	} else if (sens == "pubg") {
		if (mb_right) {
			state.camera.dimension = "fps"
			state.camera.fov = 80 / 1.5
		} else {
			state.camera.dimension = "tps"
			state.camera.fov = 80
		}
	} else if (sens == "r6") {
		state.camera.dimension = "fps"
		if (mb_right) {
			state.camera.fov = convert_deg_across_aspect(90, 2.5, width / height)
		} else {
			state.camera.fov = convert_deg_across_aspect(81, height, width)
		}
	} else if (sens == "sa") {
		state.camera.dimension = "fps"
		state.camera.fov = convert_deg_across_aspect(85, 4 / 3, width / height)
	} else if (sens == "val") {
		state.camera.dimension = "fps"
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
}