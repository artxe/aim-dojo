import { spawnSync } from "node:child_process"
import { readFileSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { deflateSync } from "node:zlib"
const require = createRequire(import.meta.url)
const ffmpeg = /** @type {string} */(require("ffmpeg-static"))/**/
const BRIGHTNESS = 0.85
const GRID_X = 16
const GRID_Y = 27
const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex")
const ROOT = join(
	dirname(fileURLToPath(import.meta.url)),
	".."
)
const SOURCE_VIDEO = join(ROOT, "bg.mp4")
const TARGET_HTML = join(ROOT, "docs/index.html")
const URI_PATTERN = /data:image\/png;base64,[A-Za-z0-9+/]+/g
const crc_table = new Uint32Array(256)
{
	for (let i = 0; i < 256; i += 1) {
		let c = i
		for (let j = 0; j < 8; j += 1) {
			c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
		}
		crc_table[i] = c >>> 0
	}
}
/**
 * @param {Buffer} buf
 * @returns {number}
 */
function crc32(buf) {
	let c = 0xffffffff
	for (const byte of buf) {
		c = /** @type {number} */(crc_table[(c ^ byte) & 0xff])/**/ ^ (c >>> 8)
	}
	return (c ^ 0xffffffff) >>> 0
}
/**
 * @param {number} width
 * @param {number} height
 * @param {Buffer} rgb
 * @returns {Buffer}
 */
function encode_png(width, height, rgb) {
	const stride = width * 3
	const raw = Buffer.alloc((stride + 1) * height)
	for (let y = 0; y < height; y += 1) {
		raw[y * (stride + 1)] = 0
		rgb.copy(
			raw,
			y * (stride + 1) + 1,
			y * stride,
			y * stride + stride
		)
	}
	const ihdr = Buffer.alloc(13)
	ihdr.writeUInt32BE(width, 0)
	ihdr.writeUInt32BE(height, 4)
	ihdr[8] = 8
	ihdr[9] = 2
	return Buffer.concat(
		[
			PNG_SIGNATURE,
			make_chunk("IHDR", ihdr),
			make_chunk(
				"IDAT",
				deflateSync(raw, { level: 9 })
			),
			make_chunk("IEND", Buffer.alloc(0))
		]
	)
}
/**
 * @param {string} type
 * @param {Buffer} data
 * @returns {Buffer}
 */
function make_chunk(type, data) {
	const head = Buffer.alloc(8)
	head.writeUInt32BE(data.length, 0)
	head.write(type, 4, "ascii")
	const crc = Buffer.alloc(4)
	crc.writeUInt32BE(
		crc32(
			Buffer.concat([ head.subarray(4), data ])
		),
		0
	)
	return Buffer.concat([ head, data, crc ])
}
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
	const pad = (3 - (png.length % 3)) % 3
	const b64 = Buffer.concat([ png, Buffer.alloc(pad) ]).toString("base64")
	if (b64.includes("=") || b64.includes("_")) {
		throw new Error(
			"base64 must not contain '=' or '_' (click-css would mangle)"
		)
	}
	const data_uri = `data:image/png;base64,${b64}`
	const html = readFileSync(TARGET_HTML, "utf8")
	const hits = html.match(URI_PATTERN)
	if (!hits || hits.length != 1) {
		throw new Error(
			`Expected exactly 1 PNG data URI in ${TARGET_HTML}, found ${hits?.length ?? 0}`
		)
	}
	const updated = html.replace(hits[0], data_uri)
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