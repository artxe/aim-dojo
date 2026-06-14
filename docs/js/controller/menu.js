import {
	aim_booster_btn,
	flick_btn,
	full_tracking_btn,
	timing_btn,
	tracking_btn,
	twitch_btn,
	writing_btn
} from "./dom.js"
import { start_game } from "../logic.js"
import state from "../state.js"
{
	aim_booster_btn.addEventListener("click", on_click_start_game)
	flick_btn.addEventListener("click", on_click_start_game)
	full_tracking_btn.addEventListener("click", on_click_start_game)
	timing_btn.addEventListener("click", on_click_start_game)
	tracking_btn.addEventListener("click", on_click_start_game)
	twitch_btn.addEventListener("click", on_click_start_game)
	writing_btn.addEventListener("click", on_click_start_game)
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_click_start_game(ev) {
	ev.preventDefault()
	const { rest_timeout } = state.game
	if (rest_timeout) {
		clearTimeout(rest_timeout)
		state.game.rest_timeout = 0
	}
	if (ev.currentTarget == aim_booster_btn) {
		start_game("aim_booster")
	} else if (ev.currentTarget == flick_btn) {
		start_game("flick")
	} else if (ev.currentTarget == full_tracking_btn) {
		start_game("full_tracking")
	} else if (ev.currentTarget == timing_btn) {
		start_game("timing")
	} else if (ev.currentTarget == tracking_btn) {
		start_game("tracking")
	} else if (ev.currentTarget == twitch_btn) {
		start_game("twitch")
	} else if (ev.currentTarget == writing_btn) {
		start_game("writing")
	} else {
		throw Error(
			/** @type {HTMLElement} */(ev.currentTarget)/**/.outerHTML
		)
	}
}