import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { deflateSync, inflateSync } from "node:zlib"
const { abs, floor, min, round } = Math
const BRIGHTNESS = 0.85
const GRID_X = 16
const GRID_Y = 27
const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex")
const ROOT = join(
	dirname(fileURLToPath(import.meta.url)),
	".."
)
const SAMPLE_STEP = 2
const SOURCE_PNG = join(ROOT, "docs/bg.png")
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
 * @param {{ channels: number, height: number, pixels: Buffer, width: number }} src
 * @param {number} grid_x
 * @param {number} grid_y
 * @returns {Buffer}
 */
function compute_averages(src, grid_x, grid_y) {
	const { channels, height, pixels, width } = src
	const src_aspect = width / height
	const target_aspect = grid_x / grid_y
	let crop_h = height
	let crop_w = width
	let crop_x = 0
	let crop_y = 0
	if (src_aspect > target_aspect) {
		crop_w = round(height * target_aspect)
		crop_x = floor((width - crop_w) / 2)
	} else if (src_aspect < target_aspect) {
		crop_h = round(width / target_aspect)
		crop_y = floor((height - crop_h) / 2)
	}
	const out = Buffer.alloc(grid_x * grid_y * 3)
	for (let cy = 0; cy < grid_y; cy += 1) {
		const y0 = crop_y + floor(cy * crop_h / grid_y)
		const y1 = crop_y + min(
			crop_h,
			floor((cy + 1) * crop_h / grid_y)
		)
		for (let cx = 0; cx < grid_x; cx += 1) {
			const x0 = crop_x + floor(cx * crop_w / grid_x)
			const x1 = crop_x + min(
				crop_w,
				floor((cx + 1) * crop_w / grid_x)
			)
			let b = 0
			let g = 0
			let n = 0
			let r = 0
			for (let y = y0; y < y1; y += SAMPLE_STEP) {
				for (let x = x0; x < x1; x += SAMPLE_STEP) {
					const i = (y * width + x) * channels
					b += pixels[i + 2]
					g += pixels[i + 1]
					r += pixels[i]
					n += 1
				}
			}
			const o = (cy * grid_x + cx) * 3
			const k = BRIGHTNESS / n
			out[o] = round(r * k)
			out[o + 1] = round(g * k)
			out[o + 2] = round(b * k)
		}
	}
	return out
}
/**
 * @param {Buffer} buf
 * @returns {number}
 */
function crc32(buf) {
	let c = 0xffffffff
	for (let i = 0; i < buf.length; i += 1) {
		c = crc_table[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
	}
	return (c ^ 0xffffffff) >>> 0
}
/**
 * @param {Buffer} buf
 * @returns {{ channels: number, height: number, pixels: Buffer, width: number }}
 */
function decode_png(buf) {
	if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
		throw new Error("not a PNG")
	}
	/** @type {Buffer[]} */
	const idat_parts = []
	let bit_depth = 0
	let color_type = 0
	let height = 0
	let p = 8
	let width = 0
	while (p < buf.length) {
		const len = buf.readUInt32BE(p)
		const type = buf.subarray(p + 4, p + 8).toString("ascii")
		const data = buf.subarray(p + 8, p + 8 + len)
		p += 8 + len + 4
		if (type == "IDAT") {
			idat_parts.push(data)
		} else if (type == "IEND") {
			break
		} else if (type == "IHDR") {
			width = data.readUInt32BE(0)
			height = data.readUInt32BE(4)
			bit_depth = data[8]
			color_type = data[9]
		}
	}
	if (bit_depth != 8 || (color_type != 2 && color_type != 6)) {
		throw new Error(
			`unsupported PNG: bit_depth=${bit_depth} color_type=${color_type} (need 8-bit RGB or RGBA)`
		)
	}
	const channels = color_type == 6 ? 4 : 3
	const stride = width * channels
	const raw = inflateSync(Buffer.concat(idat_parts))
	const pixels = Buffer.alloc(stride * height)
	let row = 0
	let rp = 0
	for (let y = 0; y < height; y += 1) {
		const filter = raw[rp++]
		for (let x = 0; x < stride; x += 1) {
			const left = x >= channels ? pixels[row + x - channels] : 0
			const up = y > 0 ? pixels[row - stride + x] : 0
			const up_left = (y > 0 && x >= channels) ? pixels[row - stride + x - channels] : 0
			let val = raw[rp++]
			if (filter == 1) {
				val = (val + left) & 0xff
			} else if (filter == 2) {
				val = (val + up) & 0xff
			} else if (filter == 3) {
				val = (val + ((left + up) >> 1)) & 0xff
			} else if (filter == 4) {
				const pp = left + up - up_left
				const pa = abs(pp - left)
				const pb = abs(pp - up)
				const pc = abs(pp - up_left)
				const pred = pa <= pb && pa <= pc ? left : pb <= pc ? up : up_left
				val = (val + pred) & 0xff
			} else if (filter != 0) {
				throw new Error(
					`unknown filter ${filter} at row ${y}`
				)
			}
			pixels[row + x] = val
		}
		row += stride
	}
	return { channels, height, pixels, width }
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
{
	const decoded = decode_png(readFileSync(SOURCE_PNG))
	const avg_rgb = compute_averages(decoded, GRID_X, GRID_Y)
	const png = encode_png(GRID_X, GRID_Y, avg_rgb)
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