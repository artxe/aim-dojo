/**
 * @param {number} seconds
 * @returns {string}
 */
export function format_seconds(seconds) {
	return seconds.toFixed(12).replace(/0+$/, "")
		.replace(/\.$/, "")
}
/**
 * @param {string} stderr
 * @returns {number}
 */
export function parse_frame_count(stderr) {
	const matches = [
		...stderr.matchAll(/frame=\s*(\d+)/g)
	]
	const match = matches.at(-1)
	if (!match) {
		throw new Error(
			"Unable to read video frame count"
		)
	}
	const video_frames = Number(match[1])
	if (video_frames <= 0) {
		throw new Error(
			`Invalid video frame count: ${video_frames}`
		)
	}
	return video_frames
}
/**
 * @param {number} target_size_bytes
 * @param {number} audio_bitrate
 * @param {number} duration_s
 * @returns {number}
 */
export function solve_video_bitrate(
	target_size_bytes,
	audio_bitrate,
	duration_s
) {
	const video_bitrate = Math.trunc(
		(target_size_bytes * 8 - audio_bitrate * duration_s)
			/ duration_s
	)
	if (video_bitrate <= 0) {
		throw new Error(
			`Invalid video bitrate: ${video_bitrate}`
		)
	}
	return video_bitrate
}