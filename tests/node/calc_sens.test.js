import {
	calc_pubg_converted,
	calc_rad_per_px,
	calc_real_hfov,
	calc_sens_al,
	calc_sens_bdo,
	calc_sens_cs2,
	calc_sens_cs2_yaw,
	calc_sens_fn,
	calc_sens_mc,
	calc_sens_ow,
	calc_sens_pubg,
	calc_sens_r6,
	calc_sens_r6_file,
	calc_sens_rb,
	calc_sens_rb_fields,
	calc_sens_sa,
	calc_sens_snap,
	calc_sens_val,
	lol_sens_to_cpi_scale
} from "../../docs/js/calc/calc_sens.js"
import constants from "../../docs/js/constants.js"
import { round_to, to_deg, to_rad } from "../../docs/js/math.js"
import { describe, expect, it } from "vitest"
const ASPECT = 16 / 9
const H = 1_080
const RESOLUTIONS = [
	[ 1_280, 1_024 ],
	[ 1_920, 1_080 ],
	[ 2_560, 1_080 ],
	[ 3_840, 2_160 ]
]
const W = 1_920
/**
 * @param {number} fov_deg
 * @param {number} aspect
 * @returns {number}
 */
function h_from_43(fov_deg, aspect) {
	return to_deg(
		2 * Math.atan(
			Math.tan(to_rad(fov_deg) / 2) * aspect * 3 / 4
		)
	)
}
/**
 * @param {number} vfov_deg
 * @param {number} aspect
 * @returns {number}
 */
function h_from_v(vfov_deg, aspect) {
	return to_deg(
		2 * Math.atan(
			Math.tan(to_rad(vfov_deg) / 2) * aspect
		)
	)
}
/**
 * @param {number} fov_deg
 * @param {number} base_deg
 * @returns {number}
 */
function tan_ratio(fov_deg, base_deg) {
	return Math.tan(to_rad(fov_deg) / 2) / Math.tan(to_rad(base_deg) / 2)
}
/**
 * @param {number} hfov_deg
 * @param {number} rad
 * @returns {number}
 */
