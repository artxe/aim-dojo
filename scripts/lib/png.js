import { deflateSync } from "node:zlib"
const PNG_SIGNATURE = Buffer.from("89504e470d0a1a0a", "hex")
const URI_PATTERN = /data:image\/png;base64,[A-Za-z0-9+/]+/g
const crc_table = new Uint32Array(256)
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
 * @param {Buffer} png
 * @returns {string}
 */
export function encode_click_css_base64(png) {
	const pad = (3 - (png.length % 3)) % 3
	return Buffer.concat([ png, Buffer.alloc(pad) ]).toString("base64")
}
/**
 * @param {number} width
 * @param {number} height
 * @param {Buffer} rgb
 * @returns {Buffer}
 */
export function encode_png(width, height, rgb) {
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
/**
 * @param {string} html
 * @param {string} data_uri
 * @param {string} file
 * @returns {string}
 */
export function replace_png_data_uri(html, data_uri, file) {
	const hits = html.match(URI_PATTERN)
	if (!hits || hits.length != 1) {
		throw new Error(
			`Expected exactly 1 PNG data URI in ${file}, found ${hits?.length ?? 0}`
		)
	}
	return html.replace(hits[0], data_uri)
}
{
	for (let i = 0; i < 256; i += 1) {
		let c = i
		for (let j = 0; j < 8; j += 1) {
			c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
		}
		crc_table[i] = c >>> 0
	}
}