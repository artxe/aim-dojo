import constants from "../../docs/js/constants.js"
import { create_fitts } from "../../docs/js/struct/fitts.js"
import { describe, expect, it } from "vitest"
const { trial_min, we_factor } = constants.fitts
const SD_OF_SYMMETRIC_ERRORS = Math.sqrt(2)
const WIDTH = we_factor * SD_OF_SYMMETRIC_ERRORS
const EXPECTED_TP = Math.log2(100 / WIDTH + 1) / .5
/**
 * @param {ReturnType<typeof create_fitts>} fitts
 * @param {number[]} errors
 * @returns {void}
 */
function feed_trials(fitts, errors) {
	errors.forEach(
		(e, i) => {
			fitts.click(0, 0, i * 1_000)
			fitts.trial(100, 0, 100 + e, 0, i * 1_000 + 500)
		}
	)
}
describe(
	"struct/fitts.js",
	() => {
		it(
			"a trial with zero distance or zero time is skipped",
			() => {
				const fitts = create_fitts()
				for (let i = 0; i < trial_min * 2; i++) {
					fitts.click(10, 10, i * 1_000)
					fitts.trial(10, 10, 12, 10, i * 1_000 + 500)
					fitts.click(0, 0, i * 1_000)
					fitts.trial(100, 0, 100 + i, 0, i * 1_000)
				}
				expect(fitts.throughput()).toBe(0)
			}
		)
		it(
			"a trial without a pending click is not counted but arms the next one",
			() => {
				const fitts = create_fitts()
				fitts.trial(100, 0, 0, 0, 0)
				fitts.trial(100, 0, 101, 0, 500)
				feed_trials(fitts, [ -2, -1, 0 ])
				expect(fitts.throughput()).toBe(0)
				feed_trials(fitts, [ 1 ])
				expect(fitts.throughput()).toBeGreaterThan(0)
			}
		)
		it(
			"clear forgets every trial and the pending click",
			() => {
				const fitts = create_fitts()
				feed_trials(fitts, [ -2, -1, 0, 1, 2 ])
				fitts.click(0, 0, 9_000)
				fitts.clear()
				expect(fitts.throughput()).toBe(0)
				fitts.trial(100, 0, 100, 0, 10_000)
				feed_trials(fitts, [ -2, -1, 0, 1 ])
				expect(fitts.throughput()).toBe(0)
			}
		)
		it(
			"expire can drop everything and the recycled entries are reused cleanly",
			() => {
				const fitts = create_fitts()
				feed_trials(fitts, [ -2, -1, 0, 1, 2 ])
				fitts.expire(10_000)
				expect(fitts.throughput()).toBe(0)
				feed_trials(fitts, [ -2, -1, 0, 1, 2 ])
				expect(fitts.throughput()).toBeCloseTo(EXPECTED_TP, 10)
			}
		)
		it(
			"expire drops trials up to and including the given time and keeps later ones",
			() => {
				const fitts = create_fitts()
				feed_trials(fitts, [ -2, -1, 0, 1, 2, 3 ])
				fitts.expire(499)
				expect(fitts.throughput()).toBeGreaterThan(0)
				fitts.expire(500)
				expect(fitts.throughput()).toBeCloseTo(EXPECTED_TP, 10)
				fitts.expire(1_499)
				expect(fitts.throughput()).toBeCloseTo(EXPECTED_TP, 10)
				fitts.expire(1_500)
				expect(fitts.throughput()).toBe(0)
			}
		)
		it(
			"reset drops the pending click so the next trial is not counted",
			() => {
				const fitts = create_fitts()
				for (let i = 0; i < trial_min; i++) {
					fitts.click(0, 0, i * 1_000)
					fitts.reset()
					fitts.trial(100, 0, 100 + i, 0, i * 1_000 + 500)
				}
				expect(fitts.throughput()).toBe(0)
			}
		)
		it(
			"the axial error is signed along the click to target direction",
			() => {
				const fitts = create_fitts()
				for (const [ i, e ] of [ -2, -1, 0, 1, 2 ].entries()) {
					fitts.click(0, 0, i * 1_000)
					fitts.trial(0, 50, 7, 50 + e, i * 1_000 + 250)
				}
				expect(fitts.throughput()).toBeCloseTo(
					Math.log2(50 / WIDTH + 1) / .25,
					10
				)
			}
		)
		it(
			"throughput is log2(D / We + 1) over mean movement time with We = we_factor x SD of axial errors",
			() => {
				const fitts = create_fitts()
				feed_trials(fitts, [ -2, -1, 0, 1, 2 ])
				expect(fitts.throughput()).toBeCloseTo(EXPECTED_TP, 10)
			}
		)
		it(
			"throughput is zero below trial_min trials",
			() => {
				const fitts = create_fitts()
				feed_trials(fitts, [ -2, -1, 0, 1 ])
				expect(fitts.throughput()).toBe(0)
			}
		)
		it(
			"trial_min is five trials",
			() => {
				expect(trial_min).toBe(5)
			}
		)
	}
)