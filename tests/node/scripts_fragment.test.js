import {
	format_seconds,
	parse_frame_count,
	solve_video_bitrate
} from "../../scripts/lib/fragment.js"
import { describe, expect, it } from "vitest"
const TARGET_SIZE_BYTES = 99 * 1_024 * 1_024
describe(
	"scripts/lib/fragment.js",
	() => {
		it(
			"format_seconds prints up to 12 decimals without trailing zeros or a bare point",
			() => {
				expect(format_seconds(10)).toBe("10")
				expect(format_seconds(0)).toBe("0")
				expect(format_seconds(2.5)).toBe("2.5")
				expect(format_seconds(59.95)).toBe("59.95")
				expect(format_seconds(4_321 / 60)).toBe("72.016666666667")
			}
		)
		it(
			"parse_frame_count reads the last frame= counter of the ffmpeg progress",
			() => {
				const stderr = [
					"Input #0, mov,mp4,m4a,3gp,3g2,mj2, from 'bg.mp4':",
					"frame=  120 fps=0.0 q=-0.0 size=N/A time=00:00:02.00 bitrate=N/A speed=4x\r",
					"frame= 1200 fps=600 q=-0.0 size=N/A time=00:00:20.00 bitrate=N/A speed=10x\r",
					"frame=1801 fps=610 q=-0.0 Lsize=N/A time=00:00:30.01 bitrate=N/A speed=10x"
				].join("\n")
				expect(parse_frame_count(stderr)).toBe(1_801)
			}
		)
		it(
			"parse_frame_count throws without a frame counter or with zero frames",
			() => {
				expect(
					() => parse_frame_count(
						"bg.mp4: Invalid data found when processing input"
					)
				).toThrow(
					"Unable to read video frame count"
				)
				expect(
					() => parse_frame_count(
						"frame=    0 fps=0.0 q=0.0 Lsize=N/A"
					)
				).toThrow("Invalid video frame count: 0")
			}
		)
		it(
			"solve_video_bitrate fills the target size to within a bit per second",
			() => {
				for (const duration_s of [ 1, 10, 30.016_666_666_666_666, 600 ]) {
					const video_bitrate = solve_video_bitrate(
						TARGET_SIZE_BYTES,
						128_000,
						duration_s
					)
					expect(
						Number.isInteger(video_bitrate)
					).toBe(true)
					const bits = (video_bitrate + 128_000) * duration_s
					expect(bits).toBeLessThanOrEqual(TARGET_SIZE_BYTES * 8)
					expect(bits).toBeGreaterThan(
						TARGET_SIZE_BYTES * 8 - duration_s
					)
				}
			}
		)
		it(
			"solve_video_bitrate leaves the audio bitrate's share of the target size",
			() => {
				expect(
					solve_video_bitrate(TARGET_SIZE_BYTES, 128_000, 10)
				).toBe(82_919_219)
			}
		)
		it(
			"solve_video_bitrate stays exact above 2^31 bps for very short clips",
			() => {
				expect(
					solve_video_bitrate(TARGET_SIZE_BYTES, 128_000, .25)
				).toBe(3_321_760_768)
			}
		)
		it(
			"solve_video_bitrate throws when the audio alone fills the target",
			() => {
				expect(
					() => solve_video_bitrate(16_000, 128_000, 1)
				).toThrow("Invalid video bitrate: 0")
				expect(
					() => solve_video_bitrate(1_000, 128_000, 1)
				).toThrow(
					"Invalid video bitrate: -120000"
				)
			}
		)
	}
)