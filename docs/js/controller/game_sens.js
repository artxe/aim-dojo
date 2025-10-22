import {
	cs2_el,
	height_input,
	lol_el,
	mc_el,
	ow_el,
	pubg_el,
	pubg_fpp_el,
	pubg_fpp_fov_input,
	sa_el,
	tolerance_input,
	val_el,
	width_input
} from "../document.js"
import { max, min, round } from "../math.js"
import { calc_sens_pubg } from "../sens.js"
import state from "../state.js"
import {
	change_active_game_sens,
	set_text_if_changed,
	update_game_sens
} from "../ui.js"
height_input.addEventListener(
	"input",
	function(ev) {
		const target = /** @type {HTMLInputElement} */(ev.target)/**/
		target.value = String(
			max(
				min(
					Number(
						target.value.replace(/[^0-9]/g, "").substring(0, 4)
					),
					9999
				),
				1
			)
		)
		localStorage.setItem("game.height", target.value)
		state.game.height = Number(target.value)
		update_game_sens()
	}
)
height_input.addEventListener(
	"keydown",
	function(ev) {
		const target = /** @type {HTMLInputElement} */(ev.target)/**/
		if (ev.code == "ArrowDown") {
			target.value = String(
				max(Number(target.value) - 1, 1)
			)
		} else if (ev.code == "ArrowUp") {
			target.value = String(
				min(Number(target.value) + 1, 9999)
			)
		} else {
			return
		}
		localStorage.setItem("game.height", target.value)
		state.game.height = Number(target.value)
		update_game_sens()
	}
)
pubg_fpp_fov_input.addEventListener(
	"input",
	function(ev) {
		const target = /** @type {HTMLInputElement} */(ev.target)/**/
		target.value = String(
			max(
				min(
					Number(
						target.value.replace(/[^0-9]/g, "").substring(0, 3)
					),
					103
				),
				80
			)
		)
		const pubg_fpp = calc_sens_pubg(
			Number(pubg_fpp_fov_input.value)
		)
		set_text_if_changed(pubg_fpp_el, round(pubg_fpp))
	}
)
pubg_fpp_fov_input.addEventListener(
	"keydown",
	function(ev) {
		const target = /** @type {HTMLInputElement} */(ev.target)/**/
		if (ev.code == "ArrowDown") {
			target.value = String(
				max(Number(target.value) - 1, 80)
			)
		} else if (ev.code == "ArrowUp") {
			target.value = String(
				min(Number(target.value) + 1, 103)
			)
		} else {
			return
		}
		const pubg_fpp = calc_sens_pubg(
			Number(pubg_fpp_fov_input.value)
		)
		set_text_if_changed(pubg_fpp_el, round(pubg_fpp))
	}
)
tolerance_input.addEventListener(
	"input",
	function(ev) {
		const target = /** @type {HTMLInputElement} */(ev.target)/**/
		target.value = String(
			max(
				min(
					Number(
						target.value.replace(/[^0-9]/g, "").substring(0, 1)
					),
					9
				),
				0
			)
		)
		localStorage.setItem("game.tolerance", target.value)
		state.game.tolerance = Number(target.value)
		update_game_sens()
	}
)
tolerance_input.addEventListener(
	"keydown",
	function(ev) {
		const target = /** @type {HTMLInputElement} */(ev.target)/**/
		if (ev.code == "ArrowDown") {
			target.value = String(
				max(Number(target.value) - 1, 0)
			)
		} else if (ev.code == "ArrowUp") {
			target.value = String(
				min(Number(target.value) + 1, 9)
			)
		} else {
			return
		}
		localStorage.setItem("game.tolerance", target.value)
		state.game.tolerance = Number(target.value)
		update_game_sens()
	}
)
width_input.addEventListener(
	"input",
	function(ev) {
		const target = /** @type {HTMLInputElement} */(ev.target)/**/
		target.value = String(
			max(
				min(
					Number(
						target.value.replace(/[^0-9]/g, "").substring(0, 4)
					),
					9999
				),
				1
			)
		)
		localStorage.setItem("game.width", target.value)
		state.game.width = Number(target.value)
		update_game_sens()
	}
)
width_input.addEventListener(
	"keydown",
	function(ev) {
		const target = /** @type {HTMLInputElement} */(ev.target)/**/
		if (ev.code == "ArrowDown") {
			target.value = String(
				max(Number(target.value) - 1, 1)
			)
		} else if (ev.code == "ArrowUp") {
			target.value = String(
				min(Number(target.value) + 1, 9999)
			)
		} else {
			return
		}
		localStorage.setItem("game.width", target.value)
		state.game.width = Number(target.value)
		update_game_sens()
	}
)
cs2_el.addEventListener(
	"mouseup",
	() => change_active_game_sens("cs2")
)
lol_el.addEventListener(
	"mouseup",
	() => change_active_game_sens("lol")
)
mc_el.addEventListener(
	"mouseup",
	() => change_active_game_sens("mc")
)
ow_el.addEventListener(
	"mouseup",
	() => change_active_game_sens("ow")
)
pubg_el.addEventListener(
	"mouseup",
	() => change_active_game_sens("pubg")
)
sa_el.addEventListener(
	"mouseup",
	() => change_active_game_sens("sa")
)
val_el.addEventListener(
	"mouseup",
	() => change_active_game_sens("val")
)