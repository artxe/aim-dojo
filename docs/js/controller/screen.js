import {
	bg_el,
	fov_el,
	setting_view_el,
	timer_el
} from "../document.js"
import game_mode from "../game_mode/index.js"
import { stop_game } from "../logic.js"
import { clamp, EPS, PI, round, round_to } from "../math.js"
import { calc_rad_per_px } from "../calc/index.js"
import state from "../state.js"
import { on_resize, set_text_if_changed } from "./index.js"
import { on_click_modal_backdrop } from "./setting.js"
addEventListener(
	"contextmenu",
	e => e.preventDefault()
)
addEventListener("keydown", on_keydown)
addEventListener("keyup", on_keyup)
addEventListener("mousecancel", on_mousecancel)
addEventListener(
	"resize",
	on_resize,
	{ passive: true }
)
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
 * @param {number} ms
 * @returns {string}
 */
function format_duration_ms(ms) {
	const total_sec = ms / 1_000 | 0
	const s = total_sec % 60
	const m = (total_sec / 60 | 0) % 60
	const h = total_sec / 3_600 | 0
	return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`
	/**
	 * @param {number} n
	 * @returns {string}
	 */
	function two(n) {
		return n < 10 ? "0" + n : "" + n
	}
}
/**
 * @param {KeyboardEvent} ev
 * @returns {void}
 */
function on_keydown(ev) {
	if (ev.repeat || ev.target instanceof HTMLInputElement) {
		return
	}
	const { mode, rest_timeout: rest_raf_id } = state.game
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
	}
	if (!mode) {
		if (ev.code === "Escape") {
			on_click_modal_backdrop()
		}
		if (rest_raf_id) {
			clearTimeout(rest_raf_id)
		}
		if (!bg_el.hasAttribute("activate") && !setting_view_el.hasAttribute("active")) {
			state.game.rest_timeout = setTimeout(screen_saver, 10_000)
		} else if (ev.code === "Escape") {
			on_click_modal_backdrop()
		}
	}
}
/**
 * @param {KeyboardEvent} ev
 * @returns {void}
 */
function on_keyup(ev) {
	if (ev.target instanceof HTMLInputElement) {
		return
	}
	const { mode, rest_timeout: rest_raf_id } = state.game
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
	if (!mode) {
		if (ev.code === "Escape") {
			on_click_modal_backdrop()
		}
		if (rest_raf_id) {
			clearTimeout(rest_raf_id)
		}
		if (!bg_el.hasAttribute("activate") && !setting_view_el.hasAttribute("active")) {
			state.game.rest_timeout = setTimeout(screen_saver, 10_000)
		} else if (ev.code === "Escape") {
			on_click_modal_backdrop()
		}
	}
}
/** @returns {void} */
function on_mousecancel() {
	const { mode } = state.game
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
	const { dimension, fov, pitch, width, y } = state.camera
	const { mode, rest_timeout: rest_raf_id } = state.game
	if (mode) {
		const sens = calc_rad_per_px(fov, width)
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
	} else {
		if (rest_raf_id) {
			clearTimeout(rest_raf_id)
		}
		if (!bg_el.hasAttribute("activate") && !setting_view_el.hasAttribute("active")) {
			state.game.rest_timeout = setTimeout(screen_saver, 5_000)
		}
	}
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_mouseup(ev) {
	const { mode } = state.game
	if (ev.button == 0) {
		state.input.mb_left = false
	}
	if (ev.button == 2) {
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
function screen_saver() {
	const { rest_timeout: rest_raf_id } = state.game
	clearTimeout(rest_raf_id)
	state.game.rest_timeout = 0
	document.body.setAttribute("rest", "")
	document.addEventListener(
		"mousemove",
		() => document.body.removeAttribute("rest"),
		{ once: true }
	)
}
/** @returns {void} */
export function update_hud() {
	const { dimension, fov } = state.camera
	const { mode } = state.game
	const { now_ms, prev_ms, start_ms } = state.timer
	let { fps } = state.timer
	if (!mode) {
		throw Error()
	}
	game_mode[mode].update_hud()
	const dt = now_ms - prev_ms
	const temp = dt > 0 ? 1_000 / dt : 0
	state.timer.fps = fps = fps ? fps * .9 + temp * .1 : temp
	set_text_if_changed(
		timer_el,
		`${round(fps)} / ${format_duration_ms(now_ms - start_ms)}`
	)
	set_text_if_changed(
		fov_el,
		dimension == "2d" ? "2D" : `${dimension} ${round_to(fov, 2)}°`
	)
}