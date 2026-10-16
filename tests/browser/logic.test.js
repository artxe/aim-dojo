import {
	calc_rad_per_px,
	calc_real_hfov,
	calc_sens_cs2,
	calc_sens_rb,
	calc_sens_snap,
	calc_sens_val
} from "../../docs/js/calc/calc_sens.js"
import constants from "../../docs/js/constants.js"
import { tan, to_rad } from "../../docs/js/math.js"
import state, {
	impacts_3d_pool,
	impacts_pool,
	shoots_pool
} from "../../docs/js/state.js"
import { load_page } from "./helpers/dom.js"
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest"
const GAME_HEIGHT = 1_440
const GAME_WIDTH = 2_560
const START_MS = 1_000
const mocks = vi.hoisted(
	() => {
		/** @returns {GameMode} */
		function stub_mode() {
			return {
				check_stats: vi.fn(),
				clear_score: vi.fn(),
				dispose: vi.fn(),
				init: vi.fn(),
				on_frame: vi.fn(),
				render: vi.fn(),
				shoot: vi.fn(),
				update_hud: vi.fn()
			}
		}
		const aim_booster = stub_mode()
		delete aim_booster.check_stats
		return {
			close_game_sens_list: vi.fn(),
			modes: {
				aim_booster,
				h_tracking: stub_mode(),
				precision: stub_mode(),
				writing: stub_mode()
			},
			sync_game_resolution: vi.fn()
		}
	}
)
vi.mock(
	"../../docs/js/controller/game_sens.js",
	() => ({
		close_game_sens_list: mocks.close_game_sens_list,
		sync_game_resolution: mocks.sync_game_resolution
	})
)
vi.mock(
	"../../docs/js/game_mode/index.js",
	() => ({ default: mocks.modes })
)
load_page()
const { canvas_3d_el } = await import("../../docs/js/controller/dom.js")
const logic = await import("../../docs/js/logic.js")
/** @type {FrameRequestCallback[]} */
const frames = []
/**
 * @param {GameSensName} sens
 * @param {AdsStage} ads_stage
 * @param {{ dimension: string, dist: number, fov_axis: FovAxis, sens_scale: number, view_fov: number }} expected
 * @returns {void}
 */
function expect_view(sens, ads_stage, expected) {
	state.game.sens = sens
	state.input.ads_stage = ads_stage
	logic.update_camera_view()
	const {
		dimension,
		dist,
		fov_axis,
		sens_scale,
		view_fov
	} = state.camera
	expect({ dimension, dist, fov_axis }).toEqual(
		{
			dimension: expected.dimension,
			dist: expected.dist,
			fov_axis: expected.fov_axis
		}
	)
	expect(sens_scale).toBeCloseTo(expected.sens_scale, 12)
	expect(view_fov).toBeCloseTo(expected.view_fov, 12)
}
/**
 * @param {number} width
 * @param {number} height
 * @returns {{ fov: number, vfov: number }}
 */
function project(width, height) {
	state.camera.height = height
	state.camera.width = width
	logic.update_camera_projection()
	const { fov, vfov } = state.camera
	return { fov, vfov }
}
/**
 * @param {number} now_ms
 * @returns {void}
 */
function run_frame(now_ms) {
	const frame = frames[frames.length - 1]
	if (!frame) {
		throw Error()
	}
	frame(now_ms)
}
/**
 * @param {GameSensName} sens
 * @param {number} ads_fov
 * @returns {number}
 */
