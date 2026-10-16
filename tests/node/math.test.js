import {
	EPS,
	PSI,
	TAU,
	calc_core_radius,
	clamp,
	convert_deg_across_aspect,
	lerp,
	normalize_rad,
	round_to,
	to_deg,
	to_rad
} from "../../docs/js/math.js"
import { describe, expect, it } from "vitest"
describe(
	"math.js",
	() => {
		it(
			"PSI is the supergolden ratio, the real root of x^3 = x^2 + 1",
			() => {
				expect(PSI ** 3).toBeCloseTo(PSI ** 2 + 1, 12)
				expect(PSI).toBeCloseTo(1.465_571_231_876_768, 12)
			}
		)
		it(
			"TAU is a full turn and EPS a tiny positive tolerance",
			() => {
				expect(TAU).toBe(2 * Math.PI)
				expect(EPS).toBe(1e-9)
			}
		)
		it(
			"calc_core_radius is a third of the radius but at least half of the base",
			() => {
				expect(calc_core_radius(30)).toBe(15)
				expect(calc_core_radius(30, 10)).toBe(10)
				expect(calc_core_radius(30, 40)).toBe(20)
			}
		)
		it(
			"clamp keeps the value within the bounds",
			() => {
				expect(clamp(0, -1, 1)).toBe(0)
				expect(clamp(0, .5, 1)).toBe(.5)
				expect(clamp(0, 2, 1)).toBe(1)
			}
		)
		it(
			"convert_deg_across_aspect is the identity at equal spans and 90 degrees doubles to 90 at a 1:1 swap",
			() => {
				expect(
					convert_deg_across_aspect(90, 1, 1)
				).toBeCloseTo(90, 10)
				expect(
					convert_deg_across_aspect(90, 2, 1)
				).toBeCloseTo(
					2 * Math.atan(.5) * 180 / Math.PI,
					10
				)
			}
		)
		it(
			"convert_deg_across_aspect round-trips between the two axes",
			() => {
				const there = convert_deg_across_aspect(103, 9, 16)
				expect(
					convert_deg_across_aspect(there, 16, 9)
				).toBeCloseTo(103, 10)
				expect(there).toBeGreaterThan(103)
			}
		)
		it(
			"lerp interpolates linearly and extrapolates outside 0..1",
			() => {
				expect(lerp(10, 20, 0)).toBe(10)
				expect(lerp(10, 20, 1)).toBe(20)
				expect(lerp(10, 20, .25)).toBe(12.5)
				expect(lerp(10, 20, 2)).toBe(30)
			}
		)
		it(
			"normalize_rad wraps any angle into [0, TAU)",
			() => {
				expect(normalize_rad(0)).toBe(0)
				expect(normalize_rad(-Math.PI / 2)).toBeCloseTo(1.5 * Math.PI, 12)
				expect(normalize_rad(TAU + 1)).toBeCloseTo(1, 12)
				expect(normalize_rad(-5 * TAU - .5)).toBeCloseTo(TAU - .5, 10)
			}
		)
		it(
			"round_to rounds to the given decimals as a number",
			() => {
				expect(round_to(1.23456, 2)).toBe(1.23)
				expect(round_to(1.235_6, 3)).toBe(1.236)
				expect(round_to(7.6, 0)).toBe(8)
			}
		)
		it(
			"to_deg and to_rad convert known angles and invert each other",
			() => {
				expect(to_deg(Math.PI)).toBe(180)
				expect(to_rad(180)).toBe(Math.PI)
				expect(to_rad(90)).toBeCloseTo(Math.PI / 2, 14)
				expect(to_deg(to_rad(37.5))).toBeCloseTo(37.5, 12)
			}
		)
	}
)