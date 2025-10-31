import os from "node:os"
import fs from "node:fs"
const mdm = 135
const w = 1920
const fov = 80
const hipfire = calc_sens_pubg(fov, w * .87)
const ads = calc_sens_pubg(fov)
const x2 = calc_sens_pubg(fov / 2)
const x3 = calc_sens_pubg(fov / 3)
const x4 = calc_sens_pubg(fov / 4)
const x6 = calc_sens_pubg(fov / 6)
const x8 = calc_sens_pubg(fov / 8)
const x15 = calc_sens_pubg(fov / 15)
const file = `C:\\Users\\${os.userInfo().username}\\AppData\\Local\\TslGame\\Saved\\Config\\WindowsNoEditor\\GameUserSettings.ini`
const settings = fs.readFileSync(file, "utf-8")
fs.writeFileSync(
	file,
	settings.replace(
		/(?<=SensitiveMap=\(\(Mouse, \(Array=\()(\([^()]*\),?)*/,
		[
			`(SensitiveName="Normal",Sensitivity=${round_to(hipfire, 6)},LastConvertedSensitivity=${round_to(calc_pubg_converted(hipfire), 6)})`,
			`(SensitiveName="Targeting",Sensitivity=${round_to(ads, 6)},LastConvertedSensitivity=${round_to(calc_pubg_converted(ads), 6)})`,
			`(SensitiveName="Scoping",Sensitivity=${round_to(ads, 6)},LastConvertedSensitivity=${round_to(calc_pubg_converted(ads), 6)})`,
			`(SensitiveName="Scope2X",Sensitivity=${round_to(x2, 6)},LastConvertedSensitivity=${round_to(calc_pubg_converted(x2), 6)})`,
			`(SensitiveName="Scope3X",Sensitivity=${round_to(x3, 6)},LastConvertedSensitivity=${round_to(calc_pubg_converted(x3), 6)})`,
			`(SensitiveName="Scope4X",Sensitivity=${round_to(x4, 6)},LastConvertedSensitivity=${round_to(calc_pubg_converted(x4), 6)})`,
			`(SensitiveName="Scope6X",Sensitivity=${round_to(x6, 6)},LastConvertedSensitivity=${round_to(calc_pubg_converted(x6), 6)})`,
			`(SensitiveName="Scope8X",Sensitivity=${round_to(x8, 6)},LastConvertedSensitivity=${round_to(calc_pubg_converted(x8), 6)})`,
			`(SensitiveName="Scope15X",Sensitivity=${round_to(x15, 6)},LastConvertedSensitivity=${round_to(calc_pubg_converted(x15), 6)})`
		].join(",")
	)
)
/**
 * @param {number} sens
 * @returns {number}
 */
export function calc_pubg_converted(sens) {
	const base_sens = 50
	const step = 15.0515
	return .02 * 2 ** ((sens - base_sens) / step)
}
/**
 * @param {number} hfov_deg
 * @param {number} [width]
 * @returns {number}
 */
export function calc_sens_pubg(hfov_deg, width = w) {
	const base_fov = 80
	const base_sens = 50
	const base_yaw = .0444400004444
	const step = 15.0515
	const sens50_yaw = to_rad(hfov_deg / base_fov * base_yaw)
	const rad_per_count = compute_sens_rad(hfov_deg, width)
	return base_sens + step * (Math.log2(rad_per_count / sens50_yaw))
}
/**
 * @param {number} fov_deg
 * @param {number} [width]
 * @returns {number}
 */
export function compute_sens_rad(fov_deg, width = w) {
	const half_width = width / 2
	const tangent_half_fov = Math.tan(to_rad(fov_deg) / 2)
	const ratio = mdm / half_width
	const theta_proj = Math.atan(ratio * tangent_half_fov)
	return theta_proj / ratio / half_width
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
 * @param {number} deg
 * @returns {number}
 */
export function to_rad(deg) {
	return deg * Math.PI / 180
}