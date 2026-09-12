import constants from "../constants.js"
import game_mode from "../game_mode/index.js"
import { lang_text } from "../i18n.js"
import {
	ads_stage_count,
	stop_game,
	update_camera_projection
} from "../logic.js"
import { clamp, EPS, PI } from "../math.js"
import { resize_2d } from "../render/renderer_2d.js"
import { resize_3d } from "../render/renderer_3d.js"
import {
	enable_bg_audio,
	resize_bg,
	set_bg_video_visible
} from "../render/renderer_bg.js"
import { set_audio_visible } from "../sfx.js"
import state from "../state.js"
import {
	activate_bg_btn,
	bg_el,
	browser_notice_el,
	lang_select,
	menu_el,
	save_bg_btn,
	setting_view_el
} from "./dom.js"
import "./cpi_norm.js"
import "./game_sens.js"
import "./menu.js"
import {
	on_click_modal_backdrop,
	sync_setting_hash
} from "./setting.js"
import {
	is_tutorial_active,
	layout_tutorial,
	step_tutorial,
	stop_tutorial
} from "./tutorial.js"
const HAS_POINTER_RAW_UPDATE = "onpointerrawupdate" in document
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function block_tutorial_click(ev) {
	const target = /** @type {Element} */(ev.target)/**/
	if (
		!is_tutorial_active()
		|| !(
			activate_bg_btn.contains(target)
			|| menu_el.contains(target)
			|| save_bg_btn.contains(target)
			|| target.matches("#game-sens-list li > b")
		)
	) {
		return
	}
	ev.preventDefault()
	ev.stopPropagation()
}
/** @returns {void} */
function cycle_ads_stage() {
	const stage_count = ads_stage_count()
	state.input.ads_stage = /** @type {AdsStage} */((state.input.ads_stage + 1) % stage_count)/**/
}
/**
 * @param {GameMode} active
 * @returns {boolean}
 */
function is_ads_available(active) {
	return !!active.update_dimension && ads_stage_count() > 1
}
/** @returns {boolean} */
function is_ads_cycled() {
	return state.game.sens == "sa" || state.game.ads_toggle
}
/**
 * @param {KeyboardEvent} ev
 * @returns {boolean}
 */
function is_keyboard_control(ev) {
	return ev.composedPath().some(
		target => target instanceof HTMLElement && (
			target.isContentEditable
			|| target.matches(
				"x-select,button,input,select,textarea"
			)
		)
	)
}
/** @returns {boolean} */
function is_modal_active() {
	return bg_el.hasAttribute("activate") || setting_view_el.hasAttribute("active")
}
/** @returns {void} */
function on_blur() {
	state.input.key_a = false
	state.input.key_e = false
	state.input.key_q = false
	state.input.key_r = false
	state.input.key_space = false
	state.input.key_w = false
	dispatchEvent(new Event("mousecancel"))
}
/**
 * @param {KeyboardEvent} ev
 * @returns {void}
 */
function on_keydown(ev) {
	const { mode } = state.game
	reset_screen_saver_timer()
	if (ev.defaultPrevented || ev.repeat) {
		return
	}
	if (ev.code == "Escape" && is_tutorial_active()) {
		ev.preventDefault()
		stop_tutorial()
		return
	}
	if (ev.code == "Escape" && is_modal_active()) {
		ev.preventDefault()
		on_click_modal_backdrop()
		return
	}
	if (is_tutorial_active()) {
		if (ev.code == "ArrowLeft") {
			ev.preventDefault()
			step_tutorial(-1)
		} else if (ev.code == "ArrowRight") {
			ev.preventDefault()
			step_tutorial(1)
		}
		return
	}
	if (is_keyboard_control(ev)) {
		return
	}
	ev.preventDefault()
	if (ev.code == "KeyA") {
		state.input.key_a = true
	} else if (ev.code == "KeyE") {
		state.input.key_e = true
	} else if (ev.code == "KeyQ") {
		state.input.key_q = true
	} else if (ev.code == "KeyR") {
		state.input.key_r = true
	} else if (ev.code == "KeyW") {
		state.input.key_w = true
	} else {
		if (ev.code == "Space") {
			state.input.key_space = true
		}
		return
	}
	if (mode) {
		game_mode[mode].shoot()
	}
}
/**
 * @param {KeyboardEvent} ev
 * @returns {void}
 */
