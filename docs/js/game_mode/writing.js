import constants from "../constants.js"
import {
	accuracy_el,
	clear_writing_btn,
	run_score_el,
	reset_hud_labels,
	send_toast,
	set_attr_if_changed,
	set_hud_labels,
	set_mode_score,
	writing_score_el
} from "../controller/dom.js"
import { lang_text } from "../i18n.js"
import { update_camera_view } from "../logic.js"
import { ceil, max, min, random, round, round_to } from "../math.js"
import {
	context_2d,
	draw_crosshair,
	draw_grid
} from "../render/renderer_2d.js"
import state from "../state.js"
import { create_record } from "../struct/record.js"
import { post_writing_worker_message } from "../worker/manager.js"
const LINE_CAPACITY = 4_096
const LINE_STRIDE = 5
const STORAGE_KEY = "writing#runs"
let has_pointer = false
let lines = new Float64Array(LINE_CAPACITY * LINE_STRIDE)
let lines_head = 0
let lines_tail = 0
const off = new OffscreenCanvas(1, 1)
const off_context = /** @type {OffscreenCanvasRenderingContext2D} */(off.getContext("2d"))/**/
let pending_drop = 0
let pending_push = 0
let pointer_x = 0
let pointer_y = 0
const record = create_record(
	localStorage.getItem(STORAGE_KEY) || ""
)
let run_count = 0
let run_sum = 0
/** @type {ImageBitmap} */
let text_image
const text_lines = [
	...constants.mode.writing.sentences
]
/** @returns {void} */
function build_text() {
	const { size } = constants.grid
	const { offset_x } = constants.mode.writing
	for (let i = text_lines.length - 1; i > 0; i--) {
		const j = (random() * (i + 1) | 0)
		;[ text_lines[i], text_lines[j] ] = [ text_lines[j], text_lines[i] ]
	}
	const font_px = size * .78 | 0
	const rows = text_lines.length
	off_context.font = `${font_px}px bold monospace`
	let max_w = 0
	for (const line of text_lines) {
		max_w = max(
			max_w,
			ceil(
				off_context.measureText(line).width
			)
		)
	}
	off.height = rows * size
	off.width = max_w + offset_x * 2
	off_context.save()
	off_context.fillStyle = "white"
	off_context.font = `${font_px}px bold monospace`
	off_context.globalAlpha = .5
	off_context.textAlign = "left"
	off_context.textBaseline = "middle"
	for (let r = 0; r < rows; r++) {
		const cy = r * size + size / 2
		off_context.fillText(text_lines[r], offset_x, cy)
	}
	off_context.restore()
	const text_data = off_context.getImageData(0, 0, off.width, off.height).data
	text_image = off.transferToImageBitmap()
	post_writing_worker_message(
		{
			fn: "set_writing_text",
			height: text_image.height,
			text_data,
			width: text_image.width
		},
		[ text_data.buffer ]
	)
}
/** @returns {void} */
function check_stats() {
	const { line_width } = constants.mode.writing
	const segments = new Float64Array(pending_push * 4)
	let o = 0
	for (
		let i = lines_tail - pending_push * LINE_STRIDE;
		i < lines_tail;
		i += LINE_STRIDE
	) {
		segments[o] = lines[i]
		segments[o + 1] = lines[i + 1]
		segments[o + 2] = lines[i + 2]
		segments[o + 3] = lines[i + 3]
		o += 4
	}
	post_writing_worker_message(
		{
			drop_count: pending_drop,
			fn: "check_writing_stats",
			line_width,
			segments
		},
		[ segments.buffer ]
	)
	pending_drop = 0
	pending_push = 0
}
/**
 * @param {number} count_hit
 * @param {number} count_shoot
 * @returns {void}
 */
