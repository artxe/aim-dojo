import constants from "../constants.js"
import {
	activate_bg_btn,
	aim_booster_score_el,
	bg_el,
	bg_iframe_el,
	bg_link_input,
	bg_type_input,
	clear_aim_booster_btn,
	clear_flick_btn,
	clear_full_tracking_btn,
	clear_timing_btn,
	clear_tracking_btn,
	clear_twitch_btn,
	clear_writing_btn,
	copy_apo_filter_btn,
	crosshair_alpha_input,
	crosshair_color_input,
	crosshair_dot_input,
	crosshair_gap_input,
	crosshair_height_input,
	crosshair_rgba_el,
	crosshair_thickness_input,
	crosshair_width_input,
	flick_score_el,
	full_tracking_score_el,
	modal_backdrop_btn,
	reset_crosshair_btn,
	save_bg_btn,
	sens_mult_btn,
	setting_view_el,
	timing_score_el,
	toast_el,
	tracking_score_el,
	twitch_score_el,
	writing_score_el,
	yx_ratio_btn
} from "../document.js"
import { update_crosshair } from "../render/renderer.js"
import state from "../state.js"
import { send_toast, set_text_if_changed } from "./index.js"
activate_bg_btn.addEventListener("click", on_click_activate_bg)
bg_type_input.addEventListener("change", on_change_bg_type)
clear_aim_booster_btn.addEventListener("click", on_click_clear_score)
clear_flick_btn.addEventListener("click", on_click_clear_score)
clear_full_tracking_btn.addEventListener("click", on_click_clear_score)
clear_timing_btn.addEventListener("click", on_click_clear_score)
clear_tracking_btn.addEventListener("click", on_click_clear_score)
clear_twitch_btn.addEventListener("click", on_click_clear_score)
clear_writing_btn.addEventListener("click", on_click_clear_score)
crosshair_alpha_input.addEventListener("input", on_change_crosshair)
crosshair_color_input.addEventListener("input", on_change_crosshair)
crosshair_dot_input.addEventListener("change", on_change_crosshair)
crosshair_gap_input.addEventListener("change", on_change_crosshair)
crosshair_height_input.addEventListener("change", on_change_crosshair)
crosshair_thickness_input.addEventListener("change", on_change_crosshair)
crosshair_width_input.addEventListener("change", on_change_crosshair)
copy_apo_filter_btn.addEventListener(
	"click",
	on_click_copy_apo_filter
)
modal_backdrop_btn.addEventListener("click", on_click_modal_backdrop)
reset_crosshair_btn.addEventListener(
	"click",
	on_click_reset_crosshair
)
save_bg_btn.addEventListener("click", on_click_save_bg)
sens_mult_btn.addEventListener(
	"click",
	on_click_copy_text_content
)
yx_ratio_btn.addEventListener(
	"click",
	on_click_copy_text_content
)
/** @returns {void} */
export function change_bg_video() {
	const type = /** @type {BackgroundType} */(bg_type_input.value)/**/
	try {
		if (type == "default") {
			bg_iframe_el.removeAttribute("src")
		} else if (type == "soop") {
			const { host, pathname } = new URL(bg_link_input.value)
			if (host == "play.sooplive.com") {
				const soop_id = pathname.slice(1, pathname.indexOf("/", 1))
				bg_iframe_el.src = `https://play.sooplive.com/${soop_id}/0/embed`
			} else if (host == "vod.sooplive.com") {
				const vod_id = pathname.slice(8)
				bg_iframe_el.src = `https://vod.sooplive.com/player/${vod_id}`
			} else {
				throw Error("Unsupported URL")
			}
			localStorage.setItem(
				"bg.soop_link",
				state.bg.soop_link = bg_link_input.value
			)
			bg_el.setAttribute("activate", "")
			send_toast("Please press ESC", 2_000)
		} else if (type == "webview") {
			localStorage.setItem(
				"bg.web_view_link",
				bg_iframe_el.src = state.bg.webview_link = bg_link_input.value
			)
			bg_el.setAttribute("activate", "")
			send_toast("Please press ESC", 2_000)
		} else if (type == "youtube") {
			const { host, pathname, searchParams } = new URL(bg_link_input.value)
			if (host == "youtu.be") {
				const video_id = pathname.slice(1)
				bg_iframe_el.src = `https://www.youtube.com/embed/${video_id}`
			} else if (host == "www.youtube.com") {
				const video_id = searchParams.get("v")
				bg_iframe_el.src = `https://www.youtube.com/embed/${video_id}`
			} else {
				throw Error("Unsupported URL")
			}
			localStorage.setItem(
				"bg.youtube_link",
				state.bg.youtube_link = bg_link_input.value
			)
			bg_el.setAttribute("activate", "")
			send_toast("Please press ESC", 2_000)
		} else {
			throw Error(type)
		}
		localStorage.setItem("bg.type", state.bg.type = type)
	} catch (error) {
		bg_iframe_el.removeAttribute("src")
		localStorage.setItem(
			"bg.type",
			state.bg.type = bg_type_input.value = "default"
		)
		send_toast(String(error), 3_000)
	}
}
/** @returns {string} */
function get_crosshair_color() {
	const alpha = Number(crosshair_alpha_input.value) / 100
	const { b, g, r } = get_crosshair_rgb()
	return `rgba(${r},${g},${b},${Number(alpha.toFixed(2))})`
}
/** @returns {string} */
function get_crosshair_opaque_color() {
	const { b, g, r } = get_crosshair_rgb()
	return `rgb(${r},${g},${b})`
}
/** @returns {{ b: number, g: number, r: number }} */
function get_crosshair_rgb() {
	const b = Number.parseInt(
		crosshair_color_input.value.slice(5, 7),
		16
	)
	const g = Number.parseInt(
		crosshair_color_input.value.slice(3, 5),
		16
	)
	const r = Number.parseInt(
		crosshair_color_input.value.slice(1, 3),
		16
	)
	return { b, g, r }
}
/**	@returns {void} */
export function on_change_bg_type() {
	const type = /** @type {BackgroundType} */(bg_type_input.value)/**/
	if (type == "default") {
		bg_link_input.value = ""
	} else if (type == "soop") {
		bg_link_input.value = state.bg.soop_link
	} else if (type == "webview") {
		bg_link_input.value = state.bg.webview_link
	} else if (type == "youtube") {
		bg_link_input.value = state.bg.youtube_link
	} else {
		throw Error(type)
	}
}
/** @returns {void} */
function on_change_crosshair() {
	const color = get_crosshair_color()
	const text = /** @type {Text} */(crosshair_alpha_input.nextSibling)/**/
	text.textContent = `${crosshair_alpha_input.value}%`
	crosshair_rgba_el.textContent = color
	crosshair_rgba_el.style.color = get_crosshair_opaque_color()
	localStorage.setItem(
		"crosshair.color",
		state.crosshair.color = color
	)
	localStorage.setItem(
		"crosshair.dot",
		String(
			state.crosshair.dot = Number(crosshair_dot_input.value)
		)
	)
	localStorage.setItem(
		"crosshair.gap",
		String(
			state.crosshair.gap = Number(crosshair_gap_input.value)
		)
	)
	localStorage.setItem(
		"crosshair.height",
		String(
			state.crosshair.height = Number(crosshair_height_input.value)
		)
	)
	localStorage.setItem(
		"crosshair.thickness",
		String(
			state.crosshair.thickness = Number(
				crosshair_thickness_input.value
			)
		)
	)
	localStorage.setItem(
		"crosshair.width",
		String(
			state.crosshair.width = Number(crosshair_width_input.value)
		)
	)
	update_crosshair()
}
/** @returns {void} */
function on_click_activate_bg() {
	setting_view_el.removeAttribute("active")
	bg_el.setAttribute("activate", "")
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_click_clear_score(ev) {
	if (ev.currentTarget == clear_aim_booster_btn) {
		localStorage.removeItem("aim_booster.best_score")
		set_text_if_changed(
			aim_booster_score_el,
			state.mode.aim_booster.best_score = 0
		)
	} else if (ev.currentTarget == clear_flick_btn) {
		localStorage.removeItem("flick.best_score")
		set_text_if_changed(
			flick_score_el,
			state.mode.flick.best_score = 0
		)
	} else if (ev.currentTarget == clear_full_tracking_btn) {
		localStorage.removeItem("full_tracking.best_score")
		set_text_if_changed(
			full_tracking_score_el,
			state.mode.full_tracking.best_score = 0
		)
	} else if (ev.currentTarget == clear_timing_btn) {
		localStorage.removeItem("timing.best_score")
		set_text_if_changed(
			timing_score_el,
			state.mode.timing.best_score = 0
		)
	} else if (ev.currentTarget == clear_tracking_btn) {
		localStorage.removeItem("tracking.best_score")
		set_text_if_changed(
			tracking_score_el,
			state.mode.tracking.best_score = 0
		)
	} else if (ev.currentTarget == clear_twitch_btn) {
		localStorage.removeItem("twitch.best_score")
		set_text_if_changed(
			twitch_score_el,
			state.mode.twitch.best_score = 0
		)
	} else if (ev.currentTarget == clear_writing_btn) {
		localStorage.removeItem("writing.best_score")
		set_text_if_changed(
			writing_score_el,
			state.mode.writing.best_score = 0
		)
	} else {
		throw Error(
			/** @type {HTMLElement} */(ev.currentTarget)/**/.outerHTML
		)
	}
	send_toast("Score has been reset!", 1_500)
}
/** @returns {void} */
function on_click_copy_apo_filter() {
	// eslint-disable-next-line max-len
	const filter = "# GraphicEQ: 25 0; 40 0; 63 0; 100 0; 160 0; 250 0; 400 -2.5; 630 -5; 1000 -2.5; 1600 5; 2500 15; 4000 10; 6300 5; 10000 -2.5; 16000 0"
	navigator.clipboard.writeText(filter)
	send_toast(`Copied!\n${filter}`, 1_500)
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_click_copy_text_content(ev) {
	const text = /** @type {HTMLButtonElement} */(ev.currentTarget)/**/.textContent
	navigator.clipboard.writeText(text)
	send_toast(`Copied!\n${text}`, 1_500)
}
/** @returns {void} */
export function on_click_modal_backdrop() {
	if (bg_el.hasAttribute("activate")) {
		bg_el.removeAttribute("activate")
		if (toast_el.textContent) {
			for (const span of toast_el.children) {
				clearTimeout(
					Number(span.getAttribute("timer"))
				)
			}
			toast_el.textContent = ""
		}
	} else if (setting_view_el.hasAttribute("active")) {
		setting_view_el.removeAttribute("active")
	}
}
/** @returns {void} */
function on_click_reset_crosshair() {
	const { crosshair } = constants
	set_crosshair_color_inputs(crosshair.color)
	crosshair_dot_input.value = String(crosshair.dot)
	crosshair_gap_input.value = String(crosshair.gap)
	crosshair_height_input.value = String(crosshair.height)
	crosshair_thickness_input.value = String(crosshair.thickness)
	crosshair_width_input.value = String(crosshair.width)
	on_change_crosshair()
	send_toast(
		"Crosshair has been reset!",
		1_500
	)
}
/** @returns {void} */
function on_click_save_bg() {
	setting_view_el.removeAttribute("active")
	change_bg_video()
}
/**
 * @param {string} color
 * @returns {{ a: number, b: number, g: number, r: number }}
 */
function parse_color(color) {
	const hex = color.match(
		/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})([\da-f]{2})?$/i
	)
	if (hex) {
		return {
			a: hex[4] ? Number.parseInt(hex[4], 16) / 255 : 1,
			b: Number.parseInt(hex[3], 16),
			g: Number.parseInt(hex[2], 16),
			r: Number.parseInt(hex[1], 16)
		}
	}
	const rgba = color.match(
		/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i
	)
	if (rgba) {
		return {
			a: rgba[4] ? Number(rgba[4]) : 1,
			b: Number(rgba[3]),
			g: Number(rgba[2]),
			r: Number(rgba[1])
		}
	}
	return parse_color(constants.crosshair.color)
}
/**
 * @param {string} color
 * @returns {void}
 */
export function set_crosshair_color_inputs(color) {
	const { a, b, g, r } = parse_color(color)
	crosshair_alpha_input.value = String(Math.round(a * 100))
	crosshair_color_input.value = `#${to_hex(r)}${to_hex(g)}${to_hex(b)}`
	crosshair_rgba_el.textContent = get_crosshair_color()
	crosshair_rgba_el.style.color = get_crosshair_opaque_color()
	const text = /** @type {Text} */(crosshair_alpha_input.nextSibling)/**/
	text.textContent = `${crosshair_alpha_input.value}%`
}
/**
 * @param {number} value
 * @returns {string}
 */
function to_hex(value) {
	return value.toString(16).padStart(2, "0")
}