function width_for(hfov_deg, rad) {
	return calc_rad_per_px(hfov_deg, 1) / rad
}
describe(
	"calc/calc_sens.js",
	() => {
		describe(
			"calc_rad_per_px",
			() => {
				it(
					"at 90 deg is the mean over the sagitta span, 2 atan(1 - cos 45) / (width (1 - cos 45)) since tan 45 = 1",
					() => {
						const c = Math.SQRT1_2
						expect(
							calc_rad_per_px(90, W) / (2 * Math.atan(1 - c) / (W * (1 - c)))
						).toBeCloseTo(1, 12)
					}
				)
				it(
					"grows with the fov at a fixed width up to 150 deg",
					() => {
						let prev = 0
						for (let fov = 10; fov <= 150; fov += 10) {
							const rad = calc_rad_per_px(fov, W)
							expect(rad).toBeGreaterThan(prev)
							prev = rad
						}
					}
				)
				it(
					"is exactly proportional to 1 / width because the match point is a length",
					() => {
						for (const fov of [ 40, 90, 103, 121.28 ]) {
							expect(
								calc_rad_per_px(fov, W / 2) / calc_rad_per_px(fov, W)
							).toBeCloseTo(2, 12)
							expect(
								calc_rad_per_px(fov, 1) / calc_rad_per_px(fov, W)
							).toBeCloseTo(W, 8)
						}
					}
				)
				it(
					"lies between the edge and the central pitch of the span it averages, atan being concave",
					() => {
						for (const fov of [ 60, 103, 150 ]) {
							const half = to_rad(fov) / 2
							const center = 2 * Math.tan(half) / W
							const match = W * (1 - Math.cos(half)) / 2
							const edge = center / (1 + (center * match) ** 2)
							const rad = calc_rad_per_px(fov, W)
							expect(rad).toBeLessThan(center)
							expect(rad).toBeGreaterThan(edge)
						}
					}
				)
				it(
					"tends to fov / width, the central pixel pitch, as the fov narrows to zero",
					() => {
						expect(
							calc_rad_per_px(.01, W) * W / to_rad(.01)
						).toBeCloseTo(1, 8)
					}
				)
			}
		)
		describe(
			"calc_real_hfov",
			() => {
				it(
					"43 above 4:3 shows the same vertical fov as at 4:3, so 21:9 gains only sides",
					() => {
						const vfov_43 = to_deg(2 * Math.atan(.75))
						for (const [ width, height ] of [
							[ 1_440, 1_080 ],
							[ 1_920, 1_080 ],
							[ 2_560, 1_080 ]
						]) {
							const hfov = calc_real_hfov("43", 90, width, height)
							expect(
								to_deg(
									2 * Math.atan(
										Math.tan(to_rad(hfov) / 2) * height / width
									)
								)
							).toBeCloseTo(vfov_43, 10)
						}
					}
				)
				it(
					"43 keeps the horizontal fov below and at 4:3",
					() => {
						expect(
							calc_real_hfov("43", 90, 1_280, 1_024)
						).toBeCloseTo(90, 10)
						expect(
							calc_real_hfov("43", 90, 1_440, 1_080)
						).toBeCloseTo(90, 10)
					}
				)
				it(
					"43 locks the vertical above 4:3: CS2's 90 shows the well-known 106.26 deg at 16:9",
					() => {
						expect(calc_real_hfov("43", 90, W, H)).toBeCloseTo(to_deg(2 * Math.atan(4 / 3)), 10)
						expect(calc_real_hfov("43", 90, W, H)).toBeCloseTo(106.26, 2)
						expect(
							calc_real_hfov("43", 90, 1_920, 1_200)
						).toBeCloseTo(to_deg(2 * Math.atan(1.2)), 10)
					}
				)
				it(
					"h returns the typed fov unchanged at every aspect, no 16:9 rebase",
					() => {
						for (const [ width, height ] of RESOLUTIONS) {
							expect(
								calc_real_hfov("h", 103, width, height)
							).toBe(103)
						}
					}
				)
				it(
					"throws the axis name for an unknown axis",
					() => {
						expect(
							() => calc_real_hfov(
								/** @type {FovAxis} */("x")/**/,
								90,
								W,
								H
							)
						).toThrow("x")
					}
				)
				it(
					"v widens the vertical fov by the aspect: R6's vfov 90 is 2 atan(16 / 9) = 121.28 deg at 16:9",
					() => {
						expect(calc_real_hfov("v", 90, W, H)).toBeCloseTo(
							to_deg(2 * Math.atan(16 / 9)),
							10
						)
						expect(calc_real_hfov("v", 90, W, H)).toBeCloseTo(121.28, 2)
						expect(
							calc_real_hfov("v", 90, 1_000, 1_000)
						).toBeCloseTo(90, 10)
					}
				)
			}
		)
		describe(
			"calc_sens_cs2_yaw",
			() => {
				it(
					"absorbs the 2 dp rounding: typed sens x m_yaw is the exact .022 yaw within m_yaw's 6 dp",
					() => {
						for (const [ width, height ] of RESOLUTIONS) {
							const exact = calc_sens_cs2(90, width, height)
							const typed = round_to(exact, 2)
							const m_yaw = calc_sens_cs2_yaw(width, height)
							expect(round_to(m_yaw, 6)).toBe(m_yaw)
							expect(
								Math.abs(typed * m_yaw - .022 * exact)
							).toBeLessThanOrEqual(5e-7 * typed + 1e-15)
						}
					}
				)
				it(
					"stays .022 when the exact sens already sits on the 2 dp grid",
					() => {
						const width = W * calc_sens_cs2(90, W, H) / 3
						expect(
							calc_sens_cs2_yaw(width, width / ASPECT)
						).toBe(.022)
					}
				)
			}
		)
		describe(
			"calc_sens_r6_file",
			() => {
				it(
					"ADS ints share one 6 dp unit that puts the largest in 100..200, each int is its ratio over the unit, and no unit in range rounds better",
					() => {
						const { r6 } = constants.fov
						const hipfire = calc_sens_r6(r6.base, W, H)
						/** @type {["x1" | "x12" | "x1_5" | "x2" | "x2_5" | "x3" | "x4" | "x5", number][]} */
						const ratios = [
							[
								"x1",
								calc_sens_r6(r6.x1, W, H) / hipfire
							],
							[
								"x12",
								calc_sens_r6(r6.x12, W, H) / hipfire
							],
							[
								"x1_5",
								calc_sens_r6(r6.x1_5, W, H) / hipfire
							],
							[
								"x2",
								calc_sens_r6(r6.x2, W, H) / hipfire
							],
							[
								"x2_5",
								calc_sens_r6(r6.x2_5, W, H) / hipfire
							],
							[
								"x3",
								calc_sens_r6(r6.x3, W, H) / hipfire
							],
							[
								"x4",
								calc_sens_r6(r6.x4, W, H) / hipfire
							],
							[
								"x5",
								calc_sens_r6(r6.x5, W, H) / hipfire
							]
						]
						const file = calc_sens_r6_file(W, H)
						const { ads_unit } = file
						expect(
							Math.round(ads_unit * 1e6) / 1e6
						).toBe(ads_unit)
						let largest = 0
						let m_max = 0
						for (const [ key, ratio ] of ratios) {
							expect(file[key]).toBe(Math.round(ratio / ads_unit))
							largest = Math.max(largest, file[key])
							m_max = Math.max(m_max, ratio)
						}
						expect(largest).toBeGreaterThanOrEqual(100)
						expect(largest).toBeLessThanOrEqual(200)
						/**
						 * @param {number} unit
						 * @returns {number}
						 */
						function worst(unit) {
							let err = 0
							for (const [ , ratio ] of ratios) {
								err = Math.max(
									err,
									Math.abs(
										Math.round(ratio / unit) * unit / ratio - 1
									)
								)
							}
							return err
						}
						let best = Number.POSITIVE_INFINITY
						const from = Math.round(m_max / 200 * 1e6)
						const to = Math.round(m_max / 100 * 1e6)
						for (let i = from; i <= to; i++) {
							best = Math.min(best, worst(i / 1e6))
						}
						expect(worst(ads_unit)).toBe(best)
					}
				)
				it(
					"is memoised on (width, height): the same object until either changes",
					() => {
						const first = calc_sens_r6_file(W, H)
						expect(calc_sens_r6_file(W, H)).toBe(first)
						const taller = calc_sens_r6_file(W, 1_200)
						expect(taller).not.toBe(first)
						expect(taller.yaw_unit).not.toBe(first.yaw_unit)
						const wider = calc_sens_r6_file(2_560, 1_200)
						expect(wider).not.toBe(taller)
						expect(wider.yaw_unit).not.toBe(taller.yaw_unit)
						const again = calc_sens_r6_file(W, H)
						expect(again).not.toBe(first)
						expect(again).toEqual(first)
					}
				)
				it(
					"yaw is always 1 with the 6 dp unit: any yaw times a 6 dp unit is itself on the 6 dp grid, so no larger yaw rounds closer",
					() => {
						for (const [ width, height ] of RESOLUTIONS) {
							const file = calc_sens_r6_file(width, height)
							expect(file.yaw).toBe(1)
							expect(file.yaw_unit).toBe(
								round_to(
									calc_sens_r6(90, width, height) * .02,
									6
								)
							)
						}
					}
				)
			}
		)
		describe(
			"calc_sens_rb_fields",
			() => {
				it(
					"While Aiming x the 45 / 120 fov scaling makes the rifle's 45 deg view exact within the grid",
					() => {
						for (const [ width, height ] of RESOLUTIONS) {
							const { aiming, effective } = calc_sens_rb_fields(width, height)
							expect(
								Math.abs(
									effective * aiming / 100 * 45 / 120 * to_rad(.5)
										/ calc_rad_per_px(
											h_from_v(45, width / height),
											width
										) - 1
								)
							).toBeLessThan(.005)
						}
					}
				)
				it(
					"fields sit on Rivals' grids and effective is hipfire x Sensitivity% x Horizontal%",
					() => {
						for (const [ width, height ] of RESOLUTIONS) {
							const fields = calc_sens_rb_fields(width, height)
							expect(fields.hipfire).toBe(
								round_to(
									calc_sens_rb(70, width, height),
									3
								)
							)
							for (const value of [
								fields.horizontal,
								fields.sensitivity
							]) {
								expect(value % 5).toBe(0)
								expect(value).toBeGreaterThanOrEqual(5)
								expect(value).toBeLessThanOrEqual(400)
							}
							expect(fields.aiming % 5).toBe(0)
							expect(fields.aiming).toBeGreaterThanOrEqual(5)
							expect(fields.aiming).toBeLessThanOrEqual(200)
							expect(
								fields.effective / (fields.hipfire * fields.sensitivity * fields.horizontal / 10_000)
							).toBeCloseTo(1, 12)
						}
					}
				)
				it(
					"horizontal_ads and horizontal_hipfire are the exact Horizontal for the rifle view and the 120 deg base at the chosen Sensitivity",
					() => {
						const fields = calc_sens_rb_fields(W, H)
						const per_horizontal = fields.hipfire * fields.sensitivity / 10_000
						expect(
							per_horizontal * fields.horizontal_ads * fields.aiming / 100 * 45 / 120
								/ calc_sens_rb(45, W, H)
						).toBeCloseTo(1, 12)
						expect(
							per_horizontal * fields.horizontal_hipfire / calc_sens_rb(120, W, H)
						).toBeCloseTo(1, 12)
					}
				)
				it(
					"is memoised on (width, height): the same object until either changes",
					() => {
						const first = calc_sens_rb_fields(W, H)
						expect(calc_sens_rb_fields(W, H)).toBe(first)
						const taller = calc_sens_rb_fields(W, 1_200)
						expect(taller).not.toBe(first)
						expect(taller.hipfire).not.toBe(first.hipfire)
						const wider = calc_sens_rb_fields(2_560, 1_200)
						expect(wider).not.toBe(taller)
						expect(wider.hipfire).not.toBe(taller.hipfire)
						const again = calc_sens_rb_fields(W, H)
						expect(again).not.toBe(first)
						expect(again).toEqual(first)
					}
				)
				it(
					"the Sensitivity x Horizontal pair is the grid's closest to the ADS target and ties keep Horizontal nearest 100",
					() => {
						const fields = calc_sens_rb_fields(W, H)
						const target = fields.hipfire * fields.sensitivity * fields.horizontal_ads / 10_000
						const chosen = Math.abs(fields.effective / target - 1)
						const product = fields.sensitivity * fields.horizontal
						let best = Number.POSITIVE_INFINITY
						for (let s = 5; s <= 400; s += 5) {
							for (let h = 5; h <= 400; h += 5) {
								best = Math.min(
									best,
									Math.abs(
										fields.hipfire * s * h / 10_000 / target - 1
									)
								)
								if (s * h == product) {
									expect(Math.abs(h - 100)).toBeGreaterThanOrEqual(
										Math.abs(fields.horizontal - 100)
									)
								}
							}
						}
						expect(chosen).toBeLessThanOrEqual(best + 1e-9)
						expect(fields.sensitivity).not.toBe(fields.horizontal)
					}
				)
			}
		)
		describe(
			"calc_sens_snap",
			() => {
				it(
					"al ADS replaces the hipfire snap: typed sens x typed 2 dp multiplier over the scope's pixel angle",
					() => {
						const { hipfire, x2 } = constants.fov.al
						const typed = round_to(calc_sens_al(hipfire, W, H), 2)
						const mul = round_to(
							calc_sens_al(x2, W, H) / typed,
							2
						)
						expect(
							calc_sens_snap("al", x2, W, H, 1, 80)
						).toBeCloseTo(
							typed * mul * to_rad(.022 * tan_ratio(x2, hipfire))
								/ calc_rad_per_px(h_from_43(x2, ASPECT), W),
							12
						)
					}
				)
				it(
					"al hipfire is the typed 2 dp sens yaw over the pixel angle",
					() => {
						const typed = round_to(
							calc_sens_al(constants.fov.al.hipfire, W, H),
							2
						)
						expect(
							calc_sens_snap("al", 0, W, H, 1, 80)
						).toBeCloseTo(
							typed * to_rad(.022) / calc_rad_per_px(
								h_from_43(constants.fov.al.hipfire, ASPECT),
								W
							),
							12
						)
					}
				)
				it(
					"bdo compares affine yaws of the typed integer and the exact sens, with the OS multiplier, and ignores ads_fov",
					() => {
						const cpi_scale = 1.5
						const width = W / cpi_scale
						const height = H / cpi_scale
						const { offset, step } = constants.sens.bdo
						const typed = Math.round(
							calc_sens_bdo(width, height, cpi_scale)
						)
						const snap = calc_sens_snap("bdo", 0, width, height, cpi_scale, 80)
						expect(snap).toBeCloseTo(
							cpi_scale * (offset + step * typed)
								/ calc_rad_per_px(h_from_v(70, ASPECT), width),
							12
						)
						expect(snap).not.toBeCloseTo(
							typed / calc_sens_bdo(width, height, cpi_scale),
							6
						)
						expect(
							calc_sens_snap("bdo", 40, width, height, cpi_scale, 80)
						).toBe(snap)
					}
				)
				it(
					"cs2 ADS replaces the hipfire snap with the typed 2 dp zoom_sensitivity_ratio on the linear fov scale",
					() => {
						const typed = round_to(calc_sens_cs2(90, W, H), 2)
						const m_yaw = calc_sens_cs2_yaw(W, H)
						const mul = round_to(
							calc_sens_cs2(40, W, H) / (typed * m_yaw / .022),
							2
						)
						expect(
							calc_sens_snap("cs2", 40, W, H, 1, 80)
						).toBeCloseTo(
							typed * to_rad(m_yaw) * mul * 40 / 90
								/ calc_rad_per_px(h_from_43(40, ASPECT), W),
							12
						)
					}
				)
				it(
					"cs2 hipfire uses the snapped m_yaw, so it stays within m_yaw's 6 dp of 1",
					() => {
						const typed = round_to(calc_sens_cs2(90, W, H), 2)
						const m_yaw = calc_sens_cs2_yaw(W, H)
						const snap = calc_sens_snap("cs2", 0, W, H, 1, 80)
						expect(snap).toBeCloseTo(
							typed * to_rad(m_yaw) / calc_rad_per_px(to_deg(2 * Math.atan(4 / 3)), W),
							12
						)
						expect(Math.abs(snap - 1)).toBeLessThan(5e-7 / .022)
					}
				)
				it(
					"fn ADS keeps the hipfire sens on the tan-ratio curve, and the real curve gap at a scope stays",
					() => {
						const typed = round_to(calc_sens_fn(80, W, H), 1)
						const snap = calc_sens_snap("fn", 40, W, H, 1, 80)
						expect(snap).toBeCloseTo(
							typed * to_rad(.005_555 * tan_ratio(40, 80)) / calc_rad_per_px(40, W),
							12
						)
						expect(Math.abs(snap - 1)).toBeGreaterThan(.005)
					}
				)
				it(
					"fn hipfire is the typed 1 dp sens yaw over the pixel angle",
					() => {
						const typed = round_to(calc_sens_fn(80, W, H), 1)
						expect(
							calc_sens_snap("fn", 0, W, H, 1, 80)
						).toBeCloseTo(
							typed * to_rad(.005_555) / calc_rad_per_px(80, W),
							12
						)
						expect(
							calc_sens_snap(
								"fn",
								constants.fov.fn.ads.targeting80,
								W,
								H,
								1,
								80
							)
						).toBe(
							calc_sens_snap("fn", 0, W, H, 1, 80)
						)
					}
				)
				it(
					"is 1 for a linear game when the resolution puts the exact sens on its typed grid",
					() => {
						const { al, cs2, fn, ow, r6, val } = constants.fov
						/** @type {[GameSensName, (width: number, height: number) => number, number][]} */
						const games = [
							[
								"al",
								(width, height) => calc_sens_al(al.hipfire, width, height),
								2
							],
							[
								"cs2",
								(width, height) => calc_sens_cs2(cs2.hipfire, width, height),
								2
							],
							[
								"fn",
								(width, height) => calc_sens_fn(fn.hipfire, width, height),
								1
							],
							[
								"ow",
								width => calc_sens_ow(ow.hipfire, width),
								2
							],
							[
								"r6",
								(width, height) => calc_sens_r6(r6.base, width, height) * .02,
								6
							],
							[
								"val",
								(width, height) => calc_sens_val(val.hipfire, width, height),
								3
							]
						]
						for (const [ name, exact_at, decimals ] of games) {
							const exact = exact_at(W, H)
							const width = W * exact / round_to(exact, decimals)
							expect(
								calc_sens_snap(name, 0, width, width / ASPECT, 1, 80)
							).toBeCloseTo(1, 10)
						}
					}
				)
				it(
					"is 1 for an affine or log game when the resolution puts the exact sens on its typed grid",
					() => {
						const bdo = width_for(h_from_v(70, ASPECT), .001_312_5)
						expect(
							calc_sens_snap("bdo", 0, bdo, bdo / ASPECT, 1, 80)
						).toBeCloseTo(1, 10)
						const sa = width_for(h_from_43(85, ASPECT), .001_05)
						expect(
							calc_sens_snap("sa", 0, sa, sa / ASPECT, 1, 80)
						).toBeCloseTo(1, 10)
						const pubg = width_for(80, to_rad(.044_440_000_444_4))
						expect(
							calc_sens_snap("pubg", 0, pubg, pubg / ASPECT, 1, 80)
						).toBeCloseTo(1, 10)
					}
				)
				it(
					"lol is always 1: its slider is the OS pointer multiplier, not a yaw",
					() => {
						expect(
							calc_sens_snap("lol", 0, W, H, 1, 80)
						).toBe(1)
						expect(
							calc_sens_snap("lol", 40, W, H, 2, 103)
						).toBe(1)
					}
				)
				it(
					"mc compares cubic yaws of the 16 dp options.txt value and ignores ads_fov",
					() => {
						const typed = round_to(calc_sens_mc(W, H), 16)
						const snap = calc_sens_snap("mc", 0, W, H, 1, 80)
						expect(snap).toBeCloseTo(
							to_rad(1.2) * (.2 + .6 * typed) ** 3
								/ calc_rad_per_px(h_from_v(110, ASPECT), W),
							12
						)
						expect(snap).toBeCloseTo(1, 12)
						expect(
							calc_sens_snap("mc", 40, W, H, 1, 80)
						).toBe(snap)
					}
				)
				it(
					"ow ADS replaces the hipfire snap with the typed 2 dp relative aim percent at the scope's vertical-locked fov",
					() => {
						const { widow } = constants.fov.ow.scopes
						const typed = round_to(calc_sens_ow(103, W), 2)
						const scope_hfov = h_from_v(widow, ASPECT)
						const percent = round_to(
							calc_sens_ow(scope_hfov, W) / typed * 100,
							2
						)
						expect(
							calc_sens_snap("ow", widow, W, H, 1, 80)
						).toBeCloseTo(
							typed * percent / 100 * to_rad(.006_6) / calc_rad_per_px(scope_hfov, W),
							12
						)
					}
				)
				it(
					"ow hipfire is the typed 2 dp sens yaw over the pixel angle",
					() => {
						const typed = round_to(calc_sens_ow(103, W), 2)
						expect(
							calc_sens_snap("ow", 0, W, H, 1, 80)
						).toBeCloseTo(
							typed * to_rad(.006_6) / calc_rad_per_px(103, W),
							12
						)
					}
				)
				it(
					"pubg ADS uses the scope's fov in place of the hipfire fov",
					() => {
						const { base_sens, base_yaw, step } = constants.sens.pubg
						const { x4 } = constants.fov.pubg
						const typed = Number(
							Math.fround(calc_sens_pubg(x4, W, H)).toFixed(6)
						)
						const snap = calc_sens_snap("pubg", x4, W, H, 1, 80)
						expect(snap).toBeCloseTo(
							to_rad(x4 / 80 * base_yaw) * 2 ** ((typed - base_sens) / step)
								/ calc_rad_per_px(x4, W),
							12
						)
						expect(
							calc_sens_snap("pubg", x4, W, H, 1, 103)
						).toBe(snap)
					}
				)
				it(
					"pubg compares log-scale yaws of the float32 6 dp sens at the hipfire fov, TPP 80 or FPP 103",
					() => {
						const { base_sens, base_yaw, step } = constants.sens.pubg
						for (const fov of /** @type {const} */([ 80, 103 ])/**/) {
							const exact = calc_sens_pubg(fov, W, H)
							const typed = Number(Math.fround(exact).toFixed(6))
							expect(
								calc_sens_snap("pubg", 0, W, H, 1, fov)
							).toBeCloseTo(
								to_rad(fov / 80 * base_yaw) * 2 ** ((typed - base_sens) / step)
									/ calc_rad_per_px(fov, W),
								12
							)
						}
					}
				)
				it(
					"r6 ADS compounds the hipfire snap with the scope's int x the shared ADS unit",
					() => {
						const { base, x1, x2_5 } = constants.fov.r6
						const file = calc_sens_r6_file(W, H)
						const hipfire = file.yaw * file.yaw_unit / .02
						for (const [ fov, ads_int ] of [
							[ x1, file.x1 ],
							[ x2_5, file.x2_5 ]
						]) {
							expect(
								calc_sens_snap("r6", fov, W, H, 1, 80)
							).toBeCloseTo(
								hipfire * ads_int * file.ads_unit * to_rad(.005_73 * tan_ratio(fov, base))
									/ calc_rad_per_px(h_from_v(fov, ASPECT), W),
								12
							)
						}
					}
				)
				it(
					"r6 hipfire is the file's yaw x unit sens over the pixel angle",
					() => {
						const { yaw, yaw_unit } = calc_sens_r6_file(W, H)
						expect(
							calc_sens_snap("r6", 0, W, H, 1, 80)
						).toBeCloseTo(
							yaw * yaw_unit / .02 * to_rad(.005_73) / calc_rad_per_px(h_from_v(90, ASPECT), W),
							12
						)
					}
				)
				it(
					"rb ADS scales the effective yaw by While Aiming and 45 / 120 over the rifle view's pixel angle",
					() => {
						const { aiming, effective } = calc_sens_rb_fields(W, H)
						expect(
							calc_sens_snap("rb", 45, W, H, 1, 80)
						).toBeCloseTo(
							effective * aiming / 100 * 45 / 120 * to_rad(.5)
								/ calc_rad_per_px(h_from_v(45, ASPECT), W),
							12
						)
					}
				)
				it(
					"rb hipfire is the effective sens's .5 deg yaw over the 120 deg base view's pixel angle",
					() => {
						const { effective } = calc_sens_rb_fields(W, H)
						expect(
							calc_sens_snap("rb", 0, W, H, 1, 80)
						).toBeCloseTo(
							effective * to_rad(.5) / calc_rad_per_px(h_from_v(120, ASPECT), W),
							12
						)
					}
				)
				it(
					"sa compares affine yaws of the typed integer and the exact sens and ignores ads_fov",
					() => {
						const { offset, step } = constants.sens.sa
						const typed = Math.round(calc_sens_sa(W, H))
						const snap = calc_sens_snap("sa", 0, W, H, 1, 80)
						expect(snap).toBeCloseTo(
							(offset + step * typed) / calc_rad_per_px(h_from_43(85, ASPECT), W),
							12
						)
						expect(
							calc_sens_snap("sa", 40, W, H, 1, 80)
						).toBe(snap)
					}
				)
				it(
					"throws the name of an unknown game",
					() => {
						expect(
							() => calc_sens_snap(
								/** @type {GameSensName} */("nope")/**/,
								0,
								W,
								H,
								1,
								80
							)
						).toThrow("nope")
					}
				)
				it(
					"val ADS replaces the hipfire snap with the typed 3 dp scope multiplier on the linear fov scale",
					() => {
						const { vandal } = constants.fov.val
						const typed = round_to(calc_sens_val(103, W, H), 3)
						const mul = round_to(
							calc_sens_val(vandal, W, H) / typed,
							3
						)
						expect(
							calc_sens_snap("val", vandal, W, H, 1, 80)
						).toBeCloseTo(
							typed * mul * to_rad(.07 * vandal / 103) / calc_rad_per_px(vandal, W),
							12
						)
					}
				)
				it(
					"val hipfire is the typed 3 dp sens yaw over the pixel angle",
					() => {
						const typed = round_to(calc_sens_val(103, W, H), 3)
						expect(
							calc_sens_snap("val", 0, W, H, 1, 80)
						).toBeCloseTo(
							typed * to_rad(.07) / calc_rad_per_px(103, W),
							12
						)
					}
				)
			}
		)
		describe(
			"engine yaw rules",
			() => {
				it(
					"al: Apex's .022 deg per count at the hipfire fov, so sens 2 where one px is .044 deg at the true 16:9 hfov",
					() => {
						const { hipfire } = constants.fov.al
						const width = width_for(
							h_from_43(hipfire, ASPECT),
							to_rad(.044)
						)
						expect(
							calc_sens_al(hipfire, width, width / ASPECT)
						).toBeCloseTo(2, 10)
					}
				)
				it(
					"al: an ADS yaw scales by the tan ratio of the 4:3 fovs",
					() => {
						const { hipfire, x2 } = constants.fov.al
						expect(
							calc_sens_al(x2, W, H) * to_rad(.022 * tan_ratio(x2, hipfire))
								/ calc_rad_per_px(h_from_43(x2, ASPECT), W)
						).toBeCloseTo(1, 12)
					}
				)
				it(
					"bdo: eats the OS pointer multiplier, so at cpi_scale 2 sens 50 needs twice the pixel angle",
					() => {
						const width = width_for(
							h_from_v(70, ASPECT),
							2 * .001_312_5
						)
						expect(
							calc_sens_bdo(width, width / ASPECT, 2)
						).toBeCloseTo(50, 8)
					}
				)
				it(
					"bdo: the affine offset + step * sens rad per count, so sens 50 where one px is .0013125 rad",
					() => {
						const width = width_for(h_from_v(70, ASPECT), .001_312_5)
						expect(
							calc_sens_bdo(width, width / ASPECT, 1)
						).toBeCloseTo(50, 8)
					}
				)
				it(
					"cs2: a scope scales the yaw by the linear 4:3 fov ratio, not the tan ratio",
					() => {
						expect(
							calc_sens_cs2(40, W, H) * to_rad(.022 * 40 / 90)
								/ calc_rad_per_px(h_from_43(40, ASPECT), W)
						).toBeCloseTo(1, 12)
					}
				)
				it(
					"cs2: m_yaw .022 deg per count, so sens 2 where one px is .044 deg at the 106.26 deg true hfov",
					() => {
						const width = width_for(
							to_deg(2 * Math.atan(4 / 3)),
							to_rad(.044)
						)
						expect(
							calc_sens_cs2(90, width, width / ASPECT)
						).toBeCloseTo(2, 10)
					}
				)
				it(
					"cs2: the AWP multiplier it needs is .818933 of a tan-ratio game's on the same 4:3 fovs, CS's known zoom_sensitivity_ratio for 0% monitor distance",
					() => {
						const cs2 = calc_sens_cs2(40, W, H) / calc_sens_cs2(90, W, H)
						const al = calc_sens_al(40, W, H) / calc_sens_al(90, W, H)
						expect(cs2 / al).toBeCloseTo(.818_933, 6)
					}
				)
				it(
					"fn: .005555 deg per percent at hipfire 80, so sens 10 where one px is .05555 deg",
					() => {
						const width = width_for(80, to_rad(.055_55))
						expect(
							calc_sens_fn(80, width, width / ASPECT)
						).toBeCloseTo(10, 10)
					}
				)
				it(
					"fn: Zoom Scaling Standard scales a scoped yaw by the tan ratio to 80",
					() => {
						expect(
							calc_sens_fn(40, W, H) * to_rad(.005_555 * tan_ratio(40, 80))
								/ calc_rad_per_px(40, W)
						).toBeCloseTo(1, 12)
					}
				)
				it(
					"mc: the cubic (.2 + .6 s)^3 x 1.2 deg, so slider 100% (s .5) is .15 deg and 0% is .0096 deg per count",
					() => {
						const hfov = h_from_v(110, ASPECT)
						const full = width_for(hfov, to_rad(.15))
						expect(
							calc_sens_mc(full, full / ASPECT)
						).toBeCloseTo(.5, 10)
						const zero = width_for(hfov, to_rad(.009_6))
						expect(
							calc_sens_mc(zero, zero / ASPECT)
						).toBeCloseTo(0, 10)
					}
				)
				it(
					"ow: .0066 deg per count, so sens 5 where one px is .033 deg",
					() => {
						expect(
							calc_sens_ow(
								103,
								width_for(103, to_rad(.033))
							)
						).toBeCloseTo(5, 10)
					}
				)
				it(
					"ow: Overwatch sens is Valorant's x 10.6 at their shared 103 deg hfov (.07 / .0066)",
					() => {
						expect(
							calc_sens_ow(103, W) / calc_sens_val(103, W, H)
						).toBeCloseTo(10.606_06, 5)
					}
				)
				it(
					"pubg: SensitivityConverted is .02 at 50 and one decade per 50 points (.002 at 0, .2 at 100)",
					() => {
						expect(calc_pubg_converted(50)).toBeCloseTo(.02, 12)
						expect(calc_pubg_converted(0)).toBeCloseTo(.002, 9)
						expect(calc_pubg_converted(100)).toBeCloseTo(.2, 6)
					}
				)
				it(
					"pubg: sens 50 at fov 80 is base_yaw .04444 deg per count",
					() => {
						const width = width_for(80, to_rad(.044_440_000_444_4))
						expect(
							calc_sens_pubg(80, width, width / ASPECT)
						).toBeCloseTo(50, 8)
					}
				)
				it(
					"pubg: the log scale makes +50 sens a tenfold yaw",
					() => {
						const width = width_for(80, to_rad(.444_400_004_444))
						expect(
							calc_sens_pubg(80, width, width / ASPECT)
						).toBeCloseTo(100, 5)
					}
				)
				it(
					"pubg: the sens 50 yaw scales linearly with the fov, as at FPP 103",
					() => {
						const width = width_for(
							103,
							to_rad(.044_440_000_444_4 * 103 / 80)
						)
						expect(
							calc_sens_pubg(103, width, width / ASPECT)
						).toBeCloseTo(50, 8)
					}
				)
				it(
					"r6: .00573 deg per count at vfov 90, so sens 50 where one px is .2865 deg at the 121.28 deg true hfov",
					() => {
						const width = width_for(
							h_from_v(90, ASPECT),
							to_rad(.005_73 * 50)
						)
						expect(
							calc_sens_r6(90, width, width / ASPECT)
						).toBeCloseTo(50, 8)
					}
				)
				it(
					"r6: an ADS yaw scales by the tan ratio of the vertical fovs",
					() => {
						const { base, x2_5 } = constants.fov.r6
						expect(
							calc_sens_r6(x2_5, W, H) * to_rad(
								.005_73 * tan_ratio(x2_5, base)
							)
								/ calc_rad_per_px(h_from_v(x2_5, ASPECT), W)
						).toBeCloseTo(1, 12)
					}
				)
				it(
					"rb: .5 deg per count, so sens 1 where one px is .5 deg at the 70 deg vfov's true hfov",
					() => {
						const width = width_for(h_from_v(70, ASPECT), to_rad(.5))
						expect(
							calc_sens_rb(70, width, width / ASPECT)
						).toBeCloseTo(1, 10)
					}
				)
				it(
					"rb: the yaw does not depend on the fov",
					() => {
						for (const vfov of [ 45, 120 ]) {
							expect(
								calc_sens_rb(vfov, W, H) * to_rad(.5)
									/ calc_rad_per_px(h_from_v(vfov, ASPECT), W)
							).toBeCloseTo(1, 12)
						}
					}
				)
				it(
					"sa: the affine offset + step * sens rad per count, so sens 20 where one px is .00105 rad",
					() => {
						const width = width_for(h_from_43(85, ASPECT), .001_05)
						expect(
							calc_sens_sa(width, width / ASPECT)
						).toBeCloseTo(20, 8)
					}
				)
				it(
					"val: .07 deg per count, so sens .5 where one px is .035 deg",
					() => {
						const width = width_for(103, to_rad(.035))
						expect(
							calc_sens_val(103, width, width / ASPECT)
						).toBeCloseTo(.5, 10)
					}
				)
				it(
					"val: a scope scales the yaw by the linear fov ratio to 103",
					() => {
						const { vandal } = constants.fov.val
						expect(
							calc_sens_val(vandal, W, H) * to_rad(.07 * vandal / 103)
								/ calc_rad_per_px(vandal, W)
						).toBeCloseTo(1, 12)
					}
				)
			}
		)
		describe(
			"lol_sens_to_cpi_scale",
			() => {
				it(
					"hits its anchors every 10 sens, up to 3.5 at 100",
					() => {
						const anchors = [
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
						for (let i = 0; i < anchors.length; i++) {
							expect(lol_sens_to_cpi_scale(i * 10)).toBe(anchors[i])
						}
					}
				)
				it(
					"interpolates linearly between anchors, including the last segment",
					() => {
						expect(lol_sens_to_cpi_scale(5)).toBe(.078_125)
						expect(lol_sens_to_cpi_scale(55)).toBe(1.25)
						expect(lol_sens_to_cpi_scale(95)).toBe(3.25)
					}
				)
				it(
					"rises monotonically across the slider",
					() => {
						let prev = 0
						for (let sens = 0; sens <= 100; sens++) {
							const scale = lol_sens_to_cpi_scale(sens)
							expect(scale).toBeGreaterThan(prev)
							prev = scale
						}
					}
				)
				it(
					"sens 50 maps to exactly 1, the neutral notch",
					() => {
						expect(lol_sens_to_cpi_scale(50)).toBe(1)
					}
				)
			}
		)
	}
)