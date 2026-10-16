import {
	encode_click_css_base64,
	encode_png,
	replace_png_data_uri
} from "./lib/png.js"
import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
const require = createRequire(import.meta.url)
/** @type {string} */
const ffmpeg = require("ffmpeg-static")
const BRIGHTNESS = 0.85
const GRID_X = 16
const GRID_Y = 27
const ROOT = join(
	dirname(fileURLToPath(import.meta.url)),
	".."
)
const SOURCE_VIDEO = join(ROOT, "bg.mp4")
const TARGET_HTML = join(ROOT, "docs/index.html")
/** @returns {Buffer} */
function read_grid_rgb() {
	const result = spawnSync(
		ffmpeg,
		[
			"-hide_banner",
			"-loglevel",
			"error",
			"-i",
			SOURCE_VIDEO,
			"-frames:v",
			"1",
			"-vf",
			[
				`crop='min(iw,ih*${GRID_X}/${GRID_Y})':'min(ih,iw*${GRID_Y}/${GRID_X})'`,
				"format=rgb24",
				`scale=${GRID_X}:${GRID_Y}:flags=area`,
				`colorchannelmixer=rr=${BRIGHTNESS}:gg=${BRIGHTNESS}:bb=${BRIGHTNESS}`
			].join(","),
			"-f",
			"rawvideo",
			"-pix_fmt",
			"rgb24",
			"-"
		],
		{
			stdio: [ "ignore", "pipe", "inherit" ]
		}
	)
	if (result.status != 0) {
		throw new Error(
			`ffmpeg exited with status ${result.status}`
		)
	}
	if (result.stdout.length != GRID_X * GRID_Y * 3) {
		throw new Error(
			`Expected ${GRID_X * GRID_Y * 3} RGB bytes, got ${result.stdout.length}`
		)
	}
	return result.stdout
}
{
	const png = encode_png(GRID_X, GRID_Y, read_grid_rgb())
	const b64 = encode_click_css_base64(png)
	if (b64.includes("=") || b64.includes("_")) {
		throw new Error(
			"base64 must not contain '=' or '_' (click-css would mangle)"
		)
	}
	const data_uri = `data:image/png;base64,${b64}`
	const html = readFileSync(TARGET_HTML, "utf8")
	const updated = replace_png_data_uri(html, data_uri, TARGET_HTML)
	if (updated == html) {
		process.stdout.write("No change.\n")
	} else {
		writeFileSync(TARGET_HTML, updated)
		process.stdout.write(`Updated ${TARGET_HTML}\n`)
	}
	process.stdout.write(
		`grid=${GRID_X}x${GRID_Y} png=${png.length}B b64=${b64.length}ch\n`
	)
}