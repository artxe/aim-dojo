import { calc_pubg_converted } from "../calc/calc_pubg.js"
import {
	calc_sens_pubg,
	lol_sens_to_dpi_scale
} from "../calc/calc_sens.js"
import {
	al_edpi_el,
	al_el,
	al_hipfire_el,
	al_x1_el,
	al_x10_el,
	al_x2_el,
	al_x3_el,
	al_x4_el,
	al_x6_el,
	al_x8_el,
	cs2_aug_el,
	cs2_auto1_el,
	cs2_auto2_el,
	cs2_awp1_el,
	cs2_awp2_el,
	cs2_edpi_el,
	cs2_el,
	cs2_hipfire_el,
	dpi_norm_sens_input,
	dpi_x_input,
	dpi_y_el,
	fn_edpi_el,
	fn_el,
	fn_hipfire_el,
	fn_scope_el,
	fn_targeting_el,
	lol_edpi_el,
	lol_el,
	lol_sens_input,
	lol_win10_el,
	lol_win11_el,
	mc_el,
	mc_file_el,
	mc_hipfire_el,
	monitor_res_btn,
	ow_ashe_el,
	ow_edpi_el,
	ow_el,
	ow_emre_el,
	ow_freja_el,
	ow_hipfire_el,
	ow_widow_el,
	pubg_ads_el,
	pubg_el,
	pubg_file_el,
	pubg_hipfire_el,
	pubg_x15_el,
	pubg_x2_el,
	pubg_x3_el,
	pubg_x4_el,
	pubg_x6_el,
	pubg_x8_el,
	r6_edpi_el,
	r6_el,
	r6_hipfire_el,
	r6_x1_el,
	r6_x12_el,
	r6_x2_5_el,
	r6_x3_5_el,
	r6_x5_el,
	sa_el,
	sa_hipfire_el,
	send_toast,
	set_text_if_changed,
	val_ads_el,
	val_edpi_el,
	val_el,
	val_guardian_el,
	val_hipfire_el,
	val_marshal_el,
	val_operator25_el,
	val_operator5_el,
	val_scoped_el,
	val_spectre_el,
	val_vandal_el
} from "./dom.js"
import { abs, EPS, round_to } from "../math.js"
import state from "../state.js"
import { post_calc_worker_message } from "../worker/manager.js"
import { update_dpi_norm_result } from "./dpi_norm.js"
import constants from "../constants.js"
const FILE_NAME = "GameUserSettings.ini"
const win10_sens_points = [
	{ multiplier: 1 / 32, sens: 1 },
	{ multiplier: 1 / 16, sens: 2 },
	{ multiplier: 2 / 8, sens: 3 },
	{ multiplier: 4 / 8, sens: 4 },
	{ multiplier: 6 / 8, sens: 5 },
	{ multiplier: 1, sens: 6 },
	{ multiplier: 1.5, sens: 7 },
	{ multiplier: 2, sens: 8 },
	{ multiplier: 2.5, sens: 9 },
	{ multiplier: 3, sens: 10 },
	{ multiplier: 3.5, sens: 11 }
]
const win11_sens_points = [
	{ multiplier: 1 / 32, sens: 1 },
	{ multiplier: 1 / 16, sens: 2 },
	{ multiplier: 1 / 8, sens: 3 },
	{ multiplier: 2 / 8, sens: 4 },
	{ multiplier: 3 / 8, sens: 5 },
	{ multiplier: 4 / 8, sens: 6 },
	{ multiplier: 5 / 8, sens: 7 },
	{ multiplier: 6 / 8, sens: 8 },
	{ multiplier: 7 / 8, sens: 9 },
	{ multiplier: 1, sens: 10 },
	{ multiplier: 1.25, sens: 11 },
	{ multiplier: 1.5, sens: 12 },
	{ multiplier: 1.75, sens: 13 },
	{ multiplier: 2, sens: 14 },
	{ multiplier: 2.25, sens: 15 },
	{ multiplier: 2.5, sens: 16 },
	{ multiplier: 2.75, sens: 17 },
	{ multiplier: 3, sens: 18 },
	{ multiplier: 3.25, sens: 19 },
	{ multiplier: 3.5, sens: 20 }
]
{
	al_el.addEventListener(
		"mouseup",
		() => change_active_game_sens("al")
	)
	cs2_el.addEventListener(
		"mouseup",
		() => change_active_game_sens("cs2")
	)
	dpi_x_input.addEventListener("change", on_change_dpi_x)
	fn_el.addEventListener(
		"mouseup",
		() => change_active_game_sens("fn")
	)
	lol_el.addEventListener(
		"mouseup",
		() => change_active_game_sens("lol")
	)
	lol_sens_input.addEventListener("change", on_change_lol_sens)
	mc_el.addEventListener(
		"mouseup",
		() => change_active_game_sens("mc")
	)
	mc_file_el.addEventListener("click", on_click_mc_file)
	mc_file_el.addEventListener("drop", on_drop_mc_file)
	monitor_res_btn.addEventListener("change", on_change_monitor_res)
	ow_el.addEventListener(
		"mouseup",
		() => change_active_game_sens("ow")
	)
	pubg_el.addEventListener(
		"mouseup",
		() => change_active_game_sens("pubg")
	)
	pubg_file_el.addEventListener("click", on_click_pubg_file)
	pubg_file_el.addEventListener("drop", on_drop_pubg_file)
	r6_el.addEventListener(
		"mouseup",
		() => change_active_game_sens("r6")
	)
	sa_el.addEventListener(
		"mouseup",
		() => change_active_game_sens("sa")
	)
	val_el.addEventListener(
		"mouseup",
		() => change_active_game_sens("val")
	)
}
/** @returns {void} */
function active_game_sens() {
	const { sens } = state.game
	if (sens == "al") {
		al_el.setAttribute("active", "")
	} else if (sens == "cs2") {
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
	} else if (sens == "r6") {
		r6_el.setAttribute("active", "")
	} else if (sens == "sa") {
		sa_el.setAttribute("active", "")
	} else if (sens == "val") {
		val_el.setAttribute("active", "")
	} else {
		throw Error(sens)
	}
}
/**
 * @param {GameSensName} name
 * @returns {void}
 */
