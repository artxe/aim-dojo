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
/** @type {typeof import("../../docs/js/constants.js").default} */
let constants
/** @type {typeof import("../../docs/js/controller/dom.js")} */
let dom
/** @type {typeof import("../../docs/js/controller/setting.js")} */
let setting
/** @type {typeof import("../../docs/js/state.js").default} */
let state
/** @returns {boolean} */
function is_open() {
	return dom.setting_view_el.hasAttribute("active")
}
/**
 * @param {HTMLInputElement} input
 * @returns {string | null}
 */
function label_of(input) {
	return /** @type {Text} */(input.nextSibling)/**/.textContent
}
/**
 * @param {"none" | "video" | "youtube"} type
 * @returns {HTMLInputElement}
 */
function radio(type) {
	return /** @type {HTMLInputElement} */(document.getElementById(`bg-${type}-radio`))/**/
}
/** @returns {string | null} */
function shown_bg() {
	return dom.bg_el.getAttribute("data-show")
}
/**
 * @param {HTMLInputElement} input
 * @param {string} value
 * @returns {void}
 */
function slide(input, value) {
	input.value = value
	input.dispatchEvent(new Event("input"))
}
/** @returns {string | null | undefined} */
function toast() {
	return dom.toast_el.firstElementChild?.textContent
}
/**
 * @param {HTMLInputElement} input
 * @param {string} value
 * @returns {void}
 */
