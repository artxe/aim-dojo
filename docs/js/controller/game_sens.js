import {
	calc_pubg_converted,
	calc_real_hfov,
	calc_sens_al,
	calc_sens_bdo,
	calc_sens_cs2,
	calc_sens_fn,
	calc_sens_mc,
	calc_sens_ow,
	calc_sens_pubg,
	calc_sens_r6_file,
	calc_sens_rb,
	calc_sens_sa,
	calc_sens_val,
	lol_sens_to_cpi_scale
} from "../calc/calc_sens.js"
import constants from "../constants.js"
import { lang_text } from "../i18n.js"
import { abs, EPS, fround, round, round_to } from "../math.js"
import state from "../state.js"
import { update_cpi_norm_result } from "./cpi_norm.js"
import {
	al_ads_scope_select,
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
	cpi_norm_sens_input,
	cpi_ratio_el,
	cpi_x_input,
	cpi_y_el,
	cs2_ads_scope_select,
	cs2_aug_el,
	cs2_auto1_el,
	cs2_auto2_el,
	cs2_awp1_el,
	cs2_awp2_el,
	cs2_edpi_el,
	cs2_el,
	cs2_hipfire_el,
	fn_ads_scope_select,
	fn_el,
	fn_hipfire_el,
	game_sens_list_el,
	lol_dpi_el,
	lol_el,
	lol_sens_input,
	lol_win10_el,
	lol_win11_el,
	mc_el,
	mc_file_el,
	mc_hipfire_el,
	mc_hipfire_file_el,
	monitor_height_input,
	monitor_width_input,
	ow_ads_scope_select,
	ow_ashe_el,
	ow_edpi_el,
	ow_el,
	ow_emre_el,
	ow_freja_el,
	ow_hipfire_el,
	ow_widow_el,
	pubg_ads_scope_select,
	pubg_el,
	pubg_file_el,
	pubg_fov_select,
	pubg_hipfire_el,
	pubg_red_dot_el,
	pubg_x15_el,
	pubg_x2_el,
	pubg_x3_el,
	pubg_x4_el,
	pubg_x6_el,
	pubg_x8_el,
	r6_ads_scope_select,
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
	rb_ads_scope_select,
	rb_aiming_el,
	rb_aiming_exact_el,
	rb_el,
	rb_exogun_el,
	rb_hipfire_el,
	rb_minigun_el,
	rb_pistol_el,
	rb_rifle_el,
	rb_rivals_el,
	rb_rivals_exact_el,
	rb_scoped_el,
	rb_scoped_exact_el,
	rb_shotgun_el,
	rb_slingshot_el,
	sa_el,
	sa_hipfire_el,
	sa_hipfire_exact_el,
	send_toast,
	set_text_if_changed,
	val_ads_el,
	val_ads_scope_select,
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
const MC_FILE_NAME = "options.txt"
const PUBG_FILE_NAME = "GameUserSettings.ini"
const R6_FILE_NAME = "GameSettings.ini"
let active_el = al_el
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
	} else if (sens == "rb") {
		active_el = rb_el
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
	set_active_game_sens(name)
	localStorage.setItem("game.sens", name)
	game_sens_list_el.removeAttribute("open")
}
/** @returns {void} */
export function close_game_sens_list() {
	game_sens_list_el.removeAttribute("open")
}
/** @returns {{ x: number, y: number }} */
function current_cpi() {
	const { x } = state.cpi_norm
	const { width } = state.game
	const cpi_x = x || round(
		constants.cpi.x * width / 1_920
	)
	return {
		x: cpi_x,
		y: round(cpi_x * constants.cpi.psi)
	}
}
/**
 * @param {File | undefined} file
 * @returns {Promise<void>}
 */
