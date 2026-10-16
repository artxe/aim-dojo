import constants from "../../docs/js/constants.js"
import { round, round_to, to_deg, to_rad } from "../../docs/js/math.js"
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
const GAMES = [
	"al",
	"bdo",
	"cs2",
	"fn",
	"lol",
	"mc",
	"ow",
	"pubg",
	"r6",
	"rb",
	"sa",
	"val"
]
const H = 1080
const W = 1920
const CS2_EXACT = Math.atan(8 / 15) / 384 / to_rad(.022)
let dom
let game_sens
let state
/**
 * @returns {string[]}
 */
function card_texts() {
	return [
		...dom.game_sens_list_el.querySelectorAll("span[id]")
	].map(el => el.textContent)
}
/**
 * @param {ReturnType<typeof watch_download>} spies
 * @param {string} name
 * @returns {Promise<string>}
 */
async function downloaded_text(spies, name) {
	await vi.waitFor(
		() => expect(spies.revoke).toHaveBeenCalledOnce()
	)
	const [ blob ] = spies.create.mock.calls[0]
	const url = spies.create.mock.results[0].value
	const [ anchor ] = spies.click.mock.contexts
	expect(anchor.download).toBe(name)
	expect(anchor.href).toBe(url)
	expect(anchor.isConnected).toBe(false)
	expect(spies.revoke).toHaveBeenCalledWith(url)
	return blob.text()
}
/**
 * @param {Element} target
 * @param {File} [file]
 * @returns {DragEvent}
 */
function drop(target, file) {
	const data = new DataTransfer()
	if (file) {
		data.items.add(file)
	}
	const ev = new DragEvent(
		"drop",
		{
			cancelable: true,
			dataTransfer: data
		}
	)
	target.dispatchEvent(ev)
	return ev
}
/**
 * @param {number} fov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function hfov_43(fov_deg, width, height) {
	return to_deg(
		2 * Math.atan(
			Math.tan(to_rad(fov_deg) / 2) / (4 / 3) * Math.max(4 / 3, width / height)
		)
	)
}
/**
 * @param {number} vfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
function hfov_v(vfov_deg, width, height) {
	return to_deg(
		2 * Math.atan(
			Math.tan(to_rad(vfov_deg) / 2) * width / height
		)
	)
}
/**
 * @param {Element} el
 * @returns {number[]}
 */
function numbers(el) {
	return String(el.textContent).split(", ")
		.map(Number)
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @returns {number}
 */
function rad_per_px(hfov_deg, width) {
	const half = to_rad(hfov_deg) / 2
	const match = width * (1 - Math.cos(half)) / 2
	return Math.atan(
		2 * Math.tan(half) * match / width
	) / match
}
/**
 * @param {HTMLInputElement} el
 * @param {string} value
 * @returns {void}
 */
function set_value(el, value) {
	el.value = value
	el.dispatchEvent(new Event("change"))
}
/**
 * @returns {string | null | undefined}
 */
function toast_text() {
	return dom.toast_el.firstElementChild?.textContent
}
/**
 * @returns {Record<"click" | "create" | "revoke", ReturnType<typeof vi.spyOn>>}
 */
function watch_download() {
	return {
		click: vi.spyOn(
			HTMLAnchorElement.prototype,
			"click"
		).mockImplementation(() => {}),
		create: vi.spyOn(URL, "createObjectURL"),
		revoke: vi.spyOn(URL, "revokeObjectURL")
	}
}
describe(
	"controller/game_sens.js",
	() => {
		beforeAll(
			async () => {
				localStorage.clear()
				localStorage.setItem("game.height", String(H))
				localStorage.setItem("game.sens", "cs2")
				localStorage.setItem("game.width", String(W))
				localStorage.setItem("lang", "en")
				load_page()
				dom = await import("../../docs/js/controller/dom.js")
				state = (await import("../../docs/js/state.js")).default
				game_sens = await import("../../docs/js/controller/game_sens.js")
			}
		)
		beforeEach(
			() => {
				localStorage.clear()
				state.cpi_norm.cpi = 800
				state.cpi_norm.game = "val"
				state.cpi_norm.sens = 1
				state.cpi_norm.x = 0
				state.game.cpi_scale = 1
				state.game.height = H
				state.game.lol_sens = 50
				state.game.pubg_fov = 80
				state.game.width = W
				game_sens.set_active_game_sens("cs2")
				game_sens.close_game_sens_list()
				game_sens.init_game_sens()
				dom.toast_el.replaceChildren()
			}
		)
		afterEach(
			() => {
				vi.restoreAllMocks()
				vi.unstubAllGlobals()
			}
		)
		it(
			"LoL sens 50 is the 1x pointer speed: Windows 10 notch 6, Windows 11 notch 10, DPI = the CPI pair",
			() => {
				const { x, y } = game_sens.current_cpi()
				expect(dom.lol_win10_el.textContent).toBe("6")
				expect(dom.lol_win11_el.textContent).toBe("10")
				expect(dom.lol_dpi_el.textContent).toBe(`${x}, ${y}`)
			}
		)
		it(
			"LoL sens also drives the CPI normalizer's sens while it normalizes LoL",
			() => {
				state.cpi_norm.game = "lol"
				set_value(dom.lol_sens_input, "30")
				expect(dom.cpi_norm_sens_input.value).toBe("30")
				expect(state.cpi_norm.sens).toBe(30)
				expect(
					localStorage.getItem("cpi_norm.sens")
				).toBe("30")
				expect(
					dom.cpi_norm_result_el.textContent
				).toBe("400")
			}
		)
		it(
			"LoL sens maps to the Windows notch with its multiplier, the notch range around it, or past the end notches",
			() => {
				for (const [ sens, cpi_scale, win10, win11 ] of [
					[ "0", 1 / 32, "1", "1" ],
					[ "10", 1 / 8, "2-3", "3" ],
					[ "45", 7 / 8, "5-6", "9" ],
					[ "100", 3.5, "11", "20" ],
					[ "110", 4, ">11", ">20" ],
					[ "-5", -1 / 64, "<1", "<1" ]
				]) {
					set_value(dom.lol_sens_input, sens)
					expect(state.game.lol_sens).toBe(Number(sens))
					expect(
						localStorage.getItem("game.lol_sens")
					).toBe(sens)
					expect(state.game.cpi_scale).toBeCloseTo(cpi_scale, 12)
					expect(dom.lol_win10_el.textContent).toBe(win10)
					expect(dom.lol_win11_el.textContent).toBe(win11)
				}
			}
		)
		it(
			"LoL sens refreshes the CPI normalizer's result for another game, which divides the resolution by cpi_scale",
			() => {
				dom.cpi_norm_result_el.textContent = "stale"
				set_value(dom.lol_sens_input, "10")
				const val = rad_per_px(103, W) / to_rad(.07) / 8
				expect(
					dom.cpi_norm_result_el.textContent
				).toBe(String(round(800 / val)))
				expect(state.cpi_norm.sens).toBe(1)
				expect(
					localStorage.getItem("cpi_norm.sens")
				).toBe(null)
			}
		)
		it(
			"LoL sens scales the DPI pair and divides the game resolution: sens 10 (x0.125) gives an eighth of the cs2 hipfire",
			() => {
				const { x, y } = game_sens.current_cpi()
				set_value(dom.lol_sens_input, "10")
				expect(dom.lol_dpi_el.textContent).toBe(
					`${round_to(x / 8, 2)}, ${round_to(y / 8, 2)}`
				)
				expect(dom.cs2_hipfire_el.textContent).toBe(
					String(round_to(CS2_EXACT / 8, 2))
				)
			}
		)
		it(
			"MC options.txt value s solves 1.2 deg * (0.6 s + 0.2)^3 = the degrees per count at the 110 vertical fov",
			() => {
				const s = Number(
					dom.mc_hipfire_file_el.textContent
				)
				expect(1.2 * (.6 * s + .2) ** 3).toBeCloseTo(
					to_deg(
						rad_per_px(hfov_v(110, W, H), W)
					),
					12
				)
				expect(dom.mc_hipfire_el.textContent).toBe(String(round_to(s * 200, 2)))
			}
		)
		it(
			"PUBG FOV moves only the hipfire cell and refreshes the normalizer only while it normalizes PUBG",
			() => {
				const red_dot = dom.pubg_red_dot_el.textContent
				dom.cpi_norm_result_el.textContent = "stale"
				set_value(dom.pubg_fov_select, "103")
				expect(state.game.pubg_fov).toBe(103)
				expect(
					localStorage.getItem("game.pubg_fov")
				).toBe("103")
				const [ s ] = numbers(dom.pubg_hipfire_el)
				const yaw = to_rad(
					103 / 80 * constants.sens.pubg.base_yaw
				) * 2 ** ((s - 50) / constants.sens.pubg.step)
				expect(
					Math.abs(yaw / rad_per_px(103, W) - 1)
				).toBeLessThan(1e-6)
				expect(
					dom.pubg_red_dot_el.textContent
				).toBe(red_dot)
				expect(
					dom.cpi_norm_result_el.textContent
				).toBe("stale")
				state.cpi_norm.game = "pubg"
				set_value(dom.pubg_fov_select, "80")
				expect(
					dom.cpi_norm_result_el.textContent
				).not.toBe("stale")
			}
		)
		it(
			"PUBG cells pair the slider value with LastConvertedSensitivity = 0.02 * 2^((s - 50) / step) and match each fov's rad per count",
			() => {
				const { base_yaw, step } = constants.sens.pubg
				const { pubg } = constants.fov
				for (const [ el, fov ] of [
					[ dom.pubg_hipfire_el, 80 ],
					[ dom.pubg_red_dot_el, pubg.x1 ],
					[ dom.pubg_x2_el, pubg.x2 ],
					[ dom.pubg_x3_el, pubg.x3 ],
					[ dom.pubg_x4_el, pubg.x4 ],
					[ dom.pubg_x6_el, pubg.x6 ],
					[ dom.pubg_x8_el, pubg.x8 ],
					[ dom.pubg_x15_el, pubg.x15 ]
				]) {
					const [ s, converted ] = numbers(el)
					expect(converted).toBeCloseTo(.02 * 2 ** ((s - 50) / step), 6)
					const yaw = to_rad(fov / 80 * base_yaw) * 2 ** ((s - 50) / step)
					expect(
						Math.abs(yaw / rad_per_px(fov, W) - 1)
					).toBeLessThan(1e-6)
				}
			}
		)
		it(
			"R6 ADS cells are each scope's sens ratio in whole ADS units",
			() => {
				const ads_unit = Number(dom.r6_ads_unit_el.textContent)
				/**
				 * @param {number} vfov
				 * @returns {number}
				 */
				function sens(vfov) {
					return rad_per_px(hfov_v(vfov, W, H), W) / Math.tan(to_rad(vfov) / 2)
				}
				const { r6 } = constants.fov
				for (const [ el, vfov ] of [
					[ dom.r6_x1_el, r6.x1 ],
					[ dom.r6_x1_5_el, r6.x1_5 ],
					[ dom.r6_x2_el, r6.x2 ],
					[ dom.r6_x2_5_el, r6.x2_5 ],
					[ dom.r6_x3_el, r6.x3 ],
					[ dom.r6_x4_el, r6.x4 ],
					[ dom.r6_x5_el, r6.x5 ],
					[ dom.r6_x12_el, r6.x12 ]
				]) {
					expect(el.textContent).toBe(
						String(
							round(
								sens(vfov) / sens(90) / ads_unit
							)
						)
					)
				}
			}
		)
		it(
			"R6 hipfire is an integer yaw times a 6-decimal unit matching the 90 vertical fov sens",
			() => {
				const [ yaw, unit ] = numbers(dom.r6_hipfire_el)
				const unit_exact = rad_per_px(hfov_v(90, W, H), W) / to_rad(.005_73) * .02
				expect(Number.isInteger(yaw)).toBe(true)
				expect(yaw).toBeGreaterThanOrEqual(1)
				expect(yaw).toBeLessThanOrEqual(100)
				expect(round_to(unit, 6)).toBe(unit)
				expect(
					Math.abs(yaw * unit - unit_exact)
				).toBeLessThanOrEqual(yaw * 5e-7)
				expect(dom.r6_vertical_el.textContent).toBe(String(yaw))
			}
		)
		it(
			"RB fields: 0.5 deg per count hipfire, 5-step Rivals pair and While Aiming that reproduce the rifle's 45 degree view",
			() => {
				const hipfire = Number(dom.rb_hipfire_el.textContent)
				expect(hipfire).toBe(
					round_to(
						rad_per_px(hfov_v(70, W, H), W) / to_rad(.5),
						3
					)
				)
				const sens = Number(dom.rb_rivals_el.textContent)
				const horizontal = Number(
					dom.rb_horizontal_el.textContent
				)
				const aiming = Number(dom.rb_aiming_el.textContent)
				for (const field of [ sens, horizontal, aiming ]) {
					expect(field % 5).toBe(0)
				}
				const rifle = hipfire * sens * horizontal / 10_000 * aiming / 100 * 45 / 120
				expect(
					Math.abs(
						rifle / (rad_per_px(hfov_v(45, W, H), W) / to_rad(.5)) - 1
					)
				).toBeLessThan(.001)
				expect(
					Math.abs(
						Number(dom.rb_rifle_el.textContent) - aiming
					)
				).toBeLessThan(.1)
				expect(dom.rb_vertical_el.textContent).toBe(
					dom.rb_horizontal_el.textContent
				)
				expect(dom.rb_scoped_el.textContent).toBe(dom.rb_aiming_el.textContent)
				expect(
					dom.rb_aiming_exact_el.textContent
				).toBe(dom.rb_rifle_el.textContent)
				expect(
					dom.rb_scoped_exact_el.textContent
				).toBe(dom.rb_rifle_el.textContent)
				expect(
					dom.rb_horizontal_exact_el.textContent
				).toMatch(/^\d+(\.\d+)? \/ \d+(\.\d+)?$/)
			}
		)
		it(
			"a GameSettings.ini without the fields only reports no changes",
			async () => {
				drop(
					dom.r6_file_el,
					new File(
						[ "[INPUT]\n" ],
						"GameSettings.ini"
					)
				)
				await vi.waitFor(
					() => expect(toast_text()).toBe("No changes")
				)
			}
		)
		it(
			"a dropped file with another name, or none, is refused by name",
			async () => {
				const spies = watch_download()
				for (const [ field, name ] of [
					[ dom.mc_file_el, "options.txt" ],
					[
						dom.pubg_file_el,
						"GameUserSettings.ini"
					],
					[
						dom.r6_file_el,
						"GameSettings.ini"
					]
				]) {
					drop(
						field,
						new File([ "x" ], "settings.ini")
					)
					await vi.waitFor(
						() => expect(toast_text()).toBe(`Not ${name}`)
					)
					dom.toast_el.replaceChildren()
					drop(field)
					await vi.waitFor(
						() => expect(toast_text()).toBe(`Not ${name}`)
					)
				}
				expect(spies.create).not.toHaveBeenCalled()
			}
		)
		it(
			"a mouseup inside the active card's details leaves the list as it is",
			() => {
				dom.cs2_hipfire_el.dispatchEvent(
					new MouseEvent("mouseup", { bubbles: true })
				)
				expect(
					dom.game_sens_list_el.hasAttribute("open")
				).toBe(false)
				dom.game_sens_list_el.setAttribute("open", "")
				dom.cs2_hipfire_el.dispatchEvent(
					new MouseEvent("mouseup", { bubbles: true })
				)
				expect(
					dom.game_sens_list_el.hasAttribute("open")
				).toBe(true)
			}
		)
		it(
			"a mouseup on another card's title persists that game and closes the list",
			() => {
				for (const name of [
					...GAMES.filter(game => game != "cs2"),
					"cs2"
				]) {
					dom.game_sens_list_el.setAttribute("open", "")
					document.getElementById(name)?.firstElementChild?.dispatchEvent(
						new MouseEvent("mouseup", { bubbles: true })
					)
					expect(state.game.sens).toBe(name)
					expect(
						localStorage.getItem("game.sens")
					).toBe(name)
					expect(
						[
							...dom.game_sens_list_el.querySelectorAll(":scope > li[active]")
						].map(li => li.id)
					).toEqual([ name ])
					expect(
						dom.game_sens_list_el.hasAttribute("open")
					).toBe(false)
				}
			}
		)
		it(
			"a mouseup on the active card's title toggles the list without persisting",
			() => {
				const title = dom.cs2_el.firstElementChild
				title?.dispatchEvent(
					new MouseEvent("mouseup", { bubbles: true })
				)
				expect(
					dom.game_sens_list_el.hasAttribute("open")
				).toBe(true)
				title?.dispatchEvent(
					new MouseEvent("mouseup", { bubbles: true })
				)
				expect(
					dom.game_sens_list_el.hasAttribute("open")
				).toBe(false)
				expect(
					localStorage.getItem("game.sens")
				).toBe(null)
			}
		)
		it(
			"a user-set CPI is rounded, persisted and never scales with resolution",
			() => {
				const { ratio } = constants.cpi
				set_value(dom.cpi_x_input, "800.4")
				expect(state.cpi_norm.x).toBe(800)
				expect(
					localStorage.getItem("cpi_norm.x")
				).toBe("800")
				expect(dom.cpi_y_el.textContent).toBe(String(round(800 * ratio)))
				expect(dom.cpi_y_exact_el.textContent).toBe(
					String(round_to(800 * ratio, 2))
				)
				set_value(dom.monitor_width_input, "3840")
				expect(dom.cpi_x_input.value).toBe("800")
				expect(game_sens.current_cpi()).toEqual(
					{ x: 800, y: round(800 * ratio) }
				)
				expect(dom.cs2_edpi_el.textContent).toBe(
					String(
						round_to(
							Number(dom.cs2_hipfire_el.textContent) * 800,
							2
						)
					)
				)
				set_value(dom.cpi_x_input, "0")
				expect(dom.cpi_x_input.value).toBe(String(constants.cpi.x * 2))
			}
		)
		it(
			"an options.txt without the rewritten fields only reports no changes",
			async () => {
				const spies = watch_download()
				drop(
					dom.mc_file_el,
					new File(
						[ "version:4189\ngamma:0.5\n" ],
						"options.txt"
					)
				)
				await vi.waitFor(
					() => expect(toast_text()).toBe("No changes")
				)
				expect(spies.create).not.toHaveBeenCalled()
			}
		)
		it(
			"clicking a file field copies the config folder, then picks a file of its type",
			async () => {
				const write = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue()
				const pick = vi.spyOn(
					HTMLInputElement.prototype,
					"click"
				).mockImplementation(() => {})
				for (const [ field, folder, accept, name ] of [
					[
						dom.mc_file_el,
						"%AppData%\\.minecraft\\",
						".txt",
						"options.txt"
					],
					[
						dom.pubg_file_el,
						"%LocalAppData%\\TslGame\\Saved\\Config\\WindowsNoEditor\\",
						".ini",
						"GameUserSettings.ini"
					],
					[
						dom.r6_file_el,
						"shell:Personal\\My Games\\Rainbow Six - Siege\\",
						".ini",
						"GameSettings.ini"
					]
				]) {
					field.dispatchEvent(new MouseEvent("click"))
					expect(write).toHaveBeenLastCalledWith(folder)
					expect(toast_text()).toBe(`Copied!\n${folder}`)
					const input = pick.mock.contexts.at(-1)
					expect(input.type).toBe("file")
					expect(input.accept).toBe(accept)
					const data = new DataTransfer()
					data.items.add(
						new File([ "x" ], "picked.bin")
					)
					input.files = data.files
					input.dispatchEvent(new Event("change"))
					await vi.waitFor(
						() => expect(toast_text()).toBe(`Not ${name}`)
					)
				}
			}
		)
		it(
			"close_game_sens_list removes [open]",
			() => {
				dom.game_sens_list_el.setAttribute("open", "")
				game_sens.close_game_sens_list()
				expect(
					dom.game_sens_list_el.hasAttribute("open")
				).toBe(false)
			}
		)
		it(
			"cs2 hipfire at 1920x1080 is atan(8/15)/384 rad per count over 0.022 degrees, 3.32",
			() => {
				expect(round_to(CS2_EXACT, 2)).toBe(3.32)
				expect(dom.cs2_hipfire_el.textContent).toBe("3.32")
				expect(dom.cs2_edpi_el.textContent).toBe(
					String(
						round_to(3.32 * constants.cpi.x, 2)
					)
				)
			}
		)
		it(
			"cs2 m_yaw and m_pitch absorb the 2-decimal rounding of the typed sensitivity",
			() => {
				const yaw = round_to(.022 * CS2_EXACT / 3.32, 6)
				expect(yaw).toBe(.022_02)
				expect(dom.cs2_yaw_el.textContent).toBe(String(yaw))
				expect(dom.cs2_pitch_el.textContent).toBe(String(yaw))
			}
		)
		it(
			"cs2 scope multipliers divide each scope's sens by the typed base",
			() => {
				const base = 3.32 * .022_02 / .022
				/**
				 * @param {number} fov
				 * @returns {string}
				 */
				function mul(fov) {
					return String(
						round_to(
							rad_per_px(hfov_43(fov, W, H), W) / to_rad(.022 * fov / 90) / base,
							2
						)
					)
				}
				expect(dom.cs2_aug_el.textContent).toBe(mul(45))
				expect(dom.cs2_auto1_el.textContent).toBe(mul(40))
				expect(dom.cs2_awp1_el.textContent).toBe(mul(40))
				expect(dom.cs2_auto2_el.textContent).toBe(mul(15))
				expect(dom.cs2_awp2_el.textContent).toBe(mul(10))
			}
		)
		it(
			"dropping GameSettings.ini writes the card's yaw, units and ADS integers at the 90 base FOV",
			async () => {
				const spies = watch_download()
				const [ yaw, unit ] = numbers(dom.r6_hipfire_el)
				drop(
					dom.r6_file_el,
					new File(
						[
							[
								"[INPUT]",
								"MouseYawSensitivity=50",
								"MousePitchSensitivity=50",
								"MouseSensitivityMultiplierUnit=0.002000",
								"ADSMouseUseSpecific=0",
								"ADSMouseSensitivity1x=50",
								"ADSMouseSensitivity1xHalf=50",
								"ADSMouseSensitivity2x=50",
								"ADSMouseSensitivity2xHalf=50",
								"ADSMouseSensitivity3x=50",
								"ADSMouseSensitivity4x=50",
								"ADSMouseSensitivity5x=50",
								"ADSMouseSensitivity12x=50",
								"ADSMouseMultiplierUnit=0.020000",
								"[DISPLAY_SETTINGS]",
								"DefaultFOV=60.000000",
								""
							].join("\n")
						],
						"GameSettings.ini"
					)
				)
				expect(
					await downloaded_text(spies, "GameSettings.ini")
				).toBe(
					[
						"[INPUT]",
						`MouseYawSensitivity=${yaw}`,
						`MousePitchSensitivity=${yaw}`,
						`MouseSensitivityMultiplierUnit=${unit.toFixed(6)}`,
						"ADSMouseUseSpecific=1",
						`ADSMouseSensitivity1x=${dom.r6_x1_el.textContent}`,
						`ADSMouseSensitivity1xHalf=${dom.r6_x1_5_el.textContent}`,
						`ADSMouseSensitivity2x=${dom.r6_x2_el.textContent}`,
						`ADSMouseSensitivity2xHalf=${dom.r6_x2_5_el.textContent}`,
						`ADSMouseSensitivity3x=${dom.r6_x3_el.textContent}`,
						`ADSMouseSensitivity4x=${dom.r6_x4_el.textContent}`,
						`ADSMouseSensitivity5x=${dom.r6_x5_el.textContent}`,
						`ADSMouseSensitivity12x=${dom.r6_x12_el.textContent}`,
						`ADSMouseMultiplierUnit=${Number(dom.r6_ads_unit_el.textContent).toFixed(6)}`,
						"[DISPLAY_SETTINGS]",
						"DefaultFOV=90.000000",
						""
					].join("\n")
				)
			}
		)
		it(
			"dropping GameUserSettings.ini writes the card's SensitiveMap, vertical 1 and the PUBG FOV",
			async () => {
				const spies = watch_download()
				/**
				 * @param {string} name
				 * @param {Element} el
				 * @returns {string}
				 */
				function entry(name, el) {
					const [ s, converted ] = String(el.textContent).split(", ")
					return `(SensitiveName="${name}",Sensitivity=${s},LastConvertedSensitivity=${converted})`
				}
				const map = `SensitiveMap=((Mouse, (Array=(${[
					entry("Normal", dom.pubg_hipfire_el),
					entry("Targeting", dom.pubg_red_dot_el),
					entry("Scoping", dom.pubg_red_dot_el),
					entry("Scope2X", dom.pubg_x2_el),
					entry("Scope3X", dom.pubg_x3_el),
					entry("Scope4X", dom.pubg_x4_el),
					entry("Scope6X", dom.pubg_x6_el),
					entry("Scope8X", dom.pubg_x8_el),
					entry("Scope15X", dom.pubg_x15_el)
				].join(",")}))))`
				drop(
					dom.pubg_file_el,
					new File(
						[
							"[/Script/TslGame.TslGameUserSettings]\nFpsCameraFov=90.000000\nInputSettings=(bInvert=False,MouseVerticalSensitivityMultiplierAdjusted=1.200000)\nSensitiveMap=()\n"
						],
						"GameUserSettings.ini"
					)
				)
				const text = await downloaded_text(spies, "GameUserSettings.ini")
				expect(text).toBe(
					`[/Script/TslGame.TslGameUserSettings]\nFpsCameraFov=80.000000\nInputSettings=(bInvert=False,MouseVerticalSensitivityMultiplierAdjusted=1.000000)\n${map}\n`
				)
				drop(
					dom.pubg_file_el,
					new File([ text ], "GameUserSettings.ini")
				)
				await vi.waitFor(
					() => expect(toast_text()).toBe("No changes")
				)
			}
		)
		it(
			"dropping options.txt downloads it with the card's mouseSensitivity and the forced view options",
			async () => {
				const spies = watch_download()
				const ev = drop(
					dom.mc_file_el,
					new File(
						[
							"version:4189\nbobView:true\ndamageTiltStrength:1.0\nfov:0.25\nfovEffectScale:0.5\nmouseSensitivity:0.5\ngamma:0.5\n"
						],
						"options.txt"
					)
				)
				expect(ev.defaultPrevented).toBe(true)
				expect(
					await downloaded_text(spies, "options.txt")
				).toBe(
					`version:4189\nbobView:false\ndamageTiltStrength:0.0\nfov:1.0\nfovEffectScale:0.0\nmouseSensitivity:${dom.mc_hipfire_file_el.textContent}\ngamma:0.5\n`
				)
			}
		)
		it(
			"each Trainer ADS select persists its game's scope and no card cell follows it",
			() => {
				const before = card_texts()
				for (const [ game, select, value ] of [
					[
						"al",
						dom.al_ads_scope_select,
						"x2"
					],
					[
						"cs2",
						dom.cs2_ads_scope_select,
						"aug"
					],
					[
						"fn",
						dom.fn_ads_scope_select,
						"scoped40"
					],
					[
						"ow",
						dom.ow_ads_scope_select,
						"ashe"
					],
					[
						"pubg",
						dom.pubg_ads_scope_select,
						"x4"
					],
					[
						"r6",
						dom.r6_ads_scope_select,
						"x4"
					],
					[
						"rb",
						dom.rb_ads_scope_select,
						"pistol"
					],
					[
						"val",
						dom.val_ads_scope_select,
						"vandal"
					]
				]) {
					set_value(select, value)
					expect(state.game.ads_scope[game]).toBe(value)
					expect(
						localStorage.getItem(`game.ads_scope.${game}`)
					).toBe(value)
				}
				expect(card_texts()).toEqual(before)
			}
		)
		it(
			"edpi cells multiply the typed hipfire by the CPI pair",
			() => {
				const { x, y } = game_sens.current_cpi()
				const al = Number(dom.al_hipfire_el.textContent)
				const ow = Number(dom.ow_hipfire_el.textContent)
				const val = Number(dom.val_hipfire_el.textContent)
				expect(dom.al_edpi_el.textContent).toBe(String(round_to(al * x, 2)))
				expect(dom.ow_edpi_el.textContent).toBe(
					`${round_to(ow * x, 2)}, ${round_to(ow * y, 2)}`
				)
				expect(dom.val_edpi_el.textContent).toBe(String(round_to(val * x, 2)))
			}
		)
		it(
			"init_game_sens activates the saved game's card and writes every card cell",
			() => {
				expect(
					[
						...dom.game_sens_list_el.querySelectorAll(":scope > li[active]")
					].map(li => li.id)
				).toEqual([ "cs2" ])
				for (const text of card_texts()) {
					expect(text).not.toMatch(/^[-—]$/)
				}
			}
		)
		it(
			"init_game_sens throws on an unknown saved game",
			() => {
				state.game.sens = "quake"
				expect(
					() => game_sens.init_game_sens()
				).toThrow("quake")
				state.game.sens = "cs2"
			}
		)
		it(
			"options.txt reports no mc value when the resolution gives none",
			async () => {
				state.game.height = 0
				state.game.width = 0
				drop(
					dom.mc_file_el,
					new File(
						[ "\nmouseSensitivity:0.5\n" ],
						"options.txt"
					)
				)
				await vi.waitFor(
					() => expect(toast_text()).toBe("No mc value")
				)
			}
		)
		it(
			"scope multipliers divide each scope's sens by the typed hipfire",
			() => {
				const al = Number(dom.al_hipfire_el.textContent)
				const al_x1 = rad_per_px(hfov_43(60 * 1.55, W, H), W)
					/ to_rad(
						.022 * Math.tan(to_rad(60 * 1.55) / 2) / Math.tan(to_rad(70 * 1.55) / 2)
					)
				expect(dom.al_x1_el.textContent).toBe(
					String(round_to(al_x1 / al, 2))
				)
				const ow = Number(dom.ow_hipfire_el.textContent)
				const widow = rad_per_px(hfov_v(30, W, H), W) / to_rad(.006_6)
				expect(dom.ow_widow_el.textContent).toBe(
					String(round_to(widow / ow * 100, 2))
				)
				const val = Number(dom.val_hipfire_el.textContent)
				const { vandal } = constants.fov.val
				const val_vandal = rad_per_px(vandal, W) / to_rad(.07 * vandal / 103)
				expect(dom.val_vandal_el.textContent).toBe(
					String(round_to(val_vandal / val, 3))
				)
				expect(dom.val_ads_el.textContent).toBe(dom.val_vandal_el.textContent)
				expect(dom.val_scoped_el.textContent).toBe(
					dom.val_operator25_el.textContent
				)
			}
		)
		it(
			"set_active_game_sens activates exactly the named card for every game",
			() => {
				for (const name of GAMES) {
					game_sens.set_active_game_sens(name)
					expect(
						[
							...dom.game_sens_list_el.querySelectorAll(":scope > li[active]")
						].map(li => li.id)
					).toEqual([ name ])
				}
			}
		)
		it(
			"set_active_game_sens moves [active] without persisting the game or touching [open]",
			() => {
				dom.game_sens_list_el.setAttribute("open", "")
				game_sens.set_active_game_sens("lol")
				expect(state.game.sens).toBe("lol")
				expect(
					dom.lol_el.hasAttribute("active")
				).toBe(true)
				expect(
					dom.cs2_el.hasAttribute("active")
				).toBe(false)
				expect(
					localStorage.getItem("game.sens")
				).toBe(null)
				expect(
					dom.game_sens_list_el.hasAttribute("open")
				).toBe(true)
				game_sens.set_active_game_sens("lol")
				expect(
					dom.lol_el.hasAttribute("active")
				).toBe(true)
			}
		)
		it(
			"sync_game_resolution leaves a matching resolution untouched",
			() => {
				vi.stubGlobal("devicePixelRatio", 2)
				vi.stubGlobal(
					"screen",
					{ height: H / 2, width: W / 2 }
				)
				dom.monitor_width_input.value = "1"
				game_sens.sync_game_resolution()
				expect(
					localStorage.getItem("game.width")
				).toBe(null)
				expect(
					localStorage.getItem("game.height")
				).toBe(null)
				expect(dom.monitor_width_input.value).toBe("1")
			}
		)
		it(
			"sync_game_resolution rounds fractional device pixels",
			() => {
				vi.stubGlobal("devicePixelRatio", 1.25)
				vi.stubGlobal(
					"screen",
					{ height: 768, width: 1_366 }
				)
				game_sens.sync_game_resolution()
				expect(state.game.width).toBe(1_708)
				expect(state.game.height).toBe(960)
			}
		)
		it(
			"sync_game_resolution takes screen * devicePixelRatio, persists it and refreshes the CPI, normalizer and cards",
			() => {
				vi.stubGlobal("devicePixelRatio", 1.5)
				vi.stubGlobal(
					"screen",
					{ height: 1_440, width: 2_560 }
				)
				dom.cpi_norm_result_el.textContent = "stale"
				game_sens.sync_game_resolution()
				expect(state.game.width).toBe(3_840)
				expect(state.game.height).toBe(2_160)
				expect(
					localStorage.getItem("game.width")
				).toBe("3840")
				expect(
					localStorage.getItem("game.height")
				).toBe("2160")
				expect(dom.monitor_width_input.value).toBe("3840")
				expect(dom.monitor_height_input.value).toBe("2160")
				expect(dom.cpi_x_input.value).toBe(String(constants.cpi.x * 2))
				expect(dom.cs2_hipfire_el.textContent).toBe(
					String(round_to(CS2_EXACT / 2, 2))
				)
				expect(
					dom.cpi_norm_result_el.textContent
				).not.toBe("stale")
			}
		)
		it(
			"the auto CPI is constants.cpi.x at the reference width and y = round(x * ratio)",
			() => {
				const { ratio, x } = constants.cpi
				expect(dom.cpi_x_input.value).toBe(String(x))
				expect(dom.cpi_y_el.textContent).toBe(String(round(x * ratio)))
				expect(dom.cpi_y_exact_el.textContent).toBe(String(round_to(x * ratio, 2)))
				expect(dom.cpi_ratio_el.textContent).toBe(String(round_to(ratio, 5)))
				expect(game_sens.current_cpi()).toEqual({ x, y: round(x * ratio) })
			}
		)
		it(
			"the auto CPI scales with the monitor width, which is rounded and persisted",
			() => {
				const { ratio } = constants.cpi
				set_value(
					dom.monitor_width_input,
					"2560.4"
				)
				expect(state.game.width).toBe(2_560)
				expect(
					localStorage.getItem("game.width")
				).toBe("2560")
				expect(dom.cpi_x_input.value).toBe("497")
				expect(dom.cpi_y_el.textContent).toBe(String(round(497 * ratio)))
				expect(dom.cs2_edpi_el.textContent).toBe(
					String(
						round_to(
							Number(dom.cs2_hipfire_el.textContent) * 497,
							2
						)
					)
				)
				set_value(dom.monitor_width_input, "3840")
				expect(game_sens.current_cpi().x).toBe(constants.cpi.x * 2)
				expect(state.cpi_norm.x).toBe(0)
			}
		)
		it(
			"the monitor height is rounded, persisted and moves the aspect: cs2 at 4:3 uses its raw 90 degrees",
			() => {
				set_value(
					dom.monitor_height_input,
					"1440.2"
				)
				expect(state.game.height).toBe(1_440)
				expect(
					localStorage.getItem("game.height")
				).toBe("1440")
				expect(dom.cs2_hipfire_el.textContent).toBe(
					String(
						round_to(
							rad_per_px(90, W) / to_rad(.022),
							2
						)
					)
				)
				expect(dom.cpi_x_input.value).toBe(String(constants.cpi.x))
			}
		)
		it(
			"the other hipfire cells follow each engine's yaw rule at 1920x1080",
			() => {
				const al = rad_per_px(hfov_43(70 * 1.55, W, H), W) / to_rad(.022)
				const bdo = (rad_per_px(hfov_v(70, W, H), W) - .000_125) / .000_023_75
				const fn = rad_per_px(80, W) / to_rad(.005_555)
				const ow = rad_per_px(103, W) / to_rad(.006_6)
				const sa = (rad_per_px(hfov_43(85, W, H), W) - .000_45) / .000_03
				const val = rad_per_px(103, W) / to_rad(.07)
				expect(dom.al_hipfire_el.textContent).toBe(String(round_to(al, 2)))
				expect(dom.bdo_hipfire_el.textContent).toBe(String(round(bdo)))
				expect(
					dom.bdo_hipfire_exact_el.textContent
				).toBe(String(round_to(bdo, 2)))
				expect(dom.fn_hipfire_el.textContent).toBe(String(round_to(fn, 1)))
				expect(dom.fn_y_el.textContent).toBe(dom.fn_hipfire_el.textContent)
				expect(dom.ow_hipfire_el.textContent).toBe(String(round_to(ow, 2)))
				expect(dom.sa_hipfire_el.textContent).toBe(String(round(sa)))
				expect(
					dom.sa_hipfire_exact_el.textContent
				).toBe(String(round_to(sa, 2)))
				expect(dom.val_hipfire_el.textContent).toBe(String(round_to(val, 3)))
			}
		)
	}
)