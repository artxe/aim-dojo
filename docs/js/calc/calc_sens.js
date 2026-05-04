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
	log2,
	tan,
	to_rad
} from "../math.js"
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_al(hfov_deg, width, height) {
	const base_fov = 70 * 1.55
	const real_hfov_deg = convert_deg_across_aspect(hfov_deg, 4 / 3, width / height)
	return calc_rad_per_px(real_hfov_deg, width)
		/ to_rad(
			.022 * tan(to_rad(hfov_deg) / 2) / tan(to_rad(base_fov) / 2)
		)
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_cs2(hfov_deg, width, height) {
	const base_fov = 90
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
			.005_555 * tan(to_rad(hfov_deg) / 2) / tan(to_rad(80) / 2)
		)
}
/**
 * @param {number} vfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_mc(vfov_deg, width, height) {
	const hfov_deg = convert_deg_across_aspect(vfov_deg, height, width)
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
	const base_fov = 80
	const base_sens = 50
	const base_yaw = .044_440_000_444_4
	const step = 15.051_5
	const sens50_yaw = to_rad(hfov_deg / base_fov * base_yaw)
	const rad_per_count = calc_rad_per_px(hfov_deg, width)
	return base_sens + step * (log2(rad_per_count / sens50_yaw))
}
/**
 * @param {number} vfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_r6(vfov_deg, width, height) {
	const base_fov = 90
	const hfov_deg = convert_deg_across_aspect(vfov_deg, height, width)
	return calc_rad_per_px(hfov_deg, width)
		/ to_rad(
			.005_73 * tan(to_rad(vfov_deg) / 2) / tan(to_rad(base_fov) / 2)
		)
}
/**
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_sa(height) {
	return (calc_rad_per_px(85, height * 4 / 3) - .000_15)
		/ .000_03
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_val(hfov_deg, width) {
	const base_fov = 103
	return calc_rad_per_px(hfov_deg, width)
		/ to_rad(.07 * hfov_deg / base_fov)
}
/**
 * @param {number} fov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_rad_per_px(fov_deg, width) {
	const fov = to_rad(fov_deg)
	const dx = (width / 2) * tan(fov / 4) / tan(fov / 2)
	return atan(dx * 2 * tan(fov / 2) / width) / dx
}