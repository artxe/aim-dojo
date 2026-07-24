import {
	calc_sens_al,
	calc_sens_bdo,
	calc_sens_cs2,
	calc_sens_fn_legacy,
	calc_sens_mc,
	calc_sens_ow,
	calc_sens_pubg,
	calc_sens_r6_file,
	calc_sens_sa,
	calc_sens_val
} from "../calc/calc_sens.js"
import constants from "../constants.js"
import { round, round_to } from "../math.js"
const off = new OffscreenCanvas(1, 1)
const off_context = /** @type {OffscreenCanvasRenderingContext2D} */(off.getContext("2d"))/**/
let writing_height = 0
/** @type {ImageDataArray} */
let writing_text_data
let writing_width = 0
{
	onmessage = function({ data }) {
		const { fn } = data
		if (fn == "check_writing_stats") {
			check_writing_stats(
				data.lines,
				data.lines_start,
				data.line_width
			)
		} else if (fn == "set_writing_text") {
			set_writing_text(
				data.text_data,
				data.width,
				data.height
			)
		} else if (fn == "update_game_sens") {
			update_game_sens(
				data.width,
				data.height,
				data.dpi_scale,
				data.pubg_fov
			)
		} else {
			throw Error(fn)
		}
	}
}
/**
 * @param {Line[]} lines
 * @param {number} lines_start
 * @param {number} line_width
 * @returns {void}
 */
function check_writing_stats(lines, lines_start, line_width) {
	off.height = writing_height
	off.width = writing_width
	off_context.save()
	off_context.lineWidth = line_width
	off_context.beginPath()
	const line_count = lines.length
	let has_prev = false
	let prev_x = 0
	let prev_y = 0
	for (let i = lines_start; i < line_count; i++) {
		const { ex, ey, sx, sy } = lines[i]
		if (!has_prev || prev_x != sx || prev_y != sy) {
			off_context.moveTo(sx, sy)
		}
		off_context.lineTo(ex, ey)
		has_prev = true
		prev_x = ex
		prev_y = ey
	}
	off_context.stroke()
	off_context.restore()
	const line_image_data = off_context.getImageData(0, 0, writing_width, writing_height).data
	let count_hit = 0
	let count_shoot = 0
	const pixel_data_len = writing_text_data.length
	for (let alpha_i = 3; alpha_i < pixel_data_len; alpha_i += 4) {
		if (line_image_data[alpha_i]) {
			count_shoot++
			if (writing_text_data[alpha_i]) {
				count_hit++
			}
		}
	}
	postMessage(
		[
			"check_writing_stats",
			count_hit,
			count_shoot
		]
	)
}
/**
 * @param {ImageDataArray} text_data
 * @param {number} width
 * @param {number} height
 * @returns {void}
 */
function set_writing_text(text_data, width, height) {
	writing_height = height
	writing_text_data = text_data
	writing_width = width
}
/**
 * @param {number} width
 * @param {number} height
 * @param {number} dpi_scale
 * @param {PubgFov} pubg_fov
 * @returns {void}
 */
