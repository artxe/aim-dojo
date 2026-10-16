import {
	beforeAll,
	beforeEach,
	describe,
	expect,
	it
} from "vitest"
import "../../docs/js/component/select.js"
import { load_page, run_page_script } from "./helpers/dom.js"
/** @type {typeof import("../../docs/js/controller/dom.js")} */
let dom
/** @type {typeof import("../../docs/js/state.js").default} */
let state
/**
 * @param {HTMLInputElement} input
 * @param {string} value
 * @returns {void}
 */
function type_and_leave(input, value) {
	input.value = value
	input.dispatchEvent(new Event("change"))
	input.dispatchEvent(new Event("blur"))
}
describe(
	"index.html",
	() => {
		beforeAll(
			async () => {
				localStorage.clear()
				load_page()
				dom = await import("../../docs/js/controller/dom.js")
				state = (await import("../../docs/js/state.js")).default
				await import("../../docs/js/controller/game_sens.js")
				run_page_script()
			}
		)
		beforeEach(
			() => {
				localStorage.clear()
			}
		)
		it(
			"a CPI typed with a separator is stored and used as the digits the field keeps",
			() => {
				type_and_leave(dom.cpi_norm_cpi_input, "1600")
				const result = dom.cpi_norm_result_el.textContent
				type_and_leave(dom.cpi_norm_cpi_input, "800")
				type_and_leave(dom.cpi_norm_cpi_input, "1,600")
				expect(dom.cpi_norm_cpi_input.value).toBe("1600")
				expect(state.cpi_norm.cpi).toBe(1_600)
				expect(
					localStorage.getItem("cpi_norm.cpi")
				).toBe("1600")
				expect(
					dom.cpi_norm_result_el.textContent
				).toBe(result)
			}
		)
		it(
			"a monitor width typed with a unit is stored and used as the digits the field keeps",
			() => {
				type_and_leave(dom.monitor_width_input, "1920")
				const cs2 = dom.cs2_hipfire_el.textContent
				type_and_leave(dom.monitor_width_input, "2560")
				type_and_leave(
					dom.monitor_width_input,
					"1920px"
				)
				expect(dom.monitor_width_input.value).toBe("1920")
				expect(state.game.width).toBe(1_920)
				expect(
					localStorage.getItem("game.width")
				).toBe("1920")
				expect(dom.cs2_hipfire_el.textContent).toBe(cs2)
			}
		)
	}
)