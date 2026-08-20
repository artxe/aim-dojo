const off = new OffscreenCanvas(1, 1)
const off_context = /** @type {OffscreenCanvasRenderingContext2D} */(off.getContext("2d"))/**/
let writing_height = 0
/** @type {ImageDataArray} */
let writing_text_data
let writing_width = 0
/**
 * @param {Line[]} lines
 * @param {number} lines_start
 * @param {number} line_width
 * @returns {void}
 */
function check_writing_stats(lines, lines_start, line_width) {
	off.height = writing_height
	off.width = writing_width
	off_context.save()
	off_context.lineWidth = line_width
	off_context.beginPath()
	const line_count = lines.length
	let has_prev = false
	let prev_x = 0
	let prev_y = 0
	for (let i = lines_start; i < line_count; i++) {
		const { ex, ey, sx, sy } = lines[i]
		if (!has_prev || prev_x != sx || prev_y != sy) {
			off_context.moveTo(sx, sy)
		}
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
 * @param {ImageDataArray} text_data
 * @param {number} width
 * @param {number} height
 * @returns {void}
 */
function set_writing_text(text_data, width, height) {
	writing_height = height
	writing_text_data = text_data
	writing_width = width
}
{
	onmessage = function({ data }) {
		const { fn } = data
		if (fn == "check_writing_stats") {
			check_writing_stats(
				data.lines,
				data.lines_start,
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