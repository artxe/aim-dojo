import {
	abs,
	cbrt,
	convert_deg_across_aspect,
	floor,
	log2,
	tan,
	to_rad
} from "./math.js"
import state from "./state.js"
/** @returns {number} */
export function calc_dpi_cs2() {
	if (state.dpi_norm.game !== "cs2") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, fov, sens } = state.dpi_norm
	if (fov == "hipfire") {
		return dpi * sens / calc_sens_cs2(90)
	}
	const { zoom } = state.dpi_norm
	let hfov_deg
	if (fov == "aug") {
		hfov_deg = 45
	} else if (fov == "awp") {
		hfov_deg = 40
	} else {
		throw Error(fov)
	}
	return dpi * sens * zoom / calc_sens_cs2(hfov_deg)
}
/** @returns {number} */
export function calc_dpi_lol() {
	if (state.dpi_norm.game !== "lol") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	if (sens < 10) {
		return dpi * (.03125 + sens * .09375 / 10)
	}
	if (sens < 20) {
		return dpi * (.125 + (sens - 10) * .125 / 10)
	}
	if (sens < 30) {
		return dpi * (.25 + (sens - 20) * .25 / 10)
	}
	if (sens < 40) {
		return dpi * (.5 + (sens - 30) * .25 / 10)
	}
	if (sens < 50) {
		return dpi * (.75 + (sens - 40) * .25 / 10)
	}
	if (sens < 60) {
		return dpi * (1 + (sens - 50) * .5 / 10)
	}
	if (sens < 70) {
		return dpi * (1.5 + (sens - 60) * .5 / 10)
	}
	if (sens < 80) {
		return dpi * (2 + (sens - 70) * .5 / 10)
	}
	if (sens < 90) {
		return dpi * (2.5 + (sens - 80) * .5 / 10)
	}
	return dpi * (3 + (sens - 90) * .5 / 10)
}
/** * @returns {number} */
export function calc_dpi_fn() {
	if (state.dpi_norm.game !== "fn") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, fov, sens } = state.dpi_norm
	const { width } = state.game
	if (fov == "hipfire") {
		return dpi * sens / calc_sens_fn(80, width * .87)
	}
	const { zoom } = state.dpi_norm
	let hfov_deg
	if (fov == "ads") {
		return dpi * sens * zoom / 100 / calc_sens_fn(80)
	}
	if (fov == "ar_legacy") {
		hfov_deg = 40
	} else if (fov == "sniper_legacy") {
		hfov_deg = 15
	} else {
		throw Error(fov)
	}
	return dpi * sens * zoom / 100
		/ (compute_sens_rad(hfov_deg) / to_rad(.005555 * hfov_deg / 80))
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
	return dpi_sens_rad / compute_sens_rad(hfov_deg)
}
/** @returns {number} */
export function calc_dpi_ow() {
	if (state.dpi_norm.game !== "ow") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, fov, sens } = state.dpi_norm
	const { width, height } = state.game
	if (fov == "hipfire") {
		return dpi * sens / calc_sens_ow(103)
	}
	const { zoom } = state.dpi_norm
	let hfov_deg
	if (fov == "ashe") {
		hfov_deg = convert_deg_across_aspect(40, height, width)
	} else if (fov == "freja") {
		hfov_deg = 76
	} else if (fov == "widow") {
		hfov_deg = convert_deg_across_aspect(30, height, width)
	} else {
		throw Error(fov)
	}
	return dpi * sens * zoom / 100 / calc_sens_ow(hfov_deg)
}
/** @returns {number} */
export function calc_dpi_pubg() {
	if (state.dpi_norm.game !== "pubg") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, fov, sens } = state.dpi_norm
	const { width } = state.game
	const base_fov = 80
	const base_sens = 50
	const base_yaw = .0444400004444
	const step = 15.0515
	if (fov == "tpp") {
		const dpi_sens_rad = dpi * to_rad(base_yaw)
			* 2 ** ((sens - base_sens) / step)
		return dpi_sens_rad / compute_sens_rad(base_fov, width * .87)
	}
	let hfov_deg
	if (fov == "x1") {
		hfov_deg = base_fov
	} else if (fov == "x2") {
		hfov_deg = base_fov / 2
	} else if (fov == "x3") {
		hfov_deg = base_fov / 3
	} else if (fov == "x4") {
		hfov_deg = base_fov / 4
	} else if (fov == "x6") {
		hfov_deg = base_fov / 6
	} else if (fov == "x8") {
		hfov_deg = base_fov / 8
	} else if (fov == "x15") {
		hfov_deg = base_fov / 15
	} else {
		throw Error(fov)
	}
	const dpi_sens_rad = dpi * to_rad(hfov_deg / base_fov * base_yaw)
			* 2 ** ((sens - base_sens) / step)
	return dpi_sens_rad / compute_sens_rad(hfov_deg)
}
/** @returns {number} */
export function calc_dpi_sa() {
	if (state.dpi_norm.game !== "sa") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, fov, sens } = state.dpi_norm
	const { height, width } = state.game
	const dpi_sens_rad = dpi * to_rad(.00015 + .00003 * sens)
	return dpi_sens_rad / compute_sens_rad(
		85,
		fov == "normal" ? height * 4 / 3 : width
	)
}
/** @returns {number} */
export function calc_dpi_val() {
	if (state.dpi_norm.game !== "val") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, fov, sens } = state.dpi_norm
	const base_hfov = 103
	if (fov == "hipfire") {
		return dpi * sens / calc_sens_val(base_hfov)
	}
	const { zoom } = state.dpi_norm
	let hfov_deg
	if (fov == "guardian") {
		hfov_deg = convert_deg_across_aspect(base_hfov, 1.5, 1)
	} else if (fov == "marshal") {
		hfov_deg = convert_deg_across_aspect(base_hfov, 3.5, 1)
	} else if (fov == "operator") {
		hfov_deg = convert_deg_across_aspect(base_hfov, 2.5, 1)
	} else if (fov == "spectre") {
		hfov_deg = convert_deg_across_aspect(base_hfov, 1.15, 1)
	} else if (fov == "vandal") {
		hfov_deg = convert_deg_across_aspect(base_hfov, 1.25, 1)
	} else {
		throw Error(fov)
	}
	return dpi * sens * zoom / calc_sens_val(hfov_deg)
}
/**
 * @param {number} sens
 * @returns {number}
 */