function change_active_game_sens(name) {
	const { sens } = state.game
	if (name == sens) {
		return
	}
	localStorage.setItem(
		"game.sens",
		state.game.sens = name
	)
	if (sens == "al") {
		al_el.removeAttribute("active")
	} else if (sens == "cs2") {
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
	} else if (sens == "r6") {
		r6_el.removeAttribute("active")
	} else if (sens == "sa") {
		sa_el.removeAttribute("active")
	} else if (sens == "val") {
		val_el.removeAttribute("active")
	} else {
		throw Error(sens)
	}
	active_game_sens()
}
/** @returns {{ x: number, y: number }} */
function current_dpi() {
	const { y_ratio } = constants.dpi
	const { width } = state.game
	const { x } = state.dpi
	const scale = width / 1_920
	return {
		x: x * scale,
		y: x * scale * y_ratio | 0
	}
}
/**
 * @param {File | undefined} file
 * @returns {Promise<void>}
 */
async function download_updated_mc_file(file) {
	if (file?.name != "options.txt") {
		return
	}
	const hipfire = parseFloat(mc_hipfire_el.textContent)
	if (!hipfire || Number.isNaN(hipfire)) {
		return send_toast("No mc_hipfire value", 2_000)
	}
	const file_text = await file.text()
	const replaced_text = file_text.replace(
		/(?<=mouseSensitivity:)\d+\.?\d*/,
		String(hipfire)
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
		a.download = "options.txt"
		document.body.appendChild(a)
		a.click()
		a.remove()
		URL.revokeObjectURL(url)
	}
}
/**
 * @param {File} [file]
 * @returns {Promise<void>}
 */
