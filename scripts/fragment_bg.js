import { spawnSync } from "node:child_process"
import {
	existsSync,
	renameSync,
	statSync,
	unlinkSync
} from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
const require = createRequire(import.meta.url)
const ffmpeg = /** @type {string} */(require("ffmpeg-static"))/**/
const AUDIO_BITRATE = 128_000
const AUDIO_PAD_SAMPLES = 4_800
const AUDIO_SAMPLE_RATE = 48_000
const FPS = 60
const MAX_HEIGHT = 1_080
const TARGET_SIZE_BYTES = 99 * 1_024 * 1_024
const ROOT = join(
	dirname(fileURLToPath(import.meta.url)),
	".."
)
const PASSLOG = join(ROOT, "docs/bg.2pass")
const SOURCE = join(ROOT, "docs/bg.mp4")
const TARGET = join(ROOT, "docs/bg.mp4")
const TMP = join(ROOT, "docs/bg.frag.tmp.mp4")
const GOP_FRAMES = FPS
const VIDEO_FRAME_SAMPLES = AUDIO_SAMPLE_RATE / FPS
{
	if (!existsSync(SOURCE)) {
		throw new Error(`Missing source: ${SOURCE}`)
	}
	const before = statSync(SOURCE).size
	const video_frames = read_video_frame_count()
	if (video_frames <= 0) {
		throw new Error(
			`Invalid video frame count: ${video_frames}`
		)
	}
	const audio_samples = video_frames * VIDEO_FRAME_SAMPLES
		+ AUDIO_PAD_SAMPLES
	const duration_s = video_frames / FPS
	const video_bitrate = (
		(TARGET_SIZE_BYTES * 8 - AUDIO_BITRATE * duration_s)
			/ duration_s
	) | 0
	if (video_bitrate <= 0) {
		throw new Error(
			`Invalid video bitrate: ${video_bitrate}`
		)
	}
	if (existsSync(TMP)) {
		unlinkSync(TMP)
	}
	clean_passlog()
	const common_video = [
		"-vf",
		`scale=-2:min(${MAX_HEIGHT}\\,ih),fps=${FPS},setpts=N/${FPS}/TB`,
		"-frames:v",
		String(video_frames),
		"-c:v",
		"libx264",
		"-preset",
		"slow",
		"-b:v",
		String(video_bitrate),
		"-pix_fmt",
		"yuv420p",
		"-g",
		String(GOP_FRAMES),
		"-keyint_min",
		String(GOP_FRAMES),
		"-sc_threshold",
		"0",
		"-r",
		String(FPS),
		"-fps_mode",
		"cfr"
	]
	run_ffmpeg(
		[
			"-hide_banner",
			"-loglevel",
			"error",
			"-i",
			SOURCE,
			"-map",
			"0:v:0",
			"-an",
			"-dn",
			"-map_metadata",
			"-1",
			"-map_chapters",
			"-1",
			...common_video,
			"-pass",
			"1",
			"-passlogfile",
			PASSLOG,
			"-f",
			"null",
			"-"
		],
		"inherit"
	)
	run_ffmpeg(
		[
			"-hide_banner",
			"-loglevel",
			"error",
			"-i",
			SOURCE,
			"-map",
			"0:v:0",
			"-map",
			"0:a:0",
			"-dn",
			"-map_metadata",
			"-1",
			"-map_chapters",
			"-1",
			...common_video,
			"-af",
			[
				`atrim=start_sample=0:end_sample=${audio_samples}`,
				"asetpts=PTS-STARTPTS",
				`apad=whole_len=${audio_samples}`,
				`atrim=start_sample=0:end_sample=${audio_samples}`
			].join(","),
			"-c:a",
			"aac",
			"-ar",
			String(AUDIO_SAMPLE_RATE),
			"-b:a",
			"128k",
			"-pass",
			"2",
			"-passlogfile",
			PASSLOG,
			"-movflags",
			"+frag_keyframe+empty_moov+default_base_moof",
			TMP
		],
		"inherit"
	)
	clean_passlog()
	const after = statSync(TMP).size
	if (existsSync(TARGET)) {
		unlinkSync(TARGET)
	}
	renameSync(TMP, TARGET)
	process.stdout.write(`Fragmented ${SOURCE}\n`)
	process.stdout.write(
		`  before:   ${before} bytes\n`
	)
	process.stdout.write(
		`  after:    ${after} bytes`
			+ ` (${(after / 1_048_576).toFixed(2)} MiB)\n`
	)
	process.stdout.write(
		`  frames:   ${video_frames}\n`
	)
	process.stdout.write(
		`  duration: ${format_seconds(duration_s)}s\n`
	)
	process.stdout.write(
		`  bitrate:  ${video_bitrate} bps (video)\n`
	)
	process.stdout.write(
		`  samples:  ${audio_samples}\n`
	)
}
function clean_passlog() {
	const suffixes = [ "-0.log", "-0.log.mbtree" ]
	for (const suffix of suffixes) {
		const file = PASSLOG + suffix
		if (existsSync(file)) {
			unlinkSync(file)
		}
	}
}
/** @param {number} seconds */
function format_seconds(seconds) {
	return seconds.toFixed(12).replace(/0+$/, "")
		.replace(/\.$/, "")
}
/** @returns {number} */
function read_video_frame_count() {
	const result = run_ffmpeg(
		[
			"-hide_banner",
			"-i",
			SOURCE,
			"-map",
			"0:v:0",
			"-an",
			"-vf",
			`fps=${FPS}`,
			"-f",
			"null",
			"-"
		],
		"pipe"
	)
	const stderr = String(result.stderr)
	const matches = [
		...stderr.matchAll(/frame=\s*(\d+)/g)
	]
	const match = matches.at(-1)
	if (!match) {
		throw new Error(
			"Unable to read video frame count"
		)
	}
	return Number(match[1])
}
/**
 * @param {string[]} args
 * @param {"inherit"|"pipe"} stdio
 * @returns {import("node:child_process").SpawnSyncReturns<Buffer>}
 */
function run_ffmpeg(args, stdio) {
	const result = spawnSync(
		ffmpeg,
		args,
		{ encoding: "buffer", stdio }
	)
	if (result.status != 0) {
		throw new Error(
			`ffmpeg exited with status ${result.status}`
		)
	}
	return result
}