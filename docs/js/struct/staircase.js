import constants from "../constants.js"
import { clamp, max, round_to } from "../math.js"
/**
 * @param {number} level
 * @returns {{
 *	 feed(rate: number): void
 *	 level: number
 * }}
 */
export function create_staircase(level) {
	const staircase = { feed, level }
	let dir = 0
	/** @type {number} */
	let step = constants.staircase.step
	/**
	 * @param {number} rate
	 * @returns {void}
	 */
	function feed(rate) {
		const {
			band_max,
			band_min,
			step_decay,
			step_min
		} = constants.staircase
		const next_dir = rate > band_max ? 1 : rate < band_min ? -1 : 0
		if (!next_dir) {
			return
		}
		if (dir && next_dir != dir) {
			step = max(step * step_decay, step_min)
		}
		dir = next_dir
		staircase.level = round_to(
			clamp(
				0,
				staircase.level + next_dir * step,
				1
			),
			4
		)
	}
	return staircase
}