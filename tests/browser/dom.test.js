import { load_page } from "./helpers/dom.js"
import { beforeAll, describe, expect, it } from "vitest"
describe(
	"controller/dom.js",
	() => {
		beforeAll(load_page)
		it(
			"set_mode_score writes the score rounded to two decimals and disables the clear button at zero",
			async () => {
				const dom = await import("../../docs/js/controller/dom.js")
				dom.set_mode_score(
					dom.writing_score_el,
					dom.clear_writing_btn,
					1.23456
				)
				expect(
					dom.writing_score_el.textContent
				).toBe("1.23")
				expect(dom.clear_writing_btn.disabled).toBe(false)
				dom.set_mode_score(
					dom.writing_score_el,
					dom.clear_writing_btn,
					0
				)
				expect(dom.clear_writing_btn.disabled).toBe(true)
			}
		)
	}
)