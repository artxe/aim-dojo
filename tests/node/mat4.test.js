import mat4 from "../../docs/js/render/mat4.js"
import { describe, expect, it } from "vitest"
/**
 * @param {number[]} a
 * @param {number[]} b
 * @returns {number}
 */
function dot(a, b) {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
/**
 * @param {Float32Array} actual
 * @param {number[]} expected
 * @returns {void}
 */
function expect_matrix(actual, expected) {
	expect(actual).toHaveLength(16)
	expected.forEach(
		(v, i) => {
			expect(actual[i]).toBeCloseTo(v, 6)
		}
	)
}
describe(
	"render/mat4.js",
	() => {
		it(
			"perspective fills the column-major OpenGL projection and returns out",
			() => {
				const out = new Float32Array(16).fill(7)
				const result = mat4.perspective(out, 90, 2, 1, 3)
				expect(result).toBe(out)
				expect_matrix(
					out,
					[ .5, 0, 0, 0, 0, 1, 0, 0, 0, 0, -2, -1, 0, 0, -3, 0 ]
				)
			}
		)
		it(
			"perspective focal length follows the vertical fov",
			() => {
				const out = mat4.perspective(new Float32Array(16), 60, 1, .1, 100)
				expect(out[5]).toBeCloseTo(1 / Math.tan(Math.PI / 6), 5)
				expect(out[0]).toBe(out[5])
			}
		)
		it(
			"perspective maps the near plane to -1 and the far plane to +1 in clip space",
			() => {
				const out = mat4.perspective(
					new Float32Array(16),
					75,
					16 / 9,
					.1,
					2_000
				)
				const near = (out[10] * -.1 + out[14]) / (out[11] * -.1)
				const far = (out[10] * -2_000 + out[14]) / (out[11] * -2_000)
				expect(near).toBeCloseTo(-1, 4)
				expect(far).toBeCloseTo(1, 4)
			}
		)
		it(
			"view at a quarter turn of pitch looks along +y",
			() => {
				const out = mat4.view(
					new Float32Array(16),
					0,
					Math.PI / 2
				)
				expect_matrix(
					out,
					[ 1, 0, 0, 0, 0, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1 ]
				)
			}
		)
		it(
			"view at a quarter turn of yaw looks along +x with right = +z",
			() => {
				const out = mat4.view(
					new Float32Array(16),
					Math.PI / 2,
					0
				)
				expect_matrix(
					out,
					[ 0, 0, -1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1 ]
				)
			}
		)
		it(
			"view at zero yaw and pitch is the identity",
			() => {
				const out = new Float32Array(16).fill(7)
				const result = mat4.view(out, 0, 0)
				expect(result).toBe(out)
				expect_matrix(
					out,
					[ 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]
				)
			}
		)
		it(
			"view basis stays orthonormal at an arbitrary yaw, pitch and roll",
			() => {
				const out = mat4.view(new Float32Array(16), 1.1, -.4, .3)
				const right = [ out[0], out[4], out[8] ]
				const up = [ out[1], out[5], out[9] ]
				const back = [ out[2], out[6], out[10] ]
				expect(dot(right, right)).toBeCloseTo(1, 5)
				expect(dot(up, up)).toBeCloseTo(1, 5)
				expect(dot(back, back)).toBeCloseTo(1, 5)
				expect(dot(right, up)).toBeCloseTo(0, 5)
				expect(dot(right, back)).toBeCloseTo(0, 5)
				expect(dot(up, back)).toBeCloseTo(0, 5)
			}
		)
		it(
			"view falls back to a unit side length for a non-finite angle",
			() => {
				const out = mat4.view(new Float32Array(16), 0, NaN)
				expect(out[15]).toBe(1)
				expect(out[3]).toBe(0)
			}
		)
		it(
			"view roll rotates right and up about the view axis",
			() => {
				const out = mat4.view(
					new Float32Array(16),
					0,
					0,
					Math.PI / 2
				)
				expect_matrix(
					out,
					[ 0, -1, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1 ]
				)
			}
		)
		it(
			"view tpp_offset pulls the camera back along its view axis",
			() => {
				const out = mat4.view(new Float32Array(16), 0, 0, 0, 9)
				expect(out[14]).toBe(-9)
				expect(out[12]).toBe(0)
				expect(out[13]).toBe(0)
			}
		)
	}
)