function on_keyup(ev) {
	reset_screen_saver_timer()
	if (is_keyboard_control(ev)) {
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
	state.input.ads_stage = 0
	state.input.mb_left = false
	state.input.mb_right = false
	if (mode) {
		game_mode[mode].update_dimension?.()
	}
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_mousedown(ev) {
	const { mode } = state.game
	const active = mode ? game_mode[mode] : null
	reset_screen_saver_timer()
	if (ev.button == 0 && active) {
		state.input.mb_left = true
		active.shoot()
	}
	if (ev.button == 2) {
		state.input.mb_right = true
		if (active) {
			if (is_ads_available(active)) {
				if (is_ads_cycled()) {
					cycle_ads_stage()
				} else {
					state.input.ads_stage = 1
				}
				active.update_dimension?.()
			} else {
				active.shoot()
			}
		}
	}
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_mousemove(ev) {
	const { mode } = state.game
	const { movementX, movementY } = ev
	reset_screen_saver_timer()
	if (!mode) {
		return
	}
	const active = game_mode[mode]
	const { dimension, pitch, sens, y } = state.camera
	if (dimension == "2d" && is_ads_available(active)) {
		const y_limit = PI / 2 / sens - EPS | 0
		state.camera.x += movementX
		state.camera.y = clamp(-y_limit, y + movementY, y_limit)
	} else if (dimension == "2d") {
		state.camera.x += movementX
		state.camera.y += movementY
	} else {
		const pitch_limit = PI / 2 - EPS
		state.camera.yaw += movementX * sens
		state.camera.pitch = clamp(
			-pitch_limit,
			pitch - movementY * sens,
			pitch_limit
		)
	}
	active.on_move?.()
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
		if (mode && !is_ads_cycled() && is_ads_available(game_mode[mode])) {
			state.input.ads_stage = 0
			game_mode[mode].update_dimension?.()
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
	update_camera_projection()
	resize_3d()
	resize_bg()
	layout_tutorial()
}
/** @returns {void} */
function on_visibilitychange() {
	const visible = !document.hidden
	set_audio_visible(visible)
	set_bg_video_visible(visible)
}
/** @returns {void} */
function update_browser_notice() {
	browser_notice_el.textContent = lang_text(
		{
			en: "This browser cannot read raw mouse input.\nInstall Google Chrome for accurate aim.",
			ko: "이 브라우저는 마우스 원시 입력을 읽지 못합니다.\n정확한 에임을 위해 Google Chrome을 설치해 주세요."
		}
	)
}
/**
 * @param {WheelEvent} ev
 * @returns {void}
 */
function on_wheel(ev) {
	if (is_tutorial_active()) {
		ev.preventDefault()
	}
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
	if (!mode && !is_tutorial_active()) {
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
{
	addEventListener("blur", on_blur)
	addEventListener(
		"click",
		block_tutorial_click,
		{ capture: true }
	)
	addEventListener(
		"contextmenu",
		e => e.preventDefault()
	)
	addEventListener("hashchange", sync_setting_hash)
	addEventListener("keydown", on_keydown)
	addEventListener("keyup", on_keyup)
	addEventListener("mousecancel", on_mousecancel)
	addEventListener(
		"mousedown",
		block_tutorial_click,
		{ capture: true }
	)
	addEventListener(
		"mouseup",
		block_tutorial_click,
		{ capture: true }
	)
	addEventListener(
		"resize",
		on_resize,
		{ passive: true }
	)
	addEventListener(
		"scroll",
		layout_tutorial,
		{ capture: true, passive: true }
	)
	addEventListener(
		"wheel",
		on_wheel,
		{ passive: false }
	)
	visualViewport?.addEventListener(
		"resize",
		on_resize,
		{ passive: true }
	)
	document.addEventListener("click", layout_tutorial)
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
	if (HAS_POINTER_RAW_UPDATE) {
		document.addEventListener(
			"pointerrawupdate",
			on_mousemove,
			{ passive: true }
		)
	} else {
		browser_notice_el.setAttribute("unsupported", "")
		lang_select.addEventListener("change", update_browser_notice)
		update_browser_notice()
		document.addEventListener(
			"mousemove",
			on_mousemove,
			{ passive: true }
		)
	}
	reset_screen_saver_timer()
}