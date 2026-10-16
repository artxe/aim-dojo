import { lang_text } from "../../docs/js/i18n.js"
import state from "../../docs/js/state.js"
import { describe, expect, it } from "vitest"
describe(
	"i18n.js",
	() => {
		it(
			"lang_text resolves the text in state.lang at call time",
			() => {
				const text = { en: "Start", ko: "시작" }
				state.lang = "en"
				expect(lang_text(text)).toBe("Start")
				state.lang = "ko"
				expect(lang_text(text)).toBe("시작")
			}
		)
	}
)