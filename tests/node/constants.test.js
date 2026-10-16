import constants from "../../docs/js/constants.js"
import { PSI } from "../../docs/js/math.js"
import { describe, expect, it } from "vitest"
/**
 * @param {number} deg
 * @param {number} zoom
 * @returns {number}
 */
function zoomed(deg, zoom) {
	return 2 * Math.atan(
		Math.tan(deg * Math.PI / 360) / zoom
	) * 180 / Math.PI
}
const { fov } = constants
describe(
	"constants.js",
	() => {
		it(
			"al zoomed fields are the 1x field narrowed by the zoom factor across aspect",
			() => {
				expect(fov.al.hipfire).toBeCloseTo(70 * 1.55, 12)
				expect(fov.al.x1).toBeCloseTo(60 * 1.55, 12)
				for (const [ key, zoom ] of [
					[ "x10", 10 ],
					[ "x2", 2 ],
					[ "x3", 3 ],
					[ "x4", 4 ],
					[ "x6", 6 ],
					[ "x8", 8 ]
				]) {
					expect(
						fov.al[/** @type {"x10"} */(key)/**/]
					).toBeCloseTo(
						zoomed(fov.al.x1, Number(zoom)),
						10
					)
					expect(
						fov.al.ads[/** @type {"x10"} */(key)/**/]
					).toBe(
						fov.al[/** @type {"x10"} */(key)/**/]
					)
				}
				expect(fov.al.ads.x1).toBe(fov.al.x1)
			}
		)
		it(
			"bdo, lol and mc declare plain numbers",
			() => {
				expect(fov.bdo).toEqual(
					{ axis: "v", hipfire: 70, zoom: 40 }
				)
				expect(fov.lol).toEqual({ axis: "v", hipfire: 120 })
				expect(fov.mc).toEqual({ axis: "v", hipfire: 110 })
			}
		)
		it(
			"cpi.ratio is the fixed math.js PSI",
			() => {
				expect(constants.cpi.ratio).toBe(PSI)
			}
		)
		it(
			"cs2 scopes share the 1x field and ads_ref matches them at it",
			() => {
				expect(fov.cs2.hipfire).toBe(90)
				expect(fov.cs2.x1).toBe(40)
				expect(fov.cs2.ads).toEqual({ aug: 45, auto: 40, awp: 40 })
				expect(fov.cs2.ads_ref).toEqual({ aug: 40, auto: 40, awp: 40 })
				expect(fov.cs2.ads_stage2).toEqual({ aug: 0, auto: 15, awp: 10 })
				expect(fov.cs2.aug).toBe(45)
				expect(fov.cs2.auto2).toBe(15)
				expect(fov.cs2.awp2).toBe(10)
			}
		)
		it(
			"every fov game declares exactly one axis per the FOV axis policy",
			() => {
				const axes = Object.fromEntries(
					Object.entries(fov).map(
						([ game, f ]) => [ game, f.axis ]
					)
				)
				expect(axes).toEqual(
					{
						al: "43",
						bdo: "v",
						cs2: "43",
						fn: "h",
						lol: "v",
						mc: "v",
						ow: "h",
						pubg: "h",
						r6: "v",
						rb: "v",
						sa: "43",
						val: "h"
					}
				)
				expect(fov.ow.scopes.axis).toBe("v")
			}
		)
		it(
			"fn scopes list the field names and targeting80 is the hipfire",
			() => {
				expect(fov.fn.hipfire).toBe(80)
				expect(fov.fn.ads).toEqual(
					{
						scoped15: 15,
						scoped40: 40,
						targeting65: 65,
						targeting80: 80
					}
				)
				expect(fov.fn.scoped15).toBe(15)
				expect(fov.fn.scoped40).toBe(40)
				expect(fov.fn.targeting65).toBe(65)
			}
		)
		it(
			"ow hero scopes appear in ads and in the nested scopes object",
			() => {
				expect(fov.ow.hipfire).toBe(103)
				expect(fov.ow.ads).toEqual(
					{
						ashe: 40,
						emre: 42.5,
						freja: 47.5,
						widow: 30
					}
				)
				expect(fov.ow.scopes).toEqual({ ...fov.ow.ads, axis: "v" })
			}
		)
		it(
			"pubg 1x is base - 5, 4x is base / 4 - 1 and the rest are base divided by the zoom",
			() => {
				const { base } = fov.pubg
				expect(base).toBe(80)
				expect(fov.pubg.x1).toBe(base - 5)
				expect(fov.pubg.x15).toBe(base / 12)
				expect(fov.pubg.x2).toBe(base / 2)
				expect(fov.pubg.x3).toBe(base / 3)
				expect(fov.pubg.x4).toBe(base / 4 - 1)
				expect(fov.pubg.x6).toBe(base / 6)
				expect(fov.pubg.x8).toBe(base / 8)
				expect(fov.pubg.fpp).toBe(103)
				expect(fov.pubg.ads).toEqual(
					{
						x1: fov.pubg.x1,
						x15: fov.pubg.x15,
						x2: fov.pubg.x2,
						x3: fov.pubg.x3,
						x4: fov.pubg.x4,
						x6: fov.pubg.x6,
						x8: fov.pubg.x8
					}
				)
			}
		)
		it(
			"r6 zoomed fields are the base field narrowed by the zoom and 1x is the declared 81",
			() => {
				expect(fov.r6.base).toBe(90)
				expect(fov.r6.x1).toBe(81)
				for (const [ key, zoom ] of [
					[ "x12", 12 ],
					[ "x1_5", 1.5 ],
					[ "x2", 2 ],
					[ "x2_5", 2.5 ],
					[ "x3", 3 ],
					[ "x4", 4 ],
					[ "x5", 5 ]
				]) {
					expect(
						fov.r6[/** @type {"x12"} */(key)/**/]
					).toBeCloseTo(zoomed(90, Number(zoom)), 10)
					expect(
						fov.r6.ads[/** @type {"x12"} */(key)/**/]
					).toBe(
						fov.r6[/** @type {"x12"} */(key)/**/]
					)
				}
				expect(fov.r6.ads.x1).toBe(81)
			}
		)
		it(
			"rb ads_ref matches every scope at the rifle field and rivals hold its own hipfire",
			() => {
				expect(fov.rb.base).toBe(120)
				expect(
					Object.keys(fov.rb.ads_ref).toSorted()
				).toEqual(
					Object.keys(fov.rb.ads).toSorted()
				)
				for (const ref of Object.values(fov.rb.ads_ref)) {
					expect(ref).toBe(45)
				}
				expect(fov.rb.ads.rifle).toBe(45)
				expect(fov.rb.rivals).toEqual(
					{
						exogun: 75,
						hipfire: 70,
						minigun: 112.5,
						pistol: 60,
						rifle: 45,
						shotgun: 90,
						slingshot: 105
					}
				)
				const { hipfire, ...scopes } = fov.rb.rivals
				expect(hipfire).toBe(70)
				expect(scopes).toEqual(fov.rb.ads)
			}
		)
		it(
			"sa zoomed fields are the hipfire narrowed by 15x and 5x",
			() => {
				expect(fov.sa.hipfire).toBe(85)
				expect(fov.sa.x15).toBeCloseTo(zoomed(85, 15), 10)
				expect(fov.sa.x5).toBeCloseTo(zoomed(85, 5), 10)
				expect(fov.sa.x15_sens).toBe(.15)
				expect(fov.sa.x5_sens).toBe(.25)
			}
		)
		it(
			"the default ads scope of every game is one of its scopes",
			() => {
				const { ads_scope } = constants.game
				for (const [ game, scope ] of Object.entries(ads_scope)) {
					expect(
						Object.keys(
							/** @type {Record<string, object>} */(fov)/**/[game].ads
						)
					).toContain(scope)
				}
			}
		)
		it(
			"the default sens game has a default sens and the version is a semver tag",
			() => {
				expect(
					constants.cpi_norm.default_sens[constants.cpi_norm.game]
				).toBe(1)
				expect(constants.version).toMatch(/^v\d+\.\d+\.\d+$/)
			}
		)
		it(
			"the staircase band is ordered and its start level and steps are in range",
			() => {
				const s = constants.staircase
				expect(s.band_min).toBeLessThan(s.band_max)
				expect(s.start_level).toBeGreaterThanOrEqual(0)
				expect(s.start_level).toBeLessThanOrEqual(1)
				expect(s.step_min).toBeLessThan(s.step)
				expect(s.step_decay).toBeLessThan(1)
			}
		)
		it(
			"val scope fields are the hipfire narrowed by each scope's zoom",
			() => {
				const { hipfire } = fov.val
				expect(hipfire).toBe(103)
				expect(fov.val.guardian).toBeCloseTo(zoomed(hipfire, 1.5), 10)
				expect(fov.val.marshal).toBeCloseTo(zoomed(hipfire, 3.5), 10)
				expect(fov.val.operator2_5).toBeCloseTo(zoomed(hipfire, 2.5), 10)
				expect(fov.val.operator5).toBeCloseTo(zoomed(hipfire, 5), 10)
				expect(fov.val.spectre).toBeCloseTo(zoomed(hipfire, 1.15), 10)
				expect(fov.val.vandal).toBeCloseTo(zoomed(hipfire, 1.25), 10)
				expect(fov.val.ads).toEqual(
					{
						guardian: fov.val.guardian,
						marshal: fov.val.marshal,
						operator: fov.val.operator2_5,
						spectre: fov.val.spectre,
						vandal: fov.val.vandal
					}
				)
				expect(fov.val.ads_ref).toEqual(
					{
						guardian: fov.val.vandal,
						marshal: fov.val.operator2_5,
						operator: fov.val.operator2_5,
						spectre: fov.val.vandal,
						vandal: fov.val.vandal
					}
				)
				expect(fov.val.ads_stage2).toEqual(
					{
						guardian: 0,
						marshal: 0,
						operator: fov.val.operator5,
						spectre: 0,
						vandal: 0
					}
				)
			}
		)
	}
)