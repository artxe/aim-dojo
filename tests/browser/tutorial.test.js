import { load_page, run_page_script } from "./helpers/dom.js"
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
const START_URL = location.href
const STEP_COUNT = 45
/** @type {typeof import("../../docs/js/controller/dom.js")} */
let dom
/** @type {typeof import("../../docs/js/state.js").default} */
let state
/** @returns {boolean} */
function is_touring() {
	return dom.tutorial_view_el.hasAttribute("active")
}
/**
 * @param {string} prefix
 * @returns {void}
 */
function next_until(prefix) {
	for (let i = 0; i < STEP_COUNT && !String(
		dom.tutorial_text_el.textContent
	).startsWith(prefix); i++) {
		dom.tutorial_next_btn.click()
	}
	expect(
		dom.tutorial_text_el.textContent
	).toMatch(new RegExp(`^${prefix}`))
}
/**
 * @param {string} code
 * @returns {KeyboardEvent}
 */
function press(code) {
	const ev = new KeyboardEvent(
		"keydown",
		{
			bubbles: true,
			cancelable: true,
			code
		}
	)
	document.body.dispatchEvent(ev)
	document.body.dispatchEvent(
		new KeyboardEvent("keyup", { bubbles: true, code })
	)
	return ev
}
/** @returns {string | null} */
function progress() {
	return dom.tutorial_progress_el.textContent
}
/**
 * @param {"none" | "video" | "youtube"} type
 * @returns {HTMLInputElement}
 */
