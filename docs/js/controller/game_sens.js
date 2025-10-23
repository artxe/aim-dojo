import {
	cs2_el,
	fn_el,
	lol_el,
	mc_el,
	monitor_res_btn,
	ow_el,
	pubg_el,
	sa_el,
	tolerance_input,
	val_el
} from "../document.js"
import { max, min } from "../math.js"
import state from "../state.js"
import {
	change_active_game_sens,
	update_game_sens
} from "../ui.js"
monitor_res_btn.addEventListener(
	"change",
	function(ev) {
		const target = /** @type {HTMLButtonElement} */(ev.target)/**/
		const type = /** @type {MonitorResolution} */(target.value)/**/
		if (type == "fhd") {
			state.game.height = 1080
			state.game.width = 1920
		} else if (type == "hd") {
			state.game.height = 720
			state.game.width = 1280
		} else if (type == "qhd") {
			state.game.height = 1440
			state.game.width = 2560
		} else {
			throw Error(type)
		}
		localStorage.setItem(
			"device.resolution",
			state.device.resolution = type
		)
		update_game_sens()
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
cs2_el.addEventListener(
	"mouseup",
	() => change_active_game_sens("cs2")
)
fn_el.addEventListener(
	"mouseup",
	() => change_active_game_sens("fn")
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