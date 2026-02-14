import {
	cs2_aug_el,
	cs2_auto1_el,
	cs2_auto2_el,
	cs2_awp1_el,
	cs2_awp2_el,
	cs2_el,
	cs2_hipfire_el,
	fn_ads_el,
	fn_ar_el,
	fn_el,
	fn_hipfire_el,
	fn_sr_el,
	lol_el,
	mc_el,
	mc_hipfire_el,
	monitor_res_btn,
	ow_ashe_el,
	ow_el,
	ow_emre_el,
	ow_freja_el,
	ow_hipfire_el,
	ow_widow_el,
	pubg_ads_el,
	pubg_el,
	pubg_file_el,
	pubg_fpp_el,
	pubg_hipfire_el,
	pubg_x15_el,
	pubg_x2_el,
	pubg_x3_el,
	pubg_x4_el,
	pubg_x6_el,
	pubg_x8_el,
	sa_el,
	sa_hipfire_el,
	val_el,
	val_guardian_el,
	val_hipfire_el,
	val_marshal_el,
	val_operator25_el,
	val_operator5_el,
	val_spectre_el,
	val_vandal_el
} from "../document.js"
import { update_fov } from "../logic.js"
import { round, round_to } from "../math.js"
import {
	calc_pubg_converted,
	calc_pubg_fpp_fov,
	calc_sens_pubg
} from "../sens/index.js"
import state from "../state.js"
import { post_worker_message } from "../worker_manager.js"
import { update_dpi_norm_result } from "./dpi_norm.js"
import { send_toast, set_text_if_changed } from "./index.js"
monitor_res_btn.addEventListener(
	"change",
	function(ev) {
		const target = /** @type {HTMLButtonElement} */(ev.target)/**/
		const type = /** @type {MonitorResolution} */(target.value)/**/
		let height
		let width
		if (type == "fhd") {
			height = state.game.height = 1_080
			width = state.game.width = 1_920
		} else if (type == "hd") {
			height = state.game.height = 720
			width = state.game.width = 1_280
		} else if (type == "qhd") {
			height = state.game.height = 1_440
			width = state.game.width = 2_560
		} else {
			throw Error(type)
		}
		localStorage.setItem(
			"game.resolution",
			state.game.resolution = type
		)
		update_dpi_norm_result()
		post_worker_message(
			{
				fn: "update_game_sens",
				height,
				width
			}
		)
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
pubg_file_el.addEventListener("drop", on_drop_pubg_file)
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
	if (name == sens) {
		return
	}
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
/**
 * @param {DragEvent} ev
 * @returns {Promise<void>}
 */
async function on_drop_pubg_file(ev) {
	ev.preventDefault()
	const file_name = "GameUserSettings.ini"
	const file = ev.dataTransfer?.files[0]
	if (file?.name != file_name) {
		return
	}
	const { width } = state.game
	const fov = 80
	const hipfire = calc_sens_pubg(fov, width)
	const ads = hipfire
	const x2 = calc_sens_pubg(fov / 2, width)
	const x3 = calc_sens_pubg(fov / 3, width)
	const x4 = calc_sens_pubg(fov / 4, width)
	const x6 = calc_sens_pubg(fov / 6, width)
	const x8 = calc_sens_pubg(fov / 8, width)
	const x15 = calc_sens_pubg(fov / 15, width)
	const fpp_fov = calc_pubg_fpp_fov(hipfire, width)
	const file_text = await file.text()
	const replaced_text = file_text
		.replace(
			/(?<=SensitiveMap=\(\(Mouse, \(Array=\()(\([^()]*\),?)*/,
			[
				// eslint-disable-next-line max-len
				`(SensitiveName="Normal",Sensitivity=${hipfire.toFixed(6)},LastConvertedSensitivity=${calc_pubg_converted(hipfire).toFixed(6)})`,
				// eslint-disable-next-line max-len
				`(SensitiveName="Targeting",Sensitivity=${ads.toFixed(6)},LastConvertedSensitivity=${calc_pubg_converted(ads).toFixed(6)})`,
				// eslint-disable-next-line max-len
				`(SensitiveName="Scoping",Sensitivity=${ads.toFixed(6)},LastConvertedSensitivity=${calc_pubg_converted(ads).toFixed(6)})`,
				// eslint-disable-next-line max-len
				`(SensitiveName="Scope2X",Sensitivity=${x2.toFixed(6)},LastConvertedSensitivity=${calc_pubg_converted(x2).toFixed(6)})`,
				// eslint-disable-next-line max-len
				`(SensitiveName="Scope3X",Sensitivity=${x3.toFixed(6)},LastConvertedSensitivity=${calc_pubg_converted(x3).toFixed(6)})`,
				// eslint-disable-next-line max-len
				`(SensitiveName="Scope4X",Sensitivity=${x4.toFixed(6)},LastConvertedSensitivity=${calc_pubg_converted(x4).toFixed(6)})`,
				// eslint-disable-next-line max-len
				`(SensitiveName="Scope6X",Sensitivity=${x6.toFixed(6)},LastConvertedSensitivity=${calc_pubg_converted(x6).toFixed(6)})`,
				// eslint-disable-next-line max-len
				`(SensitiveName="Scope8X",Sensitivity=${x8.toFixed(6)},LastConvertedSensitivity=${calc_pubg_converted(x8).toFixed(6)})`,
				// eslint-disable-next-line max-len
				`(SensitiveName="Scope15X",Sensitivity=${x15.toFixed(6)},LastConvertedSensitivity=${calc_pubg_converted(x15).toFixed(6)})`
			].join(",")
		)
		.replace(
			/(?<=\nFpsCameraFov=)\d+\.\d+/,
			fpp_fov.toFixed(6)
		)
	if (file_text == replaced_text) {
		return send_toast("No changes", 2_000)
	} else {
		const url = URL.createObjectURL(
			new Blob(
				[ replaced_text ],
				{
					type: "text/plain;charset=utf-8"
				}
			)
		)
		const a = document.createElement("a")
		a.href = url
		a.download = file_name
		document.body.appendChild(a)
		a.click()
		a.remove()
		URL.revokeObjectURL(url)
	}
}
/**
 * @param {number} val_hipfire
 * @param {number} spectre
 * @param {number} vandal
 * @param {number} guardian
 * @param {number} marshal
 * @param {number} operator25
 * @param {number} operator5
 * @param {number} mc_hipfire
 * @param {number} fn_hipfire
 * @param {number} fn_ads
 * @param {number} fn_ar
 * @param {number} fn_sr
 * @param {number} cs2_hipfire
 * @param {number} cs2_45
 * @param {number} cs2_40
 * @param {number} cs2_15
 * @param {number} cs2_10
 * @param {number} pubg_hipfire
 * @param {number} pubg_fpp_fov
 * @param {number} pubg_ads
 * @param {number} pubg_x2
 * @param {number} pubg_x3
 * @param {number} pubg_x4
 * @param {number} pubg_x6
 * @param {number} pubg_x8
 * @param {number} pubg_x15
 * @param {number} ow_hipfire
 * @param {number} widow
 * @param {number} ashe
 * @param {number} freja
 * @param {number} emre
 * @param {number} sa_hipfire
 * @returns {void}
 */
export function update_game_sens(
	val_hipfire,
	spectre,
	vandal,
	guardian,
	marshal,
	operator25,
	operator5,
	mc_hipfire,
	fn_hipfire,
	fn_ads,
	fn_ar,
	fn_sr,
	cs2_hipfire,
	cs2_45,
	cs2_40,
	cs2_15,
	cs2_10,
	pubg_hipfire,
	pubg_fpp_fov,
	pubg_ads,
	pubg_x2,
	pubg_x3,
	pubg_x4,
	pubg_x6,
	pubg_x8,
	pubg_x15,
	ow_hipfire,
	widow,
	ashe,
	freja,
	emre,
	sa_hipfire
) {
	set_text_if_changed(val_hipfire_el, val_hipfire)
	set_text_if_changed(val_spectre_el, spectre)
	set_text_if_changed(val_vandal_el, vandal)
	set_text_if_changed(val_guardian_el, guardian)
	set_text_if_changed(val_marshal_el, marshal)
	set_text_if_changed(val_operator25_el, operator25)
	set_text_if_changed(val_operator5_el, operator5)
	set_text_if_changed(mc_hipfire_el, mc_hipfire)
	set_text_if_changed(fn_hipfire_el, fn_hipfire)
	set_text_if_changed(fn_ads_el, fn_ads)
	set_text_if_changed(fn_ar_el, fn_ar)
	set_text_if_changed(fn_sr_el, fn_sr)
	set_text_if_changed(cs2_hipfire_el, cs2_hipfire)
	set_text_if_changed(cs2_aug_el, cs2_45)
	set_text_if_changed(cs2_auto1_el, cs2_40)
	set_text_if_changed(cs2_auto2_el, cs2_15)
	set_text_if_changed(cs2_awp1_el, cs2_40)
	set_text_if_changed(cs2_awp2_el, cs2_10)
	set_text_if_changed(
		pubg_hipfire_el,
		`${round_to(pubg_hipfire, 6)}, ${round_to(calc_pubg_converted(pubg_hipfire), 6)}`
	)
	set_text_if_changed(
		pubg_fpp_el,
		round_to(pubg_fpp_fov, 6)
	)
	set_text_if_changed(
		pubg_ads_el,
		`${round_to(pubg_ads, 6)}, ${round_to(calc_pubg_converted(pubg_ads), 6)}`
	)
	set_text_if_changed(
		pubg_x2_el,
		`${round_to(pubg_x2, 6)}, ${round_to(calc_pubg_converted(pubg_x2), 6)}`
	)
	set_text_if_changed(
		pubg_x3_el,
		`${round_to(pubg_x3, 6)}, ${round_to(calc_pubg_converted(pubg_x3), 6)}`
	)
	set_text_if_changed(
		pubg_x4_el,
		`${round_to(pubg_x4, 6)}, ${round_to(calc_pubg_converted(pubg_x4), 6)}`
	)
	set_text_if_changed(
		pubg_x6_el,
		`${round_to(pubg_x6, 6)}, ${round_to(calc_pubg_converted(pubg_x6), 6)}`
	)
	set_text_if_changed(
		pubg_x8_el,
		`${round_to(pubg_x8, 6)}, ${round_to(calc_pubg_converted(pubg_x8), 6)}`
	)
	set_text_if_changed(
		pubg_x15_el,
		`${round_to(pubg_x15, 6)}, ${round_to(calc_pubg_converted(pubg_x15), 6)}`
	)
	set_text_if_changed(ow_hipfire_el, ow_hipfire)
	set_text_if_changed(ow_widow_el, widow)
	set_text_if_changed(ow_ashe_el, ashe)
	set_text_if_changed(ow_freja_el, freja)
	set_text_if_changed(ow_emre_el, emre)
	set_text_if_changed(sa_hipfire_el, round(sa_hipfire))
}