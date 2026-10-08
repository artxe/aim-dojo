import {
	calc_cpi_al,
	calc_cpi_bdo,
	calc_cpi_cs2,
	calc_cpi_fn,
	calc_cpi_lol,
	calc_cpi_mc,
	calc_cpi_ow,
	calc_cpi_pubg,
	calc_cpi_r6,
	calc_cpi_rb,
	calc_cpi_sa,
	calc_cpi_val
} from "../calc/calc_cpi.js"
import constants from "../constants.js"
import { round } from "../math.js"
import state from "../state.js"
import {
	cpi_norm_cpi_input,
	cpi_norm_game_select,
	cpi_norm_result_el,
	cpi_norm_sens_input
} from "./dom.js"
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_cpi(ev) {
	const target = /** @type {HTMLInputElement} */(ev.currentTarget)/**/
	localStorage.setItem("cpi_norm.cpi", target.value)
	state.cpi_norm.cpi = Number(target.value)
	update_cpi_norm_result()
}
/**
 * @returns {void}
 */
function on_change_game() {
	const game = /** @type {GameSensName} */(cpi_norm_game_select.value)/**/
	if (game == state.cpi_norm.game) {
		return
	}
	localStorage.setItem(
		"cpi_norm.game",
		state.cpi_norm.game = game
	)
	const sens = game == "lol"
		? state.game.lol_sens
		: constants.cpi_norm.default_sens[game]
	cpi_norm_sens_input.value = String(sens)
	localStorage.setItem(
		"cpi_norm.sens",
		String(state.cpi_norm.sens = sens)
	)
	update_cpi_norm_result()
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_sens(ev) {
	const target = /** @type {HTMLInputElement} */(ev.currentTarget)/**/
	const value = target.value.replace(/\.+$/, "")
	localStorage.setItem("cpi_norm.sens", value)
	state.cpi_norm.sens = Number(value)
	update_cpi_norm_result()
}
/** @returns {void} */
export function update_cpi_norm_result() {
	const { game } = state.cpi_norm
	let cpi
	if (game == "al") {
		cpi = calc_cpi_al()
	} else if (game == "bdo") {
		cpi = calc_cpi_bdo()
	} else if (game == "cs2") {
		cpi = calc_cpi_cs2()
	} else if (game == "fn") {
		cpi = calc_cpi_fn()
	} else if (game == "lol") {
		cpi = calc_cpi_lol()
	} else if (game == "mc") {
		cpi = calc_cpi_mc()
	} else if (game == "ow") {
		cpi = calc_cpi_ow()
	} else if (game == "pubg") {
		cpi = calc_cpi_pubg()
	} else if (game == "r6") {
		cpi = calc_cpi_r6()
	} else if (game == "rb") {
		cpi = calc_cpi_rb()
	} else if (game == "sa") {
		cpi = calc_cpi_sa()
	} else if (game == "val") {
		cpi = calc_cpi_val()
	} else {
		throw Error(game)
	}
	cpi_norm_result_el.textContent = String(round(cpi))
}
{
	cpi_norm_cpi_input.addEventListener("change", on_change_cpi)
	cpi_norm_game_select.addEventListener("change", on_change_game)
	cpi_norm_sens_input.addEventListener("change", on_change_sens)
}