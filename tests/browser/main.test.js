import { load_page, run_page_script } from "./helpers/dom.js"
import {
	afterAll,
	beforeAll,
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
const LEGACY_KEYS = [
	"aim_booster#best_score",
	"flick#best_score",
	"flick_180#best_score",
	"h_tracking#best_score",
	"timing#best_score",
	"twitch#best_score",
	"v_tracking#best_score",
	"writing#best_score"
]
const START_URL = location.href
/** @type {typeof import("../../docs/js/constants.js").default} */
let constants
/** @type {typeof import("../../docs/js/controller/dom.js")} */
let dom
/**
 * @param {HTMLInputElement} input
 * @returns {string | null}
 */
function label_of(input) {
	return /** @type {Text} */(input.nextSibling)/**/.textContent
}
describe(
	"main.js",
	() => {
		beforeAll(
			async () => {
				localStorage.clear()
				for (const [ key, value ] of [
					[ "audio.bgm_volume", "35" ],
					[ "audio.sfx_volume", "45" ],
					[ "bg.blur", "false" ],
					[ "cpi_norm.cpi", "1600" ],
					[ "cpi_norm.game", "cs2" ],
					[ "cpi_norm.sens", "2" ],
					[
						"crosshair.color",
						"rgba(255,0,0,0.5)"
					],
					[ "crosshair.width", "20" ],
					[ "game.ads_scope.val", "vandal" ],
					[ "game.ads_toggle", "true" ],
					[ "game.sens", "val" ],
					[ "lang", "ko" ],
					[ "render.scale", "80" ],
					...LEGACY_KEYS.map(legacy => [ legacy, "1" ])
				]) {
					localStorage.setItem(key, value)
				}
				history.replaceState(null, "", "#setting-audio")
				load_page()
				constants = (await import("../../docs/js/constants.js")).default
				dom = await import("../../docs/js/controller/dom.js")
				await import("../../docs/js/main.js")
				run_page_script()
			}
		)
		afterAll(
			() => {
				history.replaceState(null, "", START_URL)
			}
		)
		it(
			"boot drops the scores of retired modes and keeps the settings",
			() => {
				for (const key of LEGACY_KEYS) {
					expect(localStorage.getItem(key)).toBe(null)
				}
				expect(
					localStorage.getItem("audio.bgm_volume")
				).toBe("35")
			}
		)
		it(
			"boot fills every settings control and its label from the saved settings",
			async () => {
				expect(dom.version_el.textContent).toBe(constants.version)
				expect(dom.bgm_volume_input.value).toBe("35")
				expect(label_of(dom.bgm_volume_input)).toBe("35%")
				expect(
					dom.bgm_volume_mobile_input.value
				).toBe("35")
				expect(
					label_of(dom.bgm_volume_mobile_input)
				).toBe("35%")
				expect(dom.sfx_volume_input.value).toBe("45")
				expect(label_of(dom.sfx_volume_input)).toBe("45%")
				expect(dom.render_scale_input.value).toBe("80")
				expect(
					label_of(dom.render_scale_input)
				).toBe("80%")
				expect(dom.ads_toggle_input.checked).toBe(true)
				expect(dom.bg_blur_input.checked).toBe(false)
				expect(dom.lang_select.value).toBe("ko")
				expect(dom.val_ads_scope_select.value).toBe("vandal")
				expect(
					dom.crosshair_alpha_input.value
				).toBe("50")
				expect(
					label_of(dom.crosshair_alpha_input)
				).toBe("50%")
				expect(
					dom.crosshair_color_input.value
				).toBe("#ff0000")
				expect(
					dom.crosshair_rgba_el.textContent
				).toBe("rgba(255,0,0,0.5)")
				expect(
					dom.crosshair_width_input.value
				).toBe("20")
				expect(
					dom.reset_crosshair_btn.disabled
				).toBe(false)
				expect(dom.cpi_norm_cpi_input.value).toBe("1600")
				expect(dom.cpi_norm_game_select.value).toBe("cs2")
				expect(dom.cpi_norm_sens_input.value).toBe("2")
				await vi.waitFor(
					() => expect(
						/** @type {HTMLInputElement} */(document.getElementById("bg-video-radio"))/**/.checked
					).toBe(true)
				)
			}
		)
		it(
			"boot opens the settings on the section named in the address",
			() => {
				expect(
					dom.setting_view_el.hasAttribute("active")
				).toBe(true)
				expect(location.hash).toBe("#setting-audio")
			}
		)
		it(
			"boot shows the saved game's card, the CPI pair and the normalizer's result",
			() => {
				expect(
					dom.val_el.hasAttribute("active")
				).toBe(true)
				expect(dom.val_hipfire_el.textContent).toMatch(/^\d+(\.\d+)?$/)
				expect(dom.cpi_x_input.value).toMatch(/^\d+$/)
				expect(
					dom.cpi_norm_result_el.textContent
				).toMatch(/^\d+$/)
			}
		)
		it(
			"boot sizes the canvases at the render scale and draws the crosshair preview",
			() => {
				const width = innerWidth * devicePixelRatio
				expect(dom.canvas_crosshair_el.width).toBe(width)
				expect(dom.canvas_el.width).toBe(Math.round(width * .8))
				const context = /** @type {CanvasRenderingContext2D} */(dom.crosshair_preview_el.getContext("2d"))/**/
				const { height, width: preview_width } = dom.crosshair_preview_el
				const center = context.getImageData(
					preview_width / 2 - 10,
					height / 2,
					1,
					1
				).data
				expect(center[0]).toBeGreaterThan(center[1])
			}
		)
	}
)