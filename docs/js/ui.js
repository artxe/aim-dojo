import {
	aiming_score_el,
	cs2_aug_el,
	cs2_auto1_el,
	cs2_auto2_el,
	cs2_awp1_el,
	cs2_awp2_el,
	cs2_el,
	cs2_hipfire_el,
	flick_score_el,
	height_input,
	lol_el,
	mc_el,
	mc_hipfire_el,
	ow_ashe_el,
	ow_el,
	ow_freja_el,
	ow_hipfire_el,
	ow_widow_el,
	pubg_ads_el,
	pubg_el,
	pubg_fpp_el,
	pubg_fpp_fov_input,
	pubg_tpp_el,
	pubg_v_el,
	pubg_x2_el,
	pubg_x2_r_el,
	pubg_x3_el,
	pubg_x3_r_el,
	pubg_x4_el,
	pubg_x6_el,
	pubg_x8_el,
	pubg_x15_el,
	sa_el,
	sa_hipfire_el,
	timer_el,
	toast_el,
	tolerance_input,
	tracking_score_el,
	val_el,
	val_guardian_el,
	val_hipfire_el,
	val_marshal_el,
	val_operator5_el,
	val_operator25_el,
	val_spectre_el,
	val_vandal_el,
	width_input,
	writing_score_el,
	bg_soop_input,
	bg_youtube_input,
	bg_chzzk_input,
	bg_type_input,
	bg_web_view_input,
	mode_cycle_btn,
	bg_type_youtube_input,
	bg_type_soop_input,
	bg_type_web_view_input,
	bg_type_default_input,
	bg_type_chzzk_input
} from "./document.js"
import game_mode from "./game_mode/index.js"
import { update_fov } from "./logic.js"
import {
	atan,
	convert_deg_across_aspect,
	floor,
	round,
	round_to,
	tan,
	to_deg,
	to_rad
} from "./math.js"
import {
	calc_sens_cs2,
	calc_sens_mc,
	calc_sens_ow,
	calc_sens_pubg,
	calc_sens_pubg_recoil,
	calc_sens_pubg_v,
	calc_sens_sa,
	calc_sens_val
} from "./sens.js"
import state from "./state.js"
width_input.value = String(state.game.width)
height_input.value = String(state.game.height)
tolerance_input.value = String(state.game.tolerance)
aiming_score_el.textContent = localStorage.getItem("aiming.best_score") || "0"
flick_score_el.textContent = localStorage.getItem("flick.best_score") || "0"
tracking_score_el.textContent = localStorage.getItem("tracking.best_score") || "0"
writing_score_el.textContent = localStorage.getItem("writing.best_score") || "0"
mode_cycle_btn.setAttribute(
	"on",
	state.game.cycle_id ? "true" : "false"
)
bg_type_input.value = state.bg.type
if (state.bg.type == "chzzk") {
	bg_type_chzzk_input.checked = true
	bg_chzzk_input.setAttribute("active", "")
} else if (state.bg.type == "default") {
	bg_type_default_input.checked = true
} else if (state.bg.type == "soop") {
	bg_type_soop_input.checked = true
	bg_soop_input.setAttribute("active", "")
} else if (state.bg.type == "web_view") {
	bg_type_web_view_input.checked = true
	bg_web_view_input.setAttribute("active", "")
} else if (state.bg.type == "youtube") {
	bg_type_youtube_input.checked = true
	bg_youtube_input.setAttribute("active", "")
}
bg_youtube_input.value = state.bg.youtube_link
bg_soop_input.value = state.bg.soop_link
bg_chzzk_input.value = state.bg.chzzk_link
bg_web_view_input.value = state.bg.web_view_link
/** @returns {void} */
export function active_game_sens() {
	const { sens } = state.game
	if (sens == "lol") {
		lol_el.setAttribute("active", "")
	} else if (sens == "val") {
		val_el.setAttribute("active", "")
	} else if (sens == "cs2") {
		cs2_el.setAttribute("active", "")
	} else if (sens == "pubg") {
		pubg_el.setAttribute("active", "")
	} else if (sens == "ow") {
		ow_el.setAttribute("active", "")
	} else if (sens == "mc") {
		mc_el.setAttribute("active", "")
	} else if (sens == "sa") {
		sa_el.setAttribute("active", "")
	} else {
		throw Error(sens)
	}
	update_fov()
}
/**
 * @param {GameSensName} name
 * @returns {void}
 */