function update_game_sens(width, height, dpi_scale, pubg_fov) {
	const { al, cs2, fn, ow, pubg, val } = constants.fov
	const calc_height = height / dpi_scale
	const calc_width = width / dpi_scale
	const al_hipfire = round_to(
		calc_sens_al(
			al.hipfire,
			calc_width,
			calc_height
		),
		2
	)
	const al_x1 = round_to(
		calc_sens_al(al.x1, calc_width, calc_height) / al_hipfire,
		2
	)
	const al_x2 = round_to(
		calc_sens_al(al.x2, calc_width, calc_height) / al_hipfire,
		2
	)
	const al_x3 = round_to(
		calc_sens_al(al.x3, calc_width, calc_height) / al_hipfire,
		2
	)
	const al_x4 = round_to(
		calc_sens_al(al.x4, calc_width, calc_height) / al_hipfire,
		2
	)
	const al_x6 = round_to(
		calc_sens_al(al.x6, calc_width, calc_height) / al_hipfire,
		2
	)
	const al_x8 = round_to(
		calc_sens_al(al.x8, calc_width, calc_height) / al_hipfire,
		2
	)
	const al_x10 = round_to(
		calc_sens_al(al.x10, calc_width, calc_height) / al_hipfire,
		2
	)
	const bdo_hipfire = round(
		calc_sens_bdo(calc_width, calc_height)
	)
	const bdo_hipfire_exact = round_to(
		calc_sens_bdo(calc_width, calc_height),
		2
	)
	const cs2_hipfire = round_to(
		calc_sens_cs2(
			cs2.hipfire,
			calc_width,
			calc_height
		),
		2
	)
	const cs2_45 = round_to(
		calc_sens_cs2(cs2.aug, calc_width, calc_height) / cs2_hipfire,
		2
	)
	const cs2_40 = round_to(
		calc_sens_cs2(cs2.x1, calc_width, calc_height) / cs2_hipfire,
		2
	)
	const cs2_15 = round_to(
		calc_sens_cs2(cs2.auto2, calc_width, calc_height) / cs2_hipfire,
		2
	)
	const cs2_10 = round_to(
		calc_sens_cs2(cs2.awp2, calc_width, calc_height) / cs2_hipfire,
		2
	)
	const fn_hipfire = round_to(
		calc_sens_fn_legacy(fn.hipfire, calc_width),
		1
	)
	const fn_targeting = round_to(
		calc_sens_fn_legacy(fn.hipfire, calc_width) / fn_hipfire * 100,
		1
	)
	const fn_scope = round_to(
		calc_sens_fn_legacy(fn.scope, calc_width) / fn_hipfire * 100,
		1
	)
	const mc_hipfire = round_to(
		calc_sens_mc(calc_width, calc_height),
		16
	)
	const ow_hipfire = round_to(
		calc_sens_ow(ow.hipfire, calc_width),
		2
	)
	const widow = round_to(
		calc_sens_ow(ow.widow, calc_width) / ow_hipfire * 100,
		2
	)
	const ashe = round_to(
		calc_sens_ow(ow.ashe, calc_width) / ow_hipfire * 100,
		2
	)
	const freja = round_to(
		calc_sens_ow(ow.freja, calc_width) / ow_hipfire * 100,
		2
	)
	const emre = round_to(
		calc_sens_ow(ow.emre, calc_width) / ow_hipfire * 100,
		2
	)
	const pubg_hipfire = calc_sens_pubg(pubg_fov, calc_width)
	const pubg_ads = calc_sens_pubg(pubg.x1, calc_width)
	const pubg_x2 = calc_sens_pubg(pubg.x2, calc_width)
	const pubg_x3 = calc_sens_pubg(pubg.x3, calc_width)
	const pubg_x4 = calc_sens_pubg(pubg.x4, calc_width)
	const pubg_x6 = calc_sens_pubg(pubg.x6, calc_width)
	const pubg_x8 = calc_sens_pubg(pubg.x8, calc_width)
	const pubg_x15 = calc_sens_pubg(pubg.x15, calc_width)
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
	const sa_hipfire = round(calc_sens_sa(calc_height))
	const sa_hipfire_exact = round_to(calc_sens_sa(calc_height), 2)
	const val_hipfire = round_to(
		calc_sens_val(val.hipfire, calc_width),
		3
	)
	const spectre = round_to(
		calc_sens_val(val.spectre, calc_width) / val_hipfire,
		3
	)
	const vandal = round_to(
		calc_sens_val(val.vandal, calc_width) / val_hipfire,
		3
	)
	const guardian = round_to(
		calc_sens_val(val.guardian, calc_width) / val_hipfire,
		3
	)
	const marshal = round_to(
		calc_sens_val(val.marshal, calc_width) / val_hipfire,
		3
	)
	const operator25 = round_to(
		calc_sens_val(val.operator2_5, calc_width) / val_hipfire,
		3
	)
	const operator5 = round_to(
		calc_sens_val(val.operator5, calc_width) / val_hipfire,
		3
	)
	postMessage(
		[
			"update_game_sens",
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
		]
	)
}