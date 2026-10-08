import { start_game } from "../logic.js"
import state from "../state.js"
import {
	aim_booster_btn,
	h_tracking_btn,
	precision_btn,
	writing_btn
} from "./dom.js"
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
	} else if (ev.currentTarget == h_tracking_btn) {
		start_game("h_tracking")
	} else if (ev.currentTarget == precision_btn) {
		start_game("precision")
	} else if (ev.currentTarget == writing_btn) {
		start_game("writing")
	} else {
		throw Error(
			/** @type {HTMLElement} */(ev.currentTarget)/**/.outerHTML
		)
	}
}
{
	aim_booster_btn.addEventListener("click", on_click_start_game)
	h_tracking_btn.addEventListener("click", on_click_start_game)
	precision_btn.addEventListener("click", on_click_start_game)
	writing_btn.addEventListener("click", on_click_start_game)
}