export function change_active_game_sens(name) {
	const { sens } = state.game
	if (name == sens) return
	localStorage.setItem(
		"game.sens",
		state.game.sens = name
	)
	if (sens == "lol") {
		lol_el.removeAttribute("active")
	} else if (sens == "val") {
		val_el.removeAttribute("active")
	} else if (sens == "cs2") {
		cs2_el.removeAttribute("active")
	} else if (sens == "pubg") {
		pubg_el.removeAttribute("active")
	} else if (sens == "ow") {
		ow_el.removeAttribute("active")
	} else if (sens == "mc") {
		mc_el.removeAttribute("active")
	} else if (sens == "sa") {
		sa_el.removeAttribute("active")
	} else {
		throw Error(sens)
	}
	active_game_sens()
}
/** @returns {void} */
export function cycle_active_game_sens() {
	const { sens } = state.game
	if (sens == "lol") {
		change_active_game_sens("val")
	} else if (sens == "val") {
		change_active_game_sens("cs2")
	} else if (sens == "cs2") {
		change_active_game_sens("pubg")
	} else if (sens == "pubg") {
		change_active_game_sens("ow")
	} else if (sens == "ow") {
		change_active_game_sens("mc")
	} else if (sens == "mc") {
		change_active_game_sens("sa")
	} else if (sens == "sa") {
		change_active_game_sens("lol")
	} else {
		throw Error(sens)
	}
}
/**
 * @param {number} ms
 * @returns {string}
 */
