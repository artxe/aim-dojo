import { spawnSync } from "node:child_process"
import { existsSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
const require = createRequire(import.meta.url)
const ffmpeg = /** @type {string} */(require("ffmpeg-static"))/**/
const BG_QUALITY = 90
const ICON_SIZE = 128
const ROOT = join(
	dirname(fileURLToPath(import.meta.url)),
	".."
)
const BG_SOURCE = join(ROOT, "docs/bg.png")
const BG_TARGET = join(ROOT, "docs/bg.webp")
const ICON_SOURCE = join(ROOT, "docs/favicon.png")
const ICON_TARGET = join(ROOT, "docs/icon.png")
/**
 * @param {string} source
 * @param {string} target
 * @param {string[]} args
 * @returns {void}
 */
function encode(source, target, args) {
	if (!existsSync(source)) {
		throw new Error(`Missing ${source}`)
	}
	const result = spawnSync(
		ffmpeg,
		[
			"-y",
			"-hide_banner",
			"-loglevel",
			"error",
			"-i",
			source,
			...args,
			target
		],
		{ stdio: "inherit" }
	)
	if (result.status != 0) {
		throw new Error(
			`ffmpeg exited with status ${result.status} for ${target}`
		)
	}
	process.stdout.write(
		`${target}  ${format_kb(source)} -> ${format_kb(target)}\n`
	)
}
/**
 * @param {string} file
 * @returns {string}
 */
function format_kb(file) {
	return `${(statSync(file).size / 1_024).toFixed(1)} KB`
}
{
	encode(
		BG_SOURCE,
		BG_TARGET,
		[
			"-c:v",
			"libwebp",
			"-compression_level",
			"6",
			"-quality",
			String(BG_QUALITY)
		]
	)
	encode(
		ICON_SOURCE,
		ICON_TARGET,
		[
			"-vf",
			`scale=${ICON_SIZE}:${ICON_SIZE}:flags=lanczos`
		]
	)
}