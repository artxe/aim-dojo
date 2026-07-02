import constants from "../constants.js"
import { max } from "../math.js"
/**
 * @typedef {{
 *   canvas_h: WebGLUniformLocation | null,
 *   dpr: WebGLUniformLocation | null,
 *   dx: WebGLUniformLocation | null,
 *   height: WebGLUniformLocation | null,
 *   sh: WebGLUniformLocation | null,
 *   sw: WebGLUniformLocation | null,
 *   sx: WebGLUniformLocation | null,
 *   sy: WebGLUniformLocation | null,
 *   tile: WebGLUniformLocation | null,
 *   vh: WebGLUniformLocation | null,
 *   vw: WebGLUniformLocation | null
 * }} BgUniforms
 */
const APPEND_AHEAD_S = 15
const BG_CACHE_DB = "aim-dojo-bg-cache"
const BG_CACHE_STORE = "mp4"
const BG_FRAGMENT_SHADER = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform float u_canvas_h;
uniform float u_dpr;
uniform float u_dx;
uniform float u_height;
uniform float u_sh;
uniform float u_sw;
uniform float u_sx;
uniform float u_sy;
uniform float u_tile;
uniform float u_vh;
uniform float u_vw;
out vec4 o_color;
vec4 bg_sample(vec2 frag_px) {
	float css_x = frag_px.x / u_dpr;
	float css_y = (u_canvas_h - frag_px.y) / u_dpr;
	float local = mod(css_x - u_dx, u_tile) / u_tile;
	float v = css_y / u_height;
	return texture(
		u_tex,
		vec2(
			(u_sx + local * u_sw) / u_vw,
			(u_sy + v * u_sh) / u_vh
		)
	);
}
void main() {
	o_color = bg_sample(gl_FragCoord.xy);
}
`
const BG_VERTEX_SHADER = `#version 300 es
void main() {
	vec2 p = vec2(
		gl_VertexID == 1 ? 3.0 : -1.0,
		gl_VertexID == 2 ? 3.0 : -1.0
	);
	gl_Position = vec4(p, 0.0, 1.0);
}
`
const BG_VIDEO_URL = new URL("../../bg.mp4", import.meta.url)
const EVICT_BEHIND_S = 3
const MIME = "video/mp4; codecs=\"avc1.64002A,mp4a.40.2\""
const bg_append_queue = /** @type {{ append_window_end: number, buffer: ArrayBuffer, fragment: boolean }[]} */([])/**/
const bg_fragments = /** @type {ArrayBuffer[]} */([])/**/
const bg_layout = {
	dpr: 0,
	dx: 0,
	height: 0,
	sh: 0,
	sw: 0,
	sx: 0,
	sy: 0,
	tile_width: 0,
	video_height: 0,
	video_width: 0,
	width: 0
}
let bg_append_queue_head = 0
let bg_canvas = /** @type {OffscreenCanvas | null} */(null)/**/
let bg_current_time = 0
let bg_dpr = 1
let bg_fragments_appended = 0
let bg_fragments_loaded = false
let bg_gl = /** @type {WebGL2RenderingContext | null} */(null)/**/
let bg_height = 0
let bg_init_appended = false
let bg_last_frame_timestamp = -1
let bg_media_duration = 0
let bg_parse_pending = new Uint8Array(0)
let bg_program = /** @type {WebGLProgram | null} */(null)/**/
let bg_source_buffer = /** @type {SourceBuffer | null} */(null)/**/
let bg_started = false
let bg_tex_height = 0
let bg_tex_width = 0
let bg_texture = /** @type {WebGLTexture | null} */(null)/**/
let bg_uniforms = /** @type {BgUniforms | null} */(null)/**/
let bg_video_duration_ticks = 0
let bg_video_timescale = 0
let bg_video_track_id = 0
let bg_visible = true
let bg_width = 0
{
	onmessage = function({ data }) {
		const { fn } = data
		if (fn == "init") {
			bg_dpr = data.dpr
			bg_height = data.height
			bg_visible = data.visible
			bg_width = data.width
			init_bg_video(data.canvas)
			init_bg_media_source()
		} else if (fn == "resize") {
			bg_dpr = data.dpr
			bg_height = data.height
			bg_width = data.width
		} else if (fn == "frame") {
			read_bg_frame(data.frame)
		} else if (fn == "time") {
			bg_current_time = data.time
			schedule_bg_append()
		} else if (fn == "visible") {
			bg_visible = data.visible
		} else {
			throw Error(fn)
		}
	}
}
/**
 * @param {ArrayBuffer} buffer
 * @param {number} append_window_end
 * @param {boolean} fragment
 * @returns {void}
 */
function append_bg_buffer(
	buffer,
	append_window_end,
	fragment
) {
	const sb = bg_source_buffer
	if (!sb) {
		return
	}
	const item = {
		append_window_end,
		buffer,
		fragment
	}
	if (bg_append_queue_head < bg_append_queue.length || sb.updating) {
		bg_append_queue.push(item)
	} else {
		append_bg_item(item)
	}
}
/**
 * @param {ArrayBuffer} buffer
 * @returns {void}
 */
function append_bg_fragment(buffer) {
	bg_fragments.push(buffer)
	if (!bg_fragments_loaded && bg_video_track_id) {
		read_bg_fragment_durations(new Uint8Array(buffer))
	}
	schedule_bg_append()
}
/**
 * @param {{ append_window_end: number, buffer: ArrayBuffer, fragment: boolean }} item
 * @returns {void}
 */
function append_bg_item(item) {
	const sb = bg_source_buffer
	if (!sb) {
		return
	}
	sb.appendWindowEnd = item.append_window_end
	sb.appendBuffer(item.buffer)
	if (item.fragment) {
		bg_fragments_appended += 1
	}
}
/** @returns {void} */
function append_next_bg_item() {
	const sb = bg_source_buffer
	if (!sb || sb.updating) {
		return
	}
	const item = bg_append_queue[bg_append_queue_head]
	if (item) {
		bg_append_queue_head += 1
		append_bg_item(item)
	}
	if (
		bg_append_queue_head > 2_048
			&& bg_append_queue_head > bg_append_queue.length / 2
	) {
		bg_append_queue.splice(0, bg_append_queue_head)
		bg_append_queue_head = 0
	}
}
/**
 * @param {SourceBuffer} sb
 * @param {number} t
 * @returns {number}
 */
function bg_buffered_ahead(sb, t) {
	const ranges = sb.buffered
	for (let i = 0; i < ranges.length; i += 1) {
		if (ranges.end(i) <= t) {
			continue
		}
		if (ranges.start(i) <= t + 0.1) {
			return ranges.end(i)
		}
		return t
	}
	return t
}
/**
 * @param {WebGL2RenderingContext} gl
 * @returns {WebGLProgram}
 */
function create_bg_program(gl) {
	const vs = /** @type {WebGLShader} */(gl.createShader(gl.VERTEX_SHADER))/**/
	gl.shaderSource(vs, BG_VERTEX_SHADER)
	gl.compileShader(vs)
	const fs = /** @type {WebGLShader} */(gl.createShader(gl.FRAGMENT_SHADER))/**/
	gl.shaderSource(fs, BG_FRAGMENT_SHADER)
	gl.compileShader(fs)
	const program = /** @type {WebGLProgram} */(gl.createProgram())/**/
	gl.attachShader(program, vs)
	gl.attachShader(program, fs)
	gl.linkProgram(program)
	gl.deleteShader(vs)
	gl.deleteShader(fs)
	return program
}
/**
 * @param {VideoFrame} frame
 * @returns {void}
 */
function draw_bg_video(frame) {
	const gl = bg_gl
	const off = bg_canvas
	if (!gl || !off || !bg_program || !bg_texture || !bg_uniforms) {
		return
	}
	const dpr = bg_dpr
	const height = bg_height
	const width = bg_width
	const canvas_height = Math.ceil(height * dpr)
	const canvas_width = Math.ceil(width * dpr)
	if (off.height != canvas_height || off.width != canvas_width) {
		off.height = canvas_height
		off.width = canvas_width
		gl.viewport(0, 0, canvas_width, canvas_height)
	}
	if (
		update_bg_layout(
			dpr,
			height,
			frame.displayHeight,
			frame.displayWidth,
			width
		)
	) {
		set_bg_uniforms(canvas_height, dpr, height)
	}
	if (
		bg_tex_height != frame.displayHeight
			|| bg_tex_width != frame.displayWidth
	) {
		bg_tex_height = frame.displayHeight
		bg_tex_width = frame.displayWidth
		gl.texImage2D(
			gl.TEXTURE_2D,
			0,
			gl.RGBA,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			frame
		)
	} else {
		gl.texSubImage2D(
			gl.TEXTURE_2D,
			0,
			0,
			0,
			gl.RGBA,
			gl.UNSIGNED_BYTE,
			frame
		)
	}
	gl.drawArrays(gl.TRIANGLES, 0, 3)
}
/** @returns {void} */
function evict_bg_behind() {
	const sb = bg_source_buffer
	if (!sb || sb.updating || !sb.buffered.length) {
		return
	}
	const cutoff = bg_current_time - EVICT_BEHIND_S
	const start = sb.buffered.start(0)
	if (start + 1 < cutoff) {
		sb.remove(start, cutoff)
	}
}
/** @returns {void} */
function init_bg_media_source() {
	const media_source = new MediaSource()
	media_source.addEventListener(
		"sourceopen",
		function() {
			init_bg_source_buffer(media_source)
		},
		{ once: true }
	)
	const post = /** @type {(message: *, transfer: *[]) => void} */(postMessage)/**/
	post(
		{
			fn: "handle",
			handle: media_source.handle
		},
		[ media_source.handle ]
	)
}
/**
 * @param {MediaSource} media_source
 * @returns {Promise<void>}
 */
async function init_bg_source_buffer(media_source) {
	media_source.duration = Number.POSITIVE_INFINITY
	const sb = media_source.addSourceBuffer(MIME)
	sb.mode = "segments"
	sb.addEventListener(
		"updateend",
		on_bg_source_buffer_updateend
	)
	bg_source_buffer = sb
	load_bg_fragments()
}
/**
 * @param {OffscreenCanvas} off
 * @returns {void}
 */
function init_bg_video(off) {
	bg_canvas = off
	const gl = /** @type {WebGL2RenderingContext | null} */(off.getContext(
		"webgl2",
		{ antialias: false, depth: false }
	))/**/
	if (!gl) {
		return
	}
	bg_gl = gl
	const program = create_bg_program(gl)
	bg_program = program
	gl.useProgram(program)
	gl.uniform1i(
		gl.getUniformLocation(program, "u_tex"),
		0
	)
	bg_uniforms = {
		canvas_h: gl.getUniformLocation(program, "u_canvas_h"),
		dpr: gl.getUniformLocation(program, "u_dpr"),
		dx: gl.getUniformLocation(program, "u_dx"),
		height: gl.getUniformLocation(program, "u_height"),
		sh: gl.getUniformLocation(program, "u_sh"),
		sw: gl.getUniformLocation(program, "u_sw"),
		sx: gl.getUniformLocation(program, "u_sx"),
		sy: gl.getUniformLocation(program, "u_sy"),
		tile: gl.getUniformLocation(program, "u_tile"),
		vh: gl.getUniformLocation(program, "u_vh"),
		vw: gl.getUniformLocation(program, "u_vw")
	}
	bg_texture = gl.createTexture()
	gl.bindTexture(gl.TEXTURE_2D, bg_texture)
	gl.texParameteri(
		gl.TEXTURE_2D,
		gl.TEXTURE_MIN_FILTER,
		gl.LINEAR
	)
	gl.texParameteri(
		gl.TEXTURE_2D,
		gl.TEXTURE_MAG_FILTER,
		gl.LINEAR
	)
	gl.texParameteri(
		gl.TEXTURE_2D,
		gl.TEXTURE_WRAP_S,
		gl.CLAMP_TO_EDGE
	)
	gl.texParameteri(
		gl.TEXTURE_2D,
		gl.TEXTURE_WRAP_T,
		gl.CLAMP_TO_EDGE
	)
}
/**
 * @param {string} version
 * @returns {Promise<Blob | undefined>}
 */
async function get_cached_bg(version) {
	const db = await open_bg_cache_db()
	return new Promise(
		(resolve, reject) => {
			const request = db.transaction(BG_CACHE_STORE, "readonly")
				.objectStore(BG_CACHE_STORE)
				.get(version)
			request.onsuccess = () => resolve(request.result)
			request.onerror = () => reject(request.error)
		}
	)
}
/** @returns {Promise<void>} */
async function load_bg_fragments() {
	const { version } = constants
	const cached = await get_cached_bg(version)
	if (cached) {
		await pipe_bg_stream(
			/** @type {ReadableStream<Uint8Array<ArrayBuffer>>} */(cached.stream())/**/,
			null
		)
	} else {
		const response = await fetch(BG_VIDEO_URL)
		const chunks = /** @type {Uint8Array<ArrayBuffer>[]} */([])/**/
		await pipe_bg_stream(
			/** @type {ReadableStream<Uint8Array<ArrayBuffer>>} */(response.body)/**/,
			chunks
		)
		put_cached_bg(version, new Blob(chunks))
	}
}
/** @returns {Promise<IDBDatabase>} */
function open_bg_cache_db() {
	return new Promise(
		(resolve, reject) => {
			const request = indexedDB.open(BG_CACHE_DB, 1)
			request.onupgradeneeded = () => request.result.createObjectStore(BG_CACHE_STORE)
			request.onsuccess = () => resolve(request.result)
			request.onerror = () => reject(request.error)
		}
	)
}
/**
 * @param {ReadableStream<Uint8Array<ArrayBuffer>>} stream
 * @param {Uint8Array<ArrayBuffer>[] | null} collect
 * @returns {Promise<void>}
 */
async function pipe_bg_stream(stream, collect) {
	const reader = stream.getReader()
	while (true) {
		// eslint-disable-next-line no-await-in-loop
		const { done, value } = await reader.read()
		if (done) {
			break
		}
		if (value) {
			collect?.push(value)
			parse_bg_bytes(value, false)
		}
	}
	parse_bg_bytes(new Uint8Array(0), true)
}
/**
 * @param {string} version
 * @param {Blob} blob
 * @returns {Promise<void>}
 */
async function put_cached_bg(version, blob) {
	const db = await open_bg_cache_db()
	return new Promise(
		(resolve, reject) => {
			const tx = db.transaction(BG_CACHE_STORE, "readwrite")
			const store = tx.objectStore(BG_CACHE_STORE)
			store.clear()
			store.put(blob, version)
			tx.oncomplete = () => resolve()
			tx.onerror = () => reject(tx.error)
		}
	)
}
/** @returns {void} */
function on_bg_source_buffer_updateend() {
	const sb = bg_source_buffer
	if (!sb) {
		return
	}
	if (!bg_started && bg_fragments_appended >= 2) {
		bg_started = true
		postMessage({ fn: "started" })
	}
	if (bg_append_queue_head < bg_append_queue.length) {
		append_next_bg_item()
		return
	}
	schedule_bg_append()
}
/**
 * @param {Uint8Array} chunk
 * @param {boolean} done
 * @returns {void}
 */
function parse_bg_bytes(chunk, done) {
	if (chunk.length) {
		if (bg_parse_pending.length) {
			const pending = new Uint8Array(
				bg_parse_pending.length + chunk.length
			)
			pending.set(bg_parse_pending)
			pending.set(chunk, bg_parse_pending.length)
			bg_parse_pending = pending
		} else {
			bg_parse_pending = new Uint8Array(chunk)
		}
	}
	if (!bg_init_appended) {
		parse_bg_init()
	}
	if (bg_init_appended) {
		parse_bg_fragments(done)
	}
}
/**
 * @param {boolean} done
 * @returns {void}
 */
function parse_bg_fragments(done) {
	let pos = 0
	while (pos + 8 <= bg_parse_pending.length) {
		const size = read_bg_box_size(bg_parse_pending, pos, done)
		if (!size || pos + size > bg_parse_pending.length) {
			break
		}
		const type = read_bg_box_type(bg_parse_pending, pos)
		if (type == "moof" && pos > 0) {
			append_bg_fragment(slice_bg_bytes(0, pos))
			bg_parse_pending = bg_parse_pending.slice(pos)
			pos = 0
		} else {
			pos += size
		}
	}
	if (done) {
		if (bg_parse_pending.length) {
			const buffer = slice_bg_bytes(0, bg_parse_pending.length)
			bg_parse_pending = new Uint8Array(0)
			bg_fragments.push(buffer)
			if (bg_video_track_id) {
				read_bg_fragment_durations(new Uint8Array(buffer))
			}
		}
		bg_fragments_loaded = true
		if (!bg_video_duration_ticks || !bg_video_timescale) {
			throw Error()
		}
		bg_media_duration = bg_video_duration_ticks / bg_video_timescale
		schedule_bg_append()
	}
}
/** @returns {void} */
function parse_bg_init() {
	let pos = 0
	while (pos + 8 <= bg_parse_pending.length) {
		const size = read_bg_box_size(bg_parse_pending, pos, false)
		if (!size || pos + size > bg_parse_pending.length) {
			break
		}
		const type = read_bg_box_type(bg_parse_pending, pos)
		pos += size
		if (type == "moov") {
			read_bg_track_info(
				bg_parse_pending.subarray(0, pos)
			)
			append_bg_buffer(
				slice_bg_bytes(0, pos),
				Number.POSITIVE_INFINITY,
				false
			)
			bg_init_appended = true
			bg_parse_pending = bg_parse_pending.slice(pos)
			return
		}
	}
}
/**
 * @param {Uint8Array} bytes
 * @param {number} pos
 * @param {boolean} done
 * @returns {number}
 */
function read_bg_box_size(bytes, pos, done) {
	const view = new DataView(
		bytes.buffer,
		bytes.byteOffset + pos
	)
	const size = view.getUint32(0, false)
	if (size == 0) {
		return done ? bytes.length - pos : 0
	}
	return size
}
/**
 * @param {Uint8Array} bytes
 * @param {number} pos
 * @returns {string}
 */
function read_bg_box_type(bytes, pos) {
	return String.fromCharCode(
		bytes[pos + 4],
		bytes[pos + 5],
		bytes[pos + 6],
		bytes[pos + 7]
	)
}
/**
 * @param {Uint8Array} bytes
 * @returns {void}
 */
function read_bg_fragment_durations(bytes) {
	walk_bg_boxes(
		bytes,
		0,
		bytes.length,
		function(moof_type, moof_pos, moof_size) {
			if (moof_type != "moof") {
				return
			}
			walk_bg_boxes(
				bytes,
				moof_pos + 8,
				moof_pos + moof_size,
				function(traf_type, traf_pos, traf_size) {
					if (traf_type != "traf") {
						return
					}
					read_bg_traf_durations(
						bytes,
						traf_pos + 8,
						traf_pos + traf_size
					)
				}
			)
		}
	)
}
/**
 * @param {VideoFrame} frame
 * @returns {void}
 */
function read_bg_frame(frame) {
	try {
		const time = frame.timestamp / 1_000_000
		if (time > bg_current_time) {
			bg_current_time = time
			schedule_bg_append()
		}
		if (bg_visible && should_draw_bg_frame(frame)) {
			draw_bg_video(frame)
		}
	} finally {
		frame.close()
		postMessage({ fn: "frame" })
	}
}
/**
 * @param {Uint8Array} bytes
 * @returns {void}
 */
function read_bg_track_info(bytes) {
	walk_bg_boxes(
		bytes,
		0,
		bytes.length,
		function(moov_type, moov_pos, moov_size) {
			if (moov_type != "moov") {
				return
			}
			walk_bg_boxes(
				bytes,
				moov_pos + 8,
				moov_pos + moov_size,
				function(trak_type, trak_pos, trak_size) {
					if (trak_type != "trak") {
						return
					}
					read_bg_trak(
						bytes,
						trak_pos + 8,
						trak_pos + trak_size
					)
				}
			)
		}
	)
}
/**
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {number} end
 * @returns {void}
 */
function read_bg_traf_durations(bytes, start, end) {
	let default_duration = 0
	let track_id = 0
	const trun_positions = /** @type {number[]} */([])/**/
	walk_bg_boxes(
		bytes,
		start,
		end,
		function(box_type, box_pos) {
			if (box_type == "tfhd") {
				const flags = read_bg_u32(bytes, box_pos + 8) & 0xff_ff_ff
				track_id = read_bg_u32(bytes, box_pos + 12)
				let q = box_pos + 16
				if (flags & 0x01) {
					q += 8
				}
				if (flags & 0x02) {
					q += 4
				}
				if (flags & 0x08) {
					default_duration = read_bg_u32(bytes, q)
				}
			} else if (box_type == "trun") {
				trun_positions.push(box_pos)
			}
		}
	)
	if (track_id != bg_video_track_id) {
		return
	}
	let ticks = 0
	for (const trun_pos of trun_positions) {
		const flags = read_bg_u32(bytes, trun_pos + 8) & 0xff_ff_ff
		const count = read_bg_u32(bytes, trun_pos + 12)
		if (flags & 0x100) {
			const record = (flags & 0x100 ? 4 : 0)
				+ (flags & 0x200 ? 4 : 0)
				+ (flags & 0x400 ? 4 : 0)
				+ (flags & 0x800 ? 4 : 0)
			let q = trun_pos + 16
			if (flags & 0x01) {
				q += 4
			}
			if (flags & 0x04) {
				q += 4
			}
			for (let i = 0; i < count; i += 1) {
				ticks += read_bg_u32(bytes, q + i * record)
			}
		} else {
			ticks += default_duration * count
		}
	}
	bg_video_duration_ticks += ticks
}
/**
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {number} end
 * @returns {void}
 */
function read_bg_trak(bytes, start, end) {
	let handler = ""
	let timescale = 0
	let track_id = 0
	walk_bg_boxes(
		bytes,
		start,
		end,
		function(box_type, box_pos, box_size) {
			if (box_type == "tkhd") {
				track_id = read_bg_u32(
					bytes,
					box_pos + (bytes[box_pos + 8] == 1 ? 28 : 20)
				)
			} else if (box_type == "mdia") {
				walk_bg_boxes(
					bytes,
					box_pos + 8,
					box_pos + box_size,
					function(mdia_type, mdia_pos) {
						if (mdia_type == "hdlr") {
							handler = read_bg_box_type(bytes, mdia_pos + 12)
						} else if (mdia_type == "mdhd") {
							timescale = read_bg_u32(
								bytes,
								mdia_pos + (bytes[mdia_pos + 8] == 1 ? 28 : 20)
							)
						}
					}
				)
			}
		}
	)
	if (handler == "vide") {
		bg_video_timescale = timescale
		bg_video_track_id = track_id
	}
}
/**
 * @param {Uint8Array} bytes
 * @param {number} pos
 * @returns {number}
 */
function read_bg_u32(bytes, pos) {
	return new DataView(
		bytes.buffer,
		bytes.byteOffset + pos
	).getUint32(0, false)
}
/** @returns {void} */
function schedule_bg_append() {
	const sb = bg_source_buffer
	const fragments = bg_fragments
	if (
		!sb
			|| !bg_init_appended
			|| bg_append_queue_head < bg_append_queue.length
			|| !bg_fragments_loaded && bg_fragments_appended >= fragments.length
			|| !fragments.length
			|| sb.updating
	) {
		return
	}
	const t = bg_current_time
	const buffered_end = bg_buffered_ahead(sb, t)
	if (buffered_end - t >= APPEND_AHEAD_S) {
		evict_bg_behind()
		return
	}
	const idx = bg_fragments_appended % fragments.length
	const loop_idx = bg_fragments_appended / fragments.length | 0
	try {
		sb.appendWindowEnd = bg_media_duration
			? (loop_idx + 1) * bg_media_duration
			: Number.POSITIVE_INFINITY
		sb.timestampOffset = loop_idx * bg_media_duration
		sb.appendBuffer(fragments[idx])
		bg_fragments_appended += 1
	} catch (e) {
		if (/** @type {Error} */(e)/**/.name == "QuotaExceededError") {
			evict_bg_behind()
			return
		}
		throw e
	}
}
/**
 * @param {number} canvas_height
 * @param {number} dpr
 * @param {number} height
 * @returns {void}
 */
function set_bg_uniforms(canvas_height, dpr, height) {
	const gl = bg_gl
	const uniforms = bg_uniforms
	if (!gl || !uniforms) {
		return
	}
	gl.uniform1f(uniforms.canvas_h, canvas_height)
	gl.uniform1f(uniforms.dpr, dpr)
	gl.uniform1f(uniforms.dx, bg_layout.dx)
	gl.uniform1f(uniforms.height, height)
	gl.uniform1f(uniforms.sh, bg_layout.sh)
	gl.uniform1f(uniforms.sw, bg_layout.sw)
	gl.uniform1f(uniforms.sx, bg_layout.sx)
	gl.uniform1f(uniforms.sy, bg_layout.sy)
	gl.uniform1f(
		uniforms.tile,
		bg_layout.tile_width
	)
	gl.uniform1f(
		uniforms.vh,
		bg_layout.video_height
	)
	gl.uniform1f(
		uniforms.vw,
		bg_layout.video_width
	)
}
/**
 * @param {VideoFrame} frame
 * @returns {boolean}
 */
function should_draw_bg_frame(frame) {
	const { timestamp } = frame
	if (timestamp <= bg_last_frame_timestamp) {
		return false
	}
	bg_last_frame_timestamp = timestamp
	return true
}
/**
 * @param {number} start
 * @param {number} end
 * @returns {ArrayBuffer}
 */
function slice_bg_bytes(start, end) {
	const bytes = bg_parse_pending.slice(start, end)
	const out = new Uint8Array(bytes.length)
	out.set(bytes)
	return out.buffer
}
/**
 * @param {number} dpr
 * @param {number} height
 * @param {number} video_height
 * @param {number} video_width
 * @param {number} width
 * @returns {boolean}
 */
function update_bg_layout(
	dpr,
	height,
	video_height,
	video_width,
	width
) {
	if (
		bg_layout.dpr == dpr
			&& bg_layout.height == height
			&& bg_layout.video_height == video_height
			&& bg_layout.video_width == video_width
			&& bg_layout.width == width
	) {
		return false
	}
	const strip_width = max(width, height * 16 / 9)
	bg_layout.dpr = dpr
	bg_layout.dx = (width - strip_width) / 2
	bg_layout.height = height
	bg_layout.tile_width = strip_width / 3
	bg_layout.video_height = video_height
	bg_layout.video_width = video_width
	bg_layout.width = width
	const dest_ratio = bg_layout.tile_width / height
	const src_ratio = video_width / video_height
	bg_layout.sh = video_height
	bg_layout.sw = video_width
	bg_layout.sx = 0
	bg_layout.sy = 0
	if (src_ratio > dest_ratio) {
		bg_layout.sw = video_height * dest_ratio
		bg_layout.sx = (video_width - bg_layout.sw) / 2
	} else {
		bg_layout.sh = video_width / dest_ratio
		bg_layout.sy = (video_height - bg_layout.sh) / 2
	}
	return true
}
/**
 * @param {Uint8Array} bytes
 * @param {number} start
 * @param {number} end
 * @param {(type: string, pos: number, size: number) => void} fn
 * @returns {void}
 */
function walk_bg_boxes(bytes, start, end, fn) {
	let pos = start
	while (pos + 8 <= end) {
		const size = read_bg_box_size(bytes, pos, false)
		if (!size || pos + size > end) {
			break
		}
		fn(
			read_bg_box_type(bytes, pos),
			pos,
			size
		)
		pos += size
	}
}