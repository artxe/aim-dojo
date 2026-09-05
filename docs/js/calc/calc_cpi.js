import constants from "../constants.js"
import { to_rad } from "../math.js"
import state from "../state.js"
import {
	calc_rad_per_px,
	calc_real_hfov,
	calc_sens_al,
	calc_sens_cs2,
	calc_sens_fn,
	calc_sens_ow,
	calc_sens_r6,
	calc_sens_rb,
	calc_sens_val,
	lol_sens_to_cpi_scale
} from "./calc_sens.js"
/** @returns {number} */
export function calc_cpi_al() {
	if (state.cpi_norm.game != "al") {
		throw Error(state.cpi_norm.game)
	}
	const { cpi, sens } = state.cpi_norm
	const { cpi_scale, height, width } = state.game
	return cpi * sens / calc_sens_al(
		constants.fov.al.hipfire,
		width / cpi_scale,
		height / cpi_scale
	)
}
/** @returns {number} */
export function calc_cpi_bdo() {
	if (state.cpi_norm.game != "bdo") {
		throw Error(state.cpi_norm.game)
	}
	const { cpi, sens } = state.cpi_norm
	const { cpi_scale, height, width } = state.game
	const { axis, hipfire } = constants.fov.bdo
	const calc_height = height / cpi_scale
	const calc_width = width / cpi_scale
	const hfov_deg = calc_real_hfov(
		axis,
		hipfire,
		calc_width,
		calc_height
	)
	const { offset, step } = constants.sens.bdo
	const cpi_sens_rad = cpi * cpi_scale * (offset + step * sens)
	return cpi_sens_rad / calc_rad_per_px(hfov_deg, calc_width)
}
/** @returns {number} */
export function calc_cpi_cs2() {
	if (state.cpi_norm.game != "cs2") {
		throw Error(state.cpi_norm.game)
	}
	const { cpi, sens } = state.cpi_norm
	const { cpi_scale, height, width } = state.game
	return cpi * sens / calc_sens_cs2(
		constants.fov.cs2.hipfire,
		width / cpi_scale,
		height / cpi_scale
	)
}
/** @returns {number} */
export function calc_cpi_fn() {
	if (state.cpi_norm.game != "fn") {
		throw Error(state.cpi_norm.game)
	}
	const { cpi, sens } = state.cpi_norm
	const { cpi_scale, height, width } = state.game
	return cpi * sens / calc_sens_fn(
		constants.fov.fn.hipfire,
		width / cpi_scale,
		height / cpi_scale
	)
}
/** @returns {number} */
export function calc_cpi_lol() {
	if (state.cpi_norm.game != "lol") {
		throw Error(state.cpi_norm.game)
	}
	const { cpi, sens } = state.cpi_norm
	return cpi * lol_sens_to_cpi_scale(sens)
}
/** @returns {number} */
export function calc_cpi_mc() {
	if (state.cpi_norm.game != "mc") {
		throw Error(state.cpi_norm.game)
	}
	const { cpi, sens } = state.cpi_norm
	const { cpi_scale, height, width } = state.game
	const { axis, hipfire } = constants.fov.mc
	const calc_height = height / cpi_scale
	const calc_width = width / cpi_scale
	const hfov_deg = calc_real_hfov(
		axis,
		hipfire,
		calc_width,
		calc_height
	)
	const { base, offset, step } = constants.sens.mc
	const cpi_sens_rad = cpi * to_rad(base) * (offset + step * sens) ** 3
	return cpi_sens_rad / calc_rad_per_px(hfov_deg, calc_width)
}
/** @returns {number} */
export function calc_cpi_ow() {
	if (state.cpi_norm.game != "ow") {
		throw Error(state.cpi_norm.game)
	}
	const { cpi, sens } = state.cpi_norm
	const { cpi_scale, width } = state.game
	return cpi * sens / calc_sens_ow(
		constants.fov.ow.hipfire,
		width / cpi_scale
	)
}
/** @returns {number} */
export function calc_cpi_pubg() {
	if (state.cpi_norm.game != "pubg") {
		throw Error(state.cpi_norm.game)
	}
	const { cpi, sens } = state.cpi_norm
	const { cpi_scale, pubg_fov, width } = state.game
	const base_fov = constants.fov.pubg.base
	const { base_sens, base_yaw, step } = constants.sens.pubg
	const cpi_sens_rad = cpi * to_rad(pubg_fov / base_fov * base_yaw)
			* 2 ** ((sens - base_sens) / step)
	return cpi_sens_rad / calc_rad_per_px(pubg_fov, width / cpi_scale)
}
/** @returns {number} */
export function calc_cpi_r6() {
	if (state.cpi_norm.game != "r6") {
		throw Error(state.cpi_norm.game)
	}
	const { cpi, sens } = state.cpi_norm
	const { cpi_scale, height, width } = state.game
	return cpi * sens / calc_sens_r6(
		constants.fov.r6.base,
		width / cpi_scale,
		height / cpi_scale
	)
}
/** @returns {number} */
export function calc_cpi_rb() {
	if (state.cpi_norm.game != "rb") {
		throw Error(state.cpi_norm.game)
	}
	const { cpi, sens } = state.cpi_norm
	const { cpi_scale, height, width } = state.game
	return cpi * sens / calc_sens_rb(
		constants.fov.rb.rivals.hipfire,
		width / cpi_scale,
		height / cpi_scale
	)
}
/** @returns {number} */
export function calc_cpi_sa() {
	if (state.cpi_norm.game != "sa") {
		throw Error(state.cpi_norm.game)
	}
	const { cpi, sens } = state.cpi_norm
	const { cpi_scale, height, width } = state.game
	const { axis, hipfire } = constants.fov.sa
	const { offset, step } = constants.sens.sa
	const cpi_sens_rad = cpi * (offset + step * sens)
	const hfov_deg = calc_real_hfov(
		axis,
		hipfire,
		width / cpi_scale,
		height / cpi_scale
	)
	return cpi_sens_rad / calc_rad_per_px(hfov_deg, width / cpi_scale)
}
/** @returns {number} */
export function calc_cpi_val() {
	if (state.cpi_norm.game != "val") {
		throw Error(state.cpi_norm.game)
	}
	const { cpi, sens } = state.cpi_norm
	const { cpi_scale, height, width } = state.game
	const base_hfov = constants.fov.val.hipfire
	return cpi * sens / calc_sens_val(
		base_hfov,
		width / cpi_scale,
		height / cpi_scale
	)
}