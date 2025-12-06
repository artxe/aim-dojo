/* eslint
no-restricted-syntax: [
	"error",
	{ "selector": "ImportDeclaration:not([source.value='../constants.js']):not([source.value='../math.js'])" }
]
*/
import constants from "../constants.js"
import {
	abs,
	atan2,
	cbrt,
	convert_deg_across_aspect,
	cos,
	EPS,
	log2,
	max,
	PI,
	sin,
	sqrt,
	tan,
	to_rad
} from "../math.js"
const GK15_XGK = [
	.9914553711208126,
	.9491079123427585,
	.8648644233597691,
	.7415311855993944,
	.5860872354676911,
	.4058451513773972,
	.2077849550078985,
	.0
]
const GK15_WGK = [
	.02293532201052922,
	.06309209262997855,
	.1047900103222502,
	.1406532597155259,
	.1690047266392679,
	.1903505780647854,
	.2044329400752989,
	.2094821410847278
]
const GK15_WG = [
	.1294849661688697,
	.2797053914892767,
	.3818300505051189,
	.4179591836734694
]
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
 * @param {number} hfov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_fn_tpp(hfov_deg, width) {
	return compute_sens_rad_tpp(hfov_deg, width)
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
 * @param {number} hfov_deg
 * @param {number} width
 * @returns {number}
 */
export function calc_sens_pubg_tpp(hfov_deg, width) {
	const base_fov = 80
	const base_sens = 50
	const base_yaw = .044_440_000_444_4
	const step = 15.051_5
	const sens50_yaw = to_rad(hfov_deg / base_fov * base_yaw)
	const rad_per_count = compute_sens_rad_tpp(hfov_deg, width)
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
	const theta = to_rad(fov_deg / 2)
	const s = sin(theta)
	const c = cos(theta)
	const a = abs(0.5 * c * c / s)
	const b = abs(0.5 * c / s)
	const t0 = atan2(c * c, s)
	const t1 = PI / 2
	const half_len = adaptive_integrate(t0, t1, 12, 0)
	return theta / width / half_len
	/**
	 * @param {number} xa
	 * @param {number} xb
	 * @returns {[number, number]}
	 */
	function gk15_integrate(xa, xb) {
		const center = .5 * (xa + xb)
		const half = .5 * (xb - xa)
		const fc = integrand(center)

		let res_g = GK15_WG[3] * fc
		let res_k = GK15_WGK[7] * fc

		for (let i = 0; i < 7; i++) {
			const absc = half * GK15_XGK[i]
			const f1 = integrand(center - absc)
			const f2 = integrand(center + absc)
			const fsum = f1 + f2

			res_k += GK15_WGK[i] * fsum

			if (i === 1) {
				res_g += GK15_WG[0] * fsum
			} else if (i === 3) {
				res_g += GK15_WG[1] * fsum
			} else if (i === 5) {
				res_g += GK15_WG[2] * fsum
			}
		}

		res_k *= half
		res_g *= half
		return [ res_k, abs(res_k - res_g) ]
	}
	/**
	 * @param {number} t
	 * @returns {number}
	 */
	function integrand(t) {
		const st = sin(t)
		const ct = cos(t)
		return sqrt(
			a * a * st * st + b * b * ct * ct
		)
	}
	/**
	 *
	 * @param {number} xa
	 * @param {number} xb
	 * @param {number} max_depth
	 * @param {number} depth
	 * @returns {number}
	 */
	function adaptive_integrate(xa, xb, max_depth, depth) {
		const [ result, abserr ] = gk15_integrate(xa, xb)
		const tol = max(EPS, EPS * abs(result))
		if (abserr <= tol || depth >= max_depth) {
			return result
		}
		const mid = .5 * (xa + xb)
		return (
			adaptive_integrate(xa, mid, max_depth, depth + 1)
			+ adaptive_integrate(mid, xb, max_depth, depth + 1)
		)
	}
}
/**
 * @param {number} fov_deg
 * @param {number} width
 * @param {number} camera_distance
 * @returns {number}
 */
export function compute_sens_rad_tpp(
	fov_deg,
	width,
	camera_distance = 2
) {
	const { tpp_target_meter: [ a, b ] } = constants.sens
	let w_sum = 0
	let vw_sum = 0
	for (let i = a; i <= b; i++) {
		const v = i / (i + camera_distance)
		const w = 1 / i
		w_sum += w
		vw_sum += v * w
	}
	return compute_sens_rad(fov_deg, width) / vw_sum * w_sum
}