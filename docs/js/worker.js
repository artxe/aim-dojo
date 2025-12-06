import {
	convert_deg_across_aspect,
	round_to
} from "./math.js"
import { calc_pubg_fpp_fov } from "./sens/calc_pubg.js"
import {
	calc_sens_cs2,
	calc_sens_fn,
	calc_sens_fn_tpp,
	calc_sens_mc,
	calc_sens_ow,
	calc_sens_pubg,
	calc_sens_pubg_tpp,
	calc_sens_sa,
	calc_sens_val
} from "./sens/calc_sens.js"
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
		update_game_sens(
			data.height,
			data.tpp_width_ratio,
			data.width
		)
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
 * @param {number} tpp_width_ratio
 * @param {number} width
 * @returns {void}
 */
function update_game_sens(height, tpp_width_ratio, width) {
	const base_hfov = 103
	const val_hipfire = round_to(
		calc_sens_val(base_hfov, width),
		3
	)
	let zoom_fov = convert_deg_across_aspect(base_hfov, 1.15, 1)
	const spectre = calc_sens_val(zoom_fov, width)
	zoom_fov = convert_deg_across_aspect(base_hfov, 1.25, 1)
	const vandal = calc_sens_val(zoom_fov, width)
	zoom_fov = convert_deg_across_aspect(base_hfov, 1.5, 1)
	const guardian = calc_sens_val(zoom_fov, width)
	zoom_fov = convert_deg_across_aspect(base_hfov, 3.5, 1)
	const marshal = calc_sens_val(zoom_fov, width)
	zoom_fov = convert_deg_across_aspect(base_hfov, 2.5, 1)
	const operator25 = calc_sens_val(zoom_fov, width)
	zoom_fov = convert_deg_across_aspect(base_hfov, 5, 1)
	const operator5 = calc_sens_val(zoom_fov, width)
	const mc_hipfire = calc_sens_mc(99, height, width)
	const fn_hipfire = round_to(calc_sens_fn_tpp(80, width), 1)
	const fn_ads = calc_sens_fn(80, width)
	const fn_ar = calc_sens_fn(40, width)
	const fn_sr = calc_sens_fn(15, width)
	const cs2_hipfire = round_to(
		calc_sens_cs2(90, height, width),
		2
	)
	const cs2_45 = calc_sens_cs2(45, height, width)
	const cs2_40 = calc_sens_cs2(40, height, width)
	const cs2_15 = calc_sens_cs2(15, height, width)
	const cs2_10 = calc_sens_cs2(10, height, width)
	const pubg_fov = 80
	const pubg_hipfire = calc_sens_pubg_tpp(pubg_fov, width)
	const pubg_fpp_fov = calc_pubg_fpp_fov(pubg_hipfire, width)
	const pubg_ads = calc_sens_pubg(pubg_fov, width)
	const pubg_x2 = calc_sens_pubg(pubg_fov / 2, width)
	const pubg_x3 = calc_sens_pubg(pubg_fov / 3, width)
	const pubg_x4 = calc_sens_pubg(pubg_fov / 4, width)
	const pubg_x6 = calc_sens_pubg(pubg_fov / 6, width)
	const pubg_x8 = calc_sens_pubg(pubg_fov / 8, width)
	const pubg_x15 = calc_sens_pubg(pubg_fov / 15, width)
	const ow_hipfire = round_to(
		calc_sens_ow(base_hfov, width),
		2
	)
	const widow = calc_sens_ow(
		convert_deg_across_aspect(30, height, width),
		width
	)
	const ashe = calc_sens_ow(
		convert_deg_across_aspect(40, height, width),
		width
	)
	const freja = calc_sens_ow(76, width)
	const sa_hipfire = calc_sens_sa(height)
	postMessage(
		[
			"update_game_sens",
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
			sa_hipfire
		]
	)
}