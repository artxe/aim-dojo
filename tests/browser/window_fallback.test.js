import { load_page } from "./helpers/dom.js"
import {
	afterAll,
	beforeAll,
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
			aim_booster: { shoot: vi.fn() }
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
/** @type {string[]} */
const document_types = []
/** @type {ReturnType<typeof import_window> | undefined} */
let loading
async function import_window() {
	localStorage.clear()
	localStorage.setItem("lang", "en")
	load_page()
	const descriptor = /** @type {PropertyDescriptor} */(Object.getOwnPropertyDescriptor(
		Document.prototype,
		"onpointerrawupdate"
	))/**/
	Reflect.deleteProperty(
		Document.prototype,
		"onpointerrawupdate"
	)
	vi.stubGlobal("visualViewport", void 0)
	const had_raw_update = "onpointerrawupdate" in document
	const spy = vi.spyOn(document, "addEventListener")
	await import("../../docs/js/controller/window.js")
	for (const [ type ] of spy.mock.calls) {
		document_types.push(type)
	}
	spy.mockRestore()
	vi.unstubAllGlobals()
	Object.defineProperty(
		Document.prototype,
		"onpointerrawupdate",
		descriptor
	)
	const { default: constants } = await import("../../docs/js/constants.js")
	const { default: state } = await import("../../docs/js/state.js")
	const dom = await import("../../docs/js/controller/dom.js")
	return {
		constants,
		dom,
		had_raw_update,
		state
	}
}
function load() {
	loading ??= import_window()
	return loading
}
describe(
	"controller/window.js without pointerrawupdate and visualViewport",
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
		afterAll(
			() => {
				vi.useRealTimers()
			}
		)
		it(
			"falls back to mousemove, never binding pointerrawupdate",
			async () => {
				const { had_raw_update, state } = await load()
				expect(had_raw_update).toBe(false)
				expect(document_types).toContain("mousemove")
				expect(document_types).not.toContain("pointerrawupdate")
				state.game.mode = "aim_booster"
				state.camera.dimension = "2d"
				document.dispatchEvent(
					new PointerEvent(
						"pointerrawupdate",
						{ movementX: 5, movementY: 7 }
					)
				)
				expect(state.camera.x).toBe(0)
				document.dispatchEvent(
					new MouseEvent(
						"mousemove",
						{ movementX: 5, movementY: 7 }
					)
				)
				expect(state.camera.x).toBe(5)
				expect(state.camera.y).toBe(7)
				state.game.mode = null
			}
		)
		it(
			"shows the browser notice in the current language and follows the language select",
			async () => {
				const { dom, state } = await load()
				expect(
					dom.browser_notice_el.hasAttribute("unsupported")
				).toBe(true)
				const en = String(
					dom.browser_notice_el.textContent
				)
				expect(en).toContain("Google Chrome")
				expect(en.split("\n")).toHaveLength(2)
				state.lang = "ko"
				dom.lang_select.dispatchEvent(new Event("change"))
				const ko = String(
					dom.browser_notice_el.textContent
				)
				expect(ko).toContain("Google Chrome")
				expect(ko.split("\n")).toHaveLength(2)
				expect(ko).toMatch(/[가-힣]/)
				expect(en).not.toMatch(/[가-힣]/)
				state.lang = "en"
				dom.lang_select.dispatchEvent(new Event("change"))
				expect(
					dom.browser_notice_el.textContent
				).toBe(en)
			}
		)
		it(
			"the first keydown, mousedown and touchend each enable the background audio once",
			async () => {
				await load()
				const inputs = [
					() => new KeyboardEvent(
						"keydown",
						{ bubbles: true, code: "KeyZ" }
					),
					() => new MouseEvent("mousedown", { bubbles: true }),
					() => new Event("touchend", { bubbles: true })
				]
				for (const input of inputs) {
					mocks.enable_bg_audio.mockClear()
					document.body.dispatchEvent(input())
					document.body.dispatchEvent(input())
					expect(mocks.enable_bg_audio).toHaveBeenCalledTimes(1)
				}
			}
		)
		it(
			"without visualViewport the window resize alone drives the layout",
			async () => {
				await load()
				mocks.resize_2d.mockClear()
				mocks.layout_tutorial.mockClear()
				dispatchEvent(new Event("resize"))
				expect(mocks.resize_2d).toHaveBeenCalledTimes(1)
				expect(mocks.layout_tutorial).toHaveBeenCalledTimes(1)
			}
		)
	}
)