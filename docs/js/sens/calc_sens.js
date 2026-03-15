/* eslint
no-restricted-syntax: [
	"error",
	{ "selector": "ImportDeclaration:not([source.value='../math.js'])" }
]
*/
import {
	atan,
	cbrt,
	convert_deg_across_aspect,
	GL64_W,
	GL64_X,
	log2,
	sqrt,
	tan,
	to_rad
} from "../math.js"
/**
 * @param {number} hfov_deg
 * @param {number} height
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_cs2(hfov_deg, height, width) {
	const vfov_deg = convert_deg_across_aspect(hfov_deg, height * 4 / 3, height)
	const real_hfov_deg = convert_deg_across_aspect(vfov_deg, height, width)
	return calc_avg_spherical_rad_per_px_horizontal_weighted(real_hfov_deg, width, height)
		/ to_rad(.022 * hfov_deg / 90)
}
/**
 * @param {number} hfov_deg
 * @param {number} height
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_fn(hfov_deg, height, width) {
	return calc_avg_spherical_rad_per_px_horizontal_weighted(hfov_deg, width, height)
		/ to_rad(
			.005_555 * tan(to_rad(hfov_deg) / 2) / tan(to_rad(80) / 2)
		)
}
/**
 * @param {number} vfov_deg
 * @param {number} height
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_mc(vfov_deg, height, width) {
	const hfov_deg = convert_deg_across_aspect(vfov_deg, height, width)
	const rad_per_count = calc_avg_spherical_rad_per_px_horizontal_weighted(hfov_deg, width, height)
	return (
		cbrt(rad_per_count / to_rad(1.2)) - .2
	) / .006
}
/**
 * @param {number} hfov_deg
 * @param {number} height
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_ow(hfov_deg, height, width) {
	return calc_avg_spherical_rad_per_px_horizontal_weighted(hfov_deg, width, height)
		/ to_rad(.006_6)
}
/**
 * @param {number} hfov_deg
 * @param {number} height
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_pubg(hfov_deg, height, width) {
	const base_fov = 80
	const base_sens = 50
	const base_yaw = .044_440_000_444_4
	const step = 15.051_5
	const sens50_yaw = to_rad(hfov_deg / base_fov * base_yaw)
	const rad_per_count = calc_avg_spherical_rad_per_px_horizontal_weighted(hfov_deg, width, height)
	return base_sens + step * (log2(rad_per_count / sens50_yaw))
}
/**
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_sa(height) {
	return (calc_avg_spherical_rad_per_px_horizontal_weighted(85, height * 4 / 3, height) - .000_15)
		/ .000_03
}
/**
 * @param {number} hfov_deg
 * @param {number} height
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_val(hfov_deg, height, width) {
	return calc_avg_spherical_rad_per_px_horizontal_weighted(hfov_deg, width, height)
		/ to_rad(.07 * hfov_deg / 103)
}
/**
 * @param {number} fov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_avg_spherical_rad_per_px_horizontal_weighted(fov_deg, width, height) {
	const fov = to_rad(fov_deg)
	const hw = width / 2
	const hh = height / 2
	const f = hw / tan(fov / 2)
	let num = 0
	let den = 0
	for (let i = 0; i < 64; i++) {
		const y = hh / 2 * (GL64_X[i] + 1)
		const wi = hh / 2 * GL64_W[i]
		const f_eff = sqrt(f * f + y * y)
		for (let j = 0; j < 64; j++) {
			const x = hw / 2 * (GL64_X[j] + 1)
			const wj = hw / 2 * GL64_W[j]
			const r = sqrt(x * x + y * y)
			const omega = atan(r / f)
			const htheta = atan(x / f_eff)
			num += wi * wj * htheta * omega / r
			den += wi * wj * htheta
		}
	}
	return num / den
}