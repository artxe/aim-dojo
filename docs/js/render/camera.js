import constants from "../constants.js"
import { cos, normalize_rad, PI, sin, TAU } from "../math.js"
import state from "../state.js"
const hit_result = { is_crit: false, is_hit: false }
/** @returns {void} */
export function convert_camera_to_2d() {
	state.camera.x = rad_to_px(
		normalize_rad(state.camera.yaw)
	)
	state.camera.y = -rad_to_px(state.camera.pitch)
	state.camera.pitch = 0
	state.camera.yaw = 0
}
/** @returns {void} */
export function convert_camera_to_3d() {
	state.camera.pitch = -px_to_rad(state.camera.y)
	state.camera.yaw = px_to_rad(state.camera.x)
	state.camera.x = 0
	state.camera.y = 0
}
/**
 * @param {Target3D} target
 * @param {Target} out
 * @returns {Target}
 */
export function convert_target_to_2d(target, out) {
	const yaw = px_to_rad(state.camera.x)
	let target_y = normalize_rad(target.y)
	if (yaw > PI) {
		if (target_y < yaw - PI) {
			target_y += TAU
		}
	} else if (target_y > yaw + PI) {
		target_y -= TAU
	}
	const cr = rad_to_px(target.cr)
	const r = rad_to_px(target.r)
	const x = rad_to_px(target_y)
	const y = -rad_to_px(target.p)
	out.cr = cr
	out.cx = x
	out.cy = y - r + cr
	out.r = r
	out.x = x
	out.y = y
	return out
}
/**
 * @param {Target} target
 * @param {Target3D} out
 * @returns {Target3D}
 */
export function convert_target_to_3d(target, out) {
	const cr = px_to_rad(target.cr)
	const p = -px_to_rad(target.y)
	const r = px_to_rad(target.r)
	const y = px_to_rad(target.x)
	out.cp = p + r - cr
	out.cr = cr
	out.cy = y
	out.p = p
	out.r = r
	out.y = y
	return out
}
/**
 * @param {Target} target
 * @param {number} x
 * @param {number} y
 * @returns {{ is_crit: boolean, is_hit: boolean }}
 */
export function hit_test_2d(target, x, y) {
	const { cr, cy, r, x: target_x, y: target_y } = target
	const dx = target_x - x
	hit_result.is_crit = dx ** 2 + (cy - y) ** 2 <= cr * cr
	hit_result.is_hit = dx ** 2 + (target_y - y) ** 2 <= r * r
	return hit_result
}
/**
 * @param {Target3D} target
 * @param {number} yaw
 * @param {number} pitch
 * @returns {{ is_crit: boolean, is_hit: boolean }}
 */
export function hit_test_3d(target, yaw, pitch) {
	const { cp, cr, cy, p, r, y } = target
	const cam_cos_pitch = cos(pitch)
	const cam_x = sin(yaw) * cam_cos_pitch
	const cam_y = sin(pitch)
	const cam_z = -cos(yaw) * cam_cos_pitch
	const body_cos_pitch = cos(p)
	const core_cos_pitch = cos(cp)
	hit_result.is_crit = cam_x * sin(cy) * core_cos_pitch
		+ cam_y * sin(cp)
		- cam_z * cos(cy) * core_cos_pitch >= cos(cr)
	hit_result.is_hit = cam_x * sin(y) * body_cos_pitch
		+ cam_y * sin(p)
		- cam_z * cos(y) * body_cos_pitch >= cos(r)
	return hit_result
}
/**
 * @param {number} px
 * @returns {number}
 */
export function px_to_rad(px) {
	const { dist, sens } = state.camera
	return sens * px * (1 + dist / constants.grid.sky_sphere_radius)
}
/**
 * @param {number} rad
 * @returns {number}
 */
export function rad_to_px(rad) {
	const { dist, sens } = state.camera
	return rad / (sens * (1 + dist / constants.grid.sky_sphere_radius))
}