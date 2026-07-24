import { calc_pubg_converted } from "../calc/calc_pubg.js"
import {
	calc_sens_mc,
	calc_sens_pubg,
	calc_sens_r6_file,
	lol_sens_to_dpi_scale
} from "../calc/calc_sens.js"
import constants from "../constants.js"
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
	bdo_el,
	bdo_hipfire_el,
	bdo_hipfire_exact_el,
	cs2_aug_el,
	cs2_auto1_el,
	cs2_auto2_el,
	cs2_awp1_el,
	cs2_awp2_el,
	cs2_edpi_el,
	cs2_el,
	cs2_hipfire_el,
	dpi_norm_sens_input,
	dpi_x_el,
	dpi_y_el,
	fn_edpi_el,
	fn_el,
	fn_hipfire_el,
	fn_scope_el,
	fn_targeting_el,
	game_sens_list_el,
	lol_edpi_el,
	lol_el,
	lol_sens_input,
	lol_win10_el,
	lol_win11_el,
	mc_el,
	mc_file_el,
	mc_hipfire_el,
	monitor_res_select,
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
	pubg_fov_select,
	pubg_hipfire_el,
	pubg_x15_el,
	pubg_x2_el,
	pubg_x3_el,
	pubg_x4_el,
	pubg_x6_el,
	pubg_x8_el,
	r6_ads_unit_el,
	r6_el,
	r6_file_el,
	r6_hipfire_el,
	r6_x1_el,
	r6_x12_el,
	r6_x1_5_el,
	r6_x2_el,
	r6_x2_5_el,
	r6_x3_el,
	r6_x4_el,
	r6_x5_el,
	sa_el,
	sa_hipfire_el,
	sa_hipfire_exact_el,
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
import { abs, EPS, fround, round_to } from "../math.js"
import state from "../state.js"
import { post_calc_worker_message } from "../worker/manager.js"
import { update_dpi_norm_result } from "./dpi_norm.js"
const MC_FILE_NAME = "options.txt"
const PUBG_FILE_NAME = "GameUserSettings.ini"
const R6_FILE_NAME = "GameSettings.ini"
let active_el = al_el
/**
 * @param {number} value
 * @returns {string}
 */
function format_pubg_float(value) {
	return fround(value).toFixed(6)
}
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
		ev => change_active_game_sens("al", ev)
	)
	bdo_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("bdo", ev)
	)
	cs2_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("cs2", ev)
	)
	fn_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("fn", ev)
	)
	lol_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("lol", ev)
	)
	lol_sens_input.addEventListener("change", on_change_lol_sens)
	mc_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("mc", ev)
	)
	mc_file_el.addEventListener("click", on_click_mc_file)
	mc_file_el.addEventListener("drop", on_drop_mc_file)
	monitor_res_select.addEventListener("change", on_change_monitor_res)
	ow_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("ow", ev)
	)
	pubg_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("pubg", ev)
	)
	pubg_file_el.addEventListener("click", on_click_pubg_file)
	pubg_file_el.addEventListener("drop", on_drop_pubg_file)
	pubg_fov_select.addEventListener("change", on_change_pubg_fov)
	r6_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("r6", ev)
	)
	r6_file_el.addEventListener("click", on_click_r6_file)
	r6_file_el.addEventListener("drop", on_drop_r6_file)
	sa_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("sa", ev)
	)
	val_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("val", ev)
	)
}
/** @returns {void} */
function active_game_sens() {
	const { sens } = state.game
	if (sens == "al") {
		active_el = al_el
	} else if (sens == "bdo") {
		active_el = bdo_el
	} else if (sens == "cs2") {
		active_el = cs2_el
	} else if (sens == "fn") {
		active_el = fn_el
	} else if (sens == "lol") {
		active_el = lol_el
	} else if (sens == "mc") {
		active_el = mc_el
	} else if (sens == "ow") {
		active_el = ow_el
	} else if (sens == "pubg") {
		active_el = pubg_el
	} else if (sens == "r6") {
		active_el = r6_el
	} else if (sens == "sa") {
		active_el = sa_el
	} else if (sens == "val") {
		active_el = val_el
	} else {
		throw Error(sens)
	}
	active_el.setAttribute("active", "")
}
/**
 * @param {GameSensName} name
 * @param {MouseEvent} ev
 * @returns {void}
 */
