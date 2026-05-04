import {
	dpi_norm_dpi_input,
	dpi_norm_game_btn,
	dpi_norm_sens_input,
	dpi_norm_result_el
} from "../document.js"
import {
	calc_dpi_cs2,
	calc_dpi_fn,
	calc_dpi_lol,
	calc_dpi_mc,
	calc_dpi_ow,
	calc_dpi_pubg,
	calc_dpi_sa,
	calc_dpi_val
} from "../calc/index.js"
import state from "../state.js"
import { calc_dpi_al, calc_dpi_r6 } from "../calc/calc_dpi.js"
import { round } from "../math.js"
dpi_norm_dpi_input.addEventListener("change", on_change_dpi)
dpi_norm_game_btn.addEventListener("change", on_change_game)
dpi_norm_sens_input.addEventListener("change", on_change_sens)
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_game(ev) {
	const target = /** @type {HTMLButtonElement} */(ev.target)/**/
	const game = /** @type {GameSensName} */(target.value)/**/
	if (game == state.dpi_norm.game) {
		return
	}
	localStorage.setItem(
		"dpi_norm.game",
		state.dpi_norm.game = game
	)
	if (state.dpi_norm.game == "al") {
		dpi_norm_sens_input.value = "5"
		state.dpi_norm.sens = 5
	} else if (state.dpi_norm.game == "cs2") {
		dpi_norm_sens_input.value = "2.5"
		state.dpi_norm.sens = 2.5
	} else if (state.dpi_norm.game == "fn") {
		dpi_norm_sens_input.value = "50"
		state.dpi_norm.sens = 50
	} else if (state.dpi_norm.game == "lol") {
		dpi_norm_sens_input.value = "50"
		state.dpi_norm.sens = 50
	} else if (state.dpi_norm.game == "mc") {
		dpi_norm_sens_input.value = "0.5"
		state.dpi_norm.sens = 0.5
	} else if (state.dpi_norm.game == "ow") {
		dpi_norm_sens_input.value = "15"
		state.dpi_norm.sens = 15
	} else if (state.dpi_norm.game == "pubg") {
		dpi_norm_sens_input.value = "50"
		state.dpi_norm.sens = 50
	} else if (state.dpi_norm.game == "r6") {
		dpi_norm_sens_input.value = "50"
		state.dpi_norm.sens = 50
	} else if (state.dpi_norm.game == "sa") {
		dpi_norm_sens_input.value = "50"
		state.dpi_norm.sens = 50
	} else if (state.dpi_norm.game == "val") {
		dpi_norm_sens_input.value = "1"
		state.dpi_norm.sens = 1
	} else {
		throw Error(game)
	}
	localStorage.setItem(
		"dpi_norm.sens",
		dpi_norm_sens_input.value
	)
	update_dpi_norm_result()
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_dpi(ev) {
	const target = /** @type {HTMLInputElement} */(ev.target)/**/
	localStorage.setItem("dpi_norm.dpi", target.value)
	state.dpi_norm.dpi = Number(target.value)
	update_dpi_norm_result()
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_sens(ev) {
	const target = /** @type {HTMLInputElement} */(ev.target)/**/
	const value = target.value.replace(/\.+$/, "")
	localStorage.setItem("dpi_norm.sens", value)
	state.dpi_norm.sens = Number(value)
	update_dpi_norm_result()
}
/** @returns {void} */
export function update_dpi_norm_result() {
	const { game } = state.dpi_norm
	if (game == "al") {
		dpi_norm_result_el.textContent = String(round(calc_dpi_al()))
	} else if (game == "cs2") {
		dpi_norm_result_el.textContent = String(round(calc_dpi_cs2()))
	} else if (game == "fn") {
		dpi_norm_result_el.textContent = String(round(calc_dpi_fn()))
	} else if (game == "lol") {
		dpi_norm_result_el.textContent = String(round(calc_dpi_lol()))
	} else if (game == "mc") {
		dpi_norm_result_el.textContent = String(round(calc_dpi_mc()))
	} else if (game == "ow") {
		dpi_norm_result_el.textContent = String(round(calc_dpi_ow()))
	} else if (game == "pubg") {
		dpi_norm_result_el.textContent = String(round(calc_dpi_pubg()))
	} else if (game == "r6") {
		dpi_norm_result_el.textContent = String(round(calc_dpi_r6()))
	} else if (game == "sa") {
		dpi_norm_result_el.textContent = String(round(calc_dpi_sa()))
	} else if (game == "val") {
		dpi_norm_result_el.textContent = String(round(calc_dpi_val()))
	} else {
		throw Error(game)
	}
}