async function download_updated_pubg_file(file) {
	if (file?.name != FILE_NAME) {
		return
	}
	const { dpi_scale, width } = state.game
	const calc_width = width / dpi_scale
	const fov = 80
	const hipfire = calc_sens_pubg(fov, calc_width)
	const ads = hipfire
	const x2 = calc_sens_pubg(fov / 2, calc_width)
	const x3 = calc_sens_pubg(fov / 3, calc_width)
	const x4 = calc_sens_pubg(fov / 4, calc_width)
	const x6 = calc_sens_pubg(fov / 6, calc_width)
	const x8 = calc_sens_pubg(fov / 8, calc_width)
	const x15 = calc_sens_pubg(fov / 15, calc_width)
	const file_text = await file.text()
	const replaced_text = file_text
		.replace(
			/SensitiveMap=\(\)|SensitiveMap=\(\(Mouse, ?\(Array=\((?:\([^()]*\),?)*\)\)\)\)/,
			[
				// eslint-disable-next-line max-len
				`SensitiveMap=((Mouse,(Array=((SensitiveName="Normal",Sensitivity=${hipfire.toFixed(6)},LastConvertedSensitivity=${calc_pubg_converted(hipfire).toFixed(6)})`,
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
				`(SensitiveName="Scope15X",Sensitivity=${x15.toFixed(6)},LastConvertedSensitivity=${calc_pubg_converted(x15).toFixed(6)})))))`
			].join(",")
		)
		.replace(
			/(?<=[,\n]FpsCameraFov=)\d+\.\d+/g,
			"103.000000"
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
		a.download = FILE_NAME
		document.body.appendChild(a)
		a.click()
		a.remove()
		URL.revokeObjectURL(url)
	}
}
/**
 * @param {number} dpi_scale
 * @param {{ multiplier: number, sens: number }[]} points
 * @returns {string}
 */