function change_active_game_sens(name, ev) {
	if (name == state.game.sens) {
		const details = active_el.lastElementChild
		if (details?.contains(
			/** @type {Node} */(ev.target)/**/
		)) {
			return
		}
		game_sens_list_el.toggleAttribute("open")
		return
	}
	active_el.removeAttribute("active")
	localStorage.setItem(
		"game.sens",
		state.game.sens = name
	)
	active_game_sens()
	game_sens_list_el.removeAttribute("open")
}
/** @returns {{ x: number, y: number }} */
function current_dpi() {
	const { width } = state.game
	const { x, y } = constants.dpi
	const scale = width / 1_920
	return { x: x * scale, y: y * scale }
}
/**
 * @param {File | undefined} file
 * @returns {Promise<void>}
 */
async function download_updated_mc_file(file) {
	if (file?.name != MC_FILE_NAME) {
		return send_toast(`Not ${MC_FILE_NAME}`, 2_000)
	}
	const { dpi_scale, height, width } = state.game
	const hipfire = round_to(
		calc_sens_mc(
			width / dpi_scale,
			height / dpi_scale
		),
		16
	)
	if (!hipfire || Number.isNaN(hipfire)) {
		return send_toast("No mc value", 2_000)
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
		a.download = MC_FILE_NAME
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
	if (file?.name != PUBG_FILE_NAME) {
		return send_toast(`Not ${PUBG_FILE_NAME}`, 2_000)
	}
	const { dpi_scale, pubg_fov, width } = state.game
	const calc_width = width / dpi_scale
	const hipfire = calc_sens_pubg(pubg_fov, calc_width)
	const ads = calc_sens_pubg(
		constants.fov.pubg.x1,
		calc_width
	)
	const x2 = calc_sens_pubg(
		constants.fov.pubg.x2,
		calc_width
	)
	const x3 = calc_sens_pubg(
		constants.fov.pubg.x3,
		calc_width
	)
	const x4 = calc_sens_pubg(
		constants.fov.pubg.x4,
		calc_width
	)
	const x6 = calc_sens_pubg(
		constants.fov.pubg.x6,
		calc_width
	)
	const x8 = calc_sens_pubg(
		constants.fov.pubg.x8,
		calc_width
	)
	const x15 = calc_sens_pubg(
		constants.fov.pubg.x15,
		calc_width
	)
	const file_text = await file.text()
	const sensitive_map = [
		// eslint-disable-next-line max-len
		`SensitiveMap=((Mouse, (Array=((SensitiveName="Normal",Sensitivity=${format_pubg_float(hipfire)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(hipfire))})`,
		// eslint-disable-next-line max-len
		`(SensitiveName="Targeting",Sensitivity=${format_pubg_float(ads)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(ads))})`,
		// eslint-disable-next-line max-len
		`(SensitiveName="Scoping",Sensitivity=${format_pubg_float(ads)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(ads))})`,
		// eslint-disable-next-line max-len
		`(SensitiveName="Scope2X",Sensitivity=${format_pubg_float(x2)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(x2))})`,
		// eslint-disable-next-line max-len
		`(SensitiveName="Scope3X",Sensitivity=${format_pubg_float(x3)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(x3))})`,
		// eslint-disable-next-line max-len
		`(SensitiveName="Scope4X",Sensitivity=${format_pubg_float(x4)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(x4))})`,
		// eslint-disable-next-line max-len
		`(SensitiveName="Scope6X",Sensitivity=${format_pubg_float(x6)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(x6))})`,
		// eslint-disable-next-line max-len
		`(SensitiveName="Scope8X",Sensitivity=${format_pubg_float(x8)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(x8))})`,
		// eslint-disable-next-line max-len
		`(SensitiveName="Scope15X",Sensitivity=${format_pubg_float(x15)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(x15))})))))`
	].join(",")
	const replaced_text = file_text
		.replace(
			/SensitiveMap=\(\)|SensitiveMap=\(\(Mouse, ?\(Array=\((?:\([^()]*\),?)*\)\)\)\)/g,
			sensitive_map
		)
		.replace(
			/(?<=,MouseVerticalSensitivityMultiplierAdjusted=)\d+\.\d+/g,
			"1.000000"
		)
		.replace(
			/(?<=[,\n]FpsCameraFov=)\d+\.\d+/g,
			format_pubg_float(pubg_fov)
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
		a.download = PUBG_FILE_NAME
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
async function download_updated_r6_file(file) {
	if (file?.name != R6_FILE_NAME) {
		return send_toast(`Not ${R6_FILE_NAME}`, 2_000)
	}
	const { dpi_scale, height, width } = state.game
	const {
		ads_unit,
		x1,
		x12,
		x1_5,
		x2,
		x2_5,
		x3,
		x4,
		x5,
		yaw,
		yaw_unit
	} = calc_sens_r6_file(
		width / dpi_scale,
		height / dpi_scale
	)
	const file_text = await file.text()
	const replaced_text = file_text
		.replace(
			/(?<=\nDefaultFOV=)\d+\.?\d*/,
			constants.fov.r6.base.toFixed(6)
		)
		.replace(
			/(?<=\nMouseYawSensitivity=)\d+\.?\d*/,
			String(yaw)
		)
		.replace(
			/(?<=\nMousePitchSensitivity=)\d+\.?\d*/,
			String(yaw)
		)
		.replace(
			/(?<=\nMouseSensitivityMultiplierUnit=)\d+\.?\d*/,
			yaw_unit.toFixed(6)
		)
		.replace(
			/(?<=\nADSMouseUseSpecific=)\d+/,
			"1"
		)
		.replace(
			/(?<=\nADSMouseSensitivity1x=)\d+\.?\d*/,
			String(x1)
		)
		.replace(
			/(?<=\nADSMouseSensitivity1xHalf=)\d+\.?\d*/,
			String(x1_5)
		)
		.replace(
			/(?<=\nADSMouseSensitivity2x=)\d+\.?\d*/,
			String(x2)
		)
		.replace(
			/(?<=\nADSMouseSensitivity2xHalf=)\d+\.?\d*/,
			String(x2_5)
		)
		.replace(
			/(?<=\nADSMouseSensitivity3x=)\d+\.?\d*/,
			String(x3)
		)
		.replace(
			/(?<=\nADSMouseSensitivity4x=)\d+\.?\d*/,
			String(x4)
		)
		.replace(
			/(?<=\nADSMouseSensitivity5x=)\d+\.?\d*/,
			String(x5)
		)
		.replace(
			/(?<=\nADSMouseSensitivity12x=)\d+\.?\d*/,
			String(x12)
		)
		.replace(
			/(?<=\nADSMouseMultiplierUnit=)\d+\.?\d*/,
			ads_unit.toFixed(6)
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
		a.download = R6_FILE_NAME
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
	update_dpi_display()
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
 * @returns {void}
 */
function on_change_monitor_res() {
	const { dpi_scale } = state.game
	const type = /** @type {MonitorResolution} */(monitor_res_select.value)/**/
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
	update_dpi_display()
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
/**
 * @returns {void}
 */
function on_change_pubg_fov() {
	const pubg_fov = /** @type {PubgFov} */(Number(pubg_fov_select.value))/**/
	localStorage.setItem(
		"game.pubg_fov",
		String(state.game.pubg_fov = pubg_fov)
	)
	if (state.dpi_norm.game == "pubg") {
		update_dpi_norm_result()
	}
	post_update_game_sens()
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_r6_file(ev) {
	const input = /** @type {HTMLInputElement} */(ev.target)/**/
	download_updated_r6_file(input.files?.[0])
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
/** @returns {Promise<void>} */
async function on_click_r6_file() {
	const text = "shell:Personal\\My Games\\Rainbow Six - Siege\\"
	navigator.clipboard.writeText(text)
	send_toast(`Copied!\n${text}`, 1_500)
	const input = document.createElement("input")
	input.type = "file"
	input.accept = ".ini"
	input.click()
	input.addEventListener("change", on_change_r6_file)
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
/**
 * @param {DragEvent} ev
 * @returns {Promise<void>}
 */
async function on_drop_r6_file(ev) {
	ev.preventDefault()
	download_updated_r6_file(ev.dataTransfer?.files[0])
}
/** @returns {void} */
function post_update_game_sens() {
	const { dpi_scale, height, pubg_fov, width } = state.game
	post_calc_worker_message(
		{
			dpi_scale,
			fn: "update_game_sens",
			height,
			pubg_fov,
			width
		}
	)
}
/** @returns {void} */
function update_dpi_display() {
	const { x, y } = current_dpi()
	dpi_x_el.textContent = String(round_to(x, 2))
	dpi_y_el.textContent = String(round_to(y, 2))
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
 * @param {number} bdo_hipfire
 * @param {number} bdo_hipfire_exact
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
 * @param {number} r6_yaw
 * @param {number} r6_yaw_unit
 * @param {number} r6_x1
 * @param {number} r6_x1_5
 * @param {number} r6_x2
 * @param {number} r6_x2_5
 * @param {number} r6_x3
 * @param {number} r6_x4
 * @param {number} r6_x5
 * @param {number} r6_x12
 * @param {number} r6_ads_unit
 * @param {number} sa_hipfire
 * @param {number} sa_hipfire_exact
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
	bdo_hipfire,
	bdo_hipfire_exact,
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
	r6_yaw,
	r6_yaw_unit,
	r6_x1,
	r6_x1_5,
	r6_x2,
	r6_x2_5,
	r6_x3,
	r6_x4,
	r6_x5,
	r6_x12,
	r6_ads_unit,
	sa_hipfire,
	sa_hipfire_exact,
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
	set_text_if_changed(bdo_hipfire_el, bdo_hipfire)
	set_text_if_changed(
		bdo_hipfire_exact_el,
		bdo_hipfire_exact
	)
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
		`${format_pubg_float(pubg_hipfire)}, ${format_pubg_float(calc_pubg_converted(pubg_hipfire))}`
	)
	set_text_if_changed(
		pubg_ads_el,
		`${format_pubg_float(pubg_ads)}, ${format_pubg_float(calc_pubg_converted(pubg_ads))}`
	)
	set_text_if_changed(
		pubg_x2_el,
		`${format_pubg_float(pubg_x2)}, ${format_pubg_float(calc_pubg_converted(pubg_x2))}`
	)
	set_text_if_changed(
		pubg_x3_el,
		`${format_pubg_float(pubg_x3)}, ${format_pubg_float(calc_pubg_converted(pubg_x3))}`
	)
	set_text_if_changed(
		pubg_x4_el,
		`${format_pubg_float(pubg_x4)}, ${format_pubg_float(calc_pubg_converted(pubg_x4))}`
	)
	set_text_if_changed(
		pubg_x6_el,
		`${format_pubg_float(pubg_x6)}, ${format_pubg_float(calc_pubg_converted(pubg_x6))}`
	)
	set_text_if_changed(
		pubg_x8_el,
		`${format_pubg_float(pubg_x8)}, ${format_pubg_float(calc_pubg_converted(pubg_x8))}`
	)
	set_text_if_changed(
		pubg_x15_el,
		`${format_pubg_float(pubg_x15)}, ${format_pubg_float(calc_pubg_converted(pubg_x15))}`
	)
	set_text_if_changed(
		r6_hipfire_el,
		`${r6_yaw}, ${r6_yaw_unit}`
	)
	set_text_if_changed(r6_x1_el, r6_x1)
	set_text_if_changed(r6_x1_5_el, r6_x1_5)
	set_text_if_changed(r6_x2_el, r6_x2)
	set_text_if_changed(r6_x2_5_el, r6_x2_5)
	set_text_if_changed(r6_x3_el, r6_x3)
	set_text_if_changed(r6_x4_el, r6_x4)
	set_text_if_changed(r6_x5_el, r6_x5)
	set_text_if_changed(r6_x12_el, r6_x12)
	set_text_if_changed(r6_ads_unit_el, r6_ads_unit)
	set_text_if_changed(sa_hipfire_el, sa_hipfire)
	set_text_if_changed(
		sa_hipfire_exact_el,
		sa_hipfire_exact
	)
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