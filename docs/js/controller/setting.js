import {
	activate_bg_btn,
	aim_booster_score_el,
	bg_el,
	bg_iframe_el,
	bg_link_input,
	bg_type_input,
	clear_aim_booster_btn,
	clear_flick_btn,
	clear_tracking_btn,
	clear_twitch_btn,
	clear_v_tracking_btn,
	clear_writing_btn,
	copy_apo_filter_btn,
	flick_score_el,
	modal_backdrop_btn,
	save_bg_btn,
	setting_view_el,
	toast_el,
	tracking_score_el,
	twitch_score_el,
	v_tracking_score_el,
	writing_score_el
} from "../document.js"
import state from "../state.js"
import { send_toast, set_text_if_changed } from "./index.js"
modal_backdrop_btn.addEventListener("click", on_click_modal_backdrop)
bg_type_input.addEventListener("change", on_change_bg_type)
activate_bg_btn.addEventListener("click", on_click_activate_bg)
save_bg_btn.addEventListener("click", on_click_save_bg)
copy_apo_filter_btn.addEventListener(
	"click",
	on_click_copy_apo_filter
)
clear_aim_booster_btn.addEventListener("click", on_click_clear_score)
clear_flick_btn.addEventListener("click", on_click_clear_score)
clear_tracking_btn.addEventListener("click", on_click_clear_score)
clear_twitch_btn.addEventListener("click", on_click_clear_score)
clear_v_tracking_btn.addEventListener("click", on_click_clear_score)
clear_writing_btn.addEventListener("click", on_click_clear_score)
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
	} else if (ev.currentTarget == clear_v_tracking_btn) {
		localStorage.removeItem("v_tracking.best_score")
		set_text_if_changed(
			v_tracking_score_el,
			state.mode.v_tracking.best_score = 0
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