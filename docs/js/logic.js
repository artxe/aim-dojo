import { calc_rad_per_px } from "./calc/calc_sens.js"
import constants from "./constants.js"
import { canvas_3d_el } from "./controller/dom.js"
import { update_hud } from "./controller/hud.js"
import game_mode from "./game_mode/index.js"
import { convert_deg_across_aspect } from "./math.js"
import { px_to_rad } from "./render/camera.js"
import { get_audio_time } from "./sfx.js"
import state, {
	impacts_3d_pool,
	impacts_pool,
	shoots_pool
} from "./state.js"
let canvas_3d_shown = true
let starting = false
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
	const active = game_mode[mode]
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
	state.timer.now_s = get_audio_time()
	active.on_frame()
	if (now_ms >= next_update_ms) {
		active.check_stats?.()
		update_hud()
	}
	const show_3d = state.camera.dimension != "2d"
	if (show_3d != canvas_3d_shown) {
		canvas_3d_shown = show_3d
		canvas_3d_el.style.display = show_3d ? "" : "none"
	}
	active.render()
	state.game.raf_id = requestAnimationFrame(on_frame)
}
/** @returns {void} */
export function reset_run_state() {
	state.camera.pitch = 0
	state.camera.x = 0
	state.camera.y = 0
	state.camera.yaw = 0
	state.impact.rad_size = 0
	state.impacts.clear()
	state.impacts_3d.clear()
	state.stats.count_crit = 0
	state.stats.count_hit = 0
	state.stats.count_shoot = 0
	state.stats.shoots.clear()
	state.stats.sum_crit_ms = 0
	state.stats.sum_hit_ms = 0
	state.stats.sum_shoot_ms = 0
	impacts_3d_pool.clear()
	impacts_pool.clear()
	shoots_pool.clear()
}
/**
 * @param {GameModeName} mode
 * @returns {Promise<void>}
 */
export async function start_game(mode) {
	if (!mode) {
		throw Error()
	}
	if (starting) {
		return
	}
	starting = true
	try {
		await document.body.requestPointerLock({ unadjustedMovement: true })
		await document.body.requestFullscreen()
		const now_ms = state.timer.now_ms = state.timer.start_ms = performance.now()
		state.timer.next_frame_ms = now_ms
		game_mode[state.game.mode = mode].init()
		state.game.raf_id = requestAnimationFrame(() => on_frame(now_ms))
	} catch {
		document.exitPointerLock()
		document.exitFullscreen()
		state.game.mode = null
	} finally {
		starting = false
	}
}
/** @returns {void} */
export function stop_game() {
	const { mode, raf_id } = state.game
	if (!mode) {
		throw Error()
	}
	cancelAnimationFrame(raf_id)
	game_mode[mode].dispose()
	canvas_3d_shown = false
	canvas_3d_el.style.display = "none"
}
/** @returns {void} */
export function update_camera_view() {
	const { width } = state.camera
	const { pubg_fov, sens } = state.game
	const { mb_right } = state.input
	state.camera.dist = 0
	if (sens == "al") {
		const [ vfov, zoom ] = constants.fov.al.render
		state.camera.dimension = "fpp"
		state.camera.vfov = mb_right ? zoom : vfov
		state.camera.fov = convert_deg_across_aspect(state.camera.vfov, 9, 16)
	} else if (sens == "bdo") {
		const [ vfov ] = constants.fov.bdo.render
		state.camera.vfov = vfov
		state.camera.fov = convert_deg_across_aspect(vfov, 9, 16)
		if (mb_right) {
			state.camera.dimension = "fpp"
		} else {
			state.camera.dimension = "tpp"
			state.camera.dist = constants.tpp.bdo
		}
	} else if (sens == "cs2") {
		const [ vfov, zoom ] = constants.fov.cs2.render
		state.camera.dimension = "fpp"
		state.camera.vfov = mb_right ? zoom : vfov
		state.camera.fov = convert_deg_across_aspect(state.camera.vfov, 9, 16)
	} else if (sens == "fn") {
		const [ vfov ] = constants.fov.fn.render
		state.camera.vfov = vfov
		state.camera.fov = convert_deg_across_aspect(vfov, 9, 16)
		if (mb_right) {
			state.camera.dimension = "fpp"
		} else {
			state.camera.dimension = "tpp"
			state.camera.dist = constants.tpp.fn
		}
	} else if (sens == "lol") {
		const [ vfov ] = constants.fov.lol.render
		state.camera.vfov = vfov
		state.camera.fov = convert_deg_across_aspect(vfov, 9, 16)
		if (mb_right) {
			state.camera.dimension = "fpp"
		} else {
			state.camera.dimension = "2d"
		}
	} else if (sens == "mc") {
		const [ vfov ] = constants.fov.mc.render
		state.camera.vfov = vfov
		state.camera.fov = convert_deg_across_aspect(vfov, 9, 16)
		if (mb_right) {
			state.camera.dimension = "fpp"
		} else {
			state.camera.dimension = "tpp"
			state.camera.dist = constants.tpp.mc
		}
	} else if (sens == "ow") {
		const [ vfov, zoom ] = constants.fov.ow.render
		state.camera.dimension = "fpp"
		state.camera.vfov = mb_right ? zoom : vfov
		state.camera.fov = convert_deg_across_aspect(state.camera.vfov, 9, 16)
	} else if (sens == "pubg") {
		const [ vfov103, vfov80, zoom ] = constants.fov.pubg.render
		if (mb_right) {
			state.camera.dimension = "fpp"
			state.camera.vfov = zoom
			state.camera.fov = convert_deg_across_aspect(zoom, 9, 16)
		} else if (pubg_fov == 103) {
			state.camera.dimension = "fpp"
			state.camera.fov = pubg_fov
			state.camera.vfov = vfov103
		} else if (pubg_fov == 80) {
			state.camera.dimension = "tpp"
			state.camera.dist = constants.tpp.pubg
			state.camera.fov = pubg_fov
			state.camera.vfov = vfov80
		} else {
			throw Error(pubg_fov)
		}
	} else if (sens == "r6") {
		const [ vfov, zoom ] = constants.fov.r6.render
		state.camera.dimension = "fpp"
		state.camera.vfov = mb_right ? zoom : vfov
		state.camera.fov = convert_deg_across_aspect(state.camera.vfov, 9, 16)
	} else if (sens == "sa") {
		const [ vfov ] = constants.fov.sa.render
		state.camera.dimension = "fpp"
		state.camera.vfov = vfov
		state.camera.fov = convert_deg_across_aspect(vfov, 9, 16)
	} else if (sens == "val") {
		const [ vfov, zoom ] = constants.fov.val.render
		state.camera.dimension = "fpp"
		state.camera.vfov = mb_right ? zoom : vfov
		state.camera.fov = convert_deg_across_aspect(state.camera.vfov, 9, 16)
	} else {
		throw Error(sens)
	}
	state.camera.dist *= constants.tpp.render_dist_scale
	state.camera.sens = calc_rad_per_px(state.camera.fov, width)
	state.impact.rad_size = px_to_rad(constants.impact.px_size)
}