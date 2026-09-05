import {
	calc_rad_per_px,
	calc_real_hfov,
	calc_sens_cs2,
	calc_sens_rb,
	calc_sens_snap,
	calc_sens_val
} from "./calc/calc_sens.js"
import constants from "./constants.js"
import { canvas_3d_el } from "./controller/dom.js"
import {
	close_game_sens_list,
	sync_game_resolution
} from "./controller/game_sens.js"
import { update_hud } from "./controller/hud.js"
import game_mode from "./game_mode/index.js"
import { convert_deg_across_aspect } from "./math.js"
import { calc_camera_sens, px_to_rad } from "./render/camera.js"
import state, {
	impacts_3d_pool,
	impacts_pool,
	shoots_pool
} from "./state.js"
let canvas_3d_shown = true
let starting = false
/** @returns {number} */
export function ads_stage_count() {
	const { ads_scope, sens } = state.game
	if (sens == "cs2") {
		return constants.fov.cs2.ads_stage2[ads_scope.cs2] ? 3 : 2
	}
	if (sens == "lol") {
		return 1
	}
	if (sens == "sa") {
		return 3
	}
	if (sens == "val") {
		return constants.fov.val.ads_stage2[ads_scope.val] ? 3 : 2
	}
	return 2
}
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
	state.timer.frame_count++
	active.on_frame()
	if (now_ms >= next_update_ms) {
		active.check_stats?.()
		update_hud(active)
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
	close_game_sens_list()
	try {
		await document.body.requestPointerLock({ unadjustedMovement: true })
		await document.body.requestFullscreen()
		const active = game_mode[state.game.mode = mode]
		const now_ms = state.timer.now_ms = state.timer.start_ms = performance.now()
		state.input.ads_stage = 0
		state.timer.fps_ms = now_ms
		state.timer.frame_count = 0
		state.timer.next_frame_ms = now_ms
		sync_game_resolution()
		active.init()
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
export function update_camera_projection() {
	const {
		fov_axis,
		height,
		sens_scale,
		view_fov,
		width
	} = state.camera
	const vfov = convert_deg_across_aspect(
		calc_real_hfov(fov_axis, view_fov, width, height),
		width,
		height
	)
	const fov = convert_deg_across_aspect(vfov, height, width)
	const sens = calc_camera_sens(fov) * sens_scale
	state.camera.fov = fov
	state.camera.sens = sens
	state.camera.sens_error = sens / calc_rad_per_px(fov, width) - 1
	state.camera.vfov = vfov
	state.impact.rad_size = px_to_rad(constants.impact.px_size)
}
/** @returns {void} */
export function update_camera_view() {
	const {
		ads_scope,
		cpi_scale,
		height: game_height,
		pubg_fov,
		sens,
		width: game_width
	} = state.game
	const { ads_stage } = state.input
	const calc_height = game_height / cpi_scale
	const calc_width = game_width / cpi_scale
	const mb_right = ads_stage > 0
	let ads_fov = 0
	/** @type {"2d"|"fpp"|"tpp"} */
	let dimension = "fpp"
	let dist = 0
	/** @type {FovAxis} */
	let fov_axis
	let sens_scale = 1
	let view_fov
	if (sens == "al") {
		const { ads, axis, hipfire } = constants.fov.al
		ads_fov = mb_right ? ads[ads_scope.al] : 0
		fov_axis = axis
		view_fov = ads_fov || hipfire
	} else if (sens == "bdo") {
		const { axis, hipfire, zoom } = constants.fov.bdo
		fov_axis = axis
		view_fov = mb_right ? zoom : hipfire
		if (!mb_right) {
			dimension = "tpp"
			dist = constants.tpp.bdo
		}
	} else if (sens == "cs2") {
		const {
			ads,
			ads_ref,
			ads_stage2,
			axis,
			hipfire
		} = constants.fov.cs2
		const scope = ads_scope.cs2
		const stage2 = ads_stage2[scope]
		ads_fov = mb_right ? ads_ref[scope] : 0
		fov_axis = axis
		view_fov = mb_right ? ads[scope] : hipfire
		if (ads_stage == 2 && stage2) {
			view_fov = stage2
		}
		if (ads_fov && ads_fov != view_fov) {
			sens_scale = calc_sens_cs2(ads_fov, calc_width, calc_height)
				/ calc_sens_cs2(view_fov, calc_width, calc_height)
		}
	} else if (sens == "fn") {
		const { ads, axis, hipfire } = constants.fov.fn
		const scope = ads_scope.fn
		ads_fov = mb_right ? ads[scope] : 0
		fov_axis = axis
		view_fov = ads_fov || hipfire
		if (!mb_right) {
			dimension = "tpp"
			dist = constants.tpp.fn
		} else if (scope == "targeting65" || scope == "targeting80") {
			dimension = "tpp"
			dist = constants.tpp.fn_ads
		}
	} else if (sens == "lol") {
		const { axis, hipfire } = constants.fov.lol
		dimension = "2d"
		fov_axis = axis
		view_fov = hipfire
	} else if (sens == "mc") {
		const { axis, hipfire } = constants.fov.mc
		fov_axis = axis
		view_fov = hipfire
		if (!mb_right) {
			dimension = "tpp"
			dist = constants.tpp.mc
		}
	} else if (sens == "ow") {
		const { ads, axis, hipfire, scopes } = constants.fov.ow
		ads_fov = mb_right ? ads[ads_scope.ow] : 0
		fov_axis = mb_right ? scopes.axis : axis
		view_fov = ads_fov || hipfire
	} else if (sens == "pubg") {
		const { ads, axis } = constants.fov.pubg
		ads_fov = mb_right ? ads[ads_scope.pubg] : 0
		fov_axis = axis
		view_fov = ads_fov || pubg_fov
		if (!mb_right && pubg_fov == 80) {
			dimension = "tpp"
			dist = constants.tpp.pubg
		}
	} else if (sens == "r6") {
		const { ads, axis, x1 } = constants.fov.r6
		ads_fov = mb_right ? ads[ads_scope.r6] : 0
		fov_axis = axis
		view_fov = ads_fov || x1
	} else if (sens == "rb") {
		const { ads, ads_ref, axis, base } = constants.fov.rb
		const scope = ads_scope.rb
		ads_fov = mb_right ? ads_ref[scope] : 0
		fov_axis = axis
		view_fov = mb_right ? ads[scope] : base
		if (ads_fov && ads_fov != view_fov) {
			sens_scale = calc_sens_rb(ads_fov, calc_width, calc_height) * view_fov
				/ (calc_sens_rb(view_fov, calc_width, calc_height) * ads_fov)
		}
	} else if (sens == "sa") {
		const {
			axis,
			hipfire,
			x15,
			x15_sens,
			x5,
			x5_sens
		} = constants.fov.sa
		fov_axis = axis
		if (ads_stage == 0) {
			view_fov = hipfire
		} else if (ads_stage == 1) {
			sens_scale = x5_sens
			view_fov = x5
		} else if (ads_stage == 2) {
			sens_scale = x15_sens
			view_fov = x15
		} else {
			throw Error(ads_stage)
		}
	} else if (sens == "val") {
		const {
			ads,
			ads_ref,
			ads_stage2,
			axis,
			hipfire
		} = constants.fov.val
		const scope = ads_scope.val
		const stage2 = ads_stage2[scope]
		ads_fov = mb_right ? ads_ref[scope] : 0
		fov_axis = axis
		view_fov = mb_right ? ads[scope] : hipfire
		if (ads_stage == 2 && stage2) {
			view_fov = stage2
		}
		if (ads_fov && ads_fov != view_fov) {
			sens_scale = calc_sens_val(ads_fov, calc_width, calc_height)
				/ calc_sens_val(view_fov, calc_width, calc_height)
		}
	} else {
		throw Error(sens)
	}
	state.camera.dimension = dimension
	state.camera.dist = dist * constants.tpp.render_dist_scale
	state.camera.fov_axis = fov_axis
	state.camera.sens_scale = sens_scale * calc_sens_snap(
		sens,
		ads_fov,
		calc_width,
		calc_height,
		cpi_scale,
		pubg_fov
	)
	state.camera.view_fov = view_fov
	update_camera_projection()
}