function type_and_leave(input, value) {
	input.value = value
	input.dispatchEvent(
		new Event("change", { bubbles: true })
	)
	input.dispatchEvent(new Event("blur"))
}
describe(
	"controller/setting.js",
	() => {
		beforeAll(
			async () => {
				localStorage.clear()
				localStorage.setItem("lang", "en")
				load_page()
				constants = (await import("../../docs/js/constants.js")).default
				dom = await import("../../docs/js/controller/dom.js")
				state = (await import("../../docs/js/state.js")).default
				setting = await import("../../docs/js/controller/setting.js")
				run_page_script()
				await setting.init_bg()
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
				dom.toast_el.replaceChildren()
			}
		)
		afterEach(
			() => {
				vi.restoreAllMocks()
				if (is_open()) {
					dom.modal_backdrop_btn.click()
				}
				history.replaceState(null, "", START_URL)
			}
		)
		describe(
			"background",
			() => {
				it(
					"Activate previews a choice over the settings, the backdrop dismisses it back to the saved one, and closing drops the choice",
					async () => {
						dom.setting_btn.click()
						radio("none").click()
						dom.activate_bg_btn.click()
						await vi.waitFor(
							() => expect(
								dom.bg_el.hasAttribute("activate")
							).toBe(true)
						)
						expect(shown_bg()).toBe("none")
						expect(
							localStorage.getItem("bg.type")
						).not.toBe("none")
						dom.modal_backdrop_btn.click()
						await vi.waitFor(
							() => expect(shown_bg()).toBe("default")
						)
						expect(
							dom.bg_el.hasAttribute("activate")
						).toBe(false)
						expect(is_open()).toBe(true)
						dom.modal_backdrop_btn.click()
						expect(is_open()).toBe(false)
						await vi.waitFor(
							() => expect(radio("video").checked).toBe(true)
						)
					}
				)
				it(
					"None and Save turn the background off and keep it so after closing, and Video and Save bring the default back",
					async () => {
						dom.setting_btn.click()
						radio("none").click()
						dom.save_bg_btn.click()
						await vi.waitFor(
							() => expect(shown_bg()).toBe("none")
						)
						expect(state.bg.type).toBe("none")
						expect(
							localStorage.getItem("bg.type")
						).toBe("none")
						dom.modal_backdrop_btn.click()
						dom.setting_btn.click()
						await vi.waitFor(
							() => expect(radio("none").checked).toBe(true)
						)
						radio("video").click()
						dom.save_bg_btn.click()
						await vi.waitFor(
							() => expect(shown_bg()).toBe("default")
						)
						expect(
							localStorage.getItem("bg.type")
						).toBe("default")
					}
				)
				it(
					"YouTube fills in the saved link, and an unsupported link is refused with the saved background kept",
					async () => {
						dom.setting_btn.click()
						radio("youtube").click()
						expect(dom.bg_link_input.value).toBe(constants.bg.youtube_link)
						dom.bg_link_input.value = "https://example.com/watch?v=abc"
						dom.save_bg_btn.click()
						await vi.waitFor(
							() => expect(toast()).toBe("Error: Unsupported URL")
						)
						expect(shown_bg()).toBe("default")
						expect(
							localStorage.getItem("bg.type")
						).not.toBe("youtube")
					}
				)
				it(
					"a YouTube link is saved into the background iframe with a loop, asks for Esc, and leaving it clears the iframe",
					async () => {
						const iframe = dom.bg_iframe_el
						const parent = /** @type {HTMLElement} */(iframe.parentElement)/**/
						const next = iframe.nextSibling
						iframe.remove()
						try {
							dom.setting_btn.click()
							radio("youtube").click()
							dom.bg_link_input.value = "https://youtu.be/abc123"
							dom.save_bg_btn.click()
							await vi.waitFor(
								() => expect(toast()).toBe("Please press ESC")
							)
							expect(iframe.src).toBe(
								"https://www.youtube.com/embed/abc123?loop=1&playlist=abc123"
							)
							expect(
								dom.bg_el.hasAttribute("activate")
							).toBe(true)
							expect(shown_bg()).toBe("youtube")
							expect(
								localStorage.getItem("bg.youtube_link")
							).toBe("https://youtu.be/abc123")
							dom.modal_backdrop_btn.click()
							await vi.waitFor(
								() => expect(
									dom.bg_el.hasAttribute("activate")
								).toBe(false)
							)
							expect(shown_bg()).toBe("youtube")
							radio("video").click()
							dom.save_bg_btn.click()
							await vi.waitFor(
								() => expect(shown_bg()).toBe("default")
							)
							expect(iframe.hasAttribute("src")).toBe(false)
						} finally {
							parent.insertBefore(iframe, next)
						}
					}
				)
				it(
					"an uploaded video is listed and selected, Save plays it, and removing it falls back to the default",
					async () => {
						const select_button = /** @type {HTMLButtonElement} */(dom.bg_video_select.querySelector("button"))/**/
						const upload = /** @type {HTMLLIElement} */(dom.bg_video_select.querySelector("li[data-action='upload']"))/**/
						dom.setting_btn.click()
						radio("video").click()
						const pick = vi.spyOn(
							HTMLInputElement.prototype,
							"click"
						).mockImplementation(() => {})
						select_button.click()
						upload.click()
						const input = pick.mock.contexts.at(-1)
						expect(input.type).toBe("file")
						expect(input.accept).toBe("video/*")
						const data = new DataTransfer()
						data.items.add(
							new File(
								[ "clip" ],
								"my clip.mp4",
								{ type: "video/mp4" }
							)
						)
						input.files = data.files
						input.dispatchEvent(new Event("change"))
						await vi.waitFor(
							() => expect(select_button.textContent).toBe("my clip.mp4")
						)
						const id = dom.bg_video_select.value
						expect(id).not.toBe("default")
						dom.save_bg_btn.click()
						await vi.waitFor(
							() => expect(shown_bg()).toBe("video")
						)
						expect(dom.bg_upload_video_el.src).toMatch(/^blob:/)
						expect(
							localStorage.getItem("bg.type")
						).toBe("video")
						expect(
							localStorage.getItem("bg.video_id")
						).toBe(id)
						select_button.click()
						const remove = /** @type {HTMLButtonElement} */(dom.bg_video_select.querySelector(
							`li[data-value='${id}'] button[data-remove]`
						))/**/
						remove.click()
						await vi.waitFor(
							() => expect(shown_bg()).toBe("default")
						)
						await vi.waitFor(
							() => expect(
								dom.bg_video_select.querySelector(`li[data-value='${id}']`)
							).toBe(null)
						)
						expect(dom.bg_video_select.value).toBe("default")
						expect(
							localStorage.getItem("bg.type")
						).toBe("default")
						expect(
							dom.bg_upload_video_el.hasAttribute("src")
						).toBe(false)
					}
				)
				it(
					"boots on the default video with the Video choice shown",
					() => {
						expect(shown_bg()).toBe("default")
						expect(radio("video").checked).toBe(true)
						expect(dom.bg_video_select.value).toBe("default")
					}
				)
			}
		)
		describe(
			"controls",
			() => {
				it(
					"ADS Toggle and In-Game Blur persist as they are switched",
					() => {
						dom.ads_toggle_input.click()
						expect(state.game.ads_toggle).toBe(true)
						expect(
							localStorage.getItem("game.ads_toggle")
						).toBe("true")
						dom.ads_toggle_input.click()
						expect(state.game.ads_toggle).toBe(false)
						dom.bg_blur_input.checked = true
						dom.bg_blur_input.click()
						expect(state.bg.blur).toBe(false)
						expect(
							document.body.hasAttribute("bg-blur")
						).toBe(false)
						expect(
							localStorage.getItem("bg.blur")
						).toBe("false")
						dom.bg_blur_input.click()
						expect(
							document.body.hasAttribute("bg-blur")
						).toBe(true)
						expect(
							localStorage.getItem("bg.blur")
						).toBe("true")
					}
				)
				it(
					"Copy Filter copies the Equalizer APO filter and toasts it",
					() => {
						const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(void 0)
						dom.copy_apo_filter_btn.click()
						const [ filter ] = write.mock.calls[0]
						expect(filter).toMatch(/^# GraphicEQ: 25 0; /)
						expect(toast()).toBe(`Copied!\n${filter}`)
					}
				)
				it(
					"Render Scale shows and persists its percent and redraws the game canvas at that scale",
					() => {
						slide(dom.render_scale_input, "70")
						expect(
							label_of(dom.render_scale_input)
						).toBe("70%")
						expect(state.render.scale).toBe(70)
						expect(
							localStorage.getItem("render.scale")
						).toBe("70")
						expect(dom.canvas_el.width).toBe(
							Math.round(state.camera.width * .7)
						)
						expect(dom.canvas_crosshair_el.width).toBe(state.camera.width)
						slide(dom.render_scale_input, "100")
						expect(dom.canvas_el.width).toBe(state.camera.width)
					}
				)
				it(
					"clearing a mode's score toasts it and disables its button",
					() => {
						for (const [ button, text ] of [
							[
								dom.clear_aim_booster_btn,
								"Aim Booster score has been reset!"
							],
							[
								dom.clear_h_tracking_btn,
								"H-Tracking score has been reset!"
							],
							[
								dom.clear_precision_btn,
								"Precision score has been reset!"
							],
							[
								dom.clear_writing_btn,
								"Writing score has been reset!"
							]
						]) {
							button.disabled = false
							button.click()
							expect(toast()).toBe(text)
							expect(button.disabled).toBe(true)
						}
					}
				)
				it(
					"picking a language persists it",
					() => {
						const button = /** @type {HTMLButtonElement} */(dom.lang_select.querySelector("button"))/**/
						const ko = /** @type {HTMLLIElement} */(dom.lang_select.querySelector("li[data-value='ko']"))/**/
						const en = /** @type {HTMLLIElement} */(dom.lang_select.querySelector("li[data-value='en']"))/**/
						button.click()
						ko.click()
						expect(state.lang).toBe("ko")
						expect(localStorage.getItem("lang")).toBe("ko")
						button.click()
						en.click()
						expect(state.lang).toBe("en")
					}
				)
				it(
					"the volume sliders show and persist their percent, and the two BGM sliders follow each other",
					() => {
						slide(dom.sfx_volume_input, "30")
						expect(label_of(dom.sfx_volume_input)).toBe("30%")
						expect(state.audio.sfx_volume).toBe(30)
						expect(
							localStorage.getItem("audio.sfx_volume")
						).toBe("30")
						slide(dom.bgm_volume_input, "40")
						expect(
							dom.bgm_volume_mobile_input.value
						).toBe("40")
						expect(label_of(dom.bgm_volume_input)).toBe("40%")
						expect(
							label_of(dom.bgm_volume_mobile_input)
						).toBe("40%")
						expect(state.audio.bgm_volume).toBe(40)
						expect(
							localStorage.getItem("audio.bgm_volume")
						).toBe("40")
						expect(dom.bg_upload_video_el.volume).toBeCloseTo(.4, 9)
						slide(
							dom.bgm_volume_mobile_input,
							"20"
						)
						expect(dom.bgm_volume_input.value).toBe("20")
						expect(state.audio.bgm_volume).toBe(20)
					}
				)
			}
		)
		describe(
			"crosshair",
			() => {
				it(
					"a picked colour is applied at the slider's opacity",
					() => {
						slide(dom.crosshair_alpha_input, "100")
						dom.crosshair_color_input.value = "#ff0000"
						dom.crosshair_color_input.dispatchEvent(new Event("change"))
						expect(state.crosshair.color).toBe("rgba(255,0,0,1)")
						expect(
							dom.crosshair_rgba_el.textContent
						).toBe("rgba(255,0,0,1)")
						expect(
							dom.reset_crosshair_btn.disabled
						).toBe(false)
						dom.reset_crosshair_btn.click()
					}
				)
				it(
					"after Reset the opacity slider keeps the default colour",
					() => {
						type_and_leave(dom.crosshair_gap_input, "5")
						dom.reset_crosshair_btn.click()
						slide(dom.crosshair_alpha_input, "50")
						expect(
							label_of(dom.crosshair_alpha_input)
						).toBe("50%")
						expect(state.crosshair.color).toBe("rgba(0,255,0,0.5)")
						expect(
							dom.crosshair_rgba_el.textContent
						).toBe("rgba(0,255,0,0.5)")
						expect(
							localStorage.getItem("crosshair.color")
						).toBe("rgba(0,255,0,0.5)")
						dom.reset_crosshair_btn.click()
					}
				)
				it(
					"an edited field persists, redraws the preview and enables Reset, which restores every default",
					() => {
						const { height, width } = constants.crosshair
						const draw = vi.spyOn(
							CanvasRenderingContext2D.prototype,
							"drawImage"
						)
						expect(
							dom.reset_crosshair_btn.disabled
						).toBe(true)
						type_and_leave(dom.crosshair_width_input, "40")
						expect(state.crosshair.width).toBe(40)
						expect(
							localStorage.getItem("crosshair.width")
						).toBe("40")
						expect(
							dom.reset_crosshair_btn.disabled
						).toBe(false)
						expect(draw).toHaveBeenCalled()
						type_and_leave(dom.crosshair_height_input, "12")
						dom.reset_crosshair_btn.click()
						expect(
							dom.crosshair_width_input.value
						).toBe(String(width))
						expect(
							dom.crosshair_height_input.value
						).toBe(String(height))
						expect(state.crosshair).toMatchObject(constants.crosshair)
						expect(
							localStorage.getItem("crosshair.width")
						).toBe(String(width))
						expect(
							dom.reset_crosshair_btn.disabled
						).toBe(true)
						expect(toast()).toBe("Crosshair has been reset!")
					}
				)
			}
		)
		describe(
			"the settings view",
			() => {
				it(
					"a section is named in the hash once the pointer has moved into it, or when one of its controls is used",
					() => {
						dom.setting_btn.click()
						dom.setting_audio_el.dispatchEvent(new MouseEvent("mouseenter"))
						expect(location.hash).toBe("#setting")
						dom.setting_view_el.dispatchEvent(
							new MouseEvent("mousemove", { movementX: 3 })
						)
						dom.setting_audio_el.dispatchEvent(new MouseEvent("mouseenter"))
						expect(location.hash).toBe("#setting-audio")
						dom.ads_toggle_input.click()
						expect(location.hash).toBe("#setting-control")
						dom.ads_toggle_input.click()
					}
				)
				it(
					"a settings hash opens it on that section and any other hash closes it",
					() => {
						history.replaceState(null, "", "#setting-crosshair")
						setting.sync_setting_hash()
						expect(is_open()).toBe(true)
						history.replaceState(null, "", "#menu")
						setting.sync_setting_hash()
						expect(is_open()).toBe(false)
						history.replaceState(null, "", "#setting")
						setting.sync_setting_hash()
						expect(is_open()).toBe(true)
						history.replaceState(null, "", location.pathname)
						setting.sync_setting_hash()
						expect(is_open()).toBe(false)
					}
				)
				it(
					"an undecodable hash leaves it closed",
					() => {
						history.replaceState(null, "", "#%E0%A4%A")
						expect(
							() => setting.sync_setting_hash()
						).not.toThrow()
						expect(is_open()).toBe(false)
					}
				)
				it(
					"the Setting button opens it, closing the game list, and the backdrop closes it",
					() => {
						dom.game_sens_list_el.setAttribute("open", "")
						dom.setting_btn.click()
						expect(is_open()).toBe(true)
						expect(location.hash).toBe("#setting")
						expect(
							dom.game_sens_list_el.hasAttribute("open")
						).toBe(false)
						dom.modal_backdrop_btn.click()
						expect(is_open()).toBe(false)
						expect(location.hash).toBe("")
					}
				)
			}
		)
	}
)