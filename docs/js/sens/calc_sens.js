/* eslint
no-restricted-syntax: [
	"error",
	{ "selector": "ImportDeclaration:not([source.value='../constants.js']):not([source.value='../math.js'])" }
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
 * @param {number} height
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_cs2(hfov_deg, height, width) {
	const vfov_deg = convert_deg_across_aspect(hfov_deg, height * 4 / 3, height)
	const real_hfov_deg = convert_deg_across_aspect(vfov_deg, height, width)
	return compute_sens_rad(real_hfov_deg, width)
		/ to_rad(.022 * hfov_deg / 90)
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_fn(hfov_deg, width) {
	return compute_sens_rad(hfov_deg, width)
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
	const rad_per_count = compute_sens_rad(hfov_deg, width)
	return (
		cbrt(rad_per_count / to_rad(1.2)) - .2
	) / .006
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_ow(hfov_deg, width) {
	return compute_sens_rad(hfov_deg, width)
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
	const rad_per_count = compute_sens_rad(hfov_deg, width)
	return base_sens + step * (log2(rad_per_count / sens50_yaw))
}
/**
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_sa(height) {
	return (compute_sens_rad(85, height * 4 / 3) - .000_15)
		/ .000_03
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_val(hfov_deg, width) {
	return compute_sens_rad(hfov_deg, width)
		/ to_rad(.07 * hfov_deg / 103)
}
/**
 * @param {number} fov_deg
 * @param {number} width
 * @returns {number}
 */
export function compute_sens_rad(fov_deg, width) {
	const fov = to_rad(fov_deg)
	const half = width / 2
	const f = half / tan(fov / 2)
	const N = 2048
	const h = half / N
	let integral = 1 / f + atan(half / f) / half
	for (let i = 1; i < N; i++) {
		const L = i * h
		const w = (i % 2 === 1) ? 4 : 2
		integral += w * (atan(L / f) / L)
	}
	return (h / 3) * integral / half
}