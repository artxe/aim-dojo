import { fresh_import } from "./helpers/fresh_import.js"
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest"
const HEIGHT = 10
const MASK_COLUMNS = 10
const WIDTH = 20
/** @type {ReturnType<typeof vi.fn>} */
let post
/** @returns {Promise<void>} */
async function load() {
	await fresh_import(
		"../../../docs/js/worker/writing_worker.js"
	)
	globalThis.onmessage(
		{
			data: {
				fn: "set_writing_text",
				height: HEIGHT,
				text_data: mask(),
				width: WIDTH
			}
		}
	)
}
/** @returns {Uint8ClampedArray} */
function mask() {
	const data = new Uint8ClampedArray(WIDTH * HEIGHT * 4)
	for (let y = 0; y < HEIGHT; y++) {
		for (let x = 0; x < MASK_COLUMNS; x++) {
			data[(y * WIDTH + x) * 4 + 3] = 255
		}
	}
	return data
}
/**
 * @param {number} ex
 * @param {number} ey
 * @param {number} sx
 * @param {number} sy
 * @returns {number[]}
 */
function seg(ex, ey, sx, sy) {
	return [ ex, ey, sx, sy ]
}
/**
 * @param {number[][]} lines [ex, ey, sx, sy] each
 * @returns {Float64Array}
 */
function segments(lines) {
	return new Float64Array(lines.flat())
}
/**
 * @param {Float64Array} lines
 * @param {number} [drop_count]
 * @param {number} [line_width]
 * @returns {[number, number]}
 */
function stats(
	lines,
	drop_count = 0,
	line_width = 2
) {
	post.mockClear()
	globalThis.onmessage(
		{
			data: {
				drop_count,
				fn: "check_writing_stats",
				line_width,
				segments: lines
			}
		}
	)
	expect(post).toHaveBeenCalledTimes(1)
	const [ fn, count_hit, count_shoot ] = post.mock.calls[0][0]
	expect(fn).toBe("check_writing_stats")
	return [ count_hit, count_shoot ]
}
const A = seg(17, 5, 2, 5)
const B = seg(12, 8, 6, 8)
describe(
	"worker/writing_worker.js",
	() => {
		beforeEach(
			() => {
				post = vi.fn()
				vi.stubGlobal("postMessage", post)
			}
		)
		afterEach(
			() => {
				globalThis.onmessage = null
				vi.unstubAllGlobals()
			}
		)
		it(
			"a segment starting at the same x but another y is not joined to the previous end",
			async () => {
				await load()
				expect(
					stats(
						segments(
							[
								seg(10, 2, 2, 2),
								seg(10, 8, 10, 6)
							]
						)
					)
				).toEqual([ 18, 20 ])
			}
		)
		it(
			"a stroke over empty mask pixels shoots without hitting",
			async () => {
				await load()
				expect(
					stats(
						segments([ seg(18, 2, 12, 2) ])
					)
				).toEqual([ 0, 12 ])
			}
		)
		it(
			"an unknown fn throws",
			async () => {
				await load()
				expect(
					() => globalThis.onmessage({ data: { fn: "nope" } })
				).toThrow("nope")
				expect(post).not.toHaveBeenCalled()
			}
		)
		it(
			"counts shoot pixels under a stroke and hit pixels where the text mask is opaque",
			async () => {
				await load()
				expect(stats(segments([ A ]))).toEqual([ 16, 30 ])
			}
		)
		it(
			"drop_count removes that many of the oldest segments",
			async () => {
				await load()
				stats(segments([ A ]))
				stats(segments([ B ]))
				expect(stats(segments([]), 1)).toEqual([ 8, 12 ])
				expect(stats(segments([]), 1)).toEqual([ 0, 0 ])
			}
		)
		it(
			"only the segments sent since the last tick are added to the history",
			async () => {
				await load()
				expect(stats(segments([ A ]))).toEqual([ 16, 30 ])
				expect(stats(segments([ B ]))).toEqual([ 24, 42 ])
				expect(stats(segments([]))).toEqual([ 24, 42 ])
			}
		)
		it(
			"segments that continue from the previous end are one connected stroke",
			async () => {
				await load()
				expect(
					stats(
						segments(
							[
								seg(10, 5, 2, 5),
								seg(17, 5, 10, 5)
							]
						)
					)
				).toEqual([ 16, 30 ])
			}
		)
		it(
			"set_writing_text resets the stroke history",
			async () => {
				await load()
				stats(segments([ A ]))
				globalThis.onmessage(
					{
						data: {
							fn: "set_writing_text",
							height: HEIGHT,
							text_data: mask(),
							width: WIDTH
						}
					}
				)
				expect(stats(segments([ B ]))).toEqual([ 8, 12 ])
			}
		)
		it(
			"the line width sets the stroke thickness",
			async () => {
				await load()
				expect(
					stats(
						segments([ seg(8, 5, 2, 5) ]),
						0,
						4
					)
				).toEqual([ 24, 24 ])
			}
		)
		it(
			"the ring compacts in place when dropped segments free enough room",
			async () => {
				await load()
				const full = [
					B,
					...Array.from({ length: 4_095 }, () => A)
				]
				expect(stats(segments(full))).toEqual([ 24, 42 ])
				expect(
					stats(
						segments([ seg(15, 2, 15, 0) ]),
						1
					)
				).toEqual([ 16, 34 ])
			}
		)
		it(
			"the ring doubles its capacity when full and keeps every segment",
			async () => {
				await load()
				expect(
					stats(
						segments(
							Array.from({ length: 4_096 }, () => A)
						)
					)
				).toEqual([ 16, 30 ])
				expect(stats(segments([ B ]))).toEqual([ 24, 42 ])
				expect(stats(segments([]), 4_096)).toEqual([ 8, 12 ])
			}
		)
		it(
			"the ring keeps doubling until a large batch fits",
			async () => {
				await load()
				stats(segments([ A ]))
				const batch = segments(
					Array.from({ length: 3 * 4_096 }, () => B)
				)
				expect(stats(batch)).toEqual([ 24, 42 ])
				expect(
					stats(segments([]), 1 + 3 * 4_096)
				).toEqual([ 0, 0 ])
			}
		)
	}
)