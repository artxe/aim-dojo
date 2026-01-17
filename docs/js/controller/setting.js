import {
	activate_bg_btn,
	bg_el,
	bg_iframe_el,
	bg_link_input,
	bg_type_input,
	copy_apo_filter_btn,
	modal_backdrop_btn,
	save_bg_btn,
	setting_view_el,
	toast_el
} from "../document.js"
import state from "../state.js"
import { send_toast } from "./index.js"
modal_backdrop_btn.addEventListener("click", on_click_modal_backdrop)
bg_type_input.addEventListener("change", on_change_bg_type)
activate_bg_btn.addEventListener("click", on_click_activate_bg)
save_bg_btn.addEventListener("click", on_click_save_bg)
copy_apo_filter_btn.addEventListener(
	"click",
	on_click_copy_apo_filter
)
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
function on_click_copy_apo_filter() {
	// eslint-disable-next-line max-len
	const filter = "# GraphicEQ: 25 0; 40 0; 63 0; 100 0; 160 0; 250 0; 400 -2.5; 630 -5; 1000 -2.5; 1600 5; 2500 15; 4000 10; 6300 5; 10000 -2.5; 16000 0"
	navigator.clipboard.writeText(filter)
	send_toast(`Copied!\n${filter}`, 1_500)
}
/** @returns {void} */
function on_click_save_bg() {
	setting_view_el.removeAttribute("active")
	change_bg_video()
}