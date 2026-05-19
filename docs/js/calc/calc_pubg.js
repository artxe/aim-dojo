/* eslint
no-restricted-syntax: [
	"error",
	{ "selector": "ImportDeclaration:not([source.value='../math.js']):not([source.value='./calc_sens.js'])" }
]
*/
/**
 * @param {number} sens
 * @returns {number}
 */
export function calc_pubg_converted(sens) {
	const base_sens = 50
	const step = 15.051_5
	return .02 * 2 ** ((sens - base_sens) / step)
}