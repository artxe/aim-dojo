import { load_page } from "./helpers/dom.js"
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest"
const mocks = vi.hoisted(
	() => ({
		enable_bg_audio: vi.fn(),
		is_tutorial_active: vi.fn(() => false),
		layout_tutorial: vi.fn(),
		modes: {
			aim_booster: { shoot: vi.fn() },
			h_tracking: {
				shoot: vi.fn(),
				update_dimension: vi.fn()
			},
			precision: {
				shoot: vi.fn(),
				update_dimension: vi.fn()
			},
			writing: { on_move: vi.fn(), shoot: vi.fn() }
		},
		on_click_modal_backdrop: vi.fn(),
		resize_2d: vi.fn(),
		resize_3d: vi.fn(),
		resize_bg: vi.fn(),
		set_audio_visible: vi.fn(),
		set_bg_video_visible: vi.fn(),
		step_tutorial: vi.fn(),
		stop_game: vi.fn(),
		stop_tutorial: vi.fn(),
		sync_setting_hash: vi.fn(),
		update_camera_projection: vi.fn()
	})
)
vi.mock(
	"../../docs/js/controller/setting.js",
	() => ({
		on_click_modal_backdrop: mocks.on_click_modal_backdrop,
		sync_setting_hash: mocks.sync_setting_hash
	})
)
vi.mock(
	"../../docs/js/controller/tutorial.js",
	() => ({
		is_tutorial_active: mocks.is_tutorial_active,
		layout_tutorial: mocks.layout_tutorial,
		step_tutorial: mocks.step_tutorial,
		stop_tutorial: mocks.stop_tutorial
	})
)
vi.mock(
	"../../docs/js/game_mode/index.js",
	() => ({ default: mocks.modes })
)
vi.mock(
	"../../docs/js/logic.js",
	async import_original => ({
		...await import_original(),
		stop_game: mocks.stop_game,
		update_camera_projection: mocks.update_camera_projection
	})
)
vi.mock(
	"../../docs/js/render/renderer_2d.js",
	() => ({ resize_2d: mocks.resize_2d })
)
vi.mock(
	"../../docs/js/render/renderer_3d.js",
	() => ({ resize_3d: mocks.resize_3d })
)
vi.mock(
	"../../docs/js/render/renderer_bg.js",
	() => ({
		enable_bg_audio: mocks.enable_bg_audio,
		resize_bg: mocks.resize_bg,
		set_bg_video_visible: mocks.set_bg_video_visible
	})
)
vi.mock(
	"../../docs/js/sfx.js",
	() => ({
		set_audio_visible: mocks.set_audio_visible
	})
)
const GAME_KEYS = [
	[ "KeyA", "key_a" ],
	[ "KeyE", "key_e" ],
	[ "KeyQ", "key_q" ],
	[ "KeyR", "key_r" ],
	[ "KeyW", "key_w" ]
]
const RELEASED = {
	ads_stage: 0,
	key_a: false,
	key_e: false,
	key_q: false,
	key_r: false,
	key_space: false,
	key_w: false,
	mb_left: false,
	mb_right: false
}
/** @type {[EventTarget, Parameters<EventTarget["addEventListener"]>][]} */
const bound = []
/** @type {ReturnType<typeof import_window> | undefined} */
let loading
/**
 * @param {EventTarget} target
 * @returns {string[]}
 */
function bound_types(target) {
	return bound.filter(([ owner ]) => owner == target).map(([ , [ type ] ]) => type)
}
async function import_window() {
	localStorage.clear()
	localStorage.setItem("lang", "en")
	load_page()
	/** @type {EventTarget[]} */
	const targets = [
		document,
		window,
		/** @type {VisualViewport} */(visualViewport)/**/
	]
	const spies = targets.map(
		target => vi.spyOn(target, "addEventListener")
	)
	const { on_resize } = await import("../../docs/js/controller/window.js")
	targets.forEach(
		(target, i) => {
			for (const args of spies[i].mock.calls) {
				bound.push([ target, args ])
			}
			spies[i].mockRestore()
		}
	)
	const { default: constants } = await import("../../docs/js/constants.js")
	const { default: state } = await import("../../docs/js/state.js")
	const dom = await import("../../docs/js/controller/dom.js")
	return {
		armed_at_load: state.game.rest_timeout,
		constants,
		dom,
		on_resize,
		state
	}
}
/**
 * @param {string} type
 * @param {string} code
 * @param {EventTarget} [target]
 * @param {KeyboardEventInit} [init]
 * @returns {KeyboardEvent}
 */
