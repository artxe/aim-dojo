import game_mode from "../game_mode/index.js"
import { stop_game } from "../logic.js"
import { clamp, EPS, PI } from "../math.js"
import {
	enable_bg_audio,
	resize_bg,
	set_bg_video_visible
} from "../render/renderer_bg.js"
import { resize_2d } from "../render/renderer_2d.js"
import { resize_3d } from "../render/renderer_3d.js"
import { set_audio_visible } from "../sfx.js"
import state from "../state.js"
import { bg_el, setting_view_el } from "./dom.js"
import {
	on_click_modal_backdrop,
	sync_setting_hash
} from "./setting.js"
import "./dpi_norm.js"
import "./game_sens.js"
import "./menu.js"
import constants from "../constants.js"
{
	addEventListener(
		"contextmenu",
		e => e.preventDefault()
	)
	addEventListener("hashchange", sync_setting_hash)
	addEventListener("keydown", on_keydown)
	addEventListener("keyup", on_keyup)
	addEventListener("mousecancel", on_mousecancel)
	addEventListener(
		"resize",
		on_resize,
		{ passive: true }
	)
	document.addEventListener(
		"keydown",
		enable_bg_audio,
		{ once: true }
	)
	document.addEventListener(
		"mousedown",
		enable_bg_audio,
		{ once: true }
	)
	document.addEventListener("mousedown", on_mousedown)
	document.addEventListener(
		"mousemove",
		on_mousemove,
		{ passive: true }
	)
	document.addEventListener("mouseup", on_mouseup)
	document.addEventListener(
		"pointerlockchange",
		on_pointerlockchange
	)
	document.addEventListener(
		"touchend",
		enable_bg_audio,
		{ once: true }
	)
	document.addEventListener(
		"visibilitychange",
		on_visibilitychange
	)
	reset_screen_saver_timer()
}
/** @returns {boolean} */
function is_modal_active() {
	return bg_el.hasAttribute("activate") || setting_view_el.hasAttribute("active")
}
/**
 * @param {KeyboardEvent} ev
 * @returns {void}
 */
function on_keydown(ev) {
	const { mode } = state.game
	reset_screen_saver_timer()
	if (ev.repeat || ev.target instanceof HTMLInputElement) {
		return
	}
	ev.preventDefault()
	if (ev.code == "KeyA") {
		state.input.key_a = true
		if (mode) {
			game_mode[mode].shoot()
		}
	} else if (ev.code == "KeyE") {
		state.input.key_e = true
		if (mode) {
			game_mode[mode].shoot()
		}
	} else if (ev.code == "KeyQ") {
		state.input.key_q = true
		if (mode) {
			game_mode[mode].shoot()
		}
	} else if (ev.code == "KeyR") {
		state.input.key_r = true
		if (mode) {
			game_mode[mode].shoot()
		}
	} else if (ev.code == "KeyW") {
		state.input.key_w = true
		if (mode) {
			game_mode[mode].shoot()
		}
	} else if (ev.code == "Space") {
		state.input.key_space = true
	} else if (ev.code == "Escape" && is_modal_active()) {
		on_click_modal_backdrop()
	}
}
/**
 * @param {KeyboardEvent} ev
 * @returns {void}
 */
function on_keyup(ev) {
	reset_screen_saver_timer()
	if (ev.target instanceof HTMLInputElement) {
		return
	}
	ev.preventDefault()
	if (ev.code == "KeyA") {
		state.input.key_a = false
	} else if (ev.code == "KeyE") {
		state.input.key_e = false
	} else if (ev.code == "KeyQ") {
		state.input.key_q = false
	} else if (ev.code == "KeyR") {
		state.input.key_r = false
	} else if (ev.code == "KeyW") {
		state.input.key_w = false
	} else if (ev.code == "Space") {
		state.input.key_space = false
	}
}
/** @returns {void} */
function on_mousecancel() {
	const { mode } = state.game
	reset_screen_saver_timer()
	state.input.mb_left = false
	state.input.mb_right = false
	if (mode && game_mode[mode].update_dimension) {
		game_mode[mode].update_dimension()
	}
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_mousedown(ev) {
	const { mode } = state.game
	reset_screen_saver_timer()
	if (ev.button == 0 && mode) {
		state.input.mb_left = true
		game_mode[mode].shoot()
	}
	if (ev.button == 2) {
		state.input.mb_right = true
		if (mode) {
			if (game_mode[mode].update_dimension) {
				game_mode[mode].update_dimension()
			} else {
				game_mode[mode].shoot()
			}
		}
	}
}
/**
 * @param {{ movementX: number, movementY: number }} ev
 * @returns {void}
 */
function on_mousemove({ movementX, movementY }) {
	const { dimension, pitch, sens, y } = state.camera
	const { mode } = state.game
	reset_screen_saver_timer()
	if (mode) {
		if (dimension == "2d") {
			const y_limit = PI / 2 / sens - EPS | 0
			state.camera.x += movementX
			state.camera.y = clamp(-y_limit, y + movementY, y_limit)
		} else {
			const pitch_limit = PI / 2 - EPS
			state.camera.yaw += movementX * sens
			state.camera.pitch = clamp(
				-pitch_limit,
				pitch - movementY * sens,
				pitch_limit
			)
		}
	}
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_mouseup(ev) {
	const { mode } = state.game
	const { mb_right } = state.input
	reset_screen_saver_timer()
	if (ev.button == 0) {
		state.input.mb_left = false
	}
	if (ev.button == 2 && mb_right) {
		state.input.mb_right = false
		if (mode && game_mode[mode].update_dimension) {
			game_mode[mode].update_dimension()
		}
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
	resize_2d()
	resize_3d()
	resize_bg()
}
/** @returns {void} */
function on_visibilitychange() {
	const visible = !document.hidden
	set_audio_visible(visible)
	set_bg_video_visible(visible)
}
/** @returns {void} */
function reset_screen_saver_timer() {
	const { delay_ms } = constants.screen_saver
	const { mode, rest_timeout } = state.game
	if (rest_timeout > 0) {
		clearTimeout(rest_timeout)
		state.game.rest_timeout = 0
	} else if (rest_timeout < 0) {
		document.body.removeAttribute("rest")
	}
	if (!mode) {
		state.game.rest_timeout = setTimeout(screen_saver, delay_ms)
	}

}
/** @returns {void} */
function screen_saver() {
	const { rest_timeout } = state.game
	clearTimeout(rest_timeout)
	document.body.setAttribute("rest", "")
	state.game.rest_timeout = -1
}