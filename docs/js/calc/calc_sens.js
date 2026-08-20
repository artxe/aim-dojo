import constants from "../constants.js"
import {
	abs,
	atan,
	cbrt,
	convert_deg_across_aspect,
	cos,
	fround,
	log2,
	max,
	min,
	round,
	round_to,
	tan,
	to_rad
} from "../math.js"
/** @type {R6FileSens?} */
let r6_file_cache = null
let r6_file_height = 0
let r6_file_width = 0
/**
 * @param {number} sens
 * @returns {number}
 */
export function calc_pubg_converted(sens) {
	const { base_sens, converted_base, step } = constants.sens.pubg
	return converted_base * 2 ** ((sens - base_sens) / step)
}
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
 * @param {FovAxis} axis
 * @param {number} fov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_real_hfov(axis, fov_deg, width, height) {
	if (axis == "h") {
		return fov_deg
	}
	if (axis == "43") {
		return convert_deg_across_aspect(
			fov_deg,
			4 / 3,
			max(4 / 3, width / height)
		)
	}
	if (axis == "v") {
		return convert_deg_across_aspect(fov_deg, height, width)
	}
	throw Error(axis)
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_al(hfov_deg, width, height) {
	const { axis, hipfire: base_fov } = constants.fov.al
	const real_hfov_deg = calc_real_hfov(axis, hfov_deg, width, height)
	return calc_rad_per_px(real_hfov_deg, width)
		/ to_rad(
			constants.sens.al.scale
			* tan(to_rad(hfov_deg) / 2)
			/ tan(to_rad(base_fov) / 2)
		)
}
/**
 * @param {number} width
 * @param {number} height
 * @param {number} cpi_scale
 * @returns {number}
 */
export function calc_sens_bdo(width, height, cpi_scale) {
	const { axis, hipfire } = constants.fov.bdo
	const { offset, step } = constants.sens.bdo
	const hfov_deg = calc_real_hfov(axis, hipfire, width, height)
	return (
		calc_rad_per_px(hfov_deg, width) / cpi_scale
		- offset
	) / step
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_cs2(hfov_deg, width, height) {
	const { axis, hipfire: base_fov } = constants.fov.cs2
	const real_hfov_deg = calc_real_hfov(axis, hfov_deg, width, height)
	return calc_rad_per_px(real_hfov_deg, width)
		/ to_rad(
			constants.sens.cs2.scale * hfov_deg / base_fov
		)
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_fn(hfov_deg, width, height) {
	const { axis } = constants.fov.fn
	const real_hfov_deg = calc_real_hfov(axis, hfov_deg, width, height)
	return calc_rad_per_px(real_hfov_deg, width)
		/ to_rad(
			constants.sens.fn.scale
			* tan(to_rad(hfov_deg) / 2)
			/ tan(
				to_rad(constants.fov.fn.hipfire) / 2
			)
		)
}
/**
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_mc(width, height) {
	const { axis, hipfire } = constants.fov.mc
	const { base, offset, step } = constants.sens.mc
	const hfov_deg = calc_real_hfov(axis, hipfire, width, height)
	const rad_per_count = calc_rad_per_px(hfov_deg, width)
	return (
		cbrt(rad_per_count / to_rad(base)) - offset
	) / step
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_ow(hfov_deg, width) {
	return calc_rad_per_px(hfov_deg, width)
		/ to_rad(constants.sens.ow.scale)
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_pubg(hfov_deg, width, height) {
	const { axis, base: base_fov } = constants.fov.pubg
	const { base_sens, base_yaw, step } = constants.sens.pubg
	const real_hfov_deg = calc_real_hfov(axis, hfov_deg, width, height)
	const sens50_yaw = to_rad(hfov_deg / base_fov * base_yaw)
	const rad_per_count = calc_rad_per_px(real_hfov_deg, width)
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
	const { axis, base: base_fov } = constants.fov.r6
	const hfov_deg = calc_real_hfov(axis, vfov_deg, width, height)
	return calc_rad_per_px(hfov_deg, width)
		/ to_rad(
			constants.sens.r6.scale
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
	if (r6_file_cache && r6_file_width == width && r6_file_height == height) {
		return r6_file_cache
	}
	const { r6 } = constants.fov
	const { decimals, yaw_unit: yaw_scale } = constants.sens.r6
	const hipfire = calc_sens_r6(r6.base, width, height)
	const yaw_unit = round_to(hipfire * yaw_scale, decimals)
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
	r6_file_height = height
	r6_file_width = width
	return r6_file_cache = {
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
 * @param {number} vfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_rb(vfov_deg, width, height) {
	const { axis } = constants.fov.rb
	const hfov_deg = calc_real_hfov(axis, vfov_deg, width, height)
	return calc_rad_per_px(hfov_deg, width)
		/ to_rad(constants.sens.rb.scale)
}
/**
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_sa(width, height) {
	const { axis, hipfire } = constants.fov.sa
	const { offset, step } = constants.sens.sa
	const real_hfov_deg = calc_real_hfov(axis, hipfire, width, height)
	return (
		calc_rad_per_px(real_hfov_deg, width)
		- offset
	) / step
}
/**
 * @param {GameSensName} sens_name
 * @param {number} ads_fov
 * @param {number} width
 * @param {number} height
 * @param {number} cpi_scale
 * @param {PubgFov} pubg_fov
 * @returns {number}
 */
export function calc_sens_snap(
	sens_name,
	ads_fov,
	width,
	height,
	cpi_scale,
	pubg_fov
) {
	if (sens_name == "al") {
		const { hipfire: hipfire_fov } = constants.fov.al
		const { decimals, mul_decimals } = constants.sens.al
		const exact = calc_sens_al(hipfire_fov, width, height)
		const hipfire = round_to(exact, decimals)
		if (!ads_fov) {
			return hipfire / exact
		}
		const mul = calc_sens_al(ads_fov, width, height) / hipfire
		return round_to(mul, mul_decimals) / mul
	}
	if (sens_name == "bdo") {
		const { decimals, offset, step } = constants.sens.bdo
		const exact = calc_sens_bdo(width, height, cpi_scale)
		return (step * round_to(exact, decimals) + offset)
			/ (step * exact + offset)
	}
	if (sens_name == "cs2") {
		const { hipfire: hipfire_fov } = constants.fov.cs2
		const { decimals, mul_decimals } = constants.sens.cs2
		const exact = calc_sens_cs2(hipfire_fov, width, height)
		const hipfire = round_to(exact, decimals)
		if (!ads_fov) {
			return hipfire / exact
		}
		const mul = calc_sens_cs2(ads_fov, width, height) / hipfire
		return round_to(mul, mul_decimals) / mul
	}
	if (sens_name == "fn") {
		const { hipfire: hipfire_fov } = constants.fov.fn
		const { decimals } = constants.sens.fn
		const hipfire = round_to(
			calc_sens_fn(hipfire_fov, width, height),
			decimals
		)
		return hipfire / calc_sens_fn(
			ads_fov || hipfire_fov,
			width,
			height
		)
	}
	if (sens_name == "lol") {
		return 1
	}
	if (sens_name == "mc") {
		const { decimals, offset, step } = constants.sens.mc
		const exact = calc_sens_mc(width, height)
		return (offset + step * round_to(exact, decimals)) ** 3
			/ (offset + step * exact) ** 3
	}
	if (sens_name == "ow") {
		const { hipfire: hipfire_fov, scopes } = constants.fov.ow
		const { decimals, mul_decimals } = constants.sens.ow
		const exact = calc_sens_ow(hipfire_fov, width)
		const hipfire = round_to(exact, decimals)
		if (!ads_fov) {
			return hipfire / exact
		}
		const mul = calc_sens_ow(
			calc_real_hfov(scopes.axis, ads_fov, width, height),
			width
		) / hipfire * 100
		return round_to(mul, mul_decimals) / mul
	}
	if (sens_name == "pubg") {
		const { decimals, step } = constants.sens.pubg
		const exact = calc_sens_pubg(ads_fov || pubg_fov, width, height)
		return 2 ** (
			(Number(
				fround(exact).toFixed(decimals)
			) - exact) / step
		)
	}
	if (sens_name == "r6") {
		const { base } = constants.fov.r6
		const { decimals, yaw_unit } = constants.sens.r6
		const hipfire = calc_sens_r6(base, width, height)
		const exact = hipfire * yaw_unit
		const snap = round_to(exact, decimals) / exact
		if (!ads_fov) {
			return snap
		}
		const { ads_unit } = calc_sens_r6_file(width, height)
		const mul = calc_sens_r6(ads_fov, width, height) / hipfire
		return snap * round(mul / ads_unit) * ads_unit / mul
	}
	if (sens_name == "rb") {
		const { base, rivals } = constants.fov.rb
		const { decimals, grid, mul_decimals } = constants.sens.rb
		const base_exact = calc_sens_rb(base, width, height)
		const hipfire = round_to(
			calc_sens_rb(rivals.hipfire, width, height),
			decimals
		)
		const rivals_sens = round(
			round_to(
				base_exact / hipfire * 100,
				mul_decimals
			) / grid
		) * grid
		const base_sens = hipfire * rivals_sens / base / 10_000
		if (!ads_fov) {
			return hipfire * rivals_sens / 100 / base_exact
		}
		const scope_exact = calc_sens_rb(ads_fov, width, height)
		const scope_sens = round(
			round_to(
				scope_exact / base_sens / ads_fov,
				mul_decimals
			) / grid
		) * grid
		return base_sens * scope_sens * ads_fov / scope_exact
	}
	if (sens_name == "sa") {
		const { decimals, offset, step } = constants.sens.sa
		const exact = calc_sens_sa(width, height)
		return (step * round_to(exact, decimals) + offset)
			/ (step * exact + offset)
	}
	if (sens_name == "val") {
		const { hipfire: hipfire_fov } = constants.fov.val
		const { decimals, mul_decimals } = constants.sens.val
		const exact = calc_sens_val(hipfire_fov, width, height)
		const hipfire = round_to(exact, decimals)
		if (!ads_fov) {
			return hipfire / exact
		}
		const mul = calc_sens_val(ads_fov, width, height) / hipfire
		return round_to(mul, mul_decimals) / mul
	}
	throw Error(sens_name)
}
/**
 * @param {number} hfov_deg
 * @param {number} width
 * @param {number} height
 * @returns {number}
 */
export function calc_sens_val(hfov_deg, width, height) {
	const { axis, hipfire: base_fov } = constants.fov.val
	const real_hfov_deg = calc_real_hfov(axis, hfov_deg, width, height)
	return calc_rad_per_px(real_hfov_deg, width)
		/ to_rad(
			constants.sens.val.scale * hfov_deg / base_fov
		)
}
/**
 * @param {number} sens
 * @returns {number}
 */
export function lol_sens_to_cpi_scale(sens) {
	const lol_cpi_scale_points = [
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
		lol_cpi_scale_points.length - 2
	)
	const t = sens / 10 - i
	return lol_cpi_scale_points[i]
		+ (
			lol_cpi_scale_points[i + 1]
			- lol_cpi_scale_points[i]
		) * t
}