import {
	aim_booster_btn,
	flick_btn,
	setting_btn,
	setting_view_el,
	tracking_btn,
	twitch_btn,
	v_tracking_btn,
	writing_btn
} from "../document.js"
import { start_game } from "../logic.js"
import state from "../state.js"
aim_booster_btn.addEventListener("click", on_click_start_game)
flick_btn.addEventListener("click", on_click_start_game)
tracking_btn.addEventListener("click", on_click_start_game)
twitch_btn.addEventListener("click", on_click_start_game)
v_tracking_btn.addEventListener("click", on_click_start_game)
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
	const { rest_timeout: rest_raf_id } = state.game
	ev.preventDefault()
	if (rest_raf_id) {
		clearTimeout(rest_raf_id)
		state.game.rest_timeout = 0
	}
	if (ev.currentTarget == aim_booster_btn) {
		state.game.mode = "aim_booster"
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
	} else if (ev.currentTarget == v_tracking_btn) {
		state.game.mode = "v_tracking"
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