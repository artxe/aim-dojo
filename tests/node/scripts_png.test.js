import {
	encode_click_css_base64,
	encode_png,
	replace_png_data_uri
} from "../../scripts/lib/png.js"
import { crc32, inflateSync } from "node:zlib"
import { describe, expect, it } from "vitest"
/**
 * @param {Buffer} png
 * @returns {{ crc: number, data: Buffer, type: string }[]}
 */
function read_chunks(png) {
	const chunks = []
	let at = 8
	while (at < png.length) {
		const length = png.readUInt32BE(at)
		chunks.push(
			{
				crc: png.readUInt32BE(at + 8 + length),
				data: png.subarray(at + 8, at + 8 + length),
				type: png.toString("ascii", at + 4, at + 8)
			}
		)
		at += 12 + length
	}
	expect(at).toBe(png.length)
	return chunks
}
describe(
	"scripts/lib/png.js",
	() => {
		it(
			"a padded 16x27 placeholder decodes to the PNG followed only by zero bytes",
			() => {
				const rgb = Buffer.alloc(16 * 27 * 3)
				for (let i = 0; i < rgb.length; i++) {
					rgb[i] = i * 37 % 256
				}
				const png = encode_png(16, 27, rgb)
				const decoded = Buffer.from(
					encode_click_css_base64(png),
					"base64"
				)
				expect(
					decoded.subarray(0, png.length)
				).toEqual(png)
				expect(
					[
						...decoded.subarray(png.length)
					].every(byte => byte == 0)
				).toBe(true)
				expect(decoded.length % 3).toBe(0)
			}
		)
		it(
			"encode_click_css_base64 uses the standard alphabet, never the url-safe '_'",
			() => {
				expect(
					encode_click_css_base64(
						Buffer.from([ 0xfb, 0xff, 0xbf ])
					)
				).toBe("+/+/")
				expect(
					encode_click_css_base64(
						Buffer.from([ 0xff, 0xff, 0xff ])
					)
				).toBe("////")
			}
		)
		it(
			"encode_click_css_base64 zero-pads to whole 3-byte groups so no '=' appears",
			() => {
				for (let length = 0; length < 7; length++) {
					const bytes = Buffer.alloc(length, 0xab)
					const b64 = encode_click_css_base64(bytes)
					const pad = (3 - length % 3) % 3
					expect(b64).not.toContain("=")
					expect(b64.length).toBe((length + pad) / 3 * 4)
					expect(Buffer.from(b64, "base64")).toEqual(
						Buffer.concat([ bytes, Buffer.alloc(pad) ])
					)
				}
			}
		)
		it(
			"encode_png declares 8-bit truecolor without interlace at the given size",
			() => {
				const [ ihdr ] = read_chunks(
					encode_png(16, 27, Buffer.alloc(16 * 27 * 3))
				)
				expect(ihdr.data).toEqual(
					Buffer.from(
						[ 0, 0, 0, 16, 0, 0, 0, 27, 8, 2, 0, 0, 0 ]
					)
				)
			}
		)
		it(
			"encode_png deflates each RGB row behind a filter-0 byte",
			() => {
				const rgb = Buffer.from(
					[ 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12 ]
				)
				const [ , idat ] = read_chunks(encode_png(2, 2, rgb))
				expect(inflateSync(idat.data)).toEqual(
					Buffer.from(
						[ 0, 1, 2, 3, 4, 5, 6, 0, 7, 8, 9, 10, 11, 12 ]
					)
				)
			}
		)
		it(
			"encode_png writes the signature then IHDR, IDAT and IEND with valid CRCs",
			() => {
				const png = encode_png(
					2,
					1,
					Buffer.from([ 255, 0, 0, 0, 0, 255 ])
				)
				expect(png.toString("hex", 0, 8)).toBe("89504e470d0a1a0a")
				const chunks = read_chunks(png)
				expect(
					chunks.map(chunk => chunk.type)
				).toEqual([ "IHDR", "IDAT", "IEND" ])
				for (const { crc, data, type } of chunks) {
					expect(crc).toBe(
						crc32(
							Buffer.concat(
								[ Buffer.from(type, "ascii"), data ]
							)
						)
					)
				}
				expect(
					png.toString("hex", png.length - 12)
				).toBe("0000000049454e44ae426082")
			}
		)
		it(
			"replace_png_data_uri swaps the single PNG data URI and leaves the rest",
			() => {
				const html = "<div class=\"bg=url(data:image/png;base64,AAAA+/9z)\"></div><img src=\"data:image/jpeg;base64,BBBB\">"
				expect(
					replace_png_data_uri(
						html,
						"data:image/png;base64,CCCC",
						"index.html"
					)
				).toBe(
					"<div class=\"bg=url(data:image/png;base64,CCCC)\"></div><img src=\"data:image/jpeg;base64,BBBB\">"
				)
			}
		)
		it(
			"replace_png_data_uri throws unless exactly one PNG data URI exists",
			() => {
				expect(
					() => replace_png_data_uri(
						"<p></p>",
						"data:image/png;base64,CCCC",
						"docs/index.html"
					)
				).toThrow(
					"Expected exactly 1 PNG data URI in docs/index.html, found 0"
				)
				expect(
					() => replace_png_data_uri(
						"data:image/png;base64,AAAA data:image/png;base64,BBBB",
						"data:image/png;base64,CCCC",
						"docs/index.html"
					)
				).toThrow(
					"Expected exactly 1 PNG data URI in docs/index.html, found 2"
				)
			}
		)
	}
)