function key(
	type,
	code,
	target = document.body,
	init = {}
) {
	const ev = new KeyboardEvent(
		type,
		{
			bubbles: true,
			cancelable: true,
			code,
			...init
		}
	)
	target.dispatchEvent(ev)
	return ev
}
function load() {
	loading ??= import_window()
	return loading
}
/**
 * @param {string} type
 * @param {number} button
 * @param {EventTarget} [target]
 * @returns {MouseEvent}
 */
function mouse(
	type,
	button,
	target = document.body
) {
	const ev = new MouseEvent(
		type,
		{
			bubbles: true,
			button,
			cancelable: true
		}
	)
	target.dispatchEvent(ev)
	return ev
}
/**
 * @param {number} movement_x
 * @param {number} movement_y
 * @param {string} [type]
 * @returns {void}
 */
function move(
	movement_x,
	movement_y,
	type = "pointerrawupdate"
) {
	document.dispatchEvent(
		new PointerEvent(
			type,
			{
				movementX: movement_x,
				movementY: movement_y
			}
		)
	)
}
/**
 * @param {{ input: { ads_stage: number } }} state
 * @param {number} count
 * @returns {number[]}
 */
function rmb_clicks(state, count) {
	/** @type {number[]} */
	const stages = []
	for (let i = 0; i < count; i++) {
		mouse("mousedown", 2)
		mouse("mouseup", 2)
		stages.push(state.input.ads_stage)
	}
	return stages
}
/** @returns {WheelEvent} */
function wheel() {
	const ev = new WheelEvent(
		"wheel",
		{ bubbles: true, cancelable: true }
	)
	document.body.dispatchEvent(ev)
	return ev
}
describe(
	"controller/window.js",
	() => {
		beforeAll(
			() => {
				vi.useFakeTimers(
					{
						toFake: [ "clearTimeout", "setTimeout" ]
					}
				)
			}
		)
		beforeEach(
			async () => {
				vi.resetAllMocks()
				const { constants, dom, state } = await load()
				vi.clearAllTimers()
				dom.bg_el.removeAttribute("activate")
				dom.setting_view_el.removeAttribute("active")
				document.body.removeAttribute("locked")
				document.body.removeAttribute("rest")
				Object.assign(
					state.camera,
					{
						dimension: "2d",
						pitch: 0,
						sens: 0,
						x: 0,
						y: 0,
						yaw: 0
					}
				)
				Object.assign(
					state.game,
					{
						ads_scope: { ...constants.game.ads_scope },
						ads_toggle: false,
						mode: null,
						rest_timeout: 0,
						sens: constants.game.sens
					}
				)
				Object.assign(state.input, RELEASED)
				state.lang = "en"
			}
		)
		afterEach(
			() => {
				vi.restoreAllMocks()
			}
		)
		afterAll(
			() => {
				vi.useRealTimers()
			}
		)
		it(
			"2D movement moves x and y freely when the mode has no ADS or the game has a single stage",
			async () => {
				const { state } = await load()
				state.camera.dimension = "2d"
				state.camera.sens = .01
				state.game.mode = "aim_booster"
				state.game.sens = "al"
				move(5, 100_000)
				expect(state.camera.x).toBe(5)
				expect(state.camera.y).toBe(100_000)
				state.camera.y = 150
				state.game.mode = "precision"
				state.game.sens = "lol"
				move(-5, 20)
				expect(state.camera.x).toBe(0)
				expect(state.camera.y).toBe(170)
			}
		)
		it(
			"2D y is clamped to the whole pixels of a quarter turn when ADS is available, x stays free",
			async () => {
				const { state } = await load()
				state.game.mode = "precision"
				state.game.sens = "al"
				state.camera.dimension = "2d"
				state.camera.sens = .01
				state.camera.y = 150
				move(1_000, 20)
				expect(state.camera.x).toBe(1_000)
				expect(state.camera.y).toBe(157)
				move(0, -400)
				expect(state.camera.y).toBe(-157)
				move(0, 100)
				expect(state.camera.y).toBe(-57)
			}
		)
		it(
			"3D movement turns yaw with movementX and pitch against movementY by the cached sens without recomputing the projection",
			async () => {
				const { state } = await load()
				state.game.mode = "precision"
				state.game.sens = "al"
				state.camera.dimension = "fpp"
				state.camera.sens = .5
				move(2, 1)
				expect(state.camera.yaw).toBe(1)
				expect(state.camera.pitch).toBe(-.5)
				state.camera.dimension = "tpp"
				state.camera.sens = .25
				move(-4, -6)
				expect(state.camera.yaw).toBe(0)
				expect(state.camera.pitch).toBe(1)
				expect(state.camera.x).toBe(0)
				expect(state.camera.y).toBe(0)
				expect(mocks.update_camera_projection).not.toHaveBeenCalled()
			}
		)
		it(
			"3D pitch stops just short of straight up and straight down",
			async () => {
				const { state } = await load()
				state.game.mode = "aim_booster"
				state.camera.dimension = "fpp"
				state.camera.sens = .5
				state.camera.pitch = 1
				move(0, -2)
				expect(state.camera.pitch).toBe(Math.PI / 2 - 1e-9)
				state.camera.pitch = -1
				move(0, 2)
				expect(state.camera.pitch).toBe(-(Math.PI / 2 - 1e-9))
			}
		)
		it(
			"Escape closes the open background or settings modal and is a plain key otherwise",
			async () => {
				const { dom, state } = await load()
				dom.bg_el.setAttribute("activate", "")
				expect(
					key("keydown", "Escape").defaultPrevented
				).toBe(true)
				expect(mocks.on_click_modal_backdrop).toHaveBeenCalledTimes(1)
				dom.bg_el.removeAttribute("activate")
				dom.setting_view_el.setAttribute("active", "")
				key("keydown", "Escape")
				expect(mocks.on_click_modal_backdrop).toHaveBeenCalledTimes(2)
				dom.setting_view_el.removeAttribute("active")
				state.game.mode = "aim_booster"
				expect(
					key("keydown", "Escape").defaultPrevented
				).toBe(true)
				expect(mocks.on_click_modal_backdrop).toHaveBeenCalledTimes(2)
				expect(mocks.stop_tutorial).not.toHaveBeenCalled()
				expect(mocks.modes.aim_booster.shoot).not.toHaveBeenCalled()
				expect(state.input).toEqual(RELEASED)
			}
		)
		it(
			"Escape stops the tour before it closes a modal",
			async () => {
				const { dom } = await load()
				mocks.is_tutorial_active.mockReturnValue(true)
				dom.setting_view_el.setAttribute("active", "")
				expect(
					key("keydown", "Escape").defaultPrevented
				).toBe(true)
				expect(mocks.stop_tutorial).toHaveBeenCalledTimes(1)
				expect(mocks.on_click_modal_backdrop).not.toHaveBeenCalled()
				expect(mocks.step_tutorial).not.toHaveBeenCalled()
			}
		)
		it(
			"LMB shoots and records the button only while a mode runs; the middle button does nothing",
			async () => {
				const { state } = await load()
				const { aim_booster } = mocks.modes
				mouse("mousedown", 0)
				expect(state.input.mb_left).toBe(false)
				state.game.mode = "aim_booster"
				mouse("mousedown", 0)
				expect(state.input.mb_left).toBe(true)
				expect(aim_booster.shoot).toHaveBeenCalledTimes(1)
				mouse("mouseup", 0)
				expect(state.input.mb_left).toBe(false)
				mouse("mousedown", 1)
				mouse("mouseup", 1)
				expect(aim_booster.shoot).toHaveBeenCalledTimes(1)
				expect(state.input).toEqual(RELEASED)
			}
		)
		it(
			"Q W E R A set their flag and shoot in a running mode",
			async () => {
				const { state } = await load()
				const { aim_booster } = mocks.modes
				state.game.mode = "aim_booster"
				for (const [ code, flag ] of GAME_KEYS) {
					expect(
						key("keydown", code).defaultPrevented
					).toBe(true)
					expect(state.input).toHaveProperty(flag, true)
				}
				expect(aim_booster.shoot).toHaveBeenCalledTimes(GAME_KEYS.length)
			}
		)
		it(
			"Q W E R A set their flag without shooting outside a mode",
			async () => {
				const { state } = await load()
				for (const [ code, flag ] of GAME_KEYS) {
					key("keydown", code)
					expect(state.input).toHaveProperty(flag, true)
				}
				for (const mode of Object.values(mocks.modes)) {
					expect(mode.shoot).not.toHaveBeenCalled()
				}
			}
		)
		it(
			"RMB in hold mode enters ADS stage 1 on press and returns to hipfire on release, updating the dimension each time",
			async () => {
				const { state } = await load()
				const { precision } = mocks.modes
				state.game.mode = "precision"
				state.game.sens = "al"
				/** @type {number[]} */
				const seen = []
				precision.update_dimension.mockImplementation(
					() => seen.push(state.input.ads_stage)
				)
				mouse("mousedown", 2)
				expect(state.input.mb_right).toBe(true)
				expect(state.input.ads_stage).toBe(1)
				mouse("mouseup", 2)
				expect(state.input.mb_right).toBe(false)
				expect(state.input.ads_stage).toBe(0)
				expect(seen).toEqual([ 1, 0 ])
				expect(precision.shoot).not.toHaveBeenCalled()
			}
		)
		it(
			"RMB shoots and never writes ads_stage when the mode has no update_dimension",
			async () => {
				const { state } = await load()
				state.game.mode = "aim_booster"
				state.game.sens = "al"
				state.game.ads_toggle = true
				expect(rmb_clicks(state, 2)).toEqual([ 0, 0 ])
				state.game.ads_toggle = false
				mouse("mousedown", 2)
				expect(state.input.ads_stage).toBe(0)
				expect(state.input.mb_right).toBe(true)
				mouse("mouseup", 2)
				expect(mocks.modes.aim_booster.shoot).toHaveBeenCalledTimes(3)
			}
		)
		it(
			"RMB shoots in League, whose single stage leaves nothing to aim, in hold and toggle mode",
			async () => {
				const { state } = await load()
				const { precision } = mocks.modes
				state.game.mode = "precision"
				state.game.sens = "lol"
				mouse("mousedown", 2)
				expect(state.input.ads_stage).toBe(0)
				mouse("mouseup", 2)
				state.game.ads_toggle = true
				expect(rmb_clicks(state, 2)).toEqual([ 0, 0 ])
				expect(precision.shoot).toHaveBeenCalledTimes(3)
				expect(precision.update_dimension).not.toHaveBeenCalled()
			}
		)
		it(
			"RMB toggles between hipfire and ADS when ads_toggle is on and ignores the release",
			async () => {
				const { state } = await load()
				const { precision } = mocks.modes
				state.game.mode = "precision"
				state.game.sens = "al"
				state.game.ads_toggle = true
				mouse("mousedown", 2)
				mouse("mouseup", 2)
				expect(state.input.ads_stage).toBe(1)
				expect(state.input.mb_right).toBe(false)
				expect(precision.update_dimension).toHaveBeenCalledTimes(1)
				expect(rmb_clicks(state, 3)).toEqual([ 0, 1, 0 ])
				expect(precision.update_dimension).toHaveBeenCalledTimes(4)
				expect(precision.shoot).not.toHaveBeenCalled()
			}
		)
		it(
			"RMB without a running mode only records the raw button",
			async () => {
				const { state } = await load()
				state.game.sens = "sa"
				mouse("mousedown", 2)
				expect(state.input.mb_right).toBe(true)
				expect(state.input.ads_stage).toBe(0)
				mouse("mouseup", 2)
				expect(state.input.mb_right).toBe(false)
				expect(state.input.ads_stage).toBe(0)
			}
		)
		it(
			"Sniper Arena always cycles hipfire, x5 and x15, even with ads_toggle off",
			async () => {
				const { state } = await load()
				state.game.mode = "h_tracking"
				state.game.sens = "sa"
				state.game.ads_toggle = false
				expect(rmb_clicks(state, 4)).toEqual([ 1, 2, 0, 1 ])
				expect(
					mocks.modes.h_tracking.update_dimension
				).toHaveBeenCalledTimes(4)
			}
		)
		it(
			"Space holds its flag without shooting and any other key is only prevented",
			async () => {
				const { state } = await load()
				const { aim_booster } = mocks.modes
				state.game.mode = "aim_booster"
				expect(
					key("keydown", "Space").defaultPrevented
				).toBe(true)
				expect(state.input.key_space).toBe(true)
				state.input.key_space = false
				expect(
					key("keydown", "KeyZ").defaultPrevented
				).toBe(true)
				expect(state.input).toEqual(RELEASED)
				expect(aim_booster.shoot).not.toHaveBeenCalled()
			}
		)
		it(
			"a hidden page silences the SFX and the background video, a visible one resumes them",
			async () => {
				await load()
				const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true)
				document.dispatchEvent(new Event("visibilitychange"))
				expect(mocks.set_audio_visible).toHaveBeenLastCalledWith(false)
				expect(mocks.set_bg_video_visible).toHaveBeenLastCalledWith(false)
				hidden.mockReturnValue(false)
				document.dispatchEvent(new Event("visibilitychange"))
				expect(mocks.set_audio_visible).toHaveBeenLastCalledWith(true)
				expect(mocks.set_bg_video_visible).toHaveBeenLastCalledWith(true)
			}
		)
		it(
			"a keydown already handled or auto-repeating is ignored, even Escape during the tour",
			async () => {
				const { state } = await load()
				state.game.mode = "aim_booster"
				document.body.addEventListener(
					"keydown",
					ev => ev.preventDefault(),
					{ once: true }
				)
				key("keydown", "KeyA")
				const repeat = key(
					"keydown",
					"KeyA",
					document.body,
					{ repeat: true }
				)
				expect(repeat.defaultPrevented).toBe(false)
				expect(state.input.key_a).toBe(false)
				expect(mocks.modes.aim_booster.shoot).not.toHaveBeenCalled()
				mocks.is_tutorial_active.mockReturnValue(true)
				document.body.addEventListener(
					"keydown",
					ev => ev.preventDefault(),
					{ once: true }
				)
				key("keydown", "Escape")
				key(
					"keydown",
					"Escape",
					document.body,
					{ repeat: true }
				)
				expect(mocks.stop_tutorial).not.toHaveBeenCalled()
			}
		)
		it(
			"a move ends with the mode's on_move after the camera is updated",
			async () => {
				const { state } = await load()
				state.game.mode = "writing"
				state.camera.dimension = "2d"
				/** @type {number[]} */
				const seen = []
				mocks.modes.writing.on_move.mockImplementation(
					() => seen.push(state.camera.x)
				)
				move(3, 0)
				move(3, 0)
				expect(seen).toEqual([ 3, 6 ])
			}
		)
		it(
			"a resize of the window or the visual viewport runs resize_2d, update_camera_projection, resize_3d, resize_bg, then layout_tutorial",
			async () => {
				const { on_resize } = await load()
				const steps = [
					mocks.resize_2d,
					mocks.update_camera_projection,
					mocks.resize_3d,
					mocks.resize_bg,
					mocks.layout_tutorial
				]
				const triggers = [
					() => dispatchEvent(new Event("resize")),
					() => visualViewport?.dispatchEvent(new Event("resize")),
					on_resize
				]
				for (const trigger of triggers) {
					vi.clearAllMocks()
					trigger()
					const order = steps.map(
						step => {
							expect(step).toHaveBeenCalledTimes(1)
							return Number(
								step.mock.invocationCallOrder[0]
							)
						}
					)
					expect(order).toEqual(
						[ ...order ].sort((a, b) => a - b)
					)
				}
			}
		)
		it(
			"an RMB release after a mousecancel does not touch the ADS state again",
			async () => {
				const { state } = await load()
				const { precision } = mocks.modes
				state.game.mode = "precision"
				state.game.sens = "al"
				mouse("mousedown", 2)
				dispatchEvent(new Event("blur"))
				expect(state.input.ads_stage).toBe(0)
				state.input.ads_stage = 1
				mouse("mouseup", 2)
				expect(state.input.ads_stage).toBe(1)
				expect(precision.update_dimension).toHaveBeenCalledTimes(2)
			}
		)
		it(
			"binds pointerrawupdate and not mousemove when the browser has it, leaving the browser notice hidden",
			async () => {
				expect(
					"onpointerrawupdate" in document
				).toBe(true)
				const { dom, state } = await load()
				expect(bound_types(document)).toContain("pointerrawupdate")
				expect(bound_types(document)).not.toContain("mousemove")
				state.game.mode = "aim_booster"
				move(5, 7, "mousemove")
				expect(state.camera.x).toBe(0)
				expect(state.camera.y).toBe(0)
				move(5, 7)
				expect(state.camera.x).toBe(5)
				expect(state.camera.y).toBe(7)
				expect(
					dom.browser_notice_el.hasAttribute("unsupported")
				).toBe(false)
				expect(
					dom.browser_notice_el.textContent
				).toBe("")
				state.lang = "ko"
				dom.lang_select.dispatchEvent(new Event("change"))
				expect(
					dom.browser_notice_el.textContent
				).toBe("")
			}
		)
		it(
			"during the tour presses on Activate, the menu, Save and a game card title are swallowed",
			async () => {
				const { dom } = await load()
				mocks.is_tutorial_active.mockReturnValue(true)
				/** @type {[string, Element][]} */
				const blocked = [
					[ "mousedown", dom.activate_bg_btn ],
					[ "mouseup", dom.activate_bg_btn ],
					[
						"click",
						/** @type {Element} */(dom.menu_el.querySelector("h1"))/**/
					],
					[ "mousedown", dom.save_bg_btn ],
					[
						"click",
						/** @type {Element} */(document.querySelector("#game-sens-list li > b"))/**/
					]
				]
				for (const [ type, target ] of blocked) {
					const reached = vi.fn()
					target.addEventListener(type, reached, { once: true })
					expect(
						mouse(type, 0, target).defaultPrevented
					).toBe(true)
					expect(reached).not.toHaveBeenCalled()
					target.removeEventListener(type, reached)
				}
				expect(mocks.layout_tutorial).not.toHaveBeenCalled()
			}
		)
		it(
			"during the tour the arrow keys step it, even from a control, and every other key is left alone",
			async () => {
				const { state } = await load()
				const input = document.createElement("input")
				document.body.append(input)
				mocks.is_tutorial_active.mockReturnValue(true)
				expect(
					key("keydown", "ArrowLeft").defaultPrevented
				).toBe(true)
				expect(mocks.step_tutorial).toHaveBeenLastCalledWith(-1)
				expect(
					key("keydown", "ArrowRight", input).defaultPrevented
				).toBe(true)
				expect(mocks.step_tutorial).toHaveBeenLastCalledWith(1)
				expect(
					key("keydown", "KeyA").defaultPrevented
				).toBe(false)
				expect(
					key("keydown", "Space").defaultPrevented
				).toBe(false)
				expect(mocks.step_tutorial).toHaveBeenCalledTimes(2)
				expect(state.input).toEqual(RELEASED)
				input.remove()
			}
		)
		it(
			"every input restarts the screen saver delay",
			async () => {
				const { constants } = await load()
				const { delay_ms } = constants.screen_saver
				const inputs = [
					() => key("keydown", "KeyZ"),
					() => key("keyup", "KeyZ"),
					() => mouse("mousedown", 0),
					() => mouse("mouseup", 0),
					() => move(1, 1),
					() => dispatchEvent(new Event("mousecancel"))
				]
				for (const input of inputs) {
					vi.advanceTimersByTime(delay_ms - 1)
					input()
					expect(
						document.body.hasAttribute("rest")
					).toBe(false)
				}
				vi.advanceTimersByTime(delay_ms - 1)
				expect(
					document.body.hasAttribute("rest")
				).toBe(false)
				vi.advanceTimersByTime(1)
				expect(
					document.body.hasAttribute("rest")
				).toBe(true)
			}
		)
		it(
			"hashchange syncs the settings modal, and scrolls anywhere and clicks re-lay out the tour",
			async () => {
				await load()
				dispatchEvent(
					new HashChangeEvent("hashchange")
				)
				expect(mocks.sync_setting_hash).toHaveBeenCalledTimes(1)
				document.body.dispatchEvent(new Event("scroll"))
				expect(mocks.layout_tutorial).toHaveBeenCalledTimes(1)
				mouse("click", 0)
				expect(mocks.layout_tutorial).toHaveBeenCalledTimes(2)
			}
		)
		it(
			"hold mode never goes past stage 1, even for a scope with a second zoom",
			async () => {
				const { state } = await load()
				state.game.mode = "precision"
				state.game.sens = "cs2"
				state.game.ads_scope.cs2 = "awp"
				/** @type {number[]} */
				const held = []
				for (let i = 0; i < 3; i++) {
					mouse("mousedown", 2)
					held.push(state.input.ads_stage)
					mouse("mouseup", 2)
					held.push(state.input.ads_stage)
				}
				expect(held).toEqual([ 1, 0, 1, 0, 1, 0 ])
			}
		)
		it(
			"input during a mode or the tour cancels the pending screen saver without arming a new one",
			async () => {
				const { constants, state } = await load()
				const { delay_ms } = constants.screen_saver
				key("keyup", "KeyZ")
				state.game.mode = "precision"
				move(1, 1)
				expect(state.game.rest_timeout).toBe(0)
				vi.advanceTimersByTime(delay_ms)
				expect(
					document.body.hasAttribute("rest")
				).toBe(false)
				state.game.mode = null
				mocks.is_tutorial_active.mockReturnValue(true)
				key("keyup", "KeyZ")
				expect(state.game.rest_timeout).toBe(0)
				mocks.is_tutorial_active.mockReturnValue(false)
				key("keyup", "KeyZ")
				expect(state.game.rest_timeout).toBeGreaterThan(0)
			}
		)
		it(
			"input while resting wakes the page and arms the screen saver again",
			async () => {
				const { constants, state } = await load()
				const { delay_ms } = constants.screen_saver
				key("keyup", "KeyZ")
				vi.advanceTimersByTime(delay_ms)
				key("keyup", "KeyZ")
				expect(
					document.body.hasAttribute("rest")
				).toBe(false)
				expect(state.game.rest_timeout).toBeGreaterThan(0)
				vi.advanceTimersByTime(delay_ms)
				expect(
					document.body.hasAttribute("rest")
				).toBe(true)
			}
		)
		it(
			"keys typed into a control are left to it on keydown and keyup",
			async () => {
				const { dom, state } = await load()
				state.game.mode = "aim_booster"
				const editable = document.createElement("div")
				editable.contentEditable = "true"
				const tags = [
					"button",
					"input",
					"select",
					"textarea"
				]
				const fields = tags.map(
					tag => document.createElement(tag)
				)
				document.body.append(editable, ...fields)
				const controls = [
					dom.lang_select,
					editable,
					...fields
				]
				for (const control of controls) {
					expect(
						key("keydown", "KeyA", control).defaultPrevented
					).toBe(false)
				}
				expect(state.input.key_a).toBe(false)
				expect(mocks.modes.aim_booster.shoot).not.toHaveBeenCalled()
				state.input.key_a = true
				for (const control of controls) {
					expect(
						key("keyup", "KeyA", control).defaultPrevented
					).toBe(false)
				}
				expect(state.input.key_a).toBe(true)
				editable.remove()
				for (const field of fields) {
					field.remove()
				}
			}
		)
		it(
			"keyup clears each game key and Space, and any other key changes nothing",
			async () => {
				const { state } = await load()
				Object.assign(
					state.input,
					{
						key_a: true,
						key_e: true,
						key_q: true,
						key_r: true,
						key_space: true,
						key_w: true
					}
				)
				expect(
					key("keyup", "KeyZ").defaultPrevented
				).toBe(true)
				for (const [ , flag ] of GAME_KEYS) {
					expect(state.input).toHaveProperty(flag, true)
				}
				for (const [ code, flag ] of GAME_KEYS) {
					expect(
						key("keyup", code).defaultPrevented
					).toBe(true)
					expect(state.input).toHaveProperty(flag, false)
				}
				expect(state.input.key_space).toBe(true)
				key("keyup", "Space")
				expect(state.input).toEqual(RELEASED)
			}
		)
		it(
			"losing focus releases every key and button and resets the ADS stage through mousecancel",
			async () => {
				const { state } = await load()
				state.game.mode = "precision"
				Object.assign(
					state.input,
					{
						ads_stage: 2,
						key_a: true,
						key_e: true,
						key_q: true,
						key_r: true,
						key_space: true,
						key_w: true,
						mb_left: true,
						mb_right: true
					}
				)
				const cancel = vi.fn()
				addEventListener(
					"mousecancel",
					cancel,
					{ once: true }
				)
				dispatchEvent(new Event("blur"))
				expect(cancel).toHaveBeenCalledTimes(1)
				expect(state.input).toEqual(RELEASED)
				expect(
					mocks.modes.precision.update_dimension
				).toHaveBeenCalledTimes(1)
			}
		)
		it(
			"mouse movement leaves the camera alone without a running mode",
			async () => {
				const { state } = await load()
				state.camera.dimension = "fpp"
				state.camera.sens = .5
				move(4, 4)
				state.camera.dimension = "2d"
				move(4, 4)
				expect(state.camera.x).toBe(0)
				expect(state.camera.y).toBe(0)
				expect(state.camera.yaw).toBe(0)
				expect(state.camera.pitch).toBe(0)
			}
		)
		it(
			"mousecancel resets the input without a mode and in a mode without update_dimension",
			async () => {
				const { state } = await load()
				state.input.ads_stage = 1
				state.input.mb_right = true
				dispatchEvent(new Event("mousecancel"))
				expect(state.input).toEqual(RELEASED)
				state.game.mode = "aim_booster"
				state.input.mb_left = true
				dispatchEvent(new Event("mousecancel"))
				expect(state.input).toEqual(RELEASED)
				expect(mocks.modes.aim_booster.shoot).not.toHaveBeenCalled()
			}
		)
		it(
			"pointer lock marks the body, and losing it stops a running mode",
			async () => {
				const { state } = await load()
				const lock = vi.spyOn(
					document,
					"pointerLockElement",
					"get"
				).mockReturnValue(document.body)
				document.dispatchEvent(new Event("pointerlockchange"))
				expect(
					document.body.hasAttribute("locked")
				).toBe(true)
				lock.mockReturnValue(null)
				document.dispatchEvent(new Event("pointerlockchange"))
				expect(
					document.body.hasAttribute("locked")
				).toBe(false)
				expect(mocks.stop_game).not.toHaveBeenCalled()
				state.game.mode = "precision"
				lock.mockReturnValue(document.body)
				document.dispatchEvent(new Event("pointerlockchange"))
				expect(mocks.stop_game).not.toHaveBeenCalled()
				lock.mockReturnValue(null)
				document.dispatchEvent(new Event("pointerlockchange"))
				expect(
					document.body.hasAttribute("locked")
				).toBe(false)
				expect(mocks.stop_game).toHaveBeenCalledTimes(1)
			}
		)
		it(
			"presses elsewhere during the tour and every press outside it pass through",
			async () => {
				const { dom } = await load()
				const card = /** @type {Element} */(document.querySelector("#game-sens-list li"))/**/
				const reached = vi.fn()
				mocks.is_tutorial_active.mockReturnValue(true)
				card.addEventListener(
					"mousedown",
					reached,
					{ once: true }
				)
				expect(
					mouse("mousedown", 0, card).defaultPrevented
				).toBe(false)
				mocks.is_tutorial_active.mockReturnValue(false)
				dom.activate_bg_btn.addEventListener(
					"mousedown",
					reached,
					{ once: true }
				)
				expect(
					mouse(
						"mousedown",
						0,
						dom.activate_bg_btn
					).defaultPrevented
				).toBe(false)
				expect(reached).toHaveBeenCalledTimes(2)
			}
		)
		it(
			"the context menu is always prevented",
			async () => {
				await load()
				expect(
					mouse("contextmenu", 2).defaultPrevented
				).toBe(true)
			}
		)
		it(
			"the page rests delay_ms after the last input and the timer turns -1",
			async () => {
				const { constants, state } = await load()
				const { delay_ms } = constants.screen_saver
				key("keyup", "KeyZ")
				expect(state.game.rest_timeout).toBeGreaterThan(0)
				vi.advanceTimersByTime(delay_ms - 1)
				expect(
					document.body.hasAttribute("rest")
				).toBe(false)
				vi.advanceTimersByTime(1)
				expect(
					document.body.hasAttribute("rest")
				).toBe(true)
				expect(state.game.rest_timeout).toBe(-1)
			}
		)
		it(
			"the screen saver is armed at load",
			async () => {
				const { armed_at_load } = await load()
				expect(armed_at_load).toBeGreaterThan(0)
			}
		)
		it(
			"the wheel is prevented only during the tour",
			async () => {
				await load()
				expect(wheel().defaultPrevented).toBe(false)
				mocks.is_tutorial_active.mockReturnValue(true)
				expect(wheel().defaultPrevented).toBe(true)
			}
		)
		it(
			"toggle mode reaches a third stage in CS2 and Valorant only for scopes with a second zoom",
			async () => {
				const { state } = await load()
				state.game.mode = "precision"
				state.game.ads_toggle = true
				state.game.sens = "cs2"
				state.game.ads_scope.cs2 = "awp"
				expect(rmb_clicks(state, 3)).toEqual([ 1, 2, 0 ])
				state.game.ads_scope.cs2 = "aug"
				expect(rmb_clicks(state, 3)).toEqual([ 1, 0, 1 ])
				state.input.ads_stage = 0
				state.game.sens = "val"
				state.game.ads_scope.val = "operator"
				expect(rmb_clicks(state, 3)).toEqual([ 1, 2, 0 ])
				state.game.ads_scope.val = "vandal"
				expect(rmb_clicks(state, 2)).toEqual([ 1, 0 ])
				state.game.sens = "pubg"
				expect(rmb_clicks(state, 3)).toEqual([ 1, 0, 1 ])
			}
		)
	}
)