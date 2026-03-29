import {
	convert_deg_across_aspect,
	to_rad
} from "../math.js"
import state from "../state.js"
import {
	calc_rad_per_px,
	calc_sens_al,
	calc_sens_cs2,
	calc_sens_fn,
	calc_sens_ow,
	calc_sens_val
} from "./calc_sens.js"
/** @returns {number} */
export function calc_dpi_al() {
	if (state.dpi_norm.game !== "al") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { height, width } = state.game
	return dpi * sens / calc_sens_al(70 * 1.55, width, height)
}
/** @returns {number} */
export function calc_dpi_cs2() {
	if (state.dpi_norm.game !== "cs2") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { height, width } = state.game
	return dpi * sens / calc_sens_cs2(90, width, height)
}
/** @returns {number} */
export function calc_dpi_lol() {
	if (state.dpi_norm.game !== "lol") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const scale_points = ([
		0.031_25,
		0.125,
		0.25,
		0.5,
		0.75,
		1,
		1.5,
		2,
		2.5,
		3,
		3.5
	])
	const i = Math.min(
		Math.floor(sens / 10),
		scale_points.length - 2
	)
	const t = sens / 10 - i
	return dpi * (scale_points[i] + (scale_points[i + 1] - scale_points[i]) * t)
}
/** * @returns {number} */
export function calc_dpi_fn() {
	if (state.dpi_norm.game !== "fn") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { height, width } = state.game
	return dpi * sens / calc_sens_fn(80, width, height)
}
/** @returns {number} */
export function calc_dpi_mc() {
	if (state.dpi_norm.game !== "mc") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { width, height } = state.game
	const hfov_deg = convert_deg_across_aspect(110, height, width)
	const dpi_sens_rad = dpi * to_rad(1.2) * (.2 + .006 * sens) ** 3
	return dpi_sens_rad / calc_rad_per_px(hfov_deg, width, height)
}
/** @returns {number} */
export function calc_dpi_ow() {
	if (state.dpi_norm.game !== "ow") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { width, height } = state.game
	return dpi * sens / calc_sens_ow(103, width, height)
}
/** @returns {number} */
export function calc_dpi_pubg() {
	if (state.dpi_norm.game !== "pubg") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { height, width } = state.game
	const base_fov = 80
	const base_sens = 50
	const base_yaw = .044_440_000_444_4
	const step = 15.051_5
	const dpi_sens_rad = dpi * to_rad(base_yaw)
			* 2 ** ((sens - base_sens) / step)
	return dpi_sens_rad / calc_rad_per_px(base_fov, width, height)
}
/** @returns {number} */
export function calc_dpi_sa() {
	if (state.dpi_norm.game !== "sa") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { height } = state.game
	const dpi_sens_rad = dpi * to_rad(.000_15 + .000_03 * sens)
	return dpi_sens_rad / calc_rad_per_px(85, height * 4 / 3, height)
}
/** @returns {number} */
export function calc_dpi_val() {
	if (state.dpi_norm.game !== "val") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { height, width } = state.game
	const base_hfov = 103
	return dpi * sens / calc_sens_val(base_hfov, width, height)
}