function snap(sens, ads_fov) {
	const { cpi_scale, pubg_fov } = state.game
	return calc_sens_snap(
		sens,
		ads_fov,
		GAME_WIDTH / cpi_scale,
		GAME_HEIGHT / cpi_scale,
		cpi_scale,
		pubg_fov
	)
}
describe(
	"logic.js",
	() => {
		beforeEach(
			() => {
				vi.clearAllMocks()
				frames.length = 0
				vi.stubGlobal(
					"requestAnimationFrame",
					vi.fn(
						/** @param {FrameRequestCallback} callback */
						callback => frames.push(callback)
					)
				)
				vi.stubGlobal("cancelAnimationFrame", vi.fn())
				vi.spyOn(performance, "now").mockReturnValue(START_MS)
				vi.spyOn(
					document.body,
					"requestFullscreen"
				).mockResolvedValue(void 0)
				vi.spyOn(
					document.body,
					"requestPointerLock"
				).mockResolvedValue(void 0)
				vi.spyOn(document, "exitFullscreen").mockResolvedValue(void 0)
				vi.spyOn(document, "exitPointerLock").mockReturnValue(void 0)
				vi.spyOn(
					document,
					"pointerLockElement",
					"get"
				).mockReturnValue(document.body)
				state.camera.dimension = "2d"
				state.camera.dist = 0
				state.camera.height = 1_080
				state.camera.sens_scale = 1
				state.camera.width = 1_920
				state.game.ads_scope = { ...constants.game.ads_scope }
				state.game.cpi_scale = 1
				state.game.height = GAME_HEIGHT
				state.game.mode = null
				state.game.pubg_fov = 80
				state.game.sens = "val"
				state.game.width = GAME_WIDTH
				state.hud.next_update_ms = 0
				state.input.ads_stage = 0
				state.input.key_space = false
			}
		)
		afterEach(
			() => {
				vi.restoreAllMocks()
				vi.unstubAllGlobals()
			}
		)
		describe(
			"ads_stage_count",
			() => {
				it(
					"cs2 and val have a third stage only for a scope with a second zoom",
					() => {
						state.game.sens = "cs2"
						state.game.ads_scope.cs2 = "awp"
						expect(logic.ads_stage_count()).toBe(3)
						state.game.ads_scope.cs2 = "auto"
						expect(logic.ads_stage_count()).toBe(3)
						state.game.ads_scope.cs2 = "aug"
						expect(logic.ads_stage_count()).toBe(2)
						state.game.sens = "val"
						state.game.ads_scope.val = "operator"
						expect(logic.ads_stage_count()).toBe(3)
						state.game.ads_scope.val = "vandal"
						expect(logic.ads_stage_count()).toBe(2)
					}
				)
				it(
					"lol has no ADS, sa always has two zooms and every other game one",
					() => {
						state.game.sens = "lol"
						expect(logic.ads_stage_count()).toBe(1)
						state.game.sens = "sa"
						expect(logic.ads_stage_count()).toBe(3)
						for (const sens of [
							"al",
							"bdo",
							"fn",
							"mc",
							"ow",
							"pubg",
							"r6",
							"rb"
						]) {
							state.game.sens = /** @type {GameSensName} */(sens)/**/
							expect(logic.ads_stage_count()).toBe(2)
						}
					}
				)
			}
		)
		describe(
			"on_frame",
			() => {
				it(
					"checks stats and updates the HUD only once next_update_ms is reached",
					async () => {
						const mode = mocks.modes.precision
						await logic.start_game("precision")
						state.hud.next_update_ms = START_MS + 50
						run_frame(0)
						run_frame(START_MS + 49)
						expect(mode.check_stats).not.toHaveBeenCalled()
						expect(mode.update_hud).not.toHaveBeenCalled()
						run_frame(START_MS + 50)
						expect(mode.check_stats).toHaveBeenCalledOnce()
						expect(mode.update_hud).toHaveBeenCalledOnce()
						expect(
							vi.mocked(mode.check_stats).mock.invocationCallOrder[0]
						).toBeLessThan(
							Number(
								vi.mocked(mode.update_hud).mock.invocationCallOrder[0]
							)
						)
					}
				)
				it(
					"holding space limits frames to the space-hold interval with half a millisecond of slack",
					async () => {
						const mode = mocks.modes.precision
						const interval = constants.frame_limit.space_hold_interval_ms
						expect(interval).toBeCloseTo(1_000 / 30, 12)
						await logic.start_game("precision")
						state.input.key_space = true
						run_frame(0)
						expect(state.timer.next_frame_ms).toBe(START_MS + interval)
						run_frame(START_MS + 16)
						run_frame(START_MS + 32.8)
						expect(mode.on_frame).toHaveBeenCalledOnce()
						expect(state.timer.frame_count).toBe(1)
						expect(state.timer.now_ms).toBe(START_MS)
						expect(frames).toHaveLength(4)
						expect(state.game.raf_id).toBe(4)
						run_frame(START_MS + 32.9)
						expect(mode.on_frame).toHaveBeenCalledTimes(2)
						expect(state.timer.now_ms).toBe(START_MS + 32.9)
						expect(state.timer.next_frame_ms).toBe(START_MS + 32.9 + interval)
						state.input.key_space = false
						run_frame(START_MS + 40)
						expect(mode.on_frame).toHaveBeenCalledTimes(3)
						expect(state.timer.next_frame_ms).toBe(START_MS + 40)
					}
				)
				it(
					"shows the 3D canvas when the view leaves 2d and hides it when it returns, writing only on a change",
					async () => {
						state.game.mode = "precision"
						logic.stop_game()
						await logic.start_game("precision")
						state.camera.dimension = "fpp"
						run_frame(0)
						expect(canvas_3d_el.style.display).toBe("")
						canvas_3d_el.style.display = "block"
						state.camera.dimension = "tpp"
						run_frame(START_MS + 16)
						expect(canvas_3d_el.style.display).toBe("block")
						state.camera.dimension = "2d"
						run_frame(START_MS + 32)
						expect(canvas_3d_el.style.display).toBe("none")
						canvas_3d_el.style.display = "block"
						run_frame(START_MS + 48)
						expect(canvas_3d_el.style.display).toBe("block")
						state.camera.dimension = "fpp"
						run_frame(START_MS + 64)
						expect(canvas_3d_el.style.display).toBe("")
					}
				)
				it(
					"the first frame runs at the start time, then each frame advances the clock, runs and renders the mode and requests the next",
					async () => {
						const mode = mocks.modes.precision
						await logic.start_game("precision")
						run_frame(9_999)
						expect(state.timer.now_ms).toBe(START_MS)
						expect(state.timer.prev_ms).toBe(START_MS)
						expect(state.timer.frame_count).toBe(1)
						expect(mode.on_frame).toHaveBeenCalledOnce()
						expect(mode.render).toHaveBeenCalledOnce()
						expect(state.game.raf_id).toBe(2)
						run_frame(START_MS + 16)
						expect(state.timer.now_ms).toBe(START_MS + 16)
						expect(state.timer.prev_ms).toBe(START_MS)
						expect(state.timer.frame_count).toBe(2)
						expect(mode.on_frame).toHaveBeenCalledTimes(2)
						expect(mode.render).toHaveBeenCalledTimes(2)
						expect(state.game.raf_id).toBe(3)
						expect(
							vi.mocked(mode.on_frame).mock.invocationCallOrder[1]
						).toBeLessThan(
							Number(
								vi.mocked(mode.render).mock.invocationCallOrder[1]
							)
						)
					}
				)
				it(
					"throws when the mode is gone",
					async () => {
						await logic.start_game("precision")
						state.game.mode = null
						expect(() => run_frame(START_MS + 16)).toThrow()
					}
				)
				it(
					"updates the HUD of a mode without check_stats",
					async () => {
						await logic.start_game("aim_booster")
						run_frame(0)
						expect(
							mocks.modes.aim_booster.update_hud
						).toHaveBeenCalledOnce()
					}
				)
			}
		)
		it(
			"reset_run_state zeroes the camera offsets and stats and empties the queues and pools",
			() => {
				const impact = impacts_pool.obtain()
				const impact_3d = impacts_3d_pool.obtain()
				const shoot = shoots_pool.obtain()
				state.camera.pitch = .2
				state.camera.x = 10
				state.camera.y = 20
				state.camera.yaw = .3
				state.impact.rad_size = .01
				state.impacts.push(impacts_pool.obtain())
				state.impacts_3d.push(impacts_3d_pool.obtain())
				state.stats.count_crit = 1
				state.stats.count_hit = 2
				state.stats.count_shoot = 3
				state.stats.shoots.push(shoots_pool.obtain())
				state.stats.sum_crit_ms = 4
				state.stats.sum_hit_ms = 5
				state.stats.sum_shoot_ms = 6
				impacts_pool.recycle(impact)
				impacts_3d_pool.recycle(impact_3d)
				shoots_pool.recycle(shoot)
				logic.reset_run_state()
				expect(state.camera).toMatchObject(
					{ pitch: 0, x: 0, y: 0, yaw: 0 }
				)
				expect(state.impact.rad_size).toBe(0)
				expect(state.impacts).toHaveLength(0)
				expect(state.impacts_3d).toHaveLength(0)
				expect(state.stats).toMatchObject(
					{
						count_crit: 0,
						count_hit: 0,
						count_shoot: 0,
						sum_crit_ms: 0,
						sum_hit_ms: 0,
						sum_shoot_ms: 0
					}
				)
				expect(state.stats.shoots).toHaveLength(0)
				expect(impacts_pool.obtain()).not.toBe(impact)
				expect(impacts_3d_pool.obtain()).not.toBe(impact_3d)
				expect(shoots_pool.obtain()).not.toBe(shoot)
			}
		)
		describe(
			"start_game",
			() => {
				it(
					"a pointer lock lost while entering fullscreen exits fullscreen, leaves no mode and requests no frame",
					async () => {
						const lock = vi.spyOn(
							document,
							"pointerLockElement",
							"get"
						).mockReturnValue(document.body)
						vi.mocked(
							document.body.requestFullscreen
						).mockImplementationOnce(
							async () => {
								lock.mockReturnValue(null)
							}
						)
						vi.spyOn(
							document,
							"fullscreenElement",
							"get"
						).mockReturnValue(document.body)
						await logic.start_game("precision")
						expect(document.exitFullscreen).toHaveBeenCalledOnce()
						expect(state.game.mode).toBe(null)
						expect(mocks.modes.precision.init).not.toHaveBeenCalled()
						expect(requestAnimationFrame).not.toHaveBeenCalled()
					}
				)
				it(
					"a refused fullscreen exits the pointer lock, never calls exitFullscreen and leaves no mode",
					async () => {
						vi.mocked(
							document.body.requestFullscreen
						).mockRejectedValueOnce(Error("denied"))
						await logic.start_game("writing")
						expect(document.exitPointerLock).toHaveBeenCalledOnce()
						expect(document.exitFullscreen).not.toHaveBeenCalled()
						expect(state.game.mode).toBe(null)
						expect(mocks.modes.writing.init).not.toHaveBeenCalled()
						expect(requestAnimationFrame).not.toHaveBeenCalled()
					}
				)
				it(
					"a refused pointer lock exits the pointer lock, never calls exitFullscreen and leaves no mode",
					async () => {
						vi.mocked(
							document.body.requestPointerLock
						).mockRejectedValueOnce(Error("denied"))
						await logic.start_game("precision")
						expect(
							document.body.requestFullscreen
						).not.toHaveBeenCalled()
						expect(document.exitPointerLock).toHaveBeenCalledOnce()
						expect(document.exitFullscreen).not.toHaveBeenCalled()
						expect(state.game.mode).toBe(null)
						expect(mocks.modes.precision.init).not.toHaveBeenCalled()
						expect(requestAnimationFrame).not.toHaveBeenCalled()
					}
				)
				it(
					"a second start while one is pending is ignored, and a later one runs",
					async () => {
						/** @type {PromiseWithResolvers<void>} */
						const lock = Promise.withResolvers()
						vi.mocked(
							document.body.requestPointerLock
						).mockReturnValueOnce(lock.promise)
						const first = logic.start_game("precision")
						await logic.start_game("writing")
						expect(
							document.body.requestPointerLock
						).toHaveBeenCalledOnce()
						expect(mocks.close_game_sens_list).toHaveBeenCalledOnce()
						lock.resolve()
						await first
						expect(state.game.mode).toBe("precision")
						expect(mocks.modes.writing.init).not.toHaveBeenCalled()
						await logic.start_game("writing")
						expect(state.game.mode).toBe("writing")
						expect(mocks.modes.writing.init).toHaveBeenCalledOnce()
					}
				)
				it(
					"a throwing init exits both once in fullscreen, waiting for the exit, nulls the mode it had set and requests no frame",
					async () => {
						vi.mocked(mocks.modes.h_tracking.init).mockImplementationOnce(
							() => {
								throw Error("init")
							}
						)
						vi.spyOn(
							document,
							"fullscreenElement",
							"get"
						).mockReturnValue(document.body)
						/** @type {PromiseWithResolvers<void>} */
						const exit = Promise.withResolvers()
						vi.mocked(document.exitFullscreen).mockReturnValueOnce(exit.promise)
						let settled = false
						const starting = logic.start_game("h_tracking").then(
							() => {
								settled = true
							}
						)
						await new Promise(
							resolve => setTimeout(resolve, 10)
						)
						expect(document.exitFullscreen).toHaveBeenCalledOnce()
						expect(settled).toBe(false)
						exit.resolve()
						await starting
						expect(document.exitPointerLock).toHaveBeenCalledOnce()
						expect(state.game.mode).toBe(null)
						expect(requestAnimationFrame).not.toHaveBeenCalled()
						await logic.start_game("h_tracking")
						expect(state.game.mode).toBe("h_tracking")
					}
				)
				it(
					"locks the pointer, enters fullscreen, then resets the run clock and stage, syncs the resolution, inits the mode and requests a frame",
					async () => {
						state.input.ads_stage = 2
						state.timer.frame_count = 9
						state.timer.prev_ms = 9
						const starting = logic.start_game("precision")
						expect(mocks.close_game_sens_list).toHaveBeenCalledOnce()
						await starting
						expect(
							document.body.requestPointerLock
						).toHaveBeenCalledWith({ unadjustedMovement: true })
						expect(
							document.body.requestFullscreen
						).toHaveBeenCalledOnce()
						expect(state.game.mode).toBe("precision")
						expect(state.input.ads_stage).toBe(0)
						expect(state.timer).toMatchObject(
							{
								fps_ms: START_MS,
								frame_count: 0,
								next_frame_ms: START_MS,
								now_ms: START_MS,
								prev_ms: START_MS,
								start_ms: START_MS
							}
						)
						expect(mocks.sync_game_resolution).toHaveBeenCalledOnce()
						expect(mocks.modes.precision.init).toHaveBeenCalledOnce()
						expect(frames).toHaveLength(1)
						expect(state.game.raf_id).toBe(1)
						const order = [
							mocks.close_game_sens_list,
							vi.mocked(
								document.body.requestPointerLock
							),
							vi.mocked(
								document.body.requestFullscreen
							),
							mocks.sync_game_resolution,
							vi.mocked(mocks.modes.precision.init),
							vi.mocked(requestAnimationFrame)
						].map(
							fn => fn.mock.invocationCallOrder[0]
						)
						expect(order).toEqual(
							[ ...order ].sort(
								(a, b) => Number(a) - Number(b)
							)
						)
						expect(mocks.modes.writing.init).not.toHaveBeenCalled()
						expect(document.exitPointerLock).not.toHaveBeenCalled()
					}
				)
				it(
					"throws on a missing mode before touching anything",
					async () => {
						await expect(
							logic.start_game(
								/** @type {GameModeName} */("")/**/
							)
						).rejects.toThrow()
						expect(mocks.close_game_sens_list).not.toHaveBeenCalled()
						expect(
							document.body.requestPointerLock
						).not.toHaveBeenCalled()
					}
				)
			}
		)
		describe(
			"stop_game",
			() => {
				it(
					"cancels the pending frame, disposes the mode and hides the 3D canvas",
					() => {
						state.game.mode = "writing"
						state.game.raf_id = 42
						canvas_3d_el.style.display = ""
						logic.stop_game()
						expect(cancelAnimationFrame).toHaveBeenCalledWith(42)
						expect(mocks.modes.writing.dispose).toHaveBeenCalledOnce()
						expect(canvas_3d_el.style.display).toBe("none")
					}
				)
				it(
					"throws without a running mode",
					() => {
						expect(logic.stop_game).toThrow()
						expect(cancelAnimationFrame).not.toHaveBeenCalled()
					}
				)
			}
		)
		describe(
			"update_camera_projection",
			() => {
				it(
					"bdo keeps its hipfire sens in the zoom, which shows as a sens error",
					() => {
						state.camera.fov_axis = "v"
						state.camera.view_fov = 70
						state.game.sens = "bdo"
						project(1_920, 1_080)
						const hipfire_sens = state.camera.sens
						expect(state.camera.sens_error).toBeCloseTo(0, 12)
						state.camera.view_fov = 40
						project(1_920, 1_080)
						expect(state.camera.sens).toBe(hipfire_sens)
						expect(state.camera.sens_error).toBeCloseTo(
							hipfire_sens / calc_rad_per_px(
								calc_real_hfov("v", 40, 1_920, 1_080),
								1_920
							) - 1,
							12
						)
					}
				)
				it(
					"leaves the view's dimension and dist alone",
					() => {
						state.camera.dimension = "tpp"
						state.camera.dist = 30
						state.camera.fov_axis = "h"
						state.camera.view_fov = 80
						project(2_560, 1_440)
						expect(state.camera.dimension).toBe("tpp")
						expect(state.camera.dist).toBe(30)
					}
				)
				it(
					"sens is the camera sens of the fov times sens_scale, and sens_error and rad_size follow it",
					() => {
						state.camera.dist = 30
						state.camera.fov_axis = "h"
						state.camera.sens_scale = 1.1
						state.camera.view_fov = 90
						state.game.sens = "val"
						project(1_920, 1_080)
						const sens = calc_rad_per_px(90, 1_920) * 1.1
						expect(state.camera.sens).toBeCloseTo(sens, 15)
						expect(state.camera.sens_error).toBeCloseTo(.1, 12)
						expect(state.impact.rad_size).toBeCloseTo(
							constants.impact.px_size * sens
								* (1 + 30 / constants.grid.sky_sphere_radius),
							15
						)
					}
				)
				it(
					"the 43 axis locks the horizontal fov below 4:3 and the 4:3 vertical fov above it",
					() => {
						state.camera.fov_axis = "43"
						state.camera.view_fov = 90
						const narrow = project(1_280, 1_024)
						const wide = project(1_920, 1_080)
						const ultrawide = project(2_560, 1_080)
						expect(narrow.fov).toBeCloseTo(90, 9)
						expect(tan(to_rad(wide.vfov) / 2)).toBeCloseTo(.75, 12)
						expect(
							tan(to_rad(ultrawide.vfov) / 2)
						).toBeCloseTo(.75, 12)
						expect(ultrawide.fov).toBeGreaterThan(wide.fov)
					}
				)
				it(
					"the h axis keeps the horizontal fov at every aspect",
					() => {
						state.camera.fov_axis = "h"
						state.camera.view_fov = 103
						for (const [ width, height ] of [
							[ 1_920, 1_080 ],
							[ 2_560, 1_080 ],
							[ 1_280, 1_024 ]
						]) {
							const { fov, vfov } = project(width, height)
							expect(fov).toBeCloseTo(103, 9)
							expect(
								tan(to_rad(vfov) / 2) / tan(to_rad(fov) / 2)
							).toBeCloseTo(height / width, 12)
						}
					}
				)
				it(
					"the v axis keeps the vertical fov and widens the horizontal one on a wider screen",
					() => {
						state.camera.fov_axis = "v"
						state.camera.view_fov = 60
						const wide = project(1_920, 1_080)
						const ultrawide = project(2_560, 1_080)
						expect(wide.vfov).toBeCloseTo(60, 9)
						expect(ultrawide.vfov).toBeCloseTo(60, 9)
						expect(tan(to_rad(wide.fov) / 2)).toBeCloseTo(
							tan(to_rad(30)) * 1_920 / 1_080,
							12
						)
						expect(ultrawide.fov).toBeGreaterThan(wide.fov)
					}
				)
			}
		)
		describe(
			"update_camera_view",
			() => {
				it(
					"al views hipfire, then the chosen scope with the snap at that scope",
					() => {
						const { ads, hipfire } = constants.fov.al
						expect(hipfire).toBe(108.5)
						expect_view(
							"al",
							0,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "43",
								sens_scale: snap("al", 0),
								view_fov: hipfire
							}
						)
						state.game.ads_scope.al = "x2"
						expect_view(
							"al",
							1,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "43",
								sens_scale: snap("al", ads.x2),
								view_fov: ads.x2
							}
						)
					}
				)
				it(
					"an unknown sens game throws with its name",
					() => {
						state.game.sens = /** @type {GameSensName} */("xx")/**/
						expect(logic.update_camera_view).toThrow("xx")
					}
				)
				it(
					"bdo is tpp at hipfire and fpp at its zoom, both on the hipfire snap",
					() => {
						expect_view(
							"bdo",
							0,
							{
								dimension: "tpp",
								dist: constants.tpp.bdo * constants.tpp.render_dist_scale,
								fov_axis: "v",
								sens_scale: snap("bdo", 0),
								view_fov: 70
							}
						)
						expect_view(
							"bdo",
							1,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "v",
								sens_scale: snap("bdo", 0),
								view_fov: 40
							}
						)
					}
				)
				it(
					"cs2 matches the typed field at ads_ref and scales a view that differs from it",
					() => {
						const ads_ref = 40
						expect_view(
							"cs2",
							0,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "43",
								sens_scale: snap("cs2", 0),
								view_fov: 90
							}
						)
						state.game.ads_scope.cs2 = "awp"
						expect_view(
							"cs2",
							1,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "43",
								sens_scale: snap("cs2", ads_ref),
								view_fov: 40
							}
						)
						expect_view(
							"cs2",
							2,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "43",
								sens_scale: calc_sens_cs2(ads_ref, GAME_WIDTH, GAME_HEIGHT)
									/ calc_sens_cs2(10, GAME_WIDTH, GAME_HEIGHT)
									* snap("cs2", ads_ref),
								view_fov: 10
							}
						)
						state.game.ads_scope.cs2 = "auto"
						expect_view(
							"cs2",
							2,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "43",
								sens_scale: calc_sens_cs2(ads_ref, GAME_WIDTH, GAME_HEIGHT)
									/ calc_sens_cs2(15, GAME_WIDTH, GAME_HEIGHT)
									* snap("cs2", ads_ref),
								view_fov: 15
							}
						)
						state.game.ads_scope.cs2 = "aug"
						const aug = {
							dimension: "fpp",
							dist: 0,
							fov_axis: /** @type {FovAxis} */("43")/**/,
							sens_scale: calc_sens_cs2(ads_ref, GAME_WIDTH, GAME_HEIGHT)
								/ calc_sens_cs2(45, GAME_WIDTH, GAME_HEIGHT)
								* snap("cs2", ads_ref),
							view_fov: 45
						}
						expect_view("cs2", 1, aug)
						expect_view("cs2", 2, aug)
					}
				)
				it(
					"ends with the projection of the new view",
					() => {
						state.camera.fov = 0
						state.game.sens = "val"
						logic.update_camera_view()
						expect(state.camera.fov).toBeCloseTo(103, 9)
						expect(state.camera.sens).toBeCloseTo(
							calc_rad_per_px(103, 1_920) * state.camera.sens_scale,
							15
						)
					}
				)
				it(
					"fn is tpp at hipfire and for the targeting scopes, fpp for the scoped ones",
					() => {
						const { render_dist_scale } = constants.tpp
						expect_view(
							"fn",
							0,
							{
								dimension: "tpp",
								dist: constants.tpp.fn * render_dist_scale,
								fov_axis: "h",
								sens_scale: snap("fn", 0),
								view_fov: 80
							}
						)
						state.game.ads_scope.fn = "targeting80"
						expect_view(
							"fn",
							1,
							{
								dimension: "tpp",
								dist: constants.tpp.fn_ads * render_dist_scale,
								fov_axis: "h",
								sens_scale: snap("fn", 80),
								view_fov: 80
							}
						)
						state.game.ads_scope.fn = "targeting65"
						expect_view(
							"fn",
							1,
							{
								dimension: "tpp",
								dist: constants.tpp.fn_ads * render_dist_scale,
								fov_axis: "h",
								sens_scale: snap("fn", 65),
								view_fov: 65
							}
						)
						state.game.ads_scope.fn = "scoped40"
						expect_view(
							"fn",
							1,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "h",
								sens_scale: snap("fn", 40),
								view_fov: 40
							}
						)
					}
				)
				it(
					"lol is always the 2d hipfire view with no snap",
					() => {
						const lol = {
							dimension: "2d",
							dist: 0,
							fov_axis: /** @type {FovAxis} */("v")/**/,
							sens_scale: 1,
							view_fov: 120
						}
						expect_view("lol", 0, lol)
						expect_view("lol", 1, lol)
					}
				)
				it(
					"mc is tpp at hipfire and fpp while RMB is held, same fov and snap",
					() => {
						expect_view(
							"mc",
							0,
							{
								dimension: "tpp",
								dist: constants.tpp.mc * constants.tpp.render_dist_scale,
								fov_axis: "v",
								sens_scale: snap("mc", 0),
								view_fov: 110
							}
						)
						expect_view(
							"mc",
							1,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "v",
								sens_scale: snap("mc", 0),
								view_fov: 110
							}
						)
					}
				)
				it(
					"ow hipfire is on the h axis and its hero scopes on the v axis",
					() => {
						expect_view(
							"ow",
							0,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "h",
								sens_scale: snap("ow", 0),
								view_fov: 103
							}
						)
						state.game.ads_scope.ow = "ashe"
						expect_view(
							"ow",
							1,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "v",
								sens_scale: snap("ow", 40),
								view_fov: 40
							}
						)
					}
				)
				it(
					"pubg is tpp at the base fov, fpp at the fpp fov and in every scope",
					() => {
						expect_view(
							"pubg",
							0,
							{
								dimension: "tpp",
								dist: constants.tpp.pubg * constants.tpp.render_dist_scale,
								fov_axis: "h",
								sens_scale: snap("pubg", 0),
								view_fov: 80
							}
						)
						state.game.ads_scope.pubg = "x4"
						expect_view(
							"pubg",
							1,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "h",
								sens_scale: snap("pubg", 19),
								view_fov: 19
							}
						)
						state.game.pubg_fov = 103
						expect_view(
							"pubg",
							0,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "h",
								sens_scale: snap("pubg", 0),
								view_fov: 103
							}
						)
					}
				)
				it(
					"r6 hipfire views the x1 fov and ADS the chosen scope",
					() => {
						const { ads } = constants.fov.r6
						expect_view(
							"r6",
							0,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "v",
								sens_scale: snap("r6", 0),
								view_fov: 81
							}
						)
						state.game.ads_scope.r6 = "x2_5"
						expect_view(
							"r6",
							1,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "v",
								sens_scale: snap("r6", ads.x2_5),
								view_fov: ads.x2_5
							}
						)
					}
				)
				it(
					"rb matches the typed field at ads_ref and scales each side of a differing view by its fov",
					() => {
						const ads_ref = 45
						expect_view(
							"rb",
							0,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "v",
								sens_scale: snap("rb", 0),
								view_fov: 120
							}
						)
						state.game.ads_scope.rb = "rifle"
						expect_view(
							"rb",
							1,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "v",
								sens_scale: snap("rb", ads_ref),
								view_fov: 45
							}
						)
						state.game.ads_scope.rb = "pistol"
						expect_view(
							"rb",
							1,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "v",
								sens_scale: calc_sens_rb(ads_ref, GAME_WIDTH, GAME_HEIGHT) * 60
									/ (calc_sens_rb(60, GAME_WIDTH, GAME_HEIGHT) * ads_ref)
									* snap("rb", ads_ref),
								view_fov: 60
							}
						)
					}
				)
				it(
					"sa steps through hipfire, x5 and x15 with their fixed sens multipliers on the hipfire snap",
					() => {
						const { x15, x5 } = constants.fov.sa
						expect_view(
							"sa",
							0,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "43",
								sens_scale: snap("sa", 0),
								view_fov: 85
							}
						)
						expect_view(
							"sa",
							1,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "43",
								sens_scale: .25 * snap("sa", 0),
								view_fov: x5
							}
						)
						expect_view(
							"sa",
							2,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "43",
								sens_scale: .15 * snap("sa", 0),
								view_fov: x15
							}
						)
					}
				)
				it(
					"sa throws on an ads stage past its second zoom",
					() => {
						state.game.sens = "sa"
						state.input.ads_stage = /** @type {AdsStage} */(3)/**/
						expect(logic.update_camera_view).toThrow("3")
					}
				)
				it(
					"the snap is taken at the game resolution divided by cpi_scale",
					() => {
						state.game.cpi_scale = 2
						expect_view(
							"val",
							0,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "h",
								sens_scale: calc_sens_snap("val", 0, 1_280, 720, 2, 80),
								view_fov: 103
							}
						)
						expect(state.camera.sens_scale).not.toBeCloseTo(
							calc_sens_snap("val", 0, GAME_WIDTH, GAME_HEIGHT, 2, 80),
							9
						)
					}
				)
				it(
					"val matches the typed field at ads_ref and scales a view that differs from it",
					() => {
						const {
							guardian,
							operator2_5,
							operator5,
							vandal
						} = constants.fov.val
						expect_view(
							"val",
							0,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "h",
								sens_scale: snap("val", 0),
								view_fov: 103
							}
						)
						state.game.ads_scope.val = "operator"
						expect_view(
							"val",
							1,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "h",
								sens_scale: snap("val", operator2_5),
								view_fov: operator2_5
							}
						)
						expect_view(
							"val",
							2,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "h",
								sens_scale: calc_sens_val(
									operator2_5,
									GAME_WIDTH,
									GAME_HEIGHT
								)
									/ calc_sens_val(operator5, GAME_WIDTH, GAME_HEIGHT)
									* snap("val", operator2_5),
								view_fov: operator5
							}
						)
						state.game.ads_scope.val = "vandal"
						expect_view(
							"val",
							1,
							{
								dimension: "fpp",
								dist: 0,
								fov_axis: "h",
								sens_scale: snap("val", vandal),
								view_fov: vandal
							}
						)
						state.game.ads_scope.val = "guardian"
						const guardian_view = {
							dimension: "fpp",
							dist: 0,
							fov_axis: /** @type {FovAxis} */("h")/**/,
							sens_scale: calc_sens_val(vandal, GAME_WIDTH, GAME_HEIGHT)
								/ calc_sens_val(guardian, GAME_WIDTH, GAME_HEIGHT)
								* snap("val", vandal),
							view_fov: guardian
						}
						expect_view("val", 1, guardian_view)
						expect_view("val", 2, guardian_view)
					}
				)
			}
		)
	}
)