import constants from "../../docs/js/constants.js"
import { round_to, to_deg, to_rad } from "../../docs/js/math.js"
import { beforeEach, describe, expect, it } from "vitest"
const ASPECT = 16 / 9
const CPI = 800
const H = 1_080
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
async function load() {
	const calc_cpi = await import("../../docs/js/calc/calc_cpi.js")
	const calc_sens = await import("../../docs/js/calc/calc_sens.js")
	const { default: state } = await import("../../docs/js/state.js")
	state.cpi_norm.cpi = CPI
	state.game.cpi_scale = 1
	state.game.height = H
	state.game.pubg_fov = 80
	state.game.width = W
	return { calc_cpi, calc_sens, state }
}
describe(
	"calc/calc_cpi.js",
	() => {
		beforeEach(
			() => {
				localStorage.clear()
			}
		)
		it(
			"a known sens gives cpi x the engine's yaw per count over the pixel angle at the true hfov",
			async () => {
				const { calc_cpi, calc_sens, state } = await load()
				const { calc_rad_per_px } = calc_sens
				/** @type {[GameSensName, () => number, number, number, number][]} */
				const games = [
					[
						"al",
						calc_cpi.calc_cpi_al,
						2,
						2 * to_rad(.022),
						h_from_43(constants.fov.al.hipfire, ASPECT)
					],
					[
						"bdo",
						calc_cpi.calc_cpi_bdo,
						50,
						.000_125 + .000_023_75 * 50,
						h_from_v(70, ASPECT)
					],
					[
						"cs2",
						calc_cpi.calc_cpi_cs2,
						1,
						to_rad(.022),
						to_deg(2 * Math.atan(4 / 3))
					],
					[
						"fn",
						calc_cpi.calc_cpi_fn,
						10,
						10 * to_rad(.005_555),
						80
					],
					[
						"mc",
						calc_cpi.calc_cpi_mc,
						.5,
						to_rad(.15),
						h_from_v(110, ASPECT)
					],
					[
						"ow",
						calc_cpi.calc_cpi_ow,
						5,
						5 * to_rad(.006_6),
						103
					],
					[
						"pubg",
						calc_cpi.calc_cpi_pubg,
						50,
						to_rad(.044_440_000_444_4),
						80
					],
					[
						"r6",
						calc_cpi.calc_cpi_r6,
						50,
						50 * to_rad(.005_73),
						h_from_v(90, ASPECT)
					],
					[
						"rb",
						calc_cpi.calc_cpi_rb,
						1,
						to_rad(.5),
						h_from_v(70, ASPECT)
					],
					[
						"sa",
						calc_cpi.calc_cpi_sa,
						20,
						.000_45 + .000_03 * 20,
						h_from_43(85, ASPECT)
					],
					[
						"val",
						calc_cpi.calc_cpi_val,
						.5,
						.5 * to_rad(.07),
						103
					]
				]
				for (const [ game, calc, sens, yaw_rad, hfov ] of games) {
					state.cpi_norm.game = game
					state.cpi_norm.sens = sens
					expect(
						calc() / (CPI * yaw_rad / calc_rad_per_px(hfov, W))
					).toBeCloseTo(1, 12)
				}
			}
		)
		it(
			"every calc_cpi_* throws the active game's name when it is not its own",
			async () => {
				const { calc_cpi, state } = await load()
				const entries = Object.entries(calc_cpi)
				expect(entries).toHaveLength(12)
				for (const [ name, calc ] of entries) {
					const wrong = name == "calc_cpi_val" ? "cs2" : "val"
					state.cpi_norm.game = wrong
					expect(calc).toThrow(wrong)
				}
			}
		)
		it(
			"lol's slider is the pointer multiplier: sens 50 keeps the cpi, 55 is 1.25x and 100 is 3.5x",
			async () => {
				const { calc_cpi, state } = await load()
				state.cpi_norm.game = "lol"
				state.cpi_norm.sens = 50
				expect(calc_cpi.calc_cpi_lol()).toBe(CPI)
				state.cpi_norm.sens = 55
				expect(calc_cpi.calc_cpi_lol()).toBe(CPI * 1.25)
				state.cpi_norm.sens = 100
				expect(calc_cpi.calc_cpi_lol()).toBe(CPI * 3.5)
			}
		)
		it(
			"mc's cubic slider makes 100% (.5) 15.625x the cpi of 0%, (.5 / .2)^3",
			async () => {
				const { calc_cpi, state } = await load()
				state.cpi_norm.game = "mc"
				state.cpi_norm.sens = 0
				const zero = calc_cpi.calc_cpi_mc()
				state.cpi_norm.sens = .5
				expect(calc_cpi.calc_cpi_mc() / zero).toBeCloseTo(15.625, 10)
			}
		)
		it(
			"pubg's FPP sens that puts one count on one pixel normalizes to the mouse's own cpi",
			async () => {
				const { calc_cpi, calc_sens, state } = await load()
				state.game.pubg_fov = 103
				state.cpi_norm.game = "pubg"
				state.cpi_norm.sens = calc_sens.calc_sens_pubg(103, W, H)
				expect(calc_cpi.calc_cpi_pubg()).toBeCloseTo(CPI, 8)
			}
		)
		it(
			"pubg: +50 sens is a tenfold cpi and the FPP 103 fov scales both the sens 50 yaw and the pixel angle",
			async () => {
				const { calc_cpi, calc_sens, state } = await load()
				state.cpi_norm.game = "pubg"
				state.cpi_norm.sens = 50
				const tpp = calc_cpi.calc_cpi_pubg()
				state.cpi_norm.sens = 100
				expect(calc_cpi.calc_cpi_pubg() / tpp).toBeCloseTo(10, 5)
				state.cpi_norm.sens = 50
				state.game.pubg_fov = 103
				expect(
					calc_cpi.calc_cpi_pubg() / (CPI * to_rad(.044_440_000_444_4 * 103 / 80) / calc_sens.calc_rad_per_px(103, W))
				).toBeCloseTo(1, 12)
			}
		)
		it(
			"rb's hipfire field round-trips within its 3 dp",
			async () => {
				const { calc_cpi, calc_sens, state } = await load()
				const exact = calc_sens.calc_sens_rb(
					constants.fov.rb.rivals.hipfire,
					W,
					H
				)
				const typed = calc_sens.calc_sens_rb_fields(W, H).hipfire
				state.cpi_norm.game = "rb"
				state.cpi_norm.sens = typed
				expect(calc_cpi.calc_cpi_rb() / CPI).toBeCloseTo(typed / exact, 12)
				expect(Math.abs(typed - exact)).toBeLessThanOrEqual(.000_5)
			}
		)
		it(
			"the OS pointer multiplier divides a raw-input game's normalized cpi but cancels for bdo, which eats it too",
			async () => {
				const { calc_cpi, state } = await load()
				state.cpi_norm.game = "val"
				state.cpi_norm.sens = .5
				const val = calc_cpi.calc_cpi_val()
				state.game.cpi_scale = 2
				expect(calc_cpi.calc_cpi_val()).toBeCloseTo(val / 2, 9)
				state.game.cpi_scale = 1
				state.cpi_norm.game = "bdo"
				state.cpi_norm.sens = 50
				const bdo = calc_cpi.calc_cpi_bdo()
				state.game.cpi_scale = 2
				expect(calc_cpi.calc_cpi_bdo()).toBeCloseTo(bdo, 9)
			}
		)
		it(
			"the card's typed sens round-trips to the cpi x that game's snap ratio, within its rounding",
			async () => {
				const { calc_cpi, calc_sens, state } = await load()
				const { al, cs2, fn, ow, val } = constants.fov
				const { sens } = constants
				const cpi_scale = 1.5
				state.game.cpi_scale = cpi_scale
				const width = W / cpi_scale
				const height = H / cpi_scale
				const cs2_exact = calc_sens.calc_sens_cs2(cs2.hipfire, width, height)
				const r6_file = calc_sens.calc_sens_r6_file(width, height)
				/** @type {[GameSensName, () => number, number][]} */
				const games = [
					[
						"al",
						calc_cpi.calc_cpi_al,
						round_to(
							calc_sens.calc_sens_al(al.hipfire, width, height),
							sens.al.decimals
						)
					],
					[
						"bdo",
						calc_cpi.calc_cpi_bdo,
						round_to(
							calc_sens.calc_sens_bdo(width, height, cpi_scale),
							sens.bdo.decimals
						)
					],
					[
						"cs2",
						calc_cpi.calc_cpi_cs2,
						round_to(cs2_exact, sens.cs2.decimals) * calc_sens.calc_sens_cs2_yaw(width, height) / sens.cs2.scale
					],
					[
						"fn",
						calc_cpi.calc_cpi_fn,
						round_to(
							calc_sens.calc_sens_fn(fn.hipfire, width, height),
							sens.fn.decimals
						)
					],
					[
						"mc",
						calc_cpi.calc_cpi_mc,
						round_to(
							calc_sens.calc_sens_mc(width, height),
							sens.mc.decimals
						)
					],
					[
						"ow",
						calc_cpi.calc_cpi_ow,
						round_to(
							calc_sens.calc_sens_ow(ow.hipfire, width),
							sens.ow.decimals
						)
					],
					[
						"pubg",
						calc_cpi.calc_cpi_pubg,
						Number(
							Math.fround(
								calc_sens.calc_sens_pubg(80, width, height)
							).toFixed(sens.pubg.decimals)
						)
					],
					[
						"r6",
						calc_cpi.calc_cpi_r6,
						r6_file.yaw * r6_file.yaw_unit / sens.r6.yaw_unit
					],
					[
						"sa",
						calc_cpi.calc_cpi_sa,
						round_to(
							calc_sens.calc_sens_sa(width, height),
							sens.sa.decimals
						)
					],
					[
						"val",
						calc_cpi.calc_cpi_val,
						round_to(
							calc_sens.calc_sens_val(val.hipfire, width, height),
							sens.val.decimals
						)
					]
				]
				for (const [ game, calc, typed ] of games) {
					state.cpi_norm.game = game
					state.cpi_norm.sens = typed
					const cpi = calc()
					expect(cpi / CPI).toBeCloseTo(
						calc_sens.calc_sens_snap(game, 0, width, height, cpi_scale, 80),
						12
					)
					expect(Math.abs(cpi / CPI - 1)).toBeLessThan(.01)
				}
			}
		)
		it(
			"the sens that puts one count on one pixel normalizes to the mouse's own cpi at any pointer multiplier",
			async () => {
				const { calc_cpi, calc_sens, state } = await load()
				const { al, cs2, fn, ow, r6, rb, val } = constants.fov
				for (const cpi_scale of [ 1, 1.5 ]) {
					state.game.cpi_scale = cpi_scale
					const width = W / cpi_scale
					const height = H / cpi_scale
					/** @type {[GameSensName, () => number, number][]} */
					const games = [
						[
							"al",
							calc_cpi.calc_cpi_al,
							calc_sens.calc_sens_al(al.hipfire, width, height)
						],
						[
							"bdo",
							calc_cpi.calc_cpi_bdo,
							calc_sens.calc_sens_bdo(width, height, cpi_scale)
						],
						[
							"cs2",
							calc_cpi.calc_cpi_cs2,
							calc_sens.calc_sens_cs2(cs2.hipfire, width, height)
						],
						[
							"fn",
							calc_cpi.calc_cpi_fn,
							calc_sens.calc_sens_fn(fn.hipfire, width, height)
						],
						[
							"mc",
							calc_cpi.calc_cpi_mc,
							calc_sens.calc_sens_mc(width, height)
						],
						[
							"ow",
							calc_cpi.calc_cpi_ow,
							calc_sens.calc_sens_ow(ow.hipfire, width)
						],
						[
							"pubg",
							calc_cpi.calc_cpi_pubg,
							calc_sens.calc_sens_pubg(80, width, height)
						],
						[
							"r6",
							calc_cpi.calc_cpi_r6,
							calc_sens.calc_sens_r6(r6.base, width, height)
						],
						[
							"rb",
							calc_cpi.calc_cpi_rb,
							calc_sens.calc_sens_rb(rb.rivals.hipfire, width, height)
						],
						[
							"sa",
							calc_cpi.calc_cpi_sa,
							calc_sens.calc_sens_sa(width, height)
						],
						[
							"val",
							calc_cpi.calc_cpi_val,
							calc_sens.calc_sens_val(val.hipfire, width, height)
						]
					]
					for (const [ game, calc, sens ] of games) {
						state.cpi_norm.game = game
						state.cpi_norm.sens = sens
						expect(calc()).toBeCloseTo(CPI, 8)
					}
				}
			}
		)
	}
)