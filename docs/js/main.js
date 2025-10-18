import {
	cs2_el,
	flick_btn,
	flick_score_el,
	height_el,
	lol_el,
	mc_el,
	mode_cycle_btn,
	ow_el,
	pubg_el,
	pubg_fpp_el,
	pubg_fpp_fov_el,
	sa_el,
	tolerance_el,
	tracking_btn,
	tracking_score_el,
	val_el,
	warmup_btn,
	warmup_score_el,
	width_el,
	writing_btn,
	writing_score_el
} from "./document.js"
import {
	active_game_sens,
	change_active_game_sens,
	cycle_active_game_sens,
	set_text_if_changed,
	update_game_sens
} from "./hud.js"
import {
	shoot,
	start_game,
	stop_game,
	update_fov
} from "./logic.js"
import { clamp, EPS, floor, max, min, PI, round } from "./math.js"
import { resize_2d } from "./renderer.js"
import { calc_sens_pubg, compute_sens_rad } from "./sens.js"
import state from "./state.js"

addEventListener(
	"resize",
	on_resize,
	{ passive: true }
)
addEventListener("mousecancel", on_mousecancel)
document.addEventListener("fullscreenchange", on_resize)
document.addEventListener("keydown", on_keydown)
document.addEventListener("mousedown", on_mousedown)
document.addEventListener(
	"pointerlockchange",
	on_pointerlockchange
)
document.addEventListener(
	"mousemove",
	on_mousemove,
	{ passive: true }
)
document.addEventListener("mouseup", on_mouseup)
flick_btn.addEventListener("click", on_click)
mode_cycle_btn.addEventListener(
	"click",
	function() {
		const { cycle_id } = state.game
		if (cycle_id) {
			state.game.cycle_id = 0
			mode_cycle_btn.setAttribute("on", "false")
		} else {
			state.game.cycle_id = 1
			mode_cycle_btn.setAttribute("on", "true")
		}
	}
)
tracking_btn.addEventListener("click", on_click)
warmup_btn.addEventListener("click", on_click)
writing_btn.addEventListener("click", on_click)
height_el.addEventListener(
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
height_el.addEventListener(
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
pubg_fpp_fov_el.addEventListener(
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
		const pubg_fpp = calc_sens_pubg(Number(pubg_fpp_fov_el.value))
		set_text_if_changed(pubg_fpp_el, round(pubg_fpp))
	}
)
pubg_fpp_fov_el.addEventListener(
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
		const pubg_fpp = calc_sens_pubg(Number(pubg_fpp_fov_el.value))
		set_text_if_changed(pubg_fpp_el, round(pubg_fpp))
	}
)
tolerance_el.addEventListener(
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
tolerance_el.addEventListener(
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
width_el.addEventListener(
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
width_el.addEventListener(
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
height_el.value = String(state.game.height)
tolerance_el.value = String(state.game.tolerance)
width_el.value = String(state.game.width)
flick_score_el.textContent = localStorage.getItem("flick.best_score") || "0"
tracking_score_el.textContent = localStorage.getItem("tracking.best_score") || "0"
writing_score_el.textContent = localStorage.getItem("writing.best_score") || "0"
warmup_score_el.textContent = localStorage.getItem("warmup.best_score") || "0"
active_game_sens()
update_game_sens()
on_resize()
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_click(ev) {
	ev.preventDefault()
	if (ev.currentTarget == flick_btn) {
		start_game("flick")
	} else if (ev.currentTarget == tracking_btn) {
		start_game("tracking")
	} else if (ev.currentTarget == warmup_btn) {
		start_game("warmup")
	} else if (ev.currentTarget == writing_btn) {
		start_game("writing")
	} else {
		throw Error(
			/** @type {HTMLElement} */(ev.currentTarget)/**/.outerHTML
		)
	}
}
/**
 * @param {KeyboardEvent} ev
 * @returns {void}
 */
function on_keydown(ev) {
	if (ev.code == "Tab") {
		ev.preventDefault()
		cycle_active_game_sens()
	}
}
/** @returns {void} */
function on_mousecancel() {
	const { mode } = state.game
	if (mode) {
		state.input.mb_left = false
		state.input.mb_right = false
		update_fov()
	}
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_mousedown(ev) {
	const { mode } = state.game
	if (ev.button == 0 && mode) {
		state.input.mb_left = true
		shoot()
	}
	if (ev.button == 2) {
		ev.preventDefault()
		state.input.mb_right = true
		update_fov()
	}
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_mousemove(ev) {
	const { dimension, fov, pitch, y } = state.camera
	const { width } = state.device
	const { mode } = state.game
	if (!mode) return
	const sens = compute_sens_rad(fov, width)
	if (dimension == "2d") {
		const y_limit = floor(PI / 2 / sens - EPS)
		state.camera.x += ev.movementX
		state.camera.y = clamp(
			-y_limit,
			y + ev.movementY,
			y_limit
		)
	} else {
		const pitch_limit = PI / 2 - EPS
		state.camera.yaw += ev.movementX * sens
		state.camera.pitch = clamp(
			-pitch_limit,
			pitch - ev.movementY * sens,
			pitch_limit
		)
	}
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_mouseup(ev) {
	const { mode } = state.game
	if (ev.button == 0 && mode) {
		state.input.mb_left = false
	}
	if (ev.button == 2) {
		state.input.mb_right = false
		update_fov()
	}
}
/** @returns {void} */
function on_pointerlockchange() {
	if (document.pointerLockElement) {
		document.body.setAttribute("locked", "")
	} else {
		document.body.removeAttribute("locked")
		if (state.game.mode) {
			stop_game()
		}
	}
}
/** @returns {void} */
function on_resize() {
	update_fov()
	resize_2d()
}