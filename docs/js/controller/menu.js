import {
	aiming_btn,
	flick_btn,
	setting_btn,
	setting_view_el,
	tracking_btn,
	twitch_btn,
	writing_btn
} from "../document.js"
import { start_game } from "../logic.js"
import state from "../state.js"
aiming_btn.addEventListener("click", on_click_start_game)
flick_btn.addEventListener("click", on_click_start_game)
tracking_btn.addEventListener("click", on_click_start_game)
twitch_btn.addEventListener("click", on_click_start_game)
writing_btn.addEventListener("click", on_click_start_game)
setting_btn.addEventListener("click", on_click_setting)
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
	const { rest_raf_id } = state.game
	ev.preventDefault()
	if (rest_raf_id) {
		clearTimeout(rest_raf_id)
		state.game.rest_raf_id = 0
	}
	if (ev.currentTarget == aiming_btn) {
		state.game.mode = "aiming"
		start_game()
	} else if (ev.currentTarget == flick_btn) {
		state.game.mode = "flick"
		start_game()
	} else if (ev.currentTarget == tracking_btn) {
		state.game.mode = "tracking"
		start_game()
	} else if (ev.currentTarget == twitch_btn) {
		state.game.mode = "twitch"
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