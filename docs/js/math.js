/* eslint
no-restricted-imports: ["error", { "patterns": ["*"] }]
*/
export const {
	abs,
	acos,
	atan,
	atan2,
	cbrt,
	ceil,
	cos,
	// floor, | 0
	hypot,
	log2,
	max,
	min,
	PI,
	random,
	round,
	sign,
	sin,
	sqrt,
	tan,
	tanh
} = Math
export const EPS = 1e-9
export const TAU = PI * 2
/**
 * @param {number} r
 * @param {number} [base]
 * @returns {number}
 */
export function calc_core_radius(r, base = r) {
	return max(r / 3, base / 2)
}
/**
 * @param {number} low
 * @param {number} value
 * @param {number} high
 * @returns {number}
 */
export function clamp(low, value, high) {
	return max(low, min(value, high))
}
/**
 * @param {number} x_deg
 * @param {number} span_x
 * @param {number} span_y
 * @returns {number}
 */
export function convert_deg_across_aspect(x_deg, span_x, span_y) {
	const x_rad = to_rad(x_deg)
	const y_rad = 2 * atan(
		tan(x_rad / 2) / span_x * span_y
	)
	return to_deg(y_rad)
}
/**
 * @param {number} yaw
 * @param {number} pitch
 * @returns {[ number, number, number ]}
 */
export function dir_from_yaw_pitch(yaw, pitch) {
	const cx = cos(yaw)
	const sx = sin(yaw)
	const cy = cos(pitch)
	const sy = sin(pitch)
	return [ sx * cy, sy, -cx * cy ]
}
/**
 * @param {[ number, number, number ]} a
 * @param {[ number, number, number ]} b
 * @returns {number}
 */
export function dot(a, b) {
	return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}
/**
 * @param {number} a
 * @param {number} b
 * @param {number} t
 * @returns {number}
 */
export function lerp(a, b, t) {
	return a + (b - a) * t
}
/**
 * @param {number} rad
 * @returns {number}
 */
export function normalize_rad(rad) {
	return (rad % TAU + TAU) % TAU
}
/**
 * @param {number} n
 * @param {number} d
 * @returns {number}
 */
export function round_to(n, d) {
	return Number(n.toFixed(d))
}
/**
 * @param {number} rad
 * @returns {number}
 */
export function to_deg(rad) {
	return rad * 180 / PI
}
/**
 * @param {number} deg
 * @returns {number}
 */
export function to_rad(deg) {
	return deg * PI / 180
}