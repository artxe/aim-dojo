import state from "./state.js"
/**
 * @param {LangText} text
 * @returns {string}
 */
export function lang_text(text) {
	return text[state.lang]
}