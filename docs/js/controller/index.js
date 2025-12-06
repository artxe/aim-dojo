import { toast_el } from "../document.js"
import { update_fov } from "../logic.js"
import { resize_2d } from "../renderer.js"
import "./dpi_norm.js"
import "./game_sens.js"
import "./menu.js"
export { active_game_sens } from "./game_sens.js"
export { change_bg_video } from "./setting.js"
/** @returns {void} */
export function on_resize() {
	update_fov()
	resize_2d()
}
/**
 * @param {string} message
 * @param {number} duration
 */
export function send_toast(message, duration) {
	const p = document.createElement("p")
	p.textContent = message
	toast_el.prepend(p)
	p.setAttribute(
		"timer",
		String(
			setTimeout(() => p.remove(), duration)
		)
	)
}
/**
 * @param {HTMLSpanElement} el
 * @param {string|number} text
 * @returns {void}
 */
export function set_text_if_changed(el, text) {
	const s = String(text)
	if (el.textContent != s) {
		el.textContent = s
	}
}