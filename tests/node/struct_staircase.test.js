import { create_staircase } from "../../docs/js/struct/staircase.js"
import { describe, expect, it } from "vitest"
describe(
	"struct/staircase.js",
	() => {
		it(
			"a rate above the band steps the level up and below it steps down",
			() => {
				const staircase = create_staircase(.5)
				staircase.feed(.9)
				expect(staircase.level).toBe(.58)
				staircase.feed(.9)
				expect(staircase.level).toBe(.66)
			}
		)
		it(
			"a rate inside the band does not count as a reversal",
			() => {
				const staircase = create_staircase(.5)
				staircase.feed(.9)
				staircase.feed(.78)
				staircase.feed(.9)
				expect(staircase.level).toBe(.66)
			}
		)
		it(
			"a rate inside the band leaves the level alone",
			() => {
				const staircase = create_staircase(.5)
				staircase.feed(.7)
				staircase.feed(.78)
				staircase.feed(.85)
				expect(staircase.level).toBe(.5)
			}
		)
		it(
			"a reversal shrinks the step by the decay factor",
			() => {
				const staircase = create_staircase(.5)
				staircase.feed(.9)
				staircase.feed(.9)
				staircase.feed(.5)
				expect(staircase.level).toBe(.604)
				staircase.feed(.5)
				expect(staircase.level).toBe(.548)
			}
		)
		it(
			"starts at the given level",
			() => {
				expect(create_staircase(.3).level).toBe(.3)
			}
		)
		it(
			"the level stays within 0 and 1",
			() => {
				const top = create_staircase(.97)
				top.feed(.9)
				expect(top.level).toBe(1)
				const bottom = create_staircase(.03)
				bottom.feed(.1)
				expect(bottom.level).toBe(0)
			}
		)
		it(
			"the step never shrinks below its minimum",
			() => {
				const staircase = create_staircase(.5)
				for (let i = 0; i < 40; i++) {
					staircase.feed(i % 2 ? .5 : .9)
				}
				const before = staircase.level
				staircase.feed(.9)
				const after = staircase.level
				staircase.feed(.5)
				expect(Math.abs(after - before)).toBeCloseTo(.015, 4)
				expect(staircase.level).toBeCloseTo(before, 4)
			}
		)
	}
)