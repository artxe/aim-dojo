import {
	acos,
	atan,
	cbrt,
	convert_deg_across_aspect,
	floor,
	LN2,
	log,
	max,
	min,
	sqrt,
	tan,
	to_rad
} from "./math.js"
import state from "./state.js"
/**
 * @param {number} hfov_deg
 * @returns {number}
 */
export function calc_sens_cs2(hfov_deg) {
	const { height, width } = state.game
	const vfov_deg = convert_deg_across_aspect(hfov_deg, height * 4 / 3, height)
	const real_hfov_deg = convert_deg_across_aspect(vfov_deg, height, width)
	return compute_sens_rad(real_hfov_deg, width)
		/ to_rad(.022 * hfov_deg / 90)
}
/**
 * @param {number} vfov_deg
 * @returns {number}
 */
export function calc_sens_mc(vfov_deg) {
	const { width, height } = state.game
	const hfov_deg = convert_deg_across_aspect(vfov_deg, height, width)
	const rad_per_count = compute_sens_rad(hfov_deg, width)
	return (
		cbrt(rad_per_count / to_rad(1.2)) - 0.2
	) / 0.006
}
/**
 * @param {number} hfov_deg
 * @returns {number}
 */
export function calc_sens_ow(hfov_deg) {
	const { width } = state.game
	return compute_sens_rad(hfov_deg, width)
		/ to_rad(.0066)
}
/**
 * @param {number} hfov_deg
 * @param {number} [width]
 * @returns {number}
 */
export function calc_sens_pubg(
	hfov_deg,
	width = state.game.width
) {
	const base_fov = 80
	const base_sens = 50
	const base_yaw = .0444400004444
	const step = 15.0515
	const sens50_yaw = to_rad(hfov_deg / base_fov * base_yaw)
	const rad_per_count = compute_sens_rad(hfov_deg, width)
	return base_sens + step * (log(rad_per_count / sens50_yaw) / LN2)
}
/**
 * @param {number} hfov_deg
 * @returns {number}
 */
export function calc_sens_pubg_recoil(hfov_deg) {
	const { width } = state.game
	const base_fov = 80
	const base_sens = 50
	const base_yaw = .0444400004444
	const step = 15.0515
	const sens50_yaw = to_rad(hfov_deg / base_fov * base_yaw)
	const rad_per_count = (
		compute_sens_rad(base_fov, width)
		+ compute_sens_rad(hfov_deg, width)
	) / 2
	return base_sens + step * (log(rad_per_count / sens50_yaw) / LN2)
}
/**
 * @param {number} hfov_deg
 * @returns {number}
 */
export function calc_sens_pubg_v(hfov_deg) {
	const { height, width } = state.game
	const vfov_deg = convert_deg_across_aspect(hfov_deg, width, height)
	const v_rad_per_count = compute_sens_rad(vfov_deg, height)
	const rad_per_count = compute_sens_rad(hfov_deg, width)
	return v_rad_per_count / rad_per_count
}
/** @returns {number} */
export function calc_sens_sa() {
	return (compute_sens_rad(85, 1280) - .00015)
		/ .00003
}
/**
 * @param {number} hfov_deg
 * @returns {number}
 */
export function calc_sens_val(hfov_deg) {
	const { width } = state.game
	return compute_sens_rad(hfov_deg, width)
		/ to_rad(.07 * hfov_deg / 103)
}
/**
 * @param {number} fov_deg
 * @param {number} width
 * @returns {number}
 */
export function compute_sens_rad(fov_deg, width) {
	const { tolerance } = state.game
	const half_width = width / 2
	const tangent_half_fov = tan(to_rad(fov_deg) / 2)
	let low = 1
	let mid
	let high = floor(half_width)
	while (low < high) {
		mid = floor((low + high + 1) / 2)
		const match_ratio = mid / half_width
		const theta_proj = atan(match_ratio * tangent_half_fov)
		const effective = theta_proj / match_ratio
		const theta_star = acos(
			sqrt(
				max(
					0,
					min(1, effective / tangent_half_fov)
				)
			)
		)
		const max_err = half_width * (theta_star / effective - tan(theta_star) / tangent_half_fov)
		if (tolerance >= max_err) {
			low = mid
		} else {
			high = mid - 1
		}
	}
	const match_ratio = low / half_width
	const effective = atan(match_ratio * tangent_half_fov) / match_ratio
	return 2 * effective / width
}