function format_duration_ms(ms) {
	const total_sec = floor(ms / 1_000)
	const s = total_sec % 60
	const m = floor(total_sec / 60) % 60
	const h = floor(total_sec / 3_600)
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
 * @param {HTMLSpanElement} el
 * @param {string|number} text
 * @returns {void}
 */
export function set_text_if_changed(el, text) {
	const s = String(text)
	if (el.textContent != s) el.textContent = s
}
/**
 * @param {string} message
 * @param {number} duration
 */
export function send_toast(message, duration) {
	const span = document.createElement("span")
	span.textContent = message
	toast_el.prepend(span)
	span.setAttribute(
		"timer",
		String(
			setTimeout(() => span.remove(), duration)
		)
	)
}
/** @returns {void} */
export function update_game_sens() {
	const { height, width } = state.game
	const base_hfov = 103
	const val_hipfire = calc_sens_val(base_hfov)
	set_text_if_changed(
		val_hipfire_el,
		round_to(val_hipfire, 3)
	)
	let zoom_fov = val_zoom_hfov(base_hfov, 1.15)
	const spectre = calc_sens_val(zoom_fov)
	set_text_if_changed(
		val_spectre_el,
		round_to(spectre / val_hipfire, 3)
	)
	zoom_fov = val_zoom_hfov(base_hfov, 1.25)
	const vandal = calc_sens_val(zoom_fov)
	set_text_if_changed(
		val_vandal_el,
		round_to(vandal / val_hipfire, 3)
	)
	zoom_fov = val_zoom_hfov(base_hfov, 1.5)
	const guardian = calc_sens_val(zoom_fov)
	set_text_if_changed(
		val_guardian_el,
		round_to(guardian / val_hipfire, 3)
	)
	zoom_fov = val_zoom_hfov(base_hfov, 3.5)
	const marshal = calc_sens_val(zoom_fov)
	set_text_if_changed(
		val_marshal_el,
		round_to(marshal / val_hipfire, 3)
	)
	zoom_fov = val_zoom_hfov(base_hfov, 2.5)
	const operator25 = calc_sens_val(zoom_fov)
	set_text_if_changed(
		val_operator25_el,
		round_to(operator25 / val_hipfire, 3)
	)
	zoom_fov = val_zoom_hfov(base_hfov, 5)
	const operator5 = calc_sens_val(zoom_fov)
	set_text_if_changed(
		val_operator5_el,
		round_to(operator5 / val_hipfire, 3)
	)
	const cs2_hipfire = calc_sens_cs2(90)
	const cs2_45 = calc_sens_cs2(45)
	const cs2_40 = calc_sens_cs2(40)
	const cs2_15 = calc_sens_cs2(15)
	const cs2_10 = calc_sens_cs2(10)
	set_text_if_changed(
		cs2_hipfire_el,
		round_to(cs2_hipfire, 2)
	)
	set_text_if_changed(
		cs2_aug_el,
		round_to(cs2_45 / cs2_hipfire, 2)
	)
	set_text_if_changed(
		cs2_auto1_el,
		round_to(cs2_40 / cs2_hipfire, 2)
	)
	set_text_if_changed(
		cs2_auto2_el,
		round_to(cs2_15 / cs2_hipfire, 2)
	)
	set_text_if_changed(
		cs2_awp1_el,
		round_to(cs2_40 / cs2_hipfire, 2)
	)
	set_text_if_changed(
		cs2_awp2_el,
		round_to(cs2_10 / cs2_hipfire, 2)
	)
	const pubg_fov = 80
	const pubg_fpp = calc_sens_pubg(
		Number(pubg_fpp_fov_input.value)
	)
	set_text_if_changed(pubg_fpp_el, round(pubg_fpp))
	const pubg_tpp = calc_sens_pubg(
		convert_deg_across_aspect(pubg_fov, width, width * .82),
		width * .82
	)
	set_text_if_changed(pubg_tpp_el, round(pubg_tpp))
	const pubg_ads = calc_sens_pubg(pubg_fov)
	set_text_if_changed(pubg_ads_el, round(pubg_ads))
	const pubg_v = calc_sens_pubg_v(pubg_fov)
	set_text_if_changed(pubg_v_el, round_to(pubg_v, 2))
	const pubg_x2 = calc_sens_pubg(pubg_fov / 2)
	set_text_if_changed(pubg_x2_el, round(pubg_x2))
	const pubg_x2_r = calc_sens_pubg_recoil(pubg_fov / 2)
	set_text_if_changed(pubg_x2_r_el, round(pubg_x2_r))
	const pubg_x3 = calc_sens_pubg(pubg_fov / 3)
	set_text_if_changed(pubg_x3_el, round(pubg_x3))
	const pubg_x3_r = calc_sens_pubg_recoil(pubg_fov / 3)
	set_text_if_changed(pubg_x3_r_el, round(pubg_x3_r))
	const pubg_x4 = calc_sens_pubg(pubg_fov / 4)
	set_text_if_changed(pubg_x4_el, round(pubg_x4))
	const pubg_x6 = calc_sens_pubg(pubg_fov / 6)
	set_text_if_changed(pubg_x6_el, round(pubg_x6))
	const pubg_x8 = calc_sens_pubg(pubg_fov / 8)
	set_text_if_changed(pubg_x8_el, round(pubg_x8))
	const pubg_x15 = calc_sens_pubg(pubg_fov / 15)
	set_text_if_changed(pubg_x15_el, round(pubg_x15))
	const ow_hipfire = calc_sens_ow(base_hfov)
	set_text_if_changed(
		ow_hipfire_el,
		round_to(ow_hipfire, 2)
	)
	const widow = calc_sens_ow(
		convert_deg_across_aspect(30, height, width)
	)
	set_text_if_changed(
		ow_widow_el,
		round_to(widow / ow_hipfire * 100, 2)
	)
	const ashe = calc_sens_ow(
		convert_deg_across_aspect(40, height, width)
	)
	set_text_if_changed(
		ow_ashe_el,
		round_to(ashe / ow_hipfire * 100, 2)
	)
	const freja = calc_sens_ow(76)
	set_text_if_changed(
		ow_freja_el,
		round_to(freja / ow_hipfire * 100, 2)
	)
	const mc_hipfire = calc_sens_mc(110)
	set_text_if_changed(mc_hipfire_el, round(mc_hipfire))
	const sa_hipfire = calc_sens_sa()
	set_text_if_changed(sa_hipfire_el, round(sa_hipfire))
}
/** @returns {void} */
export function update_hud() {
	const { mode } = state.game
	const { now_ms, prev_ms, start_ms } = state.timer
	if (!mode) throw Error()
	game_mode[mode].update_hud()
	const fps = 1000 / (now_ms - prev_ms)
	set_text_if_changed(
		timer_el,
		`${round(fps == Infinity ? 0 : fps)} / ${format_duration_ms(now_ms - start_ms)}`
	)
}
/**
 * @param {number} base_hfov
 * @param {number} zoom
 * @returns {number}
 */
function val_zoom_hfov(base_hfov, zoom) {
	const half_rad = to_rad(base_hfov / 2)
	const zoom_rad = 2 * atan(tan(half_rad) / zoom)
	return to_deg(zoom_rad)
}