import constants from "../constants.js"
import { log2, sqrt } from "../math.js"
import { create_pool } from "./pool.js"
import { create_queue } from "./queue.js"
/**
 * @returns {{
 *	 clear(): void
 *	 click(x: number, y: number, now_ms: number): void
 *	 expire(until_ms: number): void
 *	 reset(): void
 *	 throughput(): number
 *	 trial(target_x: number, target_y: number, x: number, y: number, now_ms: number): void
 * }}
 */
export function create_fitts() {
	let click_ms = 0
	let click_x = 0
	let click_y = 0
	let count = 0
	let dist = 0
	let err = 0
	let err2 = 0
	let has_click = false
	let ms = 0
	const pool = create_pool(
		() => ({ d: 0, e: 0, ms: 0, t: 0 })
	)
	/**
	 * @type {ReturnType<typeof create_queue<{
	 *	 d: number
	 *	 e: number
	 *	 ms: number
	 *	 t: number
	 * }>>}
	 */
	const trials = create_queue()
	/** @returns {void} */
	function clear() {
		count = 0
		dist = 0
		err = 0
		err2 = 0
		ms = 0
		pool.clear()
		trials.clear()
		reset()
	}
	/**
	 * @param {number} x
	 * @param {number} y
	 * @param {number} now_ms
	 * @returns {void}
	 */
	function click(x, y, now_ms) {
		click_ms = now_ms
		click_x = x
		click_y = y
		has_click = true
	}
	/**
	 * @param {number} until_ms
	 * @returns {void}
	 */
	function expire(until_ms) {
		while (trials.length) {
			const first = trials.at()
			if (until_ms >= first.t) {
				count--
				dist -= first.d
				err -= first.e
				err2 -= first.e * first.e
				ms -= first.ms
				trials.drop()
				pool.recycle(first)
			} else {
				break
			}
		}
	}
	/** @returns {void} */
	function reset() {
		has_click = false
	}
	/** @returns {number} */
	function throughput() {
		const { trial_min, we_factor } = constants.fitts
		if (count < trial_min) {
			return 0
		}
		const mean_err = err / count
		const width = we_factor * sqrt(
			err2 / count - mean_err * mean_err
		)
		return log2(dist / count / width + 1)
			/ (ms / count / 1_000)
	}
	/**
	 * @param {number} target_x
	 * @param {number} target_y
	 * @param {number} x
	 * @param {number} y
	 * @param {number} now_ms
	 * @returns {void}
	 */
	function trial(target_x, target_y, x, y, now_ms) {
		if (has_click) {
			const dx = target_x - click_x
			const dy = target_y - click_y
			const d = sqrt(dx * dx + dy * dy)
			const trial_ms = now_ms - click_ms
			if (d && trial_ms) {
				const e = ((x - target_x) * dx + (y - target_y) * dy) / d
				const entry = pool.obtain()
				entry.d = d
				entry.e = e
				entry.ms = trial_ms
				entry.t = now_ms
				trials.push(entry)
				count++
				dist += d
				err += e
				err2 += e * e
				ms += trial_ms
			}
		}
		click(x, y, now_ms)
	}
	return {
		clear,
		click,
		expire,
		reset,
		throughput,
		trial
	}
}