export function check_writing_stats(count_hit, count_shoot) {
	if (state.game.mode == "writing") {
		state.stats.count_hit = count_hit
		state.stats.count_shoot = count_shoot
	}
}
/** @returns {void} */
function clear_score() {
	record.clear()
	localStorage.removeItem(STORAGE_KEY)
	set_mode_score(
		writing_score_el,
		clear_writing_btn,
		0
	)
	send_toast(
		lang_text(
			{
				en: "Writing score has been reset!",
				ko: "Writing 점수를 초기화했습니다!"
			}
		),
		1_500
	)
}
/** @returns {void} */
function dispose() {
	state.camera.x = 0
	state.camera.y = 0
	state.game.mode = null
	reset_hud_labels()
	has_pointer = false
	lines_head = 0
	lines_tail = 0
	pending_drop = 0
	pending_push = 0
	state.impact.rad_size = 0
	state.stats.count_hit = 0
	state.stats.count_shoot = 0
	if (run_count) {
		record.push(run_sum / run_count)
		localStorage.setItem(
			STORAGE_KEY,
			String(record.value)
		)
		set_mode_score(
			writing_score_el,
			clear_writing_btn,
			record.value
		)
	}
	run_count = 0
	run_sum = 0
	text_image.close()
	accuracy_el.removeAttribute("value")
	run_score_el.removeAttribute("value")
}
/** @returns {void} */
function init() {
	set_hud_labels("Px/s", "On Text", "Critical")
	update_camera_view()
	state.camera.dimension = "2d"
	build_text()
}
/** @returns {boolean} */
function is_firing() {
	const {
		key_a,
		key_e,
		key_q,
		key_r,
		key_w,
		mb_left,
		mb_right
	} = state.input
	return key_a || key_e || key_q || key_r || key_w || mb_left || mb_right
}
/** @returns {void} */
function on_frame() {
	const { now_ms } = state.timer
	const window_ms = now_ms - constants.hud.window_ms
	while (lines_head < lines_tail && lines[lines_head + 4] <= window_ms) {
		lines_head += LINE_STRIDE
		pending_drop++
	}
	if (has_pointer && !is_firing()) {
		has_pointer = false
	}
}
/** @returns {void} */
function on_move() {
	if (is_firing()) {
		shoot()
	}
}
/**
 * @param {number} ex
 * @param {number} ey
 * @param {number} sx
 * @param {number} sy
 * @param {number} t
 * @returns {void}
 */
function push_line(ex, ey, sx, sy, t) {
	if (lines_tail + LINE_STRIDE > lines.length) {
		const live = lines_tail - lines_head
		if (lines_head > lines.length >>> 1) {
			lines.copyWithin(0, lines_head, lines_tail)
		} else {
			const grown = new Float64Array(lines.length * 2)
			grown.set(
				lines.subarray(lines_head, lines_tail)
			)
			lines = grown
		}
		lines_head = 0
		lines_tail = live
	}
	lines[lines_tail] = ex
	lines[lines_tail + 1] = ey
	lines[lines_tail + 2] = sx
	lines[lines_tail + 3] = sy
	lines[lines_tail + 4] = t
	lines_tail += LINE_STRIDE
	pending_push++
}
/** @returns {void} */
function render() {
	const { line_width } = constants.mode.writing
	const { height, width, x, y } = state.camera
	context_2d.save()
	context_2d.clearRect(0, 0, width, height)
	context_2d.translate(
		round(width / 2),
		round(height / 2)
	)
	context_2d.save()
	context_2d.translate(-x, -y)
	draw_grid()
	context_2d.drawImage(text_image, 0, 0)
	context_2d.lineWidth = line_width
	context_2d.strokeStyle = "black"
	context_2d.beginPath()
	let has_prev = false
	let prev_x = 0
	let prev_y = 0
	for (let i = lines_head; i < lines_tail; i += LINE_STRIDE) {
		const sx = lines[i + 2]
		const sy = lines[i + 3]
		if (!has_prev || prev_x != sx || prev_y != sy) {
			context_2d.moveTo(sx, sy)
		}
		const ex = lines[i]
		const ey = lines[i + 1]
		context_2d.lineTo(ex, ey)
		has_prev = true
		prev_x = ex
		prev_y = ey
	}
	context_2d.stroke()
	context_2d.restore()
	draw_crosshair()
	context_2d.restore()
}
/** @returns {void} */
function shoot() {
	const { line_width } = constants.mode.writing
	const { x, y } = state.camera
	const { now_ms } = state.timer
	if (has_pointer) {
		const dx = x - pointer_x
		const dy = y - pointer_y
		if (dx * dx + dy * dy < line_width * line_width) {
			return
		}
		push_line(x, y, pointer_x, pointer_y, now_ms)
	}
	has_pointer = true
	pointer_x = x
	pointer_y = y
}
/** @returns {void} */
function update_hud() {
	const { update_interval_ms, window_ms } = constants.hud
	const { count_hit, count_shoot } = state.stats
	const { now_ms, start_ms } = state.timer
	state.hud.next_update_ms = now_ms + update_interval_ms
	const elapsed_s = min(now_ms - start_ms, window_ms) / 1_000
	const score = elapsed_s && count_shoot
		? count_hit * count_hit / count_shoot / elapsed_s
		: 0
	if (score) {
		run_count++
		run_sum += score
	}
	set_attr_if_changed(
		run_score_el,
		"value",
		`${round_to(score, 2)} / ${round_to(run_count ? run_sum / run_count : 0, 2)}`
	)
	set_attr_if_changed(
		accuracy_el,
		"value",
		`${(count_shoot ? round_to(count_hit / count_shoot * 100, 2) : 0)}%`
	)
}
/** @type {GameMode} */
export default {
	check_stats,
	clear_score,
	dispose,
	init,
	on_frame,
	on_move,
	render,
	shoot,
	update_hud
}
{
	set_mode_score(
		writing_score_el,
		clear_writing_btn,
		record.value
	)
}