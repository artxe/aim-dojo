/* eslint
no-restricted-syntax: [
	"error",
	{ "selector": "ImportDeclaration:not([source.value='./calc/calc_sens.js']):not([source.value='./math.js'])" }
]
*/
import {
	calc_sens_al,
	calc_sens_cs2,
	calc_sens_fn,
	calc_sens_mc,
	calc_sens_ow,
	calc_sens_pubg,
	calc_sens_r6,
	calc_sens_sa,
	calc_sens_val
} from "./calc/calc_sens.js"
import {
	convert_deg_across_aspect,
	round,
	round_to
} from "./math.js"
const off = new OffscreenCanvas(1, 1)
const off_context = /** @type {OffscreenCanvasRenderingContext2D} */(off.getContext("2d"))/**/
onmessage = function({ data }) {
	const { fn } = data
	if (fn == "check_writing_stats") {
		check_writing_stats(
			data.height,
			data.line_width,
			data.lines,
			data.text_data,
			data.width
		)
	} else if (fn == "update_game_sens") {
		update_game_sens(data.height, data.width)
	} else {
		throw Error(fn)
	}
}
/**
 * @param {number} height
 * @param {number} line_width
 * @param {Line[]} lines
 * @param {ImageDataArray} text_data
 * @param {number} width
 * @returns {void}
 */
