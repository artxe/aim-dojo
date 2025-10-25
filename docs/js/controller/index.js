import { toast_el } from "../document.js"
import { update_fov } from "../logic.js"
import { resize_2d } from "../renderer.js"
import "./dpi_norm.js"
import "./game_sens.js"
import "./menu.js"
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
	const span = document.createElement("span")
	span.textContent = message
	toast_el.prepend(span)
	span.setAttribute(
		"timer",
		String(
			setTimeout(() => span.remove(), duration)
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
	if (el.textContent != s) el.textContent = s
}