function format_win_sens(dpi_scale, points) {
	for (let i = 0; i < points.length; i++) {
		const { multiplier, sens } = points[i]
		if (abs(dpi_scale - multiplier) < EPS) {
			return String(sens)
		}
		if (dpi_scale < multiplier) {
			if (i == 0) {
				return `<${sens}`
			}
			return `${points[i - 1].sens}-${sens}`
		}
	}
	return `>${points.at(-1)?.sens}`
}
/** @returns {void} */
export function init_game_sens() {
	active_game_sens()
	update_dpi_inputs()
	post_update_game_sens()
}
/** @returns {void} */
function on_change_dpi_x() {
	const { width } = state.game
	const value = Number(dpi_x_input.value)
	if (!value) {
		update_dpi_inputs()
		return
	}
	localStorage.setItem(
		"dpi.x",
		String(
			state.dpi.x = value * 1_920 / width
		)
	)
	update_dpi_inputs()
	update_dpi_norm_result()
	post_update_game_sens()
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_lol_sens(ev) {
	const target = /** @type {HTMLInputElement} */(ev.currentTarget)/**/
	const sens = Number(target.value)
	localStorage.setItem(
		"game.lol_sens",
		String(state.game.lol_sens = sens)
	)
	if (state.dpi_norm.game == "lol") {
		dpi_norm_sens_input.value = target.value
		localStorage.setItem(
			"dpi_norm.sens",
			String(state.dpi_norm.sens = sens)
		)
		update_dpi_norm_result()
	}
	state.game.dpi_scale = lol_sens_to_dpi_scale(sens)
	post_update_game_sens()
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_mc_file(ev) {
	const input = /** @type {HTMLInputElement} */(ev.target)/**/
	download_updated_mc_file(input.files?.[0])
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_monitor_res(ev) {
	const { dpi_scale } = state.game
	const target = /** @type {HTMLButtonElement} */(ev.currentTarget)/**/
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
	update_dpi_inputs()
	update_dpi_norm_result()
	state.game.dpi_scale = dpi_scale
	post_update_game_sens()
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_pubg_file(ev) {
	const input = /** @type {HTMLInputElement} */(ev.target)/**/
	download_updated_pubg_file(input.files?.[0])
}
/** @returns {Promise<void>} */
async function on_click_mc_file() {
	const text = "%AppData%\\.minecraft\\"
	navigator.clipboard.writeText(text)
	send_toast(`Copied!\n${text}`, 1_500)
	const input = document.createElement("input")
	input.type = "file"
	input.accept = ".txt"
	input.click()
	input.addEventListener("change", on_change_mc_file)
}
/** @returns {Promise<void>} */
async function on_click_pubg_file() {
	const text = "%LocalAppData%\\TslGame\\Saved\\Config\\WindowsNoEditor\\"
	navigator.clipboard.writeText(text)
	send_toast(`Copied!\n${text}`, 1_500)
	const input = document.createElement("input")
	input.type = "file"
	input.accept = ".ini"
	input.click()
	input.addEventListener("change", on_change_pubg_file)
}
/**
 * @param {DragEvent} ev
 * @returns {Promise<void>}
 */
async function on_drop_mc_file(ev) {
	ev.preventDefault()
	download_updated_mc_file(ev.dataTransfer?.files[0])
}
/**
 * @param {DragEvent} ev
 * @returns {Promise<void>}
 */
async function on_drop_pubg_file(ev) {
	ev.preventDefault()
	download_updated_pubg_file(ev.dataTransfer?.files[0])
}
/** @returns {void} */
function post_update_game_sens() {
	const { dpi_scale, height, width } = state.game
	post_calc_worker_message(
		{
			dpi_scale,
			fn: "update_game_sens",
			height,
			width
		}
	)
}
/** @returns {void} */
function update_dpi_inputs() {
	const { x, y } = current_dpi()
	dpi_x_input.value = String(round_to(x, 2))
	dpi_y_el.textContent = String(y)
}
/**
 * @param {number} al_hipfire
 * @param {number} al_x1
 * @param {number} al_x2
 * @param {number} al_x3
 * @param {number} al_x4
 * @param {number} al_x6
 * @param {number} al_x8
 * @param {number} al_x10
 * @param {number} cs2_hipfire
 * @param {number} cs2_45
 * @param {number} cs2_40
 * @param {number} cs2_15
 * @param {number} cs2_10
 * @param {number} fn_hipfire
 * @param {number} fn_targeting
 * @param {number} fn_scope
 * @param {number} mc_hipfire
 * @param {number} ow_hipfire
 * @param {number} widow
 * @param {number} ashe
 * @param {number} freja
 * @param {number} emre
 * @param {number} pubg_hipfire
 * @param {number} pubg_ads
 * @param {number} pubg_x2
 * @param {number} pubg_x3
 * @param {number} pubg_x4
 * @param {number} pubg_x6
 * @param {number} pubg_x8
 * @param {number} pubg_x15
 * @param {number} r6_hipfire
 * @param {number} r6_x1
 * @param {number} r6_x2_5
 * @param {number} r6_x3_5
 * @param {number} r6_x5
 * @param {number} r6_x12
 * @param {number} sa_hipfire
 * @param {number} val_hipfire
 * @param {number} spectre
 * @param {number} vandal
 * @param {number} guardian
 * @param {number} marshal
 * @param {number} operator25
 * @param {number} operator5
 * @returns {void}
 */
export function update_game_sens(
	al_hipfire,
	al_x1,
	al_x2,
	al_x3,
	al_x4,
	al_x6,
	al_x8,
	al_x10,
	cs2_hipfire,
	cs2_45,
	cs2_40,
	cs2_15,
	cs2_10,
	fn_hipfire,
	fn_targeting,
	fn_scope,
	mc_hipfire,
	ow_hipfire,
	widow,
	ashe,
	freja,
	emre,
	pubg_hipfire,
	pubg_ads,
	pubg_x2,
	pubg_x3,
	pubg_x4,
	pubg_x6,
	pubg_x8,
	pubg_x15,
	r6_hipfire,
	r6_x1,
	r6_x2_5,
	r6_x3_5,
	r6_x5,
	r6_x12,
	sa_hipfire,
	val_hipfire,
	spectre,
	vandal,
	guardian,
	marshal,
	operator25,
	operator5
) {
	const { dpi_scale } = state.game
	const { x, y } = current_dpi()
	set_text_if_changed(al_hipfire_el, al_hipfire)
	set_text_if_changed(
		al_edpi_el,
		round_to(al_hipfire * x, 2)
	)
	set_text_if_changed(al_x1_el, al_x1)
	set_text_if_changed(al_x2_el, al_x2)
	set_text_if_changed(al_x3_el, al_x3)
	set_text_if_changed(al_x4_el, al_x4)
	set_text_if_changed(al_x6_el, al_x6)
	set_text_if_changed(al_x8_el, al_x8)
	set_text_if_changed(al_x10_el, al_x10)
	set_text_if_changed(cs2_hipfire_el, cs2_hipfire)
	set_text_if_changed(
		cs2_edpi_el,
		round_to(cs2_hipfire * x, 2)
	)
	set_text_if_changed(cs2_aug_el, cs2_45)
	set_text_if_changed(cs2_auto1_el, cs2_40)
	set_text_if_changed(cs2_auto2_el, cs2_15)
	set_text_if_changed(cs2_awp1_el, cs2_40)
	set_text_if_changed(cs2_awp2_el, cs2_10)
	set_text_if_changed(fn_hipfire_el, fn_hipfire)
	set_text_if_changed(
		fn_edpi_el,
		round_to(fn_hipfire * x, 2)
	)
	set_text_if_changed(fn_targeting_el, fn_targeting)
	set_text_if_changed(fn_scope_el, fn_scope)
	set_text_if_changed(
		lol_edpi_el,
		`${round_to(x * dpi_scale, 2)}, ${round_to(y * dpi_scale, 2)}`
	)
	set_text_if_changed(
		lol_win10_el,
		format_win_sens(dpi_scale, win10_sens_points)
	)
	set_text_if_changed(
		lol_win11_el,
		format_win_sens(dpi_scale, win11_sens_points)
	)
	set_text_if_changed(mc_hipfire_el, mc_hipfire)
	set_text_if_changed(ow_hipfire_el, ow_hipfire)
	set_text_if_changed(
		ow_edpi_el,
		`${round_to(ow_hipfire * x, 2)}, ${round_to(ow_hipfire * y, 2)}`
	)
	set_text_if_changed(ow_widow_el, widow)
	set_text_if_changed(ow_ashe_el, ashe)
	set_text_if_changed(ow_freja_el, freja)
	set_text_if_changed(ow_emre_el, emre)
	set_text_if_changed(
		pubg_hipfire_el,
		`${round_to(pubg_hipfire, 6)}, ${round_to(calc_pubg_converted(pubg_hipfire), 6)}`
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
	set_text_if_changed(r6_hipfire_el, r6_hipfire)
	set_text_if_changed(
		r6_edpi_el,
		round_to(r6_hipfire * x, 2)
	)
	set_text_if_changed(r6_x1_el, r6_x1)
	set_text_if_changed(r6_x2_5_el, r6_x2_5)
	set_text_if_changed(r6_x3_5_el, r6_x3_5)
	set_text_if_changed(r6_x5_el, r6_x5)
	set_text_if_changed(r6_x12_el, r6_x12)
	set_text_if_changed(sa_hipfire_el, sa_hipfire)
	set_text_if_changed(val_hipfire_el, val_hipfire)
	set_text_if_changed(
		val_edpi_el,
		round_to(val_hipfire * x, 2)
	)
	set_text_if_changed(val_scoped_el, operator25)
	set_text_if_changed(val_ads_el, vandal)
	set_text_if_changed(val_spectre_el, spectre)
	set_text_if_changed(val_vandal_el, vandal)
	set_text_if_changed(val_guardian_el, guardian)
	set_text_if_changed(val_marshal_el, marshal)
	set_text_if_changed(val_operator25_el, operator25)
	set_text_if_changed(val_operator5_el, operator5)
}