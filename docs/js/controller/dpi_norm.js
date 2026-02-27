import {
	dpi_norm_cs2_fov_btn,
	dpi_norm_cs2_sens_input,
	dpi_norm_cs2_zoom_input,
	dpi_norm_dpi_input,
	dpi_norm_fn_fov_btn,
	dpi_norm_fn_sens_input,
	dpi_norm_fn_zoom_input,
	dpi_norm_game_btn,
	dpi_norm_lol_sens_input,
	dpi_norm_mc_sens_input,
	dpi_norm_ow_fov_btn,
	dpi_norm_ow_sens_input,
	dpi_norm_ow_zoom_input,
	dpi_norm_pubg_fov_btn,
	dpi_norm_pubg_sens_input,
	dpi_norm_result_el,
	dpi_norm_sa_fov_btn,
	dpi_norm_sa_sens_input,
	dpi_norm_val_fov_btn,
	dpi_norm_val_sens_input,
	dpi_norm_val_zoom_input
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
} from "../sens/index.js"
import state from "../state.js"
dpi_norm_dpi_input.addEventListener("change", on_change_dpi)
dpi_norm_game_btn.addEventListener("change", on_change_game)
dpi_norm_cs2_fov_btn.addEventListener("change", on_change_fov)
dpi_norm_cs2_sens_input.addEventListener("change", on_change_sens)
dpi_norm_cs2_zoom_input.addEventListener("change", on_change_zoom)
dpi_norm_fn_fov_btn.addEventListener("change", on_change_fov)
dpi_norm_fn_sens_input.addEventListener("change", on_change_sens)
dpi_norm_fn_zoom_input.addEventListener("change", on_change_zoom)
dpi_norm_lol_sens_input.addEventListener("change", on_change_sens)
dpi_norm_mc_sens_input.addEventListener("change", on_change_sens)
dpi_norm_ow_fov_btn.addEventListener("change", on_change_fov)
dpi_norm_ow_sens_input.addEventListener("change", on_change_sens)
dpi_norm_ow_zoom_input.addEventListener("change", on_change_zoom)
dpi_norm_pubg_fov_btn.addEventListener("change", on_change_fov)
dpi_norm_pubg_sens_input.addEventListener("change", on_change_sens)
dpi_norm_sa_fov_btn.addEventListener("change", on_change_fov)
dpi_norm_sa_sens_input.addEventListener("change", on_change_sens)
dpi_norm_val_fov_btn.addEventListener("change", on_change_fov)
dpi_norm_val_sens_input.addEventListener("change", on_change_sens)
dpi_norm_val_zoom_input.addEventListener("change", on_change_zoom)
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_fov(ev) {
	const { game } = state.dpi_norm
	const target = /** @type {HTMLButtonElement} */(ev.target)/**/
	if (game == "cs2") {
		const prev_fov = state.dpi_norm.fov
		const fov = /** @type {"aug"|"awp"|"hipfire"} */(target.value)/**/
		localStorage.setItem(
			"dpi_norm.fov",
			state.dpi_norm.fov = fov
		)
		if (fov == "hipfire") {
			localStorage.removeItem("dpi_norm.zoom")
		} else if (prev_fov == "hipfire") {
			dpi_norm_cs2_zoom_input.value = "1"
			// @ts-ignore
			state.dpi_norm.zoom = 1
		}
	} else if (game == "fn") {
		const prev_fov = state.dpi_norm.fov
		const fov = /** @type {"ads"|"hipfire"} */(target.value)/**/
		localStorage.setItem(
			"dpi_norm.fov",
			state.dpi_norm.fov = fov
		)
		if (fov == "hipfire") {
			localStorage.removeItem("dpi_norm.zoom")
		} else if (prev_fov == "hipfire") {
			dpi_norm_fn_zoom_input.value = "100"
			// @ts-ignore
			state.dpi_norm.zoom = 100
		}
	} else if (game == "lol") {
		localStorage.removeItem("dpi_norm.fov")
		localStorage.removeItem("dpi_norm.zoom")
	} else if (game == "mc") {
		localStorage.removeItem("dpi_norm.fov")
		localStorage.removeItem("dpi_norm.zoom")
	} else if (game == "ow") {
		const prev_fov = state.dpi_norm.fov
		const fov = /** @type {"ashe"|"freja"|"hipfire"|"widow"} */(target.value)/**/
		localStorage.setItem(
			"dpi_norm.fov",
			state.dpi_norm.fov = fov
		)
		if (fov == "hipfire") {
			localStorage.removeItem("dpi_norm.zoom")
		} else if (prev_fov == "hipfire") {
			dpi_norm_ow_zoom_input.value = "30"
			// @ts-ignore
			state.dpi_norm.zoom = 30
		}
	} else if (game == "pubg") {
		const fov = /** @type {"tpp"|"x1"|"x2"|"x3"|"x4"|"x6"|"x8"|"x15"} */(target.value)/**/
		localStorage.setItem(
			"dpi_norm.fov",
			state.dpi_norm.fov = fov
		)
	} else if (game == "sa") {
		const fov = /** @type {"normal"|"wide"} */(target.value)/**/
		localStorage.setItem(
			"dpi_norm.fov",
			state.dpi_norm.fov = fov
		)
	} else if (game == "val") {
		const prev_fov = state.dpi_norm.fov
		const fov = /** @type {"guardian"|"hipfire"|"marshal"|"operator"|"spectre"|"vandal"} */(target.value)/**/
		localStorage.setItem(
			"dpi_norm.fov",
			state.dpi_norm.fov = fov
		)
		if (fov == "hipfire") {
			localStorage.removeItem("dpi_norm.zoom")
		} else if (prev_fov == "hipfire") {
			dpi_norm_val_zoom_input.value = "1"
			// @ts-ignore
			state.dpi_norm.zoom = 1
		}
	} else {
		throw Error(game)
	}
	update_dpi_norm_result()
}
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
	let update = false
	if (state.dpi_norm.game == "cs2") {
		if (dpi_norm_cs2_fov_btn.value != "hipfire") {
			update = true
		}
		state.dpi_norm.fov = dpi_norm_cs2_fov_btn.value = "hipfire"
		dpi_norm_cs2_sens_input.value = "2.5"
		state.dpi_norm.sens = 2.5
	} else if (state.dpi_norm.game == "fn") {
		if (dpi_norm_fn_fov_btn.value != "hipfire") {
			update = true
		}
		state.dpi_norm.fov = dpi_norm_fn_fov_btn.value = "hipfire"
		dpi_norm_fn_sens_input.value = "50"
		state.dpi_norm.sens = 50
	} else if (state.dpi_norm.game == "lol") {
		update = true
		dpi_norm_lol_sens_input.value = "50"
		state.dpi_norm.sens = 50
	} else if (state.dpi_norm.game == "mc") {
		update = true
		dpi_norm_mc_sens_input.value = "50"
		state.dpi_norm.sens = 50
	} else if (state.dpi_norm.game == "ow") {
		if (dpi_norm_ow_fov_btn.value != "hipfire") {
			update = true
		}
		state.dpi_norm.fov = dpi_norm_ow_fov_btn.value = "hipfire"
		dpi_norm_ow_sens_input.value = "15"
		state.dpi_norm.sens = 15
	} else if (state.dpi_norm.game == "pubg") {
		if (dpi_norm_pubg_fov_btn.value != "x1") {
			update = true
		}
		state.dpi_norm.fov = dpi_norm_pubg_fov_btn.value = "x1"
		dpi_norm_pubg_sens_input.value = "50"
		state.dpi_norm.sens = 50
	} else if (state.dpi_norm.game == "sa") {
		if (dpi_norm_sa_fov_btn.value != "normal") {
			update = true
		}
		state.dpi_norm.fov = dpi_norm_sa_fov_btn.value = "normal"
		dpi_norm_sa_sens_input.value = "50"
		state.dpi_norm.sens = 50
	} else if (state.dpi_norm.game == "val") {
		if (dpi_norm_val_fov_btn.value != "hipfire") {
			update = true
		}
		state.dpi_norm.fov = dpi_norm_val_fov_btn.value = "hipfire"
		dpi_norm_val_sens_input.value = "1"
		state.dpi_norm.sens = 1
	} else {
		throw Error(game)
	}
	if (update) {
		update_dpi_norm_result()
	}
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
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_zoom(ev) {
	const { game } = state.dpi_norm
	if (game == "lol" || game == "mc" || game == "pubg" || game == "sa" || state.dpi_norm.fov == "hipfire") {
		throw Error(game)
	}
	const target = /** @type {HTMLInputElement} */(ev.target)/**/
	const value = target.value.replace(/\.+$/, "")
	localStorage.setItem("dpi_norm.zoom", value)
	state.dpi_norm.zoom = Number(value)
	update_dpi_norm_result()
}
/** @returns {void} */
export function update_dpi_norm_result() {
	const { game } = state.dpi_norm
	if (game == "cs2") {
		dpi_norm_result_el.textContent = String(calc_dpi_cs2() | 0)
	} else if (game == "fn") {
		dpi_norm_result_el.textContent = String(calc_dpi_fn() | 0)
	} else if (game == "lol") {
		dpi_norm_result_el.textContent = String(calc_dpi_lol() | 0)
	} else if (game == "mc") {
		dpi_norm_result_el.textContent = String(calc_dpi_mc() | 0)
	} else if (game == "ow") {
		dpi_norm_result_el.textContent = String(calc_dpi_ow() | 0)
	} else if (game == "pubg") {
		dpi_norm_result_el.textContent = String(calc_dpi_pubg() | 0)
	} else if (game == "sa") {
		dpi_norm_result_el.textContent = String(calc_dpi_sa() | 0)
	} else if (game == "val") {
		dpi_norm_result_el.textContent = String(calc_dpi_val() | 0)
	} else {
		throw Error(game)
	}
}