function radio(type) {
	return /** @type {HTMLInputElement} */(document.getElementById(`bg-${type}-radio`))/**/
}
describe(
	"controller/tutorial.js",
	() => {
		beforeAll(
			async () => {
				localStorage.clear()
				localStorage.setItem("game.sens", "cs2")
				localStorage.setItem("lang", "en")
				load_page()
				dom = await import("../../docs/js/controller/dom.js")
				state = (await import("../../docs/js/state.js")).default
				await import("../../docs/js/controller/window.js")
				const game_sens = await import("../../docs/js/controller/game_sens.js")
				const setting = await import("../../docs/js/controller/setting.js")
				run_page_script()
				game_sens.init_game_sens()
				await setting.init_bg()
				localStorage.removeItem("game.sens")
			}
		)
		beforeEach(
			() => {
				vi.spyOn(
					HTMLMediaElement.prototype,
					"load"
				).mockReturnValue(void 0)
				vi.spyOn(
					HTMLMediaElement.prototype,
					"play"
				).mockResolvedValue(void 0)
				state.lang = "en"
			}
		)
		afterEach(
			() => {
				if (is_touring()) {
					dom.tutorial_skip_btn.click()
				}
				vi.restoreAllMocks()
				history.replaceState(null, "", START_URL)
			}
		)
		it(
			"Next, Prev, the arrow keys and a click on the shade move through the steps",
			() => {
				dom.tutorial_btn.click()
				dom.tutorial_next_btn.click()
				expect(progress()).toBe(`2 / ${STEP_COUNT}`)
				expect(dom.tutorial_prev_btn.disabled).toBe(false)
				expect(
					press("ArrowRight").defaultPrevented
				).toBe(true)
				expect(progress()).toBe(`3 / ${STEP_COUNT}`)
				expect(
					dom.game_sens_list_el.hasAttribute("open")
				).toBe(true)
				press("ArrowLeft")
				expect(progress()).toBe(`2 / ${STEP_COUNT}`)
				expect(
					dom.game_sens_list_el.hasAttribute("open")
				).toBe(false)
				dom.tutorial_prev_btn.click()
				dom.tutorial_prev_btn.click()
				expect(progress()).toBe(`1 / ${STEP_COUNT}`)
				dom.tutorial_shade_el.click()
				expect(progress()).toBe(`2 / ${STEP_COUNT}`)
			}
		)
		it(
			"a Korean player gets the tour in Korean",
			() => {
				state.lang = "ko"
				dom.tutorial_btn.click()
				expect(
					dom.tutorial_text_el.textContent
				).toMatch(/^AIM DOJO는/)
				expect(
					dom.tutorial_next_btn.textContent
				).toBe("다음")
				expect(
					dom.tutorial_prev_btn.textContent
				).toBe("이전")
				expect(
					dom.tutorial_skip_btn.textContent
				).toBe("닫기")
			}
		)
		it(
			"a game card step shows that game's card without saving it, and leaving the tour brings the player's game back",
			() => {
				dom.tutorial_btn.click()
				next_until("APEX LEGENDS —\nApex lets")
				expect(state.game.sens).toBe("al")
				expect(
					dom.al_el.hasAttribute("active")
				).toBe(true)
				expect(
					dom.cs2_el.hasAttribute("active")
				).toBe(false)
				next_until("Black Desert")
				expect(state.game.sens).toBe("bdo")
				expect(
					dom.bdo_el.hasAttribute("active")
				).toBe(true)
				press("Escape")
				expect(is_touring()).toBe(false)
				expect(state.game.sens).toBe("cs2")
				expect(
					dom.cs2_el.hasAttribute("active")
				).toBe(true)
				expect(
					localStorage.getItem("game.sens")
				).toBe(null)
			}
		)
		it(
			"a mode step names its controls, with RMB as ADS only in a mode that zooms",
			() => {
				dom.tutorial_btn.click()
				next_until("Aim Booster —")
				expect(
					dom.tutorial_keys_el.textContent
				).toBe(
					"Tap LMB / Q W E R A · RMB: Shoot · Esc: Exit · Space (hold): 30 FPS limit"
				)
				next_until("Precision —")
				expect(
					dom.tutorial_keys_el.textContent
				).toBe(
					"Tap LMB / Q W E R A · RMB: ADS (Shoot in League) · Esc: Exit · Space (hold): 30 FPS limit"
				)
				next_until("H-Tracking —")
				expect(
					dom.tutorial_keys_el.textContent
				).toMatch(/^Hold LMB/)
			}
		)
		it(
			"during the tour a click on a mode does not start a run",
			() => {
				const lock = vi.spyOn(
					document.body,
					"requestPointerLock"
				)
				dom.tutorial_btn.click()
				const click = new MouseEvent(
					"click",
					{ bubbles: true, cancelable: true }
				)
				dom.precision_btn.dispatchEvent(click)
				expect(click.defaultPrevented).toBe(true)
				expect(lock).not.toHaveBeenCalled()
				expect(state.game.mode).toBe(null)
			}
		)
		it(
			"leaving the tour on the background step drops an unsaved background choice",
			async () => {
				dom.tutorial_btn.click()
				next_until("Background Video —")
				radio("none").click()
				expect(dom.bg_type_input.value).toBe("none")
				press("Escape")
				expect(
					dom.setting_view_el.hasAttribute("active")
				).toBe(false)
				dom.setting_btn.click()
				await vi.waitFor(
					() => expect(radio("video").checked).toBe(true)
				)
				expect(
					dom.bg_el.getAttribute("data-show")
				).toBe("default")
				dom.modal_backdrop_btn.click()
			}
		)
		it(
			"the HUD steps show example numbers, and the next step clears them",
			() => {
				dom.tutorial_btn.click()
				next_until("The label on the left")
				expect(
					dom.tutorial_view_el.hasAttribute("hud-preview")
				).toBe(true)
				expect(dom.run_score_el.textContent).toBe("Bit/s")
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe("4.62 / 4.31")
				expect(dom.timer_el.textContent).toBe("240 / 01:12")
				dom.tutorial_next_btn.click()
				expect(
					dom.tutorial_view_el.hasAttribute("hud-preview")
				).toBe(true)
				dom.tutorial_next_btn.click()
				expect(
					dom.tutorial_view_el.hasAttribute("hud-preview")
				).toBe(false)
				expect(dom.run_score_el.textContent).toBe("Score")
				expect(
					dom.run_score_el.hasAttribute("value")
				).toBe(false)
				expect(dom.timer_el.textContent).toBe("-")
			}
		)
		it(
			"the Tutorial button starts the tour on its first step around the menu with the step controls",
			() => {
				dom.tutorial_btn.click()
				expect(is_touring()).toBe(true)
				expect(progress()).toBe(`1 / ${STEP_COUNT}`)
				expect(
					dom.tutorial_text_el.textContent
				).toMatch(/^AIM DOJO is an aim trainer/)
				expect(
					dom.tutorial_keys_el.textContent
				).toBe(
					"Next / Prev · ← → · Esc: Exit"
				)
				expect(dom.tutorial_prev_btn.disabled).toBe(true)
				expect(
					dom.tutorial_next_btn.textContent
				).toBe("Next")
				expect(
					dom.tutorial_skip_btn.textContent
				).toBe("Exit")
				expect(
					dom.tutorial_spotlight_el.hasAttribute("blank")
				).toBe(false)
				expect(
					dom.tutorial_shade_el.style.clipPath
				).toMatch(/^path\(evenodd/)
			}
		)
		it(
			"the settings steps open the settings on each section, and the last step closes them and ends the tour on Done",
			() => {
				dom.tutorial_btn.click()
				next_until("Language —")
				expect(
					dom.setting_view_el.hasAttribute("active")
				).toBe(true)
				expect(location.hash).toBe("#setting-language")
				next_until("Crosshair —")
				expect(location.hash).toBe("#setting-crosshair")
				next_until("That is the whole tour.")
				expect(progress()).toBe(
					`${STEP_COUNT} / ${STEP_COUNT}`
				)
				expect(
					dom.setting_view_el.hasAttribute("active")
				).toBe(false)
				expect(
					dom.tutorial_next_btn.textContent
				).toBe("Done")
				expect(
					dom.tutorial_spotlight_el.hasAttribute("blank")
				).toBe(true)
				dom.tutorial_next_btn.click()
				expect(is_touring()).toBe(false)
			}
		)
	}
)