async function download_updated_mc_file(file) {
	if (file?.name != MC_FILE_NAME) {
		return send_toast(
			lang_text(
				{
					en: `Not ${MC_FILE_NAME}`,
					ko: `${MC_FILE_NAME} 파일이 아닙니다`
				}
			),
			2_000
		)
	}
	const { cpi_scale, height, width } = state.game
	const hipfire = round_to(
		calc_sens_mc(
			width / cpi_scale,
			height / cpi_scale
		),
		16
	)
	if (!hipfire || Number.isNaN(hipfire)) {
		return send_toast(
			lang_text(
				{
					en: "No mc value",
					ko: "마인크래프트 값을 계산할 수 없습니다"
				}
			),
			2_000
		)
	}
	const file_text = await file.text()
	const replaced_text = file_text
		.replace(/(?<=\nfov:)-?\d+\.?\d*/, "1.0")
		.replace(
			/(?<=\nfovEffectScale:)-?\d+\.?\d*/,
			"0.0"
		)
		.replace(
			/(?<=\nmouseSensitivity:)\d+\.?\d*/,
			String(hipfire)
		)
	if (file_text == replaced_text) {
		return send_toast(
			lang_text(
				{
					en: "No changes",
					ko: "바뀐 내용이 없습니다"
				}
			),
			2_000
		)
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
		return send_toast(
			lang_text(
				{
					en: `Not ${PUBG_FILE_NAME}`,
					ko: `${PUBG_FILE_NAME} 파일이 아닙니다`
				}
			),
			2_000
		)
	}
	const { cpi_scale, height, pubg_fov, width } = state.game
	const calc_height = height / cpi_scale
	const calc_width = width / cpi_scale
	const hipfire = calc_sens_pubg(pubg_fov, calc_width, calc_height)
	const red_dot = calc_sens_pubg(
		constants.fov.pubg.x1,
		calc_width,
		calc_height
	)
	const x2 = calc_sens_pubg(
		constants.fov.pubg.x2,
		calc_width,
		calc_height
	)
	const x3 = calc_sens_pubg(
		constants.fov.pubg.x3,
		calc_width,
		calc_height
	)
	const x4 = calc_sens_pubg(
		constants.fov.pubg.x4,
		calc_width,
		calc_height
	)
	const x6 = calc_sens_pubg(
		constants.fov.pubg.x6,
		calc_width,
		calc_height
	)
	const x8 = calc_sens_pubg(
		constants.fov.pubg.x8,
		calc_width,
		calc_height
	)
	const x15 = calc_sens_pubg(
		constants.fov.pubg.x15,
		calc_width,
		calc_height
	)
	const file_text = await file.text()
	const sensitive_map = [
		`SensitiveMap=((Mouse, (Array=((SensitiveName="Normal",Sensitivity=${format_pubg_float(hipfire)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(hipfire))})`,
		`(SensitiveName="Targeting",Sensitivity=${format_pubg_float(red_dot)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(red_dot))})`,
		`(SensitiveName="Scoping",Sensitivity=${format_pubg_float(red_dot)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(red_dot))})`,
		`(SensitiveName="Scope2X",Sensitivity=${format_pubg_float(x2)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(x2))})`,
		`(SensitiveName="Scope3X",Sensitivity=${format_pubg_float(x3)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(x3))})`,
		`(SensitiveName="Scope4X",Sensitivity=${format_pubg_float(x4)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(x4))})`,
		`(SensitiveName="Scope6X",Sensitivity=${format_pubg_float(x6)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(x6))})`,
		`(SensitiveName="Scope8X",Sensitivity=${format_pubg_float(x8)},LastConvertedSensitivity=${format_pubg_float(calc_pubg_converted(x8))})`,
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
		return send_toast(
			lang_text(
				{
					en: "No changes",
					ko: "바뀐 내용이 없습니다"
				}
			),
			2_000
		)
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
		return send_toast(
			lang_text(
				{
					en: `Not ${R6_FILE_NAME}`,
					ko: `${R6_FILE_NAME} 파일이 아닙니다`
				}
			),
			2_000
		)
	}
	const { cpi_scale, height, width } = state.game
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
		width / cpi_scale,
		height / cpi_scale
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
		return send_toast(
			lang_text(
				{
					en: "No changes",
					ko: "바뀐 내용이 없습니다"
				}
			),
			2_000
		)
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
 * @param {number} value
 * @returns {string}
 */
function format_pubg_float(value) {
	return fround(value).toFixed(6)
}
/**
 * @param {number} cpi_scale
 * @param {{ multiplier: number, sens: number }[]} points
 * @returns {string}
 */
function format_win_sens(cpi_scale, points) {
	for (let i = 0; i < points.length; i++) {
		const { multiplier, sens } = points[i]
		if (abs(cpi_scale - multiplier) < EPS) {
			return String(sens)
		}
		if (cpi_scale < multiplier) {
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
	cpi_ratio_el.textContent = String(round_to(constants.cpi.psi, 5))
	update_cpi_display()
	update_game_sens()
}
/** @returns {void} */
function on_change_al_ads_scope() {
	localStorage.setItem(
		"game.ads_scope.al",
		state.game.ads_scope.al = /** @type {typeof state.game.ads_scope.al} */(al_ads_scope_select.value)/**/
	)
	update_game_sens()
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_cpi_x(ev) {
	const target = /** @type {HTMLInputElement} */(ev.currentTarget)/**/
	localStorage.setItem(
		"cpi_norm.x",
		String(
			state.cpi_norm.x = round(Number(target.value))
		)
	)
	update_cpi_display()
	update_game_sens()
}
/** @returns {void} */
function on_change_cs2_ads_scope() {
	localStorage.setItem(
		"game.ads_scope.cs2",
		state.game.ads_scope.cs2 = /** @type {typeof state.game.ads_scope.cs2} */(cs2_ads_scope_select.value)/**/
	)
	update_game_sens()
}
/** @returns {void} */
function on_change_fn_ads_scope() {
	localStorage.setItem(
		"game.ads_scope.fn",
		state.game.ads_scope.fn = /** @type {typeof state.game.ads_scope.fn} */(fn_ads_scope_select.value)/**/
	)
	update_game_sens()
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
	if (state.cpi_norm.game == "lol") {
		cpi_norm_sens_input.value = target.value
		localStorage.setItem(
			"cpi_norm.sens",
			String(state.cpi_norm.sens = sens)
		)
		update_cpi_norm_result()
	}
	state.game.cpi_scale = lol_sens_to_cpi_scale(sens)
	update_game_sens()
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
function on_change_monitor_height(ev) {
	const target = /** @type {HTMLInputElement} */(ev.currentTarget)/**/
	localStorage.setItem(
		"game.height",
		String(
			state.game.height = round(Number(target.value))
		)
	)
	update_cpi_display()
	update_cpi_norm_result()
	update_game_sens()
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_monitor_width(ev) {
	const target = /** @type {HTMLInputElement} */(ev.currentTarget)/**/
	localStorage.setItem(
		"game.width",
		String(
			state.game.width = round(Number(target.value))
		)
	)
	update_cpi_display()
	update_cpi_norm_result()
	update_game_sens()
}
/** @returns {void} */
function on_change_ow_ads_scope() {
	localStorage.setItem(
		"game.ads_scope.ow",
		state.game.ads_scope.ow = /** @type {typeof state.game.ads_scope.ow} */(ow_ads_scope_select.value)/**/
	)
	update_game_sens()
}
/** @returns {void} */
function on_change_pubg_ads_scope() {
	localStorage.setItem(
		"game.ads_scope.pubg",
		state.game.ads_scope.pubg = /** @type {typeof state.game.ads_scope.pubg} */(pubg_ads_scope_select.value)/**/
	)
	update_game_sens()
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
	if (state.cpi_norm.game == "pubg") {
		update_cpi_norm_result()
	}
	update_game_sens()
}
/** @returns {void} */
function on_change_r6_ads_scope() {
	localStorage.setItem(
		"game.ads_scope.r6",
		state.game.ads_scope.r6 = /** @type {typeof state.game.ads_scope.r6} */(r6_ads_scope_select.value)/**/
	)
	update_game_sens()
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_change_r6_file(ev) {
	const input = /** @type {HTMLInputElement} */(ev.target)/**/
	download_updated_r6_file(input.files?.[0])
}
/** @returns {void} */
function on_change_rb_ads_scope() {
	localStorage.setItem(
		"game.ads_scope.rb",
		state.game.ads_scope.rb = /** @type {typeof state.game.ads_scope.rb} */(rb_ads_scope_select.value)/**/
	)
	update_game_sens()
}
/** @returns {void} */
function on_change_val_ads_scope() {
	localStorage.setItem(
		"game.ads_scope.val",
		state.game.ads_scope.val = /** @type {typeof state.game.ads_scope.val} */(val_ads_scope_select.value)/**/
	)
	update_game_sens()
}
/** @returns {Promise<void>} */
async function on_click_mc_file() {
	const text = "%AppData%\\.minecraft\\"
	navigator.clipboard.writeText(text)
	send_toast(
		lang_text(
			{
				en: `Copied!\n${text}`,
				ko: `복사했습니다!\n${text}`
			}
		),
		1_500
	)
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
	send_toast(
		lang_text(
			{
				en: `Copied!\n${text}`,
				ko: `복사했습니다!\n${text}`
			}
		),
		1_500
	)
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
	send_toast(
		lang_text(
			{
				en: `Copied!\n${text}`,
				ko: `복사했습니다!\n${text}`
			}
		),
		1_500
	)
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
/**
 * @param {GameSensName} name
 * @returns {void}
 */
export function set_active_game_sens(name) {
	if (name == state.game.sens) {
		return
	}
	active_el.removeAttribute("active")
	state.game.sens = name
	active_game_sens()
}
/** @returns {void} */
export function sync_game_resolution() {
	const height = round(
		screen.height * devicePixelRatio
	)
	const width = round(
		screen.width * devicePixelRatio
	)
	if (state.game.height == height && state.game.width == width) {
		return
	}
	localStorage.setItem(
		"game.height",
		String(state.game.height = height)
	)
	localStorage.setItem(
		"game.width",
		String(state.game.width = width)
	)
	monitor_height_input.value = String(height)
	monitor_width_input.value = String(width)
	update_cpi_display()
	update_cpi_norm_result()
	update_game_sens()
}
/** @returns {void} */
function update_cpi_display() {
	const { x, y } = current_cpi()
	cpi_x_input.value = String(x)
	cpi_y_el.textContent = String(y)
}
/** @returns {void} */
function update_game_sens() {
	const { al, cs2, fn, ow, pubg, rb, val } = constants.fov
	const { rivals } = rb
	const { scopes } = ow
	const { sens } = constants
	const { cpi_scale, height, pubg_fov, width } = state.game
	const { x, y } = current_cpi()
	const calc_height = height / cpi_scale
	const calc_width = width / cpi_scale
	const al_hipfire = round_to(
		calc_sens_al(
			al.hipfire,
			calc_width,
			calc_height
		),
		sens.al.decimals
	)
	const al_x1 = round_to(
		calc_sens_al(al.x1, calc_width, calc_height) / al_hipfire,
		sens.al.mul_decimals
	)
	const al_x2 = round_to(
		calc_sens_al(al.x2, calc_width, calc_height) / al_hipfire,
		sens.al.mul_decimals
	)
	const al_x3 = round_to(
		calc_sens_al(al.x3, calc_width, calc_height) / al_hipfire,
		sens.al.mul_decimals
	)
	const al_x4 = round_to(
		calc_sens_al(al.x4, calc_width, calc_height) / al_hipfire,
		sens.al.mul_decimals
	)
	const al_x6 = round_to(
		calc_sens_al(al.x6, calc_width, calc_height) / al_hipfire,
		sens.al.mul_decimals
	)
	const al_x8 = round_to(
		calc_sens_al(al.x8, calc_width, calc_height) / al_hipfire,
		sens.al.mul_decimals
	)
	const al_x10 = round_to(
		calc_sens_al(al.x10, calc_width, calc_height) / al_hipfire,
		sens.al.mul_decimals
	)
	const bdo_hipfire = round_to(
		calc_sens_bdo(calc_width, calc_height, cpi_scale),
		sens.bdo.decimals
	)
	const bdo_hipfire_exact = round_to(
		calc_sens_bdo(calc_width, calc_height, cpi_scale),
		2
	)
	const cs2_hipfire = round_to(
		calc_sens_cs2(
			cs2.hipfire,
			calc_width,
			calc_height
		),
		sens.cs2.decimals
	)
	const cs2_45 = round_to(
		calc_sens_cs2(cs2.aug, calc_width, calc_height) / cs2_hipfire,
		sens.cs2.mul_decimals
	)
	const cs2_40 = round_to(
		calc_sens_cs2(cs2.x1, calc_width, calc_height) / cs2_hipfire,
		sens.cs2.mul_decimals
	)
	const cs2_15 = round_to(
		calc_sens_cs2(cs2.auto2, calc_width, calc_height) / cs2_hipfire,
		sens.cs2.mul_decimals
	)
	const cs2_10 = round_to(
		calc_sens_cs2(cs2.awp2, calc_width, calc_height) / cs2_hipfire,
		sens.cs2.mul_decimals
	)
	const fn_hipfire = round_to(
		calc_sens_fn(
			fn.hipfire,
			calc_width,
			calc_height
		),
		sens.fn.decimals
	)
	const mc_hipfire_file = round_to(
		calc_sens_mc(calc_width, calc_height),
		sens.mc.decimals
	)
	const mc_hipfire = round_to(
		mc_hipfire_file * sens.mc.percent,
		2
	)
	const ow_hipfire = round_to(
		calc_sens_ow(ow.hipfire, calc_width),
		sens.ow.decimals
	)
	const widow = round_to(
		calc_sens_ow(
			calc_real_hfov(
				scopes.axis,
				scopes.widow,
				calc_width,
				calc_height
			),
			calc_width
		) / ow_hipfire * 100,
		sens.ow.mul_decimals
	)
	const ashe = round_to(
		calc_sens_ow(
			calc_real_hfov(
				scopes.axis,
				scopes.ashe,
				calc_width,
				calc_height
			),
			calc_width
		) / ow_hipfire * 100,
		sens.ow.mul_decimals
	)
	const freja = round_to(
		calc_sens_ow(
			calc_real_hfov(
				scopes.axis,
				scopes.freja,
				calc_width,
				calc_height
			),
			calc_width
		) / ow_hipfire * 100,
		sens.ow.mul_decimals
	)
	const emre = round_to(
		calc_sens_ow(
			calc_real_hfov(
				scopes.axis,
				scopes.emre,
				calc_width,
				calc_height
			),
			calc_width
		) / ow_hipfire * 100,
		sens.ow.mul_decimals
	)
	const pubg_hipfire = calc_sens_pubg(pubg_fov, calc_width, calc_height)
	const pubg_red_dot = calc_sens_pubg(pubg.x1, calc_width, calc_height)
	const pubg_x2 = calc_sens_pubg(pubg.x2, calc_width, calc_height)
	const pubg_x3 = calc_sens_pubg(pubg.x3, calc_width, calc_height)
	const pubg_x4 = calc_sens_pubg(pubg.x4, calc_width, calc_height)
	const pubg_x6 = calc_sens_pubg(pubg.x6, calc_width, calc_height)
	const pubg_x8 = calc_sens_pubg(pubg.x8, calc_width, calc_height)
	const pubg_x15 = calc_sens_pubg(pubg.x15, calc_width, calc_height)
	const {
		ads_unit: r6_ads_unit,
		x1: r6_x1,
		x12: r6_x12,
		x1_5: r6_x1_5,
		x2: r6_x2,
		x2_5: r6_x2_5,
		x3: r6_x3,
		x4: r6_x4,
		x5: r6_x5,
		yaw: r6_yaw,
		yaw_unit: r6_yaw_unit
	} = calc_sens_r6_file(calc_width, calc_height)
	const rb_hipfire = round_to(
		calc_sens_rb(
			rivals.hipfire,
			calc_width,
			calc_height
		),
		sens.rb.decimals
	)
	const rb_rivals_exact = round_to(
		calc_sens_rb(rb.base, calc_width, calc_height) / rb_hipfire * 100,
		sens.rb.mul_decimals
	)
	const rb_rivals = round(rb_rivals_exact / sens.rb.grid) * sens.rb.grid
	const rb_base_sens = rb_hipfire * rb_rivals / rb.base / 10_000
	const rb_exogun_exact = round_to(
		calc_sens_rb(
			rivals.exogun,
			calc_width,
			calc_height
		)
		/ rb_base_sens
		/ rivals.exogun,
		sens.rb.mul_decimals
	)
	const rb_minigun_exact = round_to(
		calc_sens_rb(
			rivals.minigun,
			calc_width,
			calc_height
		)
		/ rb_base_sens
		/ rivals.minigun,
		sens.rb.mul_decimals
	)
	const rb_pistol_exact = round_to(
		calc_sens_rb(
			rivals.pistol,
			calc_width,
			calc_height
		)
		/ rb_base_sens
		/ rivals.pistol,
		sens.rb.mul_decimals
	)
	const rb_rifle_exact = round_to(
		calc_sens_rb(
			rivals.rifle,
			calc_width,
			calc_height
		)
		/ rb_base_sens
		/ rivals.rifle,
		sens.rb.mul_decimals
	)
	const rb_ads = round(rb_rifle_exact / sens.rb.grid) * sens.rb.grid
	const rb_shotgun_exact = round_to(
		calc_sens_rb(
			rivals.shotgun,
			calc_width,
			calc_height
		)
		/ rb_base_sens
		/ rivals.shotgun,
		sens.rb.mul_decimals
	)
	const rb_slingshot_exact = round_to(
		calc_sens_rb(
			rivals.slingshot,
			calc_width,
			calc_height
		)
		/ rb_base_sens
		/ rivals.slingshot,
		sens.rb.mul_decimals
	)
	const sa_hipfire = round_to(
		calc_sens_sa(calc_width, calc_height),
		sens.sa.decimals
	)
	const sa_hipfire_exact = round_to(
		calc_sens_sa(calc_width, calc_height),
		2
	)
	const val_hipfire = round_to(
		calc_sens_val(
			val.hipfire,
			calc_width,
			calc_height
		),
		sens.val.decimals
	)
	const spectre = round_to(
		calc_sens_val(
			val.spectre,
			calc_width,
			calc_height
		) / val_hipfire,
		sens.val.mul_decimals
	)
	const vandal = round_to(
		calc_sens_val(
			val.vandal,
			calc_width,
			calc_height
		) / val_hipfire,
		sens.val.mul_decimals
	)
	const guardian = round_to(
		calc_sens_val(
			val.guardian,
			calc_width,
			calc_height
		) / val_hipfire,
		sens.val.mul_decimals
	)
	const marshal = round_to(
		calc_sens_val(
			val.marshal,
			calc_width,
			calc_height
		) / val_hipfire,
		sens.val.mul_decimals
	)
	const operator25 = round_to(
		calc_sens_val(
			val.operator2_5,
			calc_width,
			calc_height
		) / val_hipfire,
		sens.val.mul_decimals
	)
	const operator5 = round_to(
		calc_sens_val(
			val.operator5,
			calc_width,
			calc_height
		) / val_hipfire,
		sens.val.mul_decimals
	)
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
		lol_dpi_el,
		`${round_to(x * cpi_scale, 2)}, ${round_to(y * cpi_scale, 2)}`
	)
	set_text_if_changed(
		lol_win10_el,
		format_win_sens(cpi_scale, win10_sens_points)
	)
	set_text_if_changed(
		lol_win11_el,
		format_win_sens(cpi_scale, win11_sens_points)
	)
	set_text_if_changed(mc_hipfire_el, mc_hipfire)
	set_text_if_changed(
		mc_hipfire_file_el,
		mc_hipfire_file
	)
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
		pubg_red_dot_el,
		`${format_pubg_float(pubg_red_dot)}, ${format_pubg_float(calc_pubg_converted(pubg_red_dot))}`
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
	set_text_if_changed(rb_hipfire_el, rb_hipfire)
	set_text_if_changed(rb_rivals_el, rb_rivals)
	set_text_if_changed(
		rb_rivals_exact_el,
		rb_rivals_exact
	)
	set_text_if_changed(rb_aiming_el, rb_ads)
	set_text_if_changed(
		rb_aiming_exact_el,
		rb_rifle_exact
	)
	set_text_if_changed(rb_scoped_el, rb_ads)
	set_text_if_changed(
		rb_scoped_exact_el,
		rb_rifle_exact
	)
	set_text_if_changed(rb_rifle_el, rb_rifle_exact)
	set_text_if_changed(rb_pistol_el, rb_pistol_exact)
	set_text_if_changed(rb_exogun_el, rb_exogun_exact)
	set_text_if_changed(rb_shotgun_el, rb_shotgun_exact)
	set_text_if_changed(
		rb_slingshot_el,
		rb_slingshot_exact
	)
	set_text_if_changed(rb_minigun_el, rb_minigun_exact)
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
{
	al_ads_scope_select.addEventListener("change", on_change_al_ads_scope)
	al_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("al", ev)
	)
	bdo_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("bdo", ev)
	)
	cs2_ads_scope_select.addEventListener(
		"change",
		on_change_cs2_ads_scope
	)
	cs2_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("cs2", ev)
	)
	cpi_x_input.addEventListener("change", on_change_cpi_x)
	fn_ads_scope_select.addEventListener("change", on_change_fn_ads_scope)
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
	monitor_height_input.addEventListener(
		"change",
		on_change_monitor_height
	)
	monitor_width_input.addEventListener(
		"change",
		on_change_monitor_width
	)
	ow_ads_scope_select.addEventListener("change", on_change_ow_ads_scope)
	ow_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("ow", ev)
	)
	pubg_ads_scope_select.addEventListener(
		"change",
		on_change_pubg_ads_scope
	)
	pubg_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("pubg", ev)
	)
	pubg_file_el.addEventListener("click", on_click_pubg_file)
	pubg_file_el.addEventListener("drop", on_drop_pubg_file)
	pubg_fov_select.addEventListener("change", on_change_pubg_fov)
	r6_ads_scope_select.addEventListener("change", on_change_r6_ads_scope)
	r6_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("r6", ev)
	)
	r6_file_el.addEventListener("click", on_click_r6_file)
	r6_file_el.addEventListener("drop", on_drop_r6_file)
	rb_ads_scope_select.addEventListener("change", on_change_rb_ads_scope)
	rb_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("rb", ev)
	)
	sa_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("sa", ev)
	)
	val_ads_scope_select.addEventListener(
		"change",
		on_change_val_ads_scope
	)
	val_el.addEventListener(
		"mouseup",
		ev => change_active_game_sens("val", ev)
	)
}