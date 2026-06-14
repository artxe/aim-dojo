import { cos, hypot, PI, sin, tan } from "../math.js"
/**
 * @param {Float32Array} out
 * @param {number} fovy_deg
 * @param {number} aspect
 * @param {number} near
 * @param {number} far
 * @returns {Float32Array}
 */
function perspective(out, fovy_deg, aspect, near, far) {
	const f = 1 / tan((fovy_deg * PI / 180) / 2)
	const nf = 1 / (near - far)
	out[0] = f / aspect
	out[1] = 0
	out[2] = 0
	out[3] = 0
	out[4] = 0
	out[5] = f
	out[6] = 0
	out[7] = 0
	out[8] = 0
	out[9] = 0
	out[10] = (far + near) * nf
	out[11] = -1
	out[12] = 0
	out[13] = 0
	out[14] = (2 * far * near) * nf
	out[15] = 0
	return out
}
/**
 * @param {Float32Array} out
 * @param {number} yaw
 * @param {number} pitch
 * @param {number} [roll = 0]
 * @param {number} [tps_offset = 0]
 * @returns {Float32Array}
 */
function view(
	out,
	yaw,
	pitch,
	roll = 0,
	tps_offset = 0
) {
	const cx = cos(yaw)
	const sx = sin(yaw)
	const cy = cos(pitch)
	const sy = sin(pitch)
	const fwd_x = sx * cy
	const fwd_y = sy
	const fwd_z = -cx * cy
	let s_x = -fwd_z
	let s_y = 0
	let s_z = fwd_x
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
	out[0] = s_x
	out[1] = u_x
	out[2] = -fwd_x
	out[3] = 0
	out[4] = s_y
	out[5] = u_y
	out[6] = -fwd_y
	out[7] = 0
	out[8] = s_z
	out[9] = u_z
	out[10] = -fwd_z
	out[11] = 0
	out[12] = 0
	out[13] = 0
	out[14] = -tps_offset
	out[15] = 1
	return out
}
export default { perspective, view }