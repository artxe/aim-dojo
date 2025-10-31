import {
	cs2_aug_el,
	cs2_auto1_el,
	cs2_auto2_el,
	cs2_awp1_el,
	cs2_awp2_el,
	cs2_el,
	cs2_hipfire_el,
	fn_ads_el,
	fn_el,
	fn_hipfire_el,
	lol_el,
	mc_el,
	mc_hipfire_el,
	monitor_res_btn,
	ow_ashe_el,
	ow_el,
	ow_freja_el,
	ow_hipfire_el,
	ow_widow_el,
	pubg_ads_el,
	pubg_el,
	pubg_fpp_el,
	pubg_hipfire_el,
	pubg_x2_el,
	pubg_x3_el,
	pubg_x4_el,
	pubg_x6_el,
	pubg_x8_el,
	pubg_x15_el,
	sa_el,
	sa_hipfire_el,
	mdm_input,
	val_el,
	val_guardian_el,
	val_hipfire_el,
	val_marshal_el,
	val_operator5_el,
	val_operator25_el,
	val_spectre_el,
	val_vandal_el,
	fn_ar_el,
	fn_sr_el
} from "../document.js"
import { update_fov } from "../logic.js"
import {
	convert_deg_across_aspect,
	round,
	round_to
} from "../math.js"
import {
	calc_pubg_converted,
	calc_pubg_fpp_fov,
	calc_sens_cs2,
	calc_sens_fn,
	calc_sens_mc,
	calc_sens_ow,
	calc_sens_pubg,
	calc_sens_sa,
	calc_sens_val
} from "../sens.js"
import state from "../state.js"
import { update_dpi_norm_result } from "./dpi_norm.js"
import { set_text_if_changed } from "./index.js"
monitor_res_btn.addEventListener(
	"change",
	function(ev) {
		const target = /** @type {HTMLButtonElement} */(ev.target)/**/
		const type = /** @type {MonitorResolution} */(target.value)/**/
		if (type == "fhd") {
			state.game.height = 1_080
			state.game.width = 1_920
		} else if (type == "hd") {
			state.game.height = 720
			state.game.width = 1_280
		} else if (type == "qhd") {
			state.game.height = 1_440
			state.game.width = 2_560
		} else {
			throw Error(type)
		}
		localStorage.setItem(
			"game.resolution",
			state.game.resolution = type
		)
		update_game_sens()
		update_dpi_norm_result()
	}
)
mdm_input.addEventListener(
	"input",
	function(ev) {
		const target = /** @type {HTMLInputElement} */(ev.target)/**/
		localStorage.setItem("game.mdm", target.value)
		state.game.mdm = Number(target.value)
		update_game_sens()
		update_dpi_norm_result()
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
/** @returns {void} */
export function active_game_sens() {
	const { sens } = state.game
	if (sens == "cs2") {
		cs2_el.setAttribute("active", "")
	} else if (sens == "fn") {
		fn_el.setAttribute("active", "")
	} else if (sens == "lol") {
		lol_el.setAttribute("active", "")
	} else if (sens == "mc") {
		mc_el.setAttribute("active", "")
	} else if (sens == "ow") {
		ow_el.setAttribute("active", "")
	} else if (sens == "pubg") {
		pubg_el.setAttribute("active", "")
	} else if (sens == "sa") {
		sa_el.setAttribute("active", "")
	} else if (sens == "val") {
		val_el.setAttribute("active", "")
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
	if (sens == "cs2") {
		cs2_el.removeAttribute("active")
	} else if (sens == "fn") {
		fn_el.removeAttribute("active")
	} else if (sens == "lol") {
		lol_el.removeAttribute("active")
	} else if (sens == "mc") {
		mc_el.removeAttribute("active")
	} else if (sens == "ow") {
		ow_el.removeAttribute("active")
	} else if (sens == "pubg") {
		pubg_el.removeAttribute("active")
	} else if (sens == "sa") {
		sa_el.removeAttribute("active")
	} else if (sens == "val") {
		val_el.removeAttribute("active")
	} else {
		throw Error(sens)
	}
	active_game_sens()
}
/** @returns {void} */
export function cycle_active_game_sens() {
	const { sens } = state.game
	if (sens == "cs2") {
		change_active_game_sens("pubg")
	} else if (sens == "fn") {
		change_active_game_sens("cs2")
	} else if (sens == "lol") {
		change_active_game_sens("val")
	} else if (sens == "mc") {
		change_active_game_sens("fn")
	} else if (sens == "ow") {
		change_active_game_sens("sa")
	} else if (sens == "pubg") {
		change_active_game_sens("ow")
	} else if (sens == "sa") {
		change_active_game_sens("lol")
	} else if (sens == "val") {
		change_active_game_sens("mc")
	} else {
		throw Error(sens)
	}
}
/** @returns {void} */
export function update_game_sens() {
	const { height, width } = state.game
	const base_hfov = 103
	const val_hipfire = round_to(calc_sens_val(base_hfov), 3)
	set_text_if_changed(val_hipfire_el, val_hipfire)
	let zoom_fov = convert_deg_across_aspect(base_hfov, 1.15, 1)
	const spectre = calc_sens_val(zoom_fov)
	set_text_if_changed(
		val_spectre_el,
		round_to(spectre / val_hipfire, 3)
	)
	zoom_fov = convert_deg_across_aspect(base_hfov, 1.25, 1)
	const vandal = calc_sens_val(zoom_fov)
	set_text_if_changed(
		val_vandal_el,
		round_to(vandal / val_hipfire, 3)
	)
	zoom_fov = convert_deg_across_aspect(base_hfov, 1.5, 1)
	const guardian = calc_sens_val(zoom_fov)
	set_text_if_changed(
		val_guardian_el,
		round_to(guardian / val_hipfire, 3)
	)
	zoom_fov = convert_deg_across_aspect(base_hfov, 3.5, 1)
	const marshal = calc_sens_val(zoom_fov)
	set_text_if_changed(
		val_marshal_el,
		round_to(marshal / val_hipfire, 3)
	)
	zoom_fov = convert_deg_across_aspect(base_hfov, 2.5, 1)
	const operator25 = calc_sens_val(zoom_fov)
	set_text_if_changed(
		val_operator25_el,
		round_to(operator25 / val_hipfire, 3)
	)
	zoom_fov = convert_deg_across_aspect(base_hfov, 5, 1)
	const operator5 = calc_sens_val(zoom_fov)
	set_text_if_changed(
		val_operator5_el,
		round_to(operator5 / val_hipfire, 3)
	)
	const mc_hipfire = calc_sens_mc(110)
	set_text_if_changed(mc_hipfire_el, round(mc_hipfire))
	const fn_hipfire = round_to(calc_sens_fn(80, width * .87), 1)
	set_text_if_changed(fn_hipfire_el, fn_hipfire)
	const fn_ads = calc_sens_fn(80)
	set_text_if_changed(
		fn_ads_el,
		round_to(fn_ads / fn_hipfire * 100, 1)
	)
	const fn_ar = calc_sens_fn(40)
	set_text_if_changed(
		fn_ar_el,
		round_to(fn_ar / fn_hipfire * 100, 1)
	)
	const fn_sr = calc_sens_fn(15)
	set_text_if_changed(
		fn_sr_el,
		round_to(fn_sr / fn_hipfire * 100, 1)
	)
	const cs2_hipfire = round_to(calc_sens_cs2(90), 2)
	const cs2_45 = calc_sens_cs2(45)
	const cs2_40 = calc_sens_cs2(40)
	const cs2_15 = calc_sens_cs2(15)
	const cs2_10 = calc_sens_cs2(10)
	set_text_if_changed(cs2_hipfire_el, cs2_hipfire)
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
	const pubg_hipfire = calc_sens_pubg(pubg_fov, width * .87)
	set_text_if_changed(
		pubg_hipfire_el,
		`${round_to(pubg_hipfire, 6)}, ${round_to(calc_pubg_converted(pubg_hipfire), 6)}`
	)
	const pubg_fpp_fov = calc_pubg_fpp_fov(pubg_hipfire)
	set_text_if_changed(pubg_fpp_el, pubg_fpp_fov)
	const pubg_ads = calc_sens_pubg(pubg_fov)
	set_text_if_changed(
		pubg_ads_el,
		`${round_to(pubg_ads, 6)}, ${round_to(calc_pubg_converted(pubg_ads), 6)}`
	)
	const pubg_x2 = calc_sens_pubg(pubg_fov / 2)
	set_text_if_changed(
		pubg_x2_el,
		`${round_to(pubg_x2, 6)}, ${round_to(calc_pubg_converted(pubg_x2), 6)}`
	)
	const pubg_x3 = calc_sens_pubg(pubg_fov / 3)
	set_text_if_changed(
		pubg_x3_el,
		`${round_to(pubg_x3, 6)}, ${round_to(calc_pubg_converted(pubg_x3), 6)}`
	)
	const pubg_x4 = calc_sens_pubg(pubg_fov / 4)
	set_text_if_changed(
		pubg_x4_el,
		`${round_to(pubg_x4, 6)}, ${round_to(calc_pubg_converted(pubg_x4), 6)}`
	)
	const pubg_x6 = calc_sens_pubg(pubg_fov / 6)
	set_text_if_changed(
		pubg_x6_el,
		`${round_to(pubg_x6, 6)}, ${round_to(calc_pubg_converted(pubg_x6), 6)}`
	)
	const pubg_x8 = calc_sens_pubg(pubg_fov / 8)
	set_text_if_changed(
		pubg_x8_el,
		`${round_to(pubg_x8, 6)}, ${round_to(calc_pubg_converted(pubg_x8), 6)}`
	)
	const pubg_x15 = calc_sens_pubg(pubg_fov / 15)
	set_text_if_changed(
		pubg_x15_el,
		`${round_to(pubg_x15, 6)}, ${round_to(calc_pubg_converted(pubg_x15), 6)}`
	)
	const ow_hipfire = round_to(calc_sens_ow(base_hfov), 2)
	set_text_if_changed(ow_hipfire_el, ow_hipfire)
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
	const sa_hipfire = calc_sens_sa()
	set_text_if_changed(sa_hipfire_el, round(sa_hipfire))
}