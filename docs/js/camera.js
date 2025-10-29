import { atan, tan, to_rad } from "./math.js"
import state from "./state.js"
/** @returns {void} */
export function camera_to_2d() {
	state.camera.x += rad_to_px(state.camera.yaw)
	state.camera.y -= rad_to_px(state.camera.pitch)
	state.camera.yaw = 0
	state.camera.pitch = 0
	state.camera.dimension = "2d"
}
/** @returns {void} */
export function camera_to_3d() {
	state.camera.yaw += px_to_rad(state.camera.x)
	state.camera.pitch -= px_to_rad(state.camera.y)
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
	return atan(
		(2 * px / width) * tan(to_rad(fov) / 2)
	)
}
/**
 * @param {number} rad
 * @returns {number}
 */
export function rad_to_px(rad) {
	const { fov, width } = state.camera
	return (width / 2) * tan(rad) / tan(to_rad(fov) / 2)
}