export function check_writing_stats(
	height,
	line_width,
	lines,
	text_data,
	width
) {
	off.height = height
	off.width = width
	off_context.save()
	off_context.lineWidth = line_width
	off_context.beginPath()
	let l = lines.length
	let b = null
	for (let i = 0; i < l; i++) {
		const { e, s } = /** @type {Line} */(lines.at(i))/**/
		if (b != s) {
			off_context.moveTo(s.x, s.y)
		}
		off_context.lineTo(e.x, e.y)
		b = e
	}
	off_context.stroke()
	off_context.restore()
	const lines_data = off_context.getImageData(0, 0, width, height).data
	let count_hit = 0
	let count_shoot = 0
	l = text_data.length
	for (let i = 0; i < l; i += 4) {
		if (lines_data[i + 3]) {
			count_shoot++
			if (text_data[i + 3]) {
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
 * @param {number} height
 * @param {number} width
 * @returns {void}
 */
function update_game_sens(height, width) {
	const al_hipfire = round_to(
		calc_sens_al(70 * 1.55, width, height),
		2
	)
	const al_x1 = round_to(
		calc_sens_al(60 * 1.55, width, height) / al_hipfire,
		2
	)
	const al_x2 = round_to(
		calc_sens_al(
			convert_deg_across_aspect(60 * 1.55, 2, 1),
			width,
			height
		) / al_hipfire,
		2
	)
	const al_x3 = round_to(
		calc_sens_al(
			convert_deg_across_aspect(60 * 1.55, 3, 1),
			width,
			height
		) / al_hipfire,
		2
	)
	const al_x4 = round_to(
		calc_sens_al(
			convert_deg_across_aspect(60 * 1.55, 4, 1),
			width,
			height
		) / al_hipfire,
		2
	)
	const al_x6 = round_to(
		calc_sens_al(
			convert_deg_across_aspect(60 * 1.55, 6, 1),
			width,
			height
		) / al_hipfire,
		2
	)
	const al_x8 = round_to(
		calc_sens_al(
			convert_deg_across_aspect(60 * 1.55, 8, 1),
			width,
			height
		) / al_hipfire,
		2
	)
	const al_x10 = round_to(
		calc_sens_al(
			convert_deg_across_aspect(60 * 1.55, 10, 1),
			width,
			height
		) / al_hipfire,
		2
	)
	const cs2_hipfire = round_to(
		calc_sens_cs2(90, width, height),
		2
	)
	const cs2_45 = round_to(
		calc_sens_cs2(45, width, height) / cs2_hipfire,
		2
	)
	const cs2_40 = round_to(
		calc_sens_cs2(40, width, height) / cs2_hipfire,
		2
	)
	const cs2_15 = round_to(
		calc_sens_cs2(15, width, height) / cs2_hipfire,
		2
	)
	const cs2_10 = round_to(
		calc_sens_cs2(10, width, height) / cs2_hipfire,
		2
	)
	const fn_hipfire = round_to(calc_sens_fn(80, width), 1)
	const fn_targeting = 100
	const fn_scope = 100
	const mc_hipfire = round_to(
		calc_sens_mc(110, width, height),
		16
	)
	const ow_hipfire = round_to(calc_sens_ow(103, width), 2)
	const widow = round_to(
		calc_sens_ow(
			convert_deg_across_aspect(30, height, width),
			width
		) / ow_hipfire * 100,
		2
	)
	const ashe = round_to(
		calc_sens_ow(
			convert_deg_across_aspect(40, height, width),
			width
		) / ow_hipfire * 100,
		2
	)
	const freja = round_to(
		calc_sens_ow(
			convert_deg_across_aspect(47.5, height, width),
			width
		) / ow_hipfire * 100,
		2
	)
	const emre = round_to(
		calc_sens_ow(
			convert_deg_across_aspect(42.5, height, width),
			width
		) / ow_hipfire * 100,
		2
	)
	const pubg_hipfire = calc_sens_pubg(80, width)
	const pubg_ads = calc_sens_pubg(80 / 1.5, width)
	const pubg_x2 = calc_sens_pubg(80 / 2, width)
	const pubg_x3 = calc_sens_pubg(80 / 3, width)
	const pubg_x4 = calc_sens_pubg(80 / 4 - 1, width)
	const pubg_x6 = calc_sens_pubg(80 / 6, width)
	const pubg_x8 = calc_sens_pubg(80 / 8, width)
	const pubg_x15 = calc_sens_pubg(80 / 15, width)
	const r6_hipfire = round(
		calc_sens_r6(90, width, height)
	)
	const r6_x1 = round(
		calc_sens_r6(81, width, height) / r6_hipfire * 50
	)
	const r6_x2_5 = round(
		calc_sens_r6(
			convert_deg_across_aspect(90, 2.5, 1),
			width,
			height
		) / r6_hipfire * 50
	)
	const r6_x3_5 = round(
		calc_sens_r6(
			convert_deg_across_aspect(90, 3.5, 1),
			width,
			height
		) / r6_hipfire * 50
	)
	const r6_x5 = round(
		calc_sens_r6(
			convert_deg_across_aspect(90, 5, 1),
			width,
			height
		) / r6_hipfire * 50
	)
	const r6_x12 = round(
		calc_sens_r6(
			convert_deg_across_aspect(90, 12, 1),
			width,
			height
		) / r6_hipfire * 50
	)
	const sa_hipfire = round(calc_sens_sa(height))
	const val_hipfire = round_to(calc_sens_val(103, width), 3)
	const spectre = round_to(
		calc_sens_val(
			convert_deg_across_aspect(103, 1.15, 1),
			width
		) / val_hipfire,
		3
	)
	const vandal = round_to(
		calc_sens_val(
			convert_deg_across_aspect(103, 1.25, 1),
			width
		) / val_hipfire,
		3
	)
	const guardian = round_to(
		calc_sens_val(
			convert_deg_across_aspect(103, 1.5, 1),
			width
		) / val_hipfire,
		3
	)
	const marshal = round_to(
		calc_sens_val(
			convert_deg_across_aspect(103, 3.5, 1),
			width
		) / val_hipfire,
		3
	)
	const operator25 = round_to(
		calc_sens_val(
			convert_deg_across_aspect(103, 2.5, 1),
			width
		) / val_hipfire,
		3
	)
	const operator5 = round_to(
		calc_sens_val(
			convert_deg_across_aspect(103, 5, 1),
			width
		) / val_hipfire,
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
		]
	)
}