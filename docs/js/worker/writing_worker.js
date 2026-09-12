const LINE_CAPACITY = 4_096
const LINE_STRIDE = 4
let lines = new Float64Array(LINE_CAPACITY * LINE_STRIDE)
let lines_head = 0
let lines_tail = 0
const off = new OffscreenCanvas(1, 1)
const off_context = /** @type {OffscreenCanvasRenderingContext2D} */(off.getContext("2d"))/**/
let writing_height = 0
/** @type {ImageDataArray} */
let writing_text_data
let writing_width = 0
/**
 * @param {Float64Array} segments
 * @param {number} drop_count
 * @param {number} line_width
 * @returns {void}
 */
function check_writing_stats(segments, drop_count, line_width) {
	lines_head += drop_count * LINE_STRIDE
	push_segments(segments)
	off_context.clearRect(0, 0, writing_width, writing_height)
	off_context.save()
	off_context.lineWidth = line_width
	off_context.beginPath()
	let has_prev = false
	let prev_x = 0
	let prev_y = 0
	for (let i = lines_head; i < lines_tail; i += LINE_STRIDE) {
		const sx = lines[i + 2]
		const sy = lines[i + 3]
		if (!has_prev || prev_x != sx || prev_y != sy) {
			off_context.moveTo(sx, sy)
		}
		const ex = lines[i]
		const ey = lines[i + 1]
		off_context.lineTo(ex, ey)
		has_prev = true
		prev_x = ex
		prev_y = ey
	}
	off_context.stroke()
	off_context.restore()
	const line_image_data = off_context.getImageData(0, 0, writing_width, writing_height).data
	let count_hit = 0
	let count_shoot = 0
	const pixel_data_len = writing_text_data.length
	for (let alpha_i = 3; alpha_i < pixel_data_len; alpha_i += 4) {
		if (line_image_data[alpha_i]) {
			count_shoot++
			if (writing_text_data[alpha_i]) {
				count_hit++
			}
		}
	}
	postMessage(
		[
			"check_writing_stats",
			count_hit,
			count_shoot
		]
	)
}
/**
 * @param {Float64Array} segments
 * @returns {void}
 */
function push_segments(segments) {
	const added = segments.length
	if (lines_tail + added > lines.length) {
		const live = lines_tail - lines_head
		if (lines.length - live >= added) {
			lines.copyWithin(0, lines_head, lines_tail)
		} else {
			let capacity = lines.length * 2
			while (capacity < live + added) {
				capacity *= 2
			}
			const grown = new Float64Array(capacity)
			grown.set(
				lines.subarray(lines_head, lines_tail)
			)
			lines = grown
		}
		lines_head = 0
		lines_tail = live
	}
	lines.set(segments, lines_tail)
	lines_tail += added
}
/**
 * @param {ImageDataArray} text_data
 * @param {number} width
 * @param {number} height
 * @returns {void}
 */
function set_writing_text(text_data, width, height) {
	lines_head = 0
	lines_tail = 0
	off.height = height
	off.width = width
	writing_height = height
	writing_text_data = text_data
	writing_width = width
}
{
	onmessage = function({ data }) {
		const { fn } = data
		if (fn == "check_writing_stats") {
			check_writing_stats(
				data.segments,
				data.drop_count,
				data.line_width
			)
		} else if (fn == "set_writing_text") {
			set_writing_text(
				data.text_data,
				data.width,
				data.height
			)
		} else {
			throw Error(fn)
		}
	}
}