export function calc_pubg_converted(sens) {
	const base_sens = 50
	const step = 15.0515
	return .02 * 2 ** ((sens - base_sens) / step)
}
/**
 * @param {number} sens
 * @returns {number}
 */
export function calc_pubg_fpp_fov(sens) {
	const base_fov = 80
	const base_sens = 50
	const base_yaw = .0444400004444
	const step = 15.0515
	let low = 80
	let mid
	let high = 150
	let err = 1
	while (low < high) {
		mid = floor((low + high + 1) / 2)
		const rad_per_count = compute_sens_rad(mid)
		const sens_rad = to_rad(mid / base_fov * base_yaw)
			* 2 ** ((sens - base_sens) / step)
		if (abs(rad_per_count - sens_rad) <= err) {
			low = mid
			err = abs(rad_per_count - sens_rad)
		} else {
			high = mid - 1
		}
	}
	return low
}
/**
 * @param {number} hfov_deg
 * @returns {number}
 */
export function calc_sens_cs2(hfov_deg) {
	const { height, width } = state.game
	const vfov_deg = convert_deg_across_aspect(hfov_deg, height * 4 / 3, height)
	const real_hfov_deg = convert_deg_across_aspect(vfov_deg, height, width)
	return compute_sens_rad(real_hfov_deg)
		/ to_rad(.022 * hfov_deg / 90)
}
/**
 * @param {number} hfov_deg
 * @param {number} [width]
 * @returns {number}
 */
export function calc_sens_fn(
	hfov_deg,
	width = state.game.width
) {
	return compute_sens_rad(hfov_deg, width)
		/ to_rad(
			.005555 * tan(to_rad(hfov_deg) / 2) / tan(to_rad(80) / 2)
		)
}
/**
 * @param {number} vfov_deg
 * @returns {number}
 */
export function calc_sens_mc(vfov_deg) {
	const { width, height } = state.game
	const hfov_deg = convert_deg_across_aspect(vfov_deg, height, width)
	const rad_per_count = compute_sens_rad(hfov_deg)
	return (
		cbrt(rad_per_count / to_rad(1.2)) - .2
	) / .006
}
/**
 * @param {number} hfov_deg
 * @returns {number}
 */
export function calc_sens_ow(hfov_deg) {
	return compute_sens_rad(hfov_deg)
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
	return base_sens + step * (log2(rad_per_count / sens50_yaw))
}
/** @returns {number} */
export function calc_sens_sa() {
	const { height } = state.game
	return (compute_sens_rad(85, height * 4 / 3) - .00015)
		/ .00003
}
/**
 * @param {number} hfov_deg
 * @returns {number}
 */
export function calc_sens_val(hfov_deg) {
	return compute_sens_rad(hfov_deg)
		/ to_rad(.07 * hfov_deg / 103)
}
/**
 * @param {number} fov_deg
 * @param {number} [width]
 * @returns {number}
 */
export function compute_sens_rad(
	fov_deg,
	width = state.game.width
) {
	const { mdm } = state.game
	const half_width = width / 2
	const tangent_half_fov = Math.tan(to_rad(fov_deg) / 2)
	const ratio = mdm / half_width
	const theta_proj = Math.atan(ratio * tangent_half_fov)
	return theta_proj / ratio / half_width
}