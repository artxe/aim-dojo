/* eslint
no-restricted-syntax: [
	"error",
	{ "selector": "ImportDeclaration:not([source.value='../math.js']):not([source.value='./calc_sens.js'])" }
]
*/
import { abs, sqrt } from "../math.js"
import { calc_sens_pubg } from "./calc_sens.js"
/**
 * @param {number} sens
 * @returns {number}
 */
export function calc_pubg_converted(sens) {
	const base_sens = 50
	const step = 15.051_5
	return .02 * 2 ** ((sens - base_sens) / step)
}
/**
 * @param {number} sens
 * @param {number} width
 * @returns {number}
 */
export function calc_pubg_fpp_fov(sens, width) {
	const gr = (sqrt(5) - 1) / 2
	let a = 80
	let b = 103
	let c = b - gr * (b - a)
	let d = a + gr * (b - a)
	let fc = err(c)
	let fd = err(d)
	const tol = 1e-12
	while ((b - a) > tol * (abs((a + b) / 2) + 1)) {
		if (fc < fd) {
			b = d
			d = c
			fd = fc
			c = b - gr * (b - a)
			fc = err(c)
		} else {
			a = c
			c = d
			fc = fd
			d = a + gr * (b - a)
			fd = err(d)
		}
	}
	return (a + b) / 2
	/**
	 * @param {number} fov
	 * @returns {number}
	 */
	function err(fov) {
		return abs(
			sens - calc_sens_pubg(fov, width)
		)
	}
}