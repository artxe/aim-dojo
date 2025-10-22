import { bg_el, setting_view_el, toast_el } from "../document.js"
import game_mode from "../game_mode/index.js"
import { stop_game, update_fov } from "../logic.js"
import { clamp, EPS, floor, PI } from "../math.js"
import { resize_2d } from "../renderer.js"
import { compute_sens_rad } from "../sens.js"
import state from "../state.js"
import { cycle_active_game_sens } from "../ui.js"
addEventListener(
	"contextmenu",
	e => e.preventDefault()
)
addEventListener("keydown", on_keydown)
addEventListener("mousecancel", on_mousecancel)
addEventListener(
	"resize",
	on_resize,
	{ passive: true }
)
document.addEventListener("fullscreenchange", on_resize)
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
/**
 * @param {KeyboardEvent} ev
 * @returns {void}
 */
function on_keydown(ev) {
	if (ev.code === "Escape") {
		ev.preventDefault()
		if (bg_el.hasAttribute("preview")) {
			bg_el.removeAttribute("preview")
		} else if (setting_view_el.hasAttribute("active")) {
			setting_view_el.removeAttribute("active")
		}
		if (toast_el.textContent) {
			for (const span of toast_el.children) {
				clearTimeout(
					Number(span.getAttribute("timer"))
				)
			}
			toast_el.textContent = ""
		}
	} else if (ev.code == "Tab") {
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
		game_mode[mode].shoot()
	}
	if (ev.button == 2 && mode) {
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
export function on_resize() {
	update_fov()
	resize_2d()
}