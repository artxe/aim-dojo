import {
	aiming_btn,
	bg_chzzk_input,
	bg_el,
	bg_iframe_el,
	bg_soop_input,
	bg_space_btn,
	bg_type_input,
	bg_web_view_input,
	bg_youtube_input,
	flick_btn,
	mode_cycle_btn,
	preview_bg_btn,
	save_bg_btn,
	setting_btn,
	setting_view_el,
	toast_el,
	tracking_btn,
	writing_btn
} from "../document.js"
import { start_game } from "../logic.js"
import state from "../state.js"
import { send_toast } from "../ui.js"
aiming_btn.addEventListener("click", on_click_start_game)
flick_btn.addEventListener("click", on_click_start_game)
tracking_btn.addEventListener("click", on_click_start_game)
writing_btn.addEventListener("click", on_click_start_game)
setting_btn.addEventListener("click", on_click_setting)
mode_cycle_btn.addEventListener("click", toggle_mode_cycle)
bg_type_input.addEventListener("change", on_change_bg_type)
preview_bg_btn.addEventListener("click", on_click_preview_bg)
save_bg_btn.addEventListener("click", on_click_save_bg)
bg_space_btn.addEventListener("click", on_click_bg_space)
/** @returns {void} */
export function change_bg_video() {
	const type = /** @type {BackgroundType} */(bg_type_input.value)/**/
	try {
		if (type == "chzzk") {
			const { host, pathname } = new URL(bg_chzzk_input.value)
			if (host == "chzzk.naver.com") {
				const root = pathname.slice(1, pathname.indexOf("/", 1))
				if (root == "clips") {
					const clip_id = pathname.slice(7)
					bg_iframe_el.src = `https://chzzk.naver.com/embed/clip/${clip_id}`
				} else {
					throw Error("Unsupported URL")
				}
			} else {
				throw Error("Unsupported URL")
			}
			localStorage.setItem(
				"bg.chzzk_link",
				state.bg.chzzk_link = bg_chzzk_input.value
			)
			bg_el.setAttribute("preview", "")
			send_toast("Please press ESC", 2000)
		} else if (type == "default") {
			bg_iframe_el.removeAttribute("src")
		} else if (type == "soop") {
			const { host, pathname } = new URL(bg_soop_input.value)
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
				state.bg.soop_link = bg_soop_input.value
			)
			bg_el.setAttribute("preview", "")
			send_toast("Please press ESC", 2000)
		} else if (type == "web_view") {
			localStorage.setItem(
				"bg.web_view_link",
				bg_iframe_el.src = state.bg.web_view_link = bg_web_view_input.value
			)
			bg_el.setAttribute("preview", "")
			send_toast("Please press ESC", 2000)
		} else if (type == "youtube") {
			const { host, pathname, searchParams } = new URL(bg_youtube_input.value)
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
				state.bg.youtube_link = bg_youtube_input.value
			)
			bg_el.setAttribute("preview", "")
			send_toast("Please press ESC", 2000)
		} else {
			throw Error(type)
		}
		localStorage.setItem("bg.type", state.bg.type = type)
	} catch (error) {
		send_toast(String(error), 3000)
	}
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_bg_type(ev) {
	const target = /** @type {HTMLInputElement} */(ev.target)/**/
	const type = /** @type {BackgroundType} */(target.value)/**/
	if (type == "chzzk") {
		bg_chzzk_input.setAttribute("active", "")
		bg_soop_input.removeAttribute("active")
		bg_web_view_input.removeAttribute("active")
		bg_youtube_input.removeAttribute("active")
	} else if (type == "default") {
		bg_chzzk_input.removeAttribute("active")
		bg_soop_input.removeAttribute("active")
		bg_web_view_input.removeAttribute("active")
		bg_youtube_input.removeAttribute("active")
	} else if (type == "soop") {
		bg_chzzk_input.removeAttribute("active")
		bg_soop_input.setAttribute("active", "")
		bg_web_view_input.removeAttribute("active")
		bg_youtube_input.removeAttribute("active")
	} else if (type == "web_view") {
		bg_chzzk_input.removeAttribute("active")
		bg_soop_input.removeAttribute("active")
		bg_web_view_input.setAttribute("active", "")
		bg_youtube_input.removeAttribute("active")
	} else if (type == "youtube") {
		bg_chzzk_input.removeAttribute("active")
		bg_soop_input.removeAttribute("active")
		bg_web_view_input.removeAttribute("active")
		bg_youtube_input.setAttribute("active", "")
	} else {
		throw Error(type)
	}
}
/** @returns {void} */
function on_click_bg_space() {
	bg_el.removeAttribute("preview")
	if (toast_el.textContent) {
		for (const span of toast_el.children) {
			clearTimeout(
				Number(span.getAttribute("timer"))
			)
		}
		toast_el.textContent = ""
	}
}
/** @returns {void} */
function on_click_preview_bg() {
	setting_view_el.removeAttribute("active")
	bg_el.setAttribute("preview", "")
}
/** @returns {void} */
function on_click_save_bg() {
	setting_view_el.removeAttribute("active")
	change_bg_video()
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_click_setting(ev) {
	ev.preventDefault()
	setting_view_el.setAttribute("active", "")
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_click_start_game(ev) {
	ev.preventDefault()
	if (ev.currentTarget == aiming_btn) {
		state.game.mode = "aiming"
		start_game()
	} else if (ev.currentTarget == flick_btn) {
		state.game.mode = "flick"
		start_game()
	} else if (ev.currentTarget == tracking_btn) {
		state.game.mode = "tracking"
		start_game()
	} else if (ev.currentTarget == writing_btn) {
		state.game.mode = "writing"
		start_game()
	} else {
		throw Error(
			/** @type {HTMLElement} */(ev.currentTarget)/**/.outerHTML
		)
	}
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