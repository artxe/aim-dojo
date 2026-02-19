import {
	convert_deg_across_aspect,
	to_rad
} from "../math.js"
import state from "../state.js"
import {
	calc_sens_cs2,
	calc_sens_fn,
	calc_sens_ow,
	calc_sens_val,
	compute_ang_weighted_avg_sens_rad
} from "./calc_sens.js"
/** @returns {number} */
export function calc_dpi_cs2() {
	if (state.dpi_norm.game !== "cs2") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, fov, sens } = state.dpi_norm
	const { height, width } = state.game
	if (fov == "hipfire") {
		return dpi * sens / calc_sens_cs2(90, height, width)
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
	return dpi * sens * zoom / calc_sens_cs2(hfov_deg, height, width)
}
/** @returns {number} */
export function calc_dpi_lol() {
	if (state.dpi_norm.game !== "lol") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, sens } = state.dpi_norm
	if (sens < 10) {
		return dpi * (.031_25 + sens * .093_75 / 10)
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
		return dpi * sens / calc_sens_fn(80, width)
	}
	const { zoom } = state.dpi_norm
	return dpi * sens * zoom / 100 / calc_sens_fn(80, width)
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
	return dpi_sens_rad / compute_ang_weighted_avg_sens_rad(hfov_deg, width)
}
/** @returns {number} */
export function calc_dpi_ow() {
	if (state.dpi_norm.game !== "ow") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, fov, sens } = state.dpi_norm
	const { width, height } = state.game
	if (fov == "hipfire") {
		return dpi * sens / calc_sens_ow(103, width)
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
	return dpi * sens * zoom / 100 / calc_sens_ow(hfov_deg, width)
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
	const base_yaw = .044_440_000_444_4
	const step = 15.051_5
	let hfov_deg
	if (fov == "tpp" || fov == "x1") {
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
	return dpi_sens_rad / compute_ang_weighted_avg_sens_rad(hfov_deg, width)
}
/** @returns {number} */
export function calc_dpi_sa() {
	if (state.dpi_norm.game !== "sa") {
		throw Error(state.dpi_norm.game)
	}
	const { dpi, fov, sens } = state.dpi_norm
	const { height, width } = state.game
	const dpi_sens_rad = dpi * to_rad(.000_15 + .000_03 * sens)
	return dpi_sens_rad / compute_ang_weighted_avg_sens_rad(
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
	const { width } = state.game
	const base_hfov = 103
	if (fov == "hipfire") {
		return dpi * sens / calc_sens_val(base_hfov, width)
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
	return dpi * sens * zoom / calc_sens_val(hfov_deg, width)
}