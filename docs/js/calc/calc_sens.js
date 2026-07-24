import constants from "../constants.js"
import {
	abs,
	atan,
	cbrt,
	convert_deg_across_aspect,
	cos,
	log2,
	max,
	min,
	round,
	round_to,
	tan,
	to_rad
} from "../math.js"
/**
 * @param {number} fov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_rad_per_px(fov_deg, width) {
	const fov_rad = to_rad(fov_deg)
	const match = width * (1 - cos(fov_rad / 2)) / 2
	return atan(
		2 * tan(fov_rad / 2) * match / width
	) / match
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_al(hfov_deg, width, height) {
	const base_fov = constants.fov.al.hipfire
	const real_hfov_deg = convert_deg_across_aspect(hfov_deg, 4 / 3, width / height)
	return calc_rad_per_px(real_hfov_deg, width)
		/ to_rad(
			.022
			* tan(to_rad(hfov_deg) / 2)
			/ tan(to_rad(base_fov) / 2)
		)
}
/**
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_bdo(width, height) {
	const hfov_deg = convert_deg_across_aspect(
		constants.fov.bdo.hipfire,
		height,
		width
	)
	return calc_rad_per_px(hfov_deg, width) / to_rad(.001_84)
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_cs2(hfov_deg, width, height) {
	const base_fov = constants.fov.cs2.hipfire
	const real_hfov_deg = convert_deg_across_aspect(hfov_deg, 4 / 3, width / height)
	return calc_rad_per_px(real_hfov_deg, width)
		/ to_rad(.022 * hfov_deg / base_fov)
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_fn(hfov_deg, width) {
	return calc_rad_per_px(hfov_deg, width)
		/ to_rad(
			.005_555
			* tan(to_rad(hfov_deg) / 2)
			/ tan(
				to_rad(constants.fov.fn.hipfire) / 2
			)
		)
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_fn_legacy(hfov_deg, width) {
	const base_fov = constants.fov.fn.hipfire
	return calc_rad_per_px(hfov_deg, width)
		/ to_rad(.005_555 * hfov_deg / base_fov)
}
/**
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_mc(width, height) {
	const hfov_deg = convert_deg_across_aspect(
		constants.fov.mc.hipfire,
		height,
		width
	)
	const rad_per_count = calc_rad_per_px(hfov_deg, width)
	return (
		cbrt(rad_per_count / to_rad(1.2)) - .2
	) / .6
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_ow(hfov_deg, width) {
	return calc_rad_per_px(hfov_deg, width)
		/ to_rad(.006_6)
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_pubg(hfov_deg, width) {
	const base_fov = constants.fov.pubg.base
	const base_sens = 50
	const base_yaw = .044_440_000_444_4
	const step = 15.051_5
	const sens50_yaw = to_rad(hfov_deg / base_fov * base_yaw)
	const rad_per_count = calc_rad_per_px(hfov_deg, width)
	return base_sens
		+ step * log2(rad_per_count / sens50_yaw)
}
/**
 * @param {number} vfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_r6(vfov_deg, width, height) {
	const base_fov = constants.fov.r6.base
	const hfov_deg = convert_deg_across_aspect(vfov_deg, height, width)
	return calc_rad_per_px(hfov_deg, width)
		/ to_rad(
			.005_73
			* tan(to_rad(vfov_deg) / 2)
			/ tan(to_rad(base_fov) / 2)
		)
}
/**
 * @param {number} width
 * @param {number} height
 * @returns {R6FileSens}
 */
export function calc_sens_r6_file(width, height) {
	const { r6 } = constants.fov
	const hipfire = calc_sens_r6(r6.base, width, height)
	const yaw_unit = round_to(hipfire * .02, 6)
	const x1 = calc_sens_r6(r6.x1, width, height) / hipfire
	const x1_5 = calc_sens_r6(r6.x1_5, width, height) / hipfire
	const x2 = calc_sens_r6(r6.x2, width, height) / hipfire
	const x2_5 = calc_sens_r6(r6.x2_5, width, height) / hipfire
	const x3 = calc_sens_r6(r6.x3, width, height) / hipfire
	const x4 = calc_sens_r6(r6.x4, width, height) / hipfire
	const x5 = calc_sens_r6(r6.x5, width, height) / hipfire
	const x12 = calc_sens_r6(r6.x12, width, height) / hipfire
	const ratios = [ x1, x1_5, x2, x2_5, x3, x4, x5, x12 ]
	const m_max = max(...ratios)
	const from = round(m_max / 200 * 1e6)
	const to = round(m_max / 100 * 1e6)
	let ads_unit = 0
	let min_err = Number.POSITIVE_INFINITY
	for (let i = from; i <= to; i++) {
		const unit = i / 1e6
		let err = 0
		for (const m of ratios) {
			const e = abs(round(m / unit) * unit / m - 1)
			if (e > err) {
				err = e
			}
		}
		if (err < min_err) {
			ads_unit = unit
			min_err = err
		}
	}
	return {
		ads_unit,
		x1: round(x1 / ads_unit),
		x12: round(x12 / ads_unit),
		x1_5: round(x1_5 / ads_unit),
		x2: round(x2 / ads_unit),
		x2_5: round(x2_5 / ads_unit),
		x3: round(x3 / ads_unit),
		x4: round(x4 / ads_unit),
		x5: round(x5 / ads_unit),
		yaw: 1,
		yaw_unit
	}
}
/**
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_sa(height) {
	return (
		calc_rad_per_px(
			constants.fov.sa.hipfire,
			height * 4 / 3
		)
		- .000_15
	) / .000_03
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_val(hfov_deg, width) {
	const base_fov = constants.fov.val.hipfire
	return calc_rad_per_px(hfov_deg, width)
		/ to_rad(.07 * hfov_deg / base_fov)
}
/**
 * @param {number} sens
 * @returns {number}
 */
export function lol_sens_to_dpi_scale(sens) {
	const lol_dpi_scale_points = [
		.031_25,
		.125,
		.25,
		.5,
		.75,
		1,
		1.5,
		2,
		2.5,
		3,
		3.5
	]
	const i = min(
		sens / 10 | 0,
		lol_dpi_scale_points.length - 2
	)
	const t = sens / 10 - i
	return lol_dpi_scale_points[i]
		+ (
			lol_dpi_scale_points[i + 1]
			- lol_dpi_scale_points[i]
		) * t
}