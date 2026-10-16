import { load_page } from "./helpers/dom.js"
import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest"
vi.mock(
	"../../docs/js/sfx.js",
	() => ({
		play_hit: vi.fn(),
		play_miss: vi.fn(),
		play_shot: vi.fn(),
		set_audio_visible: vi.fn()
	})
)
vi.mock(
	"../../docs/js/worker/manager.js",
	() => ({
		post_bg_worker_message: vi.fn(),
		post_writing_worker_message: vi.fn()
	})
)
/** @type {typeof import("../../docs/js/controller/dom.js")} */
let dom
/** @type {typeof import("../../docs/js/logic.js")} */
let logic
/** @type {typeof import("../../docs/js/state.js").default} */
let state
/** @returns {string[]} */
function hud_labels() {
	return [
		String(dom.run_score_el.textContent),
		String(dom.accuracy_el.textContent),
		String(dom.crit_rate_el.textContent)
	]
}
describe(
	"controller/menu.js",
	() => {
		beforeAll(
			async () => {
				localStorage.clear()
				localStorage.setItem("lang", "en")
				load_page()
				dom = await import("../../docs/js/controller/dom.js")
				logic = await import("../../docs/js/logic.js")
				state = (await import("../../docs/js/state.js")).default
				await import("../../docs/js/controller/menu.js")
			}
		)
		beforeEach(
			() => {
				state.camera.height = 1_080
				state.camera.width = 1_920
				state.game.sens = "val"
				vi.spyOn(
					document.body,
					"requestFullscreen"
				).mockResolvedValue(void 0)
				vi.spyOn(
					document.body,
					"requestPointerLock"
				).mockResolvedValue(void 0)
				vi.spyOn(
					document,
					"pointerLockElement",
					"get"
				).mockReturnValue(document.body)
				vi.stubGlobal("cancelAnimationFrame", vi.fn())
				vi.stubGlobal(
					"requestAnimationFrame",
					vi.fn(() => 1)
				)
			}
		)
		afterEach(
			() => {
				if (state.game.mode) {
					logic.stop_game()
				}
				vi.restoreAllMocks()
				vi.unstubAllGlobals()
			}
		)
		it.each(
			[
				[
					"aim_booster",
					"aim_booster_btn",
					[ "Bit/s", "Accuracy", "Spawn" ]
				],
				[
					"h_tracking",
					"h_tracking_btn",
					[ "Bit/s", "On Target", "Critical" ]
				],
				[
					"precision",
					"precision_btn",
					[ "Bit/s", "Accuracy", "Critical" ]
				],
				[
					"writing",
					"writing_btn",
					[ "Px/s", "On Text", "Critical" ]
				]
			]
		)(
			"clicking %s locks the pointer, enters fullscreen and starts that mode with its HUD labels",
			async (mode, button, labels) => {
				const click = new MouseEvent("click", { cancelable: true })
				dom[button].dispatchEvent(click)
				expect(click.defaultPrevented).toBe(true)
				await vi.waitFor(
					() => expect(state.game.mode).toBe(mode)
				)
				expect(
					document.body.requestPointerLock
				).toHaveBeenCalledOnce()
				expect(
					document.body.requestFullscreen
				).toHaveBeenCalledOnce()
				expect(hud_labels()).toEqual(labels)
				expect(requestAnimationFrame).toHaveBeenCalledOnce()
			}
		)
		it(
			"a click on a mode cancels the pending screensaver",
			async () => {
				const screen_saver = vi.fn()
				state.game.rest_timeout = setTimeout(screen_saver, 10)
				dom.precision_btn.dispatchEvent(
					new MouseEvent("click", { cancelable: true })
				)
				expect(state.game.rest_timeout).toBe(0)
				await vi.waitFor(
					() => expect(state.game.mode).toBe("precision")
				)
				await new Promise(
					resolve => setTimeout(resolve, 20)
				)
				expect(screen_saver).not.toHaveBeenCalled()
			}
		)
	}
)