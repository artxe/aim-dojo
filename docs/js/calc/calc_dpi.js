import constants from "../constants.js"
import {
	convert_deg_across_aspect,
	to_rad
} from "../math.js"
import state from "../state.js"
import {
	calc_rad_per_px,
	calc_sens_al,
	calc_sens_bdo,
	calc_sens_cs2,
	calc_sens_fn,
	calc_sens_ow,
	calc_sens_r6,
	calc_sens_val,
	lol_sens_to_dpi_scale
} from "./calc_sens.js"
/** @returns {number} */
export function calc_dpi_al() {
	if (state.dpi_norm.game !== "al") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { height, width } = state.game
	return dpi * sens / calc_sens_al(
		constants.fov.al.hipfire,
		width,
		height
	)
}
/** @returns {number} */
export function calc_dpi_bdo() {
	if (state.dpi_norm.game !== "bdo") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { height, width } = state.game
	return dpi * sens / calc_sens_bdo(width, height)
}
/** @returns {number} */
export function calc_dpi_cs2() {
	if (state.dpi_norm.game !== "cs2") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { height, width } = state.game
	return dpi * sens / calc_sens_cs2(
		constants.fov.cs2.hipfire,
		width,
		height
	)
}
/** @returns {number} */
export function calc_dpi_fn() {
	if (state.dpi_norm.game !== "fn") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { width } = state.game
	return dpi * sens / calc_sens_fn(constants.fov.fn.hipfire, width)
}
/** @returns {number} */
export function calc_dpi_lol() {
	if (state.dpi_norm.game !== "lol") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	return dpi * lol_sens_to_dpi_scale(sens)
}
/** @returns {number} */
export function calc_dpi_mc() {
	if (state.dpi_norm.game !== "mc") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { width, height } = state.game
	const hfov_deg = convert_deg_across_aspect(
		constants.fov.mc.hipfire,
		height,
		width
	)
	const dpi_sens_rad = dpi * to_rad(1.2) * (.2 + .6 * sens) ** 3
	return dpi_sens_rad / calc_rad_per_px(hfov_deg, width)
}
/** @returns {number} */
export function calc_dpi_ow() {
	if (state.dpi_norm.game !== "ow") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { width } = state.game
	return dpi * sens / calc_sens_ow(constants.fov.ow.hipfire, width)
}
/** @returns {number} */
export function calc_dpi_pubg() {
	if (state.dpi_norm.game !== "pubg") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { pubg_fov, width } = state.game
	const base_fov = constants.fov.pubg.base
	const base_sens = 50
	const base_yaw = .044_440_000_444_4
	const step = 15.051_5
	const dpi_sens_rad = dpi * to_rad(pubg_fov / base_fov * base_yaw)
			* 2 ** ((sens - base_sens) / step)
	return dpi_sens_rad / calc_rad_per_px(pubg_fov, width)
}
/** @returns {number} */
export function calc_dpi_r6() {
	if (state.dpi_norm.game !== "r6") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { height, width } = state.game
	return dpi * sens / calc_sens_r6(
		constants.fov.r6.base,
		width,
		height
	)
}
/** @returns {number} */
export function calc_dpi_sa() {
	if (state.dpi_norm.game !== "sa") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { height } = state.game
	const dpi_sens_rad = dpi * to_rad(.000_15 + .000_03 * sens)
	return dpi_sens_rad / calc_rad_per_px(
		constants.fov.sa.hipfire,
		height * 4 / 3
	)
}
/** @returns {number} */
export function calc_dpi_val() {
	if (state.dpi_norm.game !== "val") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	const { width } = state.game
	const base_hfov = constants.fov.val.hipfire
	return dpi * sens / calc_sens_val(base_hfov, width)
}