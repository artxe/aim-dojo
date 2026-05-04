import { normalize_rad, PI, tan, TAU, to_rad } from "./math.js"
import state from "./state.js"
/** @returns {void} */
export function camera_to_2d() {
	state.camera.x = rad_to_px(
		normalize_rad(state.camera.yaw)
	)
	state.camera.y = -rad_to_px(state.camera.pitch)
	state.camera.pitch = 0
	state.camera.dimension = "2d"
}
/** @returns {void} */
export function camera_to_3d() {
	state.camera.yaw = px_to_rad(state.camera.x)
	state.camera.pitch = -px_to_rad(state.camera.y)
	state.camera.x = 0
	state.camera.y = 0
	state.camera.dimension = "3d"
}
/**
 * @param {number} px
 * @returns {number}
 */
export function px_to_rad(px) {
	const { fov, width } = state.camera
	return 2 * tan(to_rad(fov) / 2) / width * px
}
/**
 * @param {number} rad
 * @returns {number}
 */
export function rad_to_px(rad) {
	const { fov, width } = state.camera
	return width * rad / (2 * tan(to_rad(fov) / 2))
}
/**
 * @param {Target3D} target
 * @returns {Target}
 */
export function target_to_2d(target) {
	const yaw = normalize_rad(state.camera.yaw)
	let target_cy = normalize_rad(target.cy)
	let target_y = normalize_rad(target.y)
	if (yaw > PI) {
		if (target_cy < yaw - PI) {
			target_cy += TAU
		}
		if (target_y < yaw - PI) {
			target_y += TAU
		}
	} else {
		if (target_cy > yaw + PI) {
			target_cy -= TAU
		}
		if (target_y > yaw + PI) {
			target_y -= TAU
		}
	}
	const cr = rad_to_px(target.cr)
	const r = rad_to_px(target.r)
	const x = rad_to_px(target_y)
	const y = -rad_to_px(target.p)
	return { cr, cx: x, cy: y - r + cr, r, x, y }
}
/**
 * @param {Target} target
 * @returns {Target3D}
 */
export function target_to_3d(target) {
	const cr = px_to_rad(target.cr)
	const p = -px_to_rad(target.y)
	const r = px_to_rad(target.r)
	const y = px_to_rad(target.x)
	return { cp: p + r - cr, cr, cy: y, p, r, y }
}