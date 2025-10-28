import {
	activate_bg_btn,
	bg_el,
	bg_iframe_el,
	bg_link_input,
	bg_space_btn,
	bg_type_input,
	mode_cycle_btn,
	save_bg_btn,
	setting_view_el,
	toast_el
} from "../document.js"
import state from "../state.js"
import { send_toast } from "./index.js"
mode_cycle_btn.addEventListener("click", toggle_mode_cycle)
bg_type_input.addEventListener("change", on_change_bg_type)
activate_bg_btn.addEventListener("click", on_click_activate_bg)
save_bg_btn.addEventListener("click", on_click_save_bg)
bg_space_btn.addEventListener("click", close_bg_activate)
/** @returns {void} */
export function change_bg_video() {
	const type = /** @type {BackgroundType} */(bg_type_input.value)/**/
	try {
		if (type == "default") {
			bg_iframe_el.removeAttribute("src")
		} else if (type == "soop") {
			const { host, pathname } = new URL(bg_link_input.value)
			if (host == "play.sooplive.co.kr") {
				const soop_id = pathname.slice(1, pathname.indexOf("/", 1))
				bg_iframe_el.src = `https://play.sooplive.co.kr/${soop_id}/0/embed`
			} else if (host == "vod.sooplive.co.kr") {
				const vod_id = pathname.slice(8)
				bg_iframe_el.src = `https://vod.sooplive.co.kr/player/${vod_id}`
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
/** @returns {void} */
export function close_bg_activate() {
	bg_el.removeAttribute("activate")
	if (toast_el.textContent) {
		for (const span of toast_el.children) {
			clearTimeout(
				Number(span.getAttribute("timer"))
			)
		}
		toast_el.textContent = ""
	}
}
/**	@returns {void} */
export function on_change_bg_type() {
	const type = /** @type {BackgroundType} */(bg_type_input.value)/**/
	if (type == "default") {
		// no-op
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
function on_click_activate_bg() {
	setting_view_el.removeAttribute("active")
	bg_el.setAttribute("activate", "")
}
/** @returns {void} */
function on_click_save_bg() {
	setting_view_el.removeAttribute("active")
	change_bg_video()
}
/** @returns {void} */
function toggle_mode_cycle() {
	const { cycle_id } = state.game
	if (cycle_id) {
		localStorage.setItem(
			"game.cycle_id",
			String(state.game.cycle_id = 0)
		)
		mode_cycle_btn.setAttribute("on", "false")
	} else {
		localStorage.setItem(
			"game.cycle_id",
			String(state.game.cycle_id = 1)
		)
		mode_cycle_btn.setAttribute("on", "true")
	}
}