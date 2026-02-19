import { cos, hypot, PI, sin, tan } from "./math.js"
/** @returns {Float32Array<ArrayBuffer>} */
function identity() {
	const m = new Float32Array(16)
	m[0] = 1
	m[5] = 1
	m[10] = 1
	m[15] = 1
	return m
}
/**
 * @param {Float32Array} a
 * @param {Float32Array} b
 * @returns {Float32Array<ArrayBuffer>}
 */
function multiply(a, b) {
	const o = new Float32Array(16)
	o[0] = a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3]
	o[1] = a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3]
	o[2] = a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3]
	o[3] = a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3]
	o[4] = a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7]
	o[5] = a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7]
	o[6] = a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7]
	o[7] = a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7]
	o[8] = a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11]
	o[9] = a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11]
	o[10] = a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11]
	o[11] = a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11]
	o[12] = a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15]
	o[13] = a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15]
	o[14] = a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15]
	o[15] = a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15]
	return o
}
/**
 * @param {number} fovy_deg
 * @param {number} aspect
 * @param {number} near
 * @param {number} far
 * @returns {Float32Array<ArrayBuffer>}
 */
function perspective(fovy_deg, aspect, near, far) {
	const f = 1 / tan((fovy_deg * PI / 180) / 2)
	const nf = 1 / (near - far)
	const m = new Float32Array(16)
	m[0] = f / aspect
	m[1] = 0
	m[2] = 0
	m[3] = 0
	m[4] = 0
	m[5] = f
	m[6] = 0
	m[7] = 0
	m[8] = 0
	m[9] = 0
	m[10] = (far + near) * nf
	m[11] = -1
	m[12] = 0
	m[13] = 0
	m[14] = (2 * far * near) * nf
	m[15] = 0
	return m
}
/**
 * @param {number} yaw
 * @param {number} pitch
 * @param {number} [roll = 0]
 * @returns {Float32Array<ArrayBuffer>}
 */
function view(yaw, pitch, roll = 0) {
	const cx = cos(yaw)
	const sx = sin(yaw)
	const cy = cos(pitch)
	const sy = sin(pitch)
	const fwd_x = sx * cy
	const fwd_y = sy
	const fwd_z = -cx * cy
	const up_x = 0
	const up_y = 1
	const up_z = 0
	let s_x = fwd_y * up_z - fwd_z * up_y
	let s_y = fwd_z * up_x - fwd_x * up_z
	let s_z = fwd_x * up_y - fwd_y * up_x
	const s_len = hypot(s_x, s_y, s_z) || 1
	s_x = s_x / s_len
	s_y = s_y / s_len
	s_z = s_z / s_len
	let u_x = s_y * fwd_z - s_z * fwd_y
	let u_y = s_z * fwd_x - s_x * fwd_z
	let u_z = s_x * fwd_y - s_y * fwd_x
	if (roll) {
		const cr = cos(roll)
		const sr = sin(roll)
		const rs_x = s_x * cr + u_x * sr
		const rs_y = s_y * cr + u_y * sr
		const rs_z = s_z * cr + u_z * sr
		const ru_x = -s_x * sr + u_x * cr
		const ru_y = -s_y * sr + u_y * cr
		const ru_z = -s_z * sr + u_z * cr
		s_x = rs_x
		s_y = rs_y
		s_z = rs_z
		u_x = ru_x
		u_y = ru_y
		u_z = ru_z
	}
	const m = identity()
	m[0] = s_x
	m[4] = s_y
	m[8] = s_z
	m[1] = u_x
	m[5] = u_y
	m[9] = u_z
	m[2] = -fwd_x
	m[6] = -fwd_y
	m[10] = -fwd_z
	m[12] = 0
	m[13] = 0
	m[14] = 0
	return m
}
export default {
	identity,
	multiply,
	perspective,
	view
}