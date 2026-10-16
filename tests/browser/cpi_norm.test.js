import {
	beforeAll,
	beforeEach,
	describe,
	expect,
	it
} from "vitest"
import "../../docs/js/component/select.js"
import { load_page } from "./helpers/dom.js"
/** @type {GameSensName[]} */
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
/** @returns {Promise<void>} */
async function load() {
	await import("../../docs/js/controller/cpi_norm.js")
}
describe(
	"controller/cpi_norm.js",
	() => {
		beforeAll(load_page)
		beforeEach(
			() => {
				localStorage.clear()
			}
		)
		it(
			"changing the CPI input persists it and recomputes the result",
			async () => {
				await load()
				const { default: state } = await import("../../docs/js/state.js")
				const dom = await import("../../docs/js/controller/dom.js")
				dom.cpi_norm_cpi_input.value = "1600"
				dom.cpi_norm_cpi_input.dispatchEvent(new Event("change"))
				expect(
					localStorage.getItem("cpi_norm.cpi")
				).toBe("1600")
				expect(state.cpi_norm.cpi).toBe(1_600)
				const before = Number(
					dom.cpi_norm_result_el.textContent
				)
				dom.cpi_norm_cpi_input.value = "800"
				dom.cpi_norm_cpi_input.dispatchEvent(new Event("change"))
				expect(
					Math.abs(
						Number(
							dom.cpi_norm_result_el.textContent
						) - before / 2
					)
				).toBeLessThanOrEqual(1)
			}
		)
		it(
			"changing the game resets sens to that game's default and persists game and sens",
			async () => {
				await load()
				const { default: constants } = await import("../../docs/js/constants.js")
				const { default: state } = await import("../../docs/js/state.js")
				const dom = await import("../../docs/js/controller/dom.js")
				state.cpi_norm.game = "val"
				dom.cpi_norm_game_select.value = "pubg"
				dom.cpi_norm_game_select.dispatchEvent(new Event("change"))
				expect(state.cpi_norm.game).toBe("pubg")
				expect(
					localStorage.getItem("cpi_norm.game")
				).toBe("pubg")
				expect(state.cpi_norm.sens).toBe(
					constants.cpi_norm.default_sens.pubg
				)
				expect(
					localStorage.getItem("cpi_norm.sens")
				).toBe(
					String(
						constants.cpi_norm.default_sens.pubg
					)
				)
				expect(dom.cpi_norm_sens_input.value).toBe(
					String(
						constants.cpi_norm.default_sens.pubg
					)
				)
			}
		)
		it(
			"changing the sens input persists it, strips trailing dots and recomputes the result",
			async () => {
				await load()
				const { default: state } = await import("../../docs/js/state.js")
				const dom = await import("../../docs/js/controller/dom.js")
				dom.cpi_norm_sens_input.value = "12.5"
				dom.cpi_norm_sens_input.dispatchEvent(new Event("change"))
				expect(
					localStorage.getItem("cpi_norm.sens")
				).toBe("12.5")
				expect(state.cpi_norm.sens).toBe(12.5)
				dom.cpi_norm_sens_input.value = "7..."
				dom.cpi_norm_sens_input.dispatchEvent(new Event("change"))
				expect(
					localStorage.getItem("cpi_norm.sens")
				).toBe("7")
				expect(state.cpi_norm.sens).toBe(7)
				dom.cpi_norm_sens_input.value = "1.5.2"
				dom.cpi_norm_sens_input.dispatchEvent(new Event("change"))
				expect(
					localStorage.getItem("cpi_norm.sens")
				).toBe("1.5.2")
			}
		)
		it(
			"changing to lol takes the sens from the game's lol_sens instead of the default",
			async () => {
				await load()
				const { default: state } = await import("../../docs/js/state.js")
				const dom = await import("../../docs/js/controller/dom.js")
				state.cpi_norm.game = "val"
				state.game.lol_sens = 73
				dom.cpi_norm_game_select.value = "lol"
				dom.cpi_norm_game_select.dispatchEvent(new Event("change"))
				expect(state.cpi_norm.game).toBe("lol")
				expect(state.cpi_norm.sens).toBe(73)
				expect(
					localStorage.getItem("cpi_norm.sens")
				).toBe("73")
				expect(dom.cpi_norm_sens_input.value).toBe("73")
			}
		)
		it(
			"selecting the already active game is a no-op",
			async () => {
				await load()
				const { default: state } = await import("../../docs/js/state.js")
				const dom = await import("../../docs/js/controller/dom.js")
				state.cpi_norm.game = "cs2"
				state.cpi_norm.sens = 3.3
				dom.cpi_norm_sens_input.value = "3.3"
				dom.cpi_norm_game_select.value = "cs2"
				dom.cpi_norm_game_select.dispatchEvent(new Event("change"))
				expect(state.cpi_norm.sens).toBe(3.3)
				expect(dom.cpi_norm_sens_input.value).toBe("3.3")
				expect(
					localStorage.getItem("cpi_norm.game")
				).toBeNull()
				expect(
					localStorage.getItem("cpi_norm.sens")
				).toBeNull()
			}
		)
		it(
			"update_cpi_norm_result scales linearly with the CPI for every game",
			async () => {
				const { default: constants } = await import("../../docs/js/constants.js")
				const { default: state } = await import("../../docs/js/state.js")
				const dom = await import("../../docs/js/controller/dom.js")
				const { update_cpi_norm_result } = await import("../../docs/js/controller/cpi_norm.js")
				for (const game of GAMES) {
					state.cpi_norm.game = game
					state.cpi_norm.sens = constants.cpi_norm.default_sens[game]
					state.cpi_norm.cpi = 400
					update_cpi_norm_result()
					const low = Number(
						dom.cpi_norm_result_el.textContent
					)
					state.cpi_norm.cpi = 4_000
					update_cpi_norm_result()
					const high = Number(
						dom.cpi_norm_result_el.textContent
					)
					expect(high).toBeGreaterThanOrEqual(Math.round(low * 10) - 5)
					expect(high).toBeLessThanOrEqual(Math.round(low * 10) + 5)
				}
			}
		)
		it(
			"update_cpi_norm_result throws for an unknown game",
			async () => {
				const { default: state } = await import("../../docs/js/state.js")
				const { update_cpi_norm_result } = await import("../../docs/js/controller/cpi_norm.js")
				state.cpi_norm.game = /** @type {GameSensName} */("nope")/**/
				expect(() => update_cpi_norm_result()).toThrow("nope")
			}
		)
		it(
			"update_cpi_norm_result writes a positive integer CPI for every game",
			async () => {
				const { default: constants } = await import("../../docs/js/constants.js")
				const { default: state } = await import("../../docs/js/state.js")
				const dom = await import("../../docs/js/controller/dom.js")
				const { update_cpi_norm_result } = await import("../../docs/js/controller/cpi_norm.js")
				for (const game of GAMES) {
					state.cpi_norm.game = game
					state.cpi_norm.cpi = 800
					state.cpi_norm.sens = constants.cpi_norm.default_sens[game]
					update_cpi_norm_result()
					const text = String(
						dom.cpi_norm_result_el.textContent
					)
					expect(text).toMatch(/^\d+$/)
					expect(Number(text)).toBeGreaterThan(0)
				}
			}
		)
	}
)