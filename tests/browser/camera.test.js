import { calc_rad_per_px, calc_real_hfov } from "../../docs/js/calc/calc_sens.js"
import constants from "../../docs/js/constants.js"
import { PI, TAU, to_rad } from "../../docs/js/math.js"
import {
	calc_camera_sens,
	convert_camera_to_2d,
	convert_camera_to_3d,
	convert_target_to_2d,
	convert_target_to_3d,
	hit_test_2d,
	hit_test_3d,
	is_target_visible_2d,
	is_target_visible_3d,
	px_to_rad,
	rad_to_px
} from "../../docs/js/render/camera.js"
import state from "../../docs/js/state.js"
import { beforeEach, describe, expect, it } from "vitest"
/** @returns {Target} */
function empty_target() {
	return { cr: 0, cx: 0, cy: 0, r: 0, x: 0, y: 0 }
}
/** @returns {Target3D} */
function empty_target_3d() {
	return { cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 }
}
/**
 * @param {Target} target
 * @param {number} x
 * @param {number} y
 * @returns {{ is_crit: boolean, is_hit: boolean }}
 */
function hit_2d(target, x, y) {
	return { ...hit_test_2d(target, x, y) }
}
/**
 * @param {Target3D} target
 * @param {number} yaw
 * @param {number} pitch
 * @returns {{ is_crit: boolean, is_hit: boolean }}
 */
function hit_3d(target, yaw, pitch) {
	return {
		...hit_test_3d(target, yaw, pitch)
	}
}
describe(
	"render/camera.js",
	() => {
		beforeEach(
			() => {
				state.camera.dist = 0
				state.camera.height = 1_080
				state.camera.pitch = 0
				state.camera.sens = .001
				state.camera.width = 1_920
				state.camera.x = 0
				state.camera.y = 0
				state.camera.yaw = 0
				state.game.sens = "val"
			}
		)
		it(
			"calc_camera_sens is the rad per px of the given fov across the camera width",
			() => {
				for (const sens of [
					"al",
					"cs2",
					"fn",
					"lol",
					"mc",
					"ow",
					"pubg",
					"r6",
					"rb",
					"val"
				]) {
					state.game.sens = /** @type {GameSensName} */(sens)/**/
					expect(calc_camera_sens(90)).toBe(calc_rad_per_px(90, 1_920))
					expect(calc_camera_sens(40)).toBe(calc_rad_per_px(40, 1_920))
				}
			}
		)
		it(
			"calc_camera_sens locks bdo to its hipfire fov on the vertical axis whatever fov it is given",
			() => {
				state.game.sens = "bdo"
				const { axis, hipfire, zoom } = constants.fov.bdo
				for (const [ width, height ] of [
					[ 1_920, 1_080 ],
					[ 2_560, 1_080 ],
					[ 1_280, 1_024 ]
				]) {
					state.camera.height = height
					state.camera.width = width
					const expected = calc_rad_per_px(
						calc_real_hfov(axis, hipfire, width, height),
						width
					)
					expect(calc_camera_sens(hipfire)).toBeCloseTo(expected, 15)
					expect(calc_camera_sens(zoom)).toBeCloseTo(expected, 15)
				}
			}
		)
		it(
			"calc_camera_sens locks sa to its hipfire fov on the 4:3 axis whatever fov it is given",
			() => {
				state.game.sens = "sa"
				const { axis, hipfire, x15 } = constants.fov.sa
				for (const [ width, height ] of [
					[ 1_920, 1_080 ],
					[ 2_560, 1_080 ],
					[ 1_280, 1_024 ]
				]) {
					state.camera.height = height
					state.camera.width = width
					const expected = calc_rad_per_px(
						calc_real_hfov(axis, hipfire, width, height),
						width
					)
					expect(calc_camera_sens(hipfire)).toBeCloseTo(expected, 15)
					expect(calc_camera_sens(x15)).toBeCloseTo(expected, 15)
				}
				state.camera.height = 1_024
				state.camera.width = 1_280
				expect(calc_camera_sens(1)).toBeCloseTo(
					calc_rad_per_px(hipfire, 1_280),
					15
				)
			}
		)
		it(
			"convert_camera_to_2d maps yaw and pitch to x and screen-down y and zeroes the angles",
			() => {
				state.camera.pitch = .1
				state.camera.yaw = .3
				convert_camera_to_2d()
				expect(state.camera.x).toBeCloseTo(300, 9)
				expect(state.camera.y).toBeCloseTo(-100, 9)
				expect(state.camera.pitch).toBe(0)
				expect(state.camera.yaw).toBe(0)
			}
		)
		it(
			"convert_camera_to_2d normalizes a negative or multi-turn yaw into one turn",
			() => {
				state.camera.yaw = -.1
				convert_camera_to_2d()
				expect(state.camera.x).toBeCloseTo((TAU - .1) * 1_000, 9)
				state.camera.yaw = TAU * 2 + .5
				convert_camera_to_2d()
				expect(state.camera.x).toBeCloseTo(500, 9)
			}
		)
		it(
			"convert_camera_to_3d maps x and y back to yaw and pitch and zeroes the offsets",
			() => {
				state.camera.x = 300
				state.camera.y = -100
				convert_camera_to_3d()
				expect(state.camera.pitch).toBeCloseTo(.1, 12)
				expect(state.camera.yaw).toBeCloseTo(.3, 12)
				expect(state.camera.x).toBe(0)
				expect(state.camera.y).toBe(0)
			}
		)
		it(
			"convert_camera_to_3d then convert_camera_to_2d round-trips at a tpp dist",
			() => {
				state.camera.dist = 30
				state.camera.x = 1_234
				state.camera.y = 321
				convert_camera_to_3d()
				convert_camera_to_2d()
				expect(state.camera.x).toBeCloseTo(1_234, 9)
				expect(state.camera.y).toBeCloseTo(321, 9)
			}
		)
		it(
			"convert_target_to_2d and convert_target_to_3d round-trip a straight-core target",
			() => {
				state.camera.dist = 30
				const target = {
					cr: 12,
					cx: -450,
					cy: 80 - 40 + 12,
					r: 40,
					x: -450,
					y: 80
				}
				const target_3d = convert_target_to_3d(target, empty_target_3d())
				const back = convert_target_to_2d(target_3d, empty_target())
				for (const key of [ "cr", "cx", "cy", "r", "x", "y" ]) {
					const field = /** @type {keyof Target} */(key)/**/
					expect(back[field]).toBeCloseTo(target[field], 9)
				}
				const again = convert_target_to_3d(back, empty_target_3d())
				for (const key of [ "cp", "cr", "cy", "p", "r", "y" ]) {
					const field = /** @type {keyof Target3D} */(key)/**/
					expect(again[field]).toBeCloseTo(target_3d[field], 12)
				}
			}
		)
		it(
			"convert_target_to_2d keeps a target within half a turn of a camera past PI on the camera's side",
			() => {
				state.camera.x = (PI + 1) * 1_000
				const behind_zero = convert_target_to_2d(
					{ ...empty_target_3d(), y: .1 },
					empty_target()
				)
				expect(behind_zero.x).toBeCloseTo((TAU + .1) * 1_000, 9)
				const ahead = convert_target_to_2d(
					{ ...empty_target_3d(), y: 3 },
					empty_target()
				)
				expect(ahead.x).toBeCloseTo(3_000, 9)
				for (const y of [ -3, -1, 0, .1, 1, 2, 3, 4, 5, 6 ]) {
					const { x } = convert_target_to_2d(
						{ ...empty_target_3d(), y },
						empty_target()
					)
					expect(Math.abs(x - state.camera.x)).toBeLessThanOrEqual(PI * 1_000 + 1e-6)
				}
			}
		)
		it(
			"convert_target_to_2d puts a target just left of a camera at yaw 0 to the left, not a turn away",
			() => {
				const target = { ...empty_target_3d(), y: -.2 }
				const out = convert_target_to_2d(target, empty_target())
				expect(out.x).toBeCloseTo(-200, 9)
				expect(out.cx).toBeCloseTo(-200, 9)
			}
		)
		it(
			"convert_target_to_2d writes into out and places body and a straight core in px",
			() => {
				const out = empty_target()
				const target = {
					cp: .5,
					cr: .01,
					cy: .7,
					p: .1,
					r: .02,
					y: .2
				}
				expect(
					convert_target_to_2d(target, out)
				).toBe(out)
				expect(out.cr).toBeCloseTo(10, 9)
				expect(out.cx).toBeCloseTo(200, 9)
				expect(out.cy).toBeCloseTo(-110, 9)
				expect(out.r).toBeCloseTo(20, 9)
				expect(out.x).toBeCloseTo(200, 9)
				expect(out.y).toBeCloseTo(-100, 9)
			}
		)
		it(
			"convert_target_to_3d writes into out and rebuilds the core straight above the body centre",
			() => {
				const out = empty_target_3d()
				const target = {
					cr: 10,
					cx: 999,
					cy: -110,
					r: 20,
					x: 200,
					y: -100
				}
				expect(
					convert_target_to_3d(target, out)
				).toBe(out)
				expect(out.cp).toBeCloseTo(.11, 12)
				expect(out.cr).toBeCloseTo(.01, 12)
				expect(out.cy).toBeCloseTo(.2, 12)
				expect(out.p).toBeCloseTo(.1, 12)
				expect(out.r).toBeCloseTo(.02, 12)
				expect(out.y).toBeCloseTo(.2, 12)
			}
		)
		it(
			"hit_test_2d tells a core hit, a body hit and a miss, edges included",
			() => {
				const target = { cr: 4, cx: 0, cy: -6, r: 10, x: 0, y: 0 }
				expect(hit_2d(target, 0, -6)).toEqual(
					{ is_crit: true, is_hit: true }
				)
				expect(hit_2d(target, 0, -2)).toEqual(
					{ is_crit: true, is_hit: true }
				)
				expect(hit_2d(target, 0, 0)).toEqual(
					{ is_crit: false, is_hit: true }
				)
				expect(hit_2d(target, 10, 0)).toEqual(
					{ is_crit: false, is_hit: true }
				)
				expect(hit_2d(target, 0, -11)).toEqual(
					{ is_crit: false, is_hit: false }
				)
				expect(hit_2d(target, 8, 8)).toEqual(
					{ is_crit: false, is_hit: false }
				)
			}
		)
		it(
			"hit_test_3d tells a core hit, a body hit and a miss by the angle to each centre",
			() => {
				const target = {
					cp: .06,
					cr: .04,
					cy: 0,
					p: 0,
					r: .1,
					y: 0
				}
				expect(hit_3d(target, 0, .06)).toEqual(
					{ is_crit: true, is_hit: true }
				)
				expect(hit_3d(target, 0, 0)).toEqual(
					{ is_crit: false, is_hit: true }
				)
				expect(hit_3d(target, .099, 0)).toEqual(
					{ is_crit: false, is_hit: true }
				)
				expect(hit_3d(target, .101, 0)).toEqual(
					{ is_crit: false, is_hit: false }
				)
				expect(hit_3d(target, PI, 0)).toEqual(
					{ is_crit: false, is_hit: false }
				)
				expect(
					hit_3d(
						{
							...target,
							cy: TAU - .01,
							y: TAU - .01
						},
						0,
						.06
					)
				).toEqual(
					{ is_crit: true, is_hit: true }
				)
			}
		)
		it(
			"is_target_visible_2d is true within half the camera size of the view centre on both axes",
			() => {
				const target = {
					...empty_target(),
					x: 1_100,
					y: 600
				}
				expect(
					is_target_visible_2d(target, 140, 60)
				).toBe(true)
				expect(
					is_target_visible_2d(target, 139, 60)
				).toBe(false)
				expect(
					is_target_visible_2d(target, 140, 59)
				).toBe(false)
				expect(
					is_target_visible_2d(target, 2_060, 1_140)
				).toBe(true)
				expect(
					is_target_visible_2d(target, 2_061, 1_140)
				).toBe(false)
				expect(
					is_target_visible_2d(target, 2_060, 1_141)
				).toBe(false)
			}
		)
		it(
			"is_target_visible_3d is false for a target behind the camera",
			() => {
				state.camera.fov = 179
				state.camera.vfov = 179
				const target = { ...empty_target_3d(), y: PI }
				expect(
					is_target_visible_3d(target, 0, 0)
				).toBe(false)
				expect(
					is_target_visible_3d(target, PI, 0)
				).toBe(true)
				expect(
					is_target_visible_3d(
						{
							...empty_target_3d(),
							p: to_rad(80)
						},
						0,
						-to_rad(80)
					)
				).toBe(false)
			}
		)
		it(
			"is_target_visible_3d is true inside the horizontal fov and the vertical vfov",
			() => {
				state.camera.fov = 90
				state.camera.vfov = 60
				/**
				 * @param {number} y
				 * @param {number} p
				 * @param {number} yaw
				 * @param {number} pitch
				 * @returns {boolean}
				 */
				function visible(y, p, yaw, pitch) {
					return is_target_visible_3d(
						{ ...empty_target_3d(), p, y },
						yaw,
						pitch
					)
				}
				expect(visible(0, 0, 0, 0)).toBe(true)
				expect(visible(to_rad(44), 0, 0, 0)).toBe(true)
				expect(visible(to_rad(46), 0, 0, 0)).toBe(false)
				expect(visible(-to_rad(44), 0, 0, 0)).toBe(true)
				expect(visible(-to_rad(46), 0, 0, 0)).toBe(false)
				expect(visible(0, to_rad(29), 0, 0)).toBe(true)
				expect(visible(0, to_rad(31), 0, 0)).toBe(false)
				expect(visible(0, -to_rad(31), 0, 0)).toBe(false)
				expect(
					visible(1 + to_rad(44), 0, 1, 0)
				).toBe(true)
				expect(
					visible(1 + to_rad(46), 0, 1, 0)
				).toBe(false)
				expect(visible(1, .5, 1, .5)).toBe(true)
				expect(
					visible(1, .5 + to_rad(29), 1, .5)
				).toBe(true)
				expect(
					visible(1, .5 + to_rad(31), 1, .5)
				).toBe(false)
				expect(visible(0, 0, 0, to_rad(20))).toBe(true)
				expect(visible(0, 0, 0, to_rad(40))).toBe(false)
				expect(visible(TAU - .1, 0, .1, 0)).toBe(true)
			}
		)
		it(
			"px_to_rad multiplies by sens and grows by dist over the sky sphere radius",
			() => {
				expect(px_to_rad(100)).toBeCloseTo(.1, 15)
				state.camera.dist = constants.grid.sky_sphere_radius
				expect(px_to_rad(100)).toBeCloseTo(.2, 15)
				state.camera.dist = constants.grid.sky_sphere_radius / 2
				expect(px_to_rad(100)).toBeCloseTo(.15, 15)
			}
		)
		it(
			"rad_to_px inverts px_to_rad at every dist",
			() => {
				for (const dist of [ 0, 10, 30, 90 ]) {
					state.camera.dist = dist
					for (const px of [ -250, 0, 1, 37.5, 1_000 ]) {
						expect(rad_to_px(px_to_rad(px))).toBeCloseTo(px, 9)
					}
				}
				state.camera.dist = constants.grid.sky_sphere_radius
				expect(rad_to_px(.2)).toBeCloseTo(100, 12)
			}
		)
	}
)