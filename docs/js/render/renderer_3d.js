import { calc_rad_per_px } from "../calc/calc_sens.js"
import { canvas_3d_el } from "../controller/dom.js"
import constants from "../constants.js"
import { cos, PI, sin, tan, TAU } from "../math.js"
import { play_shot } from "../sfx.js"
import state, { impacts_3d_pool } from "../state.js"
import { px_to_rad } from "./camera.js"
import mat4 from "./mat4.js"
import { record_shot_2d } from "./renderer_2d.js"
const canvas = canvas_3d_el
const context_3d = /** @type {WebGL2RenderingContext} */(canvas.getContext(
	"webgl2",
	{
		alpha: true,
		antialias: true,
		desynchronized: true,
		premultipliedAlpha: true
	}
))/**/
const VERTEX = 96
const unit_cos = new Float32Array(VERTEX + 1)
const unit_sin = new Float32Array(VERTEX + 1)
const stroke_p = create_program(
	`#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos_a;
layout(location=1) in vec3 a_pos_b;
uniform mat4 u_proj;
uniform mat4 u_view;
uniform vec2 u_viewport;
uniform float u_thickness_px;
const float EPS = 1e-4;
void main() {
int vid = gl_VertexID;
float side = ( (vid & 1) == 0 ) ? -1.0 : 1.0;
float endpoint = (vid < 2) ? 0.0 : 1.0;
vec4 a_view = u_view * vec4(a_pos_a, 1.0);
vec4 b_view = u_view * vec4(a_pos_b, 1.0);
bool a_front = (a_view.z <= -EPS);
bool b_front = (b_view.z <= -EPS);
if (!a_front && !b_front) {
	gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
	return;
}
if (a_front != b_front) {
	vec3 pa = a_view.xyz;
	vec3 pb = b_view.xyz;
	float t = (-EPS - pa.z) / (pb.z - pa.z);
	vec3 pI = mix(pa, pb, t);
	if (!a_front) a_view = vec4(pI, 1.0);
	else b_view = vec4(pI, 1.0);
}
vec4 a_clip = u_proj * a_view;
vec4 b_clip = u_proj * b_view;
vec2 a_ndc = a_clip.xy / a_clip.w;
vec2 b_ndc = b_clip.xy / b_clip.w;
vec2 dir_ndc = normalize(b_ndc - a_ndc);
vec2 nrm_ndc = vec2(-dir_ndc.y, dir_ndc.x);
vec2 px_to_ndc = 2.0 / u_viewport;
vec2 offset_ndc = nrm_ndc * u_thickness_px * 0.5 * px_to_ndc;
vec4 base_clip = mix(a_clip, b_clip, endpoint);
vec2 base_ndc = base_clip.xy / base_clip.w;
base_ndc += offset_ndc * side;
vec2 base_clip_xy = base_ndc * base_clip.w;
gl_Position = vec4(base_clip_xy, base_clip.zw);
}
`,
	`#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 out_color;
void main(){ out_color = u_color; }`
)
const u_view_i = context_3d.getUniformLocation(stroke_p, "u_view")
const u_proj_i = context_3d.getUniformLocation(stroke_p, "u_proj")
const u_viewport_i = context_3d.getUniformLocation(stroke_p, "u_viewport")
const u_thickness_px_i = context_3d.getUniformLocation(stroke_p, "u_thickness_px")
const u_color_i = context_3d.getUniformLocation(stroke_p, "u_color")
const vao_stroke_instanced = context_3d.createVertexArray()
const fill_p = create_program(
	`#version 300 es
precision highp float;
in vec3 a_pos;
uniform mat4 u_proj;
uniform mat4 u_view;
void main() {
gl_Position = u_proj * (u_view * vec4(a_pos, 1.0));
}`,
	`#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 out_color;
void main() { out_color = u_color; }`
)
const a_pos_fill = context_3d.getAttribLocation(fill_p, "a_pos")
const u_color_fill = context_3d.getUniformLocation(fill_p, "u_color")
const u_proj_fill = context_3d.getUniformLocation(fill_p, "u_proj")
const u_view_fill = context_3d.getUniformLocation(fill_p, "u_view")
const disc_scratch = new Float32Array(VERTEX * 9)
const disc_vbo = /** @type {WebGLBuffer} */(context_3d.createBuffer())/**/
/** @type {VboInfo} */
const disc_info = {
	count: VERTEX * 3,
	stride: 12,
	vbo: disc_vbo
}
const ring_scratch = new Float32Array(VERTEX * 6)
const ring_vbo = /** @type {WebGLBuffer} */(context_3d.createBuffer())/**/
/** @type {VboInfo} */
const ring_info = {
	count: VERTEX,
	stride: 24,
	vbo: ring_vbo
}
const grid_color_major = /** @type {[ number, number, number, number ]} */([ .227, .290, .407, .6 ])/**/
const grid_color_minor = /** @type {[ number, number, number, number ]} */([ .227, .290, .407, .3 ])/**/
const guide_color = /** @type {[ number, number, number, number ]} */([ 1, 1, 1, .2 ])/**/
const impact_color = /** @type {[ number, number, number, number ]} */([ 0, 0, 0, 0 ])/**/
const target_core_color = /** @type {[ number, number, number, number ]} */([ 0, 0, 0, 0 ])/**/
const target_fill_color = /** @type {[ number, number, number, number ]} */([ 0, 0, 0, 0 ])/**/
const target_stroke_color = /** @type {[ number, number, number, number ]} */([ 0, 0, 0, 0 ])/**/
let guide_capacity = 32
let guide_scratch = new Float32Array(guide_capacity * 6)
const guide_vbo = /** @type {WebGLBuffer} */(context_3d.createBuffer())/**/
const guide_info = {
	count: 0,
	stride: 24,
	vbo: guide_vbo
}
const sky_sphere = (() => {
	const { sky_sphere_radius: r } = constants.grid
	const seg_w = 72
	const seg_h = 36
	/** @type {number[]} */
	const segments = []
	for (let y = 1; y < seg_h; y++) {
		const v = y / seg_h
		const phi = v * PI
		const c_y = cos(phi)
		const s_y = sin(phi)
		for (let x = 0; x < seg_w; x++) {
			const th1 = (x / seg_w) * TAU
			const th2 = ((x + 1) / seg_w) * TAU
			const p1x = sin(th1) * s_y * r
			const p1y = c_y * r
			const p1z = -cos(th1) * s_y * r
			const p2x = sin(th2) * s_y * r
			const p2y = c_y * r
			const p2z = -cos(th2) * s_y * r
			segments.push(p1x, p1y, p1z, p2x, p2y, p2z)
		}
	}
	for (let x = 0; x < seg_w; x++) {
		const th = (x / seg_w) * TAU
		const c_x = cos(th)
		const s_x = sin(th)
		for (let y = 0; y < seg_h; y++) {
			const v1 = (y / seg_h) * PI
			const v2 = ((y + 1) / seg_h) * PI
			const p1x = s_x * sin(v1) * r
			const p1y = cos(v1) * r
			const p1z = -c_x * sin(v1) * r
			const p2x = s_x * sin(v2) * r
			const p2y = cos(v2) * r
			const p2z = -c_x * sin(v2) * r
			segments.push(p1x, p1y, p1z, p2x, p2y, p2z)
		}
	}
	return build_stroke_vbo(
		new Float32Array(segments),
		context_3d.STATIC_DRAW
	)
})()
const sky_sphere_major = (() => {
	const { sky_sphere_radius: r } = constants.grid
	const seg_w = 72
	const seg_h = 36
	/** @type {number[]} */
	const segments = []
	for (let p = PI * .25; p <= PI; p += PI * .25) {
		const cy = cos(p)
		const sy = sin(p)
		for (let x = 0; x < seg_w; x++) {
			const th1 = (x / seg_w) * TAU
			const th2 = ((x + 1) / seg_w) * TAU
			const p1x = sin(th1) * sy * r
			const p1y = cy * r
			const p1z = -cos(th1) * sy * r
			const p2x = sin(th2) * sy * r
			const p2y = cy * r
			const p2z = -cos(th2) * sy * r
			segments.push(p1x, p1y, p1z, p2x, p2y, p2z)
		}
	}
	for (let p = 0; p <= TAU; p += PI * .25) {
		const cx = cos(p)
		const sx = sin(p)
		for (let y = 0; y < seg_h; y++) {
			const v1 = (y / seg_h) * PI
			const v2 = ((y + 1) / seg_h) * PI
			const p1x = sx * sin(v1) * r
			const p1y = cos(v1) * r
			const p1z = -cx * sin(v1) * r
			const p2x = sx * sin(v2) * r
			const p2y = cos(v2) * r
			const p2z = -cx * sin(v2) * r
			segments.push(p1x, p1y, p1z, p2x, p2y, p2z)
		}
	}
	return build_stroke_vbo(
		new Float32Array(segments),
		context_3d.STATIC_DRAW
	)
})()
{
	for (let i = 0; i <= VERTEX; i++) {
		const a = i / VERTEX * TAU
		unit_cos[i] = cos(a)
		unit_sin[i] = sin(a)
	}
	context_3d.bindBuffer(
		context_3d.ARRAY_BUFFER,
		disc_vbo
	)
	context_3d.bufferData(
		context_3d.ARRAY_BUFFER,
		disc_scratch.byteLength,
		context_3d.DYNAMIC_DRAW
	)
	context_3d.bindBuffer(
		context_3d.ARRAY_BUFFER,
		ring_vbo
	)
	context_3d.bufferData(
		context_3d.ARRAY_BUFFER,
		ring_scratch.byteLength,
		context_3d.DYNAMIC_DRAW
	)
	context_3d.bindBuffer(
		context_3d.ARRAY_BUFFER,
		guide_vbo
	)
	context_3d.bufferData(
		context_3d.ARRAY_BUFFER,
		guide_scratch.byteLength,
		context_3d.DYNAMIC_DRAW
	)
	context_3d.blendFunc(
		context_3d.ONE,
		context_3d.ONE_MINUS_SRC_ALPHA
	)
	context_3d.clearColor(0, 0, 0, 0)
	context_3d.disable(context_3d.DEPTH_TEST)
	context_3d.enable(context_3d.BLEND)
}
/**
 * @param {number} yaw
 * @param {number} pitch
 * @param {number} radius_rad
 * @param {number} dist
 * @returns {VboInfo}
 */
function build_disc_vbo_from_angles(yaw, pitch, radius_rad, dist) {
	const { view } = state.camera
	const cos_pitch = cos(pitch)
	const cx = sin(yaw) * cos_pitch * dist
	const cy = sin(pitch) * dist
	const cz = -cos(yaw) * cos_pitch * dist
	const rx = view[0]
	const ry = view[4]
	const rz = view[8]
	const ux = view[1]
	const uy = view[5]
	const uz = view[9]
	const r_world = tan(radius_rad) * dist
	for (let i = 0; i < VERTEX; i++) {
		const c0 = unit_cos[i]
		const s0 = unit_sin[i]
		const c1 = unit_cos[i + 1]
		const s1 = unit_sin[i + 1]
		const o = i * 9
		const p0x = cx + (rx * c0 + ux * s0) * r_world
		const p0y = cy + (ry * c0 + uy * s0) * r_world
		const p0z = cz + (rz * c0 + uz * s0) * r_world
		const p1x = cx + (rx * c1 + ux * s1) * r_world
		const p1y = cy + (ry * c1 + uy * s1) * r_world
		const p1z = cz + (rz * c1 + uz * s1) * r_world
		disc_scratch[o] = cx
		disc_scratch[o + 1] = cy
		disc_scratch[o + 2] = cz
		disc_scratch[o + 3] = p0x
		disc_scratch[o + 4] = p0y
		disc_scratch[o + 5] = p0z
		disc_scratch[o + 6] = p1x
		disc_scratch[o + 7] = p1y
		disc_scratch[o + 8] = p1z
	}
	context_3d.bindBuffer(
		context_3d.ARRAY_BUFFER,
		disc_vbo
	)
	context_3d.bufferSubData(
		context_3d.ARRAY_BUFFER,
		0,
		disc_scratch
	)
	return disc_info
}
/**
 * @param {number} yaw
 * @param {number} pitch
 * @param {number} radius_rad
 * @param {number} dist
 * @returns {VboInfo}
 */
function build_ring_vbo_from_angles(yaw, pitch, radius_rad, dist) {
	const { view } = state.camera
	const cos_pitch = cos(pitch)
	const cx = sin(yaw) * cos_pitch * dist
	const cy = sin(pitch) * dist
	const cz = -cos(yaw) * cos_pitch * dist
	const rx = view[0]
	const ry = view[4]
	const rz = view[8]
	const ux = view[1]
	const uy = view[5]
	const uz = view[9]
	const r_world = tan(radius_rad) * dist
	for (let i = 0; i < VERTEX; i++) {
		const c0 = unit_cos[i]
		const s0 = unit_sin[i]
		const c1 = unit_cos[i + 1]
		const s1 = unit_sin[i + 1]
		const o = i * 6
		ring_scratch[o] = cx + (rx * c0 + ux * s0) * r_world
		ring_scratch[o + 1] = cy + (ry * c0 + uy * s0) * r_world
		ring_scratch[o + 2] = cz + (rz * c0 + uz * s0) * r_world
		ring_scratch[o + 3] = cx + (rx * c1 + ux * s1) * r_world
		ring_scratch[o + 4] = cy + (ry * c1 + uy * s1) * r_world
		ring_scratch[o + 5] = cz + (rz * c1 + uz * s1) * r_world
	}
	context_3d.bindBuffer(
		context_3d.ARRAY_BUFFER,
		ring_vbo
	)
	context_3d.bufferSubData(
		context_3d.ARRAY_BUFFER,
		0,
		ring_scratch
	)
	return ring_info
}
/**
 * @param {Float32Array} segments
 * @param {GLenum} [usage = context.STATIC_DRAW]
 * @returns {VboInfo}
 */
function build_stroke_vbo(
	segments,
	usage = context_3d.STATIC_DRAW
) {
	const seg_count = segments.length / 6 | 0
	const vbo = /** @type {WebGLBuffer} */(context_3d.createBuffer())/**/
	context_3d.bindBuffer(context_3d.ARRAY_BUFFER, vbo)
	context_3d.bufferData(
		context_3d.ARRAY_BUFFER,
		segments,
		usage
	)
	return {
		vbo,
		count: seg_count,
		stride: 6 * 4 | 0
	}
}
/**
 * @param {string} vs_src
 * @param {string} fs_src
 * @returns {WebGLProgram}
 */
function create_program(vs_src, fs_src) {
	const p = context_3d.createProgram()
	const vs = create_shader(context_3d.VERTEX_SHADER, vs_src)
	const fs = create_shader(
		context_3d.FRAGMENT_SHADER,
		fs_src
	)
	context_3d.attachShader(p, vs)
	context_3d.attachShader(p, fs)
	context_3d.linkProgram(p)
	context_3d.deleteShader(vs)
	context_3d.deleteShader(fs)
	context_3d.getProgramParameter(p, context_3d.LINK_STATUS)
	return p
}
/**
 * @param {GLenum} type
 * @param {string} src
 * @returns {WebGLShader}
 */
function create_shader(type, src) {
	const s = /** @type {WebGLShader } */(context_3d.createShader(type))/**/
	context_3d.shaderSource(s, src)
	context_3d.compileShader(s)
	context_3d.getShaderParameter(s, context_3d.COMPILE_STATUS)
	return s
}
/**
 * @param {Target3D[]} chain
 * @returns {void}
 */
export function draw_aim_guides_3d(chain) {
	const n = chain.length
	if (!n) {
		return
	}
	const { sky_sphere_radius: d } = constants.grid
	const { pitch, yaw } = state.camera
	if (n > guide_capacity) {
		guide_capacity = n * 2
		guide_scratch = new Float32Array(guide_capacity * 6)
		context_3d.bindBuffer(
			context_3d.ARRAY_BUFFER,
			guide_vbo
		)
		context_3d.bufferData(
			context_3d.ARRAY_BUFFER,
			guide_scratch.byteLength,
			context_3d.DYNAMIC_DRAW
		)
	}
	const start_cos_pitch = cos(pitch)
	let from_x = sin(yaw) * start_cos_pitch
	let from_y = sin(pitch)
	let from_z = -cos(yaw) * start_cos_pitch
	for (let i = 0; i < n; i++) {
		const t = chain[i]
		const dir_cos_pitch = cos(t.cp)
		const to_x = sin(t.cy) * dir_cos_pitch * d
		const to_y = sin(t.cp) * d
		const to_z = -cos(t.cy) * dir_cos_pitch * d
		const o = i * 6
		guide_scratch[o] = from_x
		guide_scratch[o + 1] = from_y
		guide_scratch[o + 2] = from_z
		guide_scratch[o + 3] = to_x
		guide_scratch[o + 4] = to_y
		guide_scratch[o + 5] = to_z
		from_x = to_x
		from_y = to_y
		from_z = to_z
	}
	context_3d.bindBuffer(
		context_3d.ARRAY_BUFFER,
		guide_vbo
	)
	context_3d.bufferSubData(
		context_3d.ARRAY_BUFFER,
		0,
		guide_scratch,
		0,
		n * 6
	)
	guide_info.count = n
	draw_stroke(guide_color, 2, guide_info)
}
/**
 * @param {[ number, number, number, number ]} color
 * @param {VboInfo} vbo_info
 * @returns {void}
 */
function draw_fill([ r, g, b, a ], vbo_info) {
	context_3d.useProgram(fill_p)
	context_3d.uniformMatrix4fv(
		u_proj_fill,
		false,
		state.camera.proj
	)
	context_3d.uniformMatrix4fv(
		u_view_fill,
		false,
		state.camera.view
	)
	context_3d.uniform4f(u_color_fill, r * a, g * a, b * a, a)
	context_3d.bindBuffer(
		context_3d.ARRAY_BUFFER,
		vbo_info.vbo
	)
	context_3d.enableVertexAttribArray(a_pos_fill)
	context_3d.vertexAttribPointer(
		a_pos_fill,
		3,
		context_3d.FLOAT,
		false,
		vbo_info.stride,
		0
	)
	context_3d.drawArrays(
		context_3d.TRIANGLES,
		0,
		vbo_info.count
	)
	context_3d.disableVertexAttribArray(a_pos_fill)
}
/** @returns {void} */
export function draw_grid_3d() {
	draw_stroke(grid_color_minor, 1, sky_sphere)
	draw_stroke(
		grid_color_major,
		2,
		sky_sphere_major
	)
}
/** @returns {void} */
export function draw_impacts_3d() {
	const {
		duration_s,
		fade_factor,
		rings,
		spacing
	} = constants.impact
	const { sky_sphere_radius: d } = constants.grid
	const { impacts_3d } = state
	const { now_s } = state.timer
	if (!impacts_3d.length) {
		return
	}
	const max_life = duration_s + spacing * (rings - 1)
	const base_alpha = .9
	const color = impact_color
	while (impacts_3d.length) {
		const first = impacts_3d.at()
		if (now_s - first.t > max_life) {
			impacts_3d_pool.recycle(first)
			impacts_3d.drop()
		} else {
			break
		}
	}
	for (let i = 0; i < impacts_3d.length; i++) {
		const { c, p, r, t, y } = impacts_3d.at(i)
		const progress = (now_s - t) / duration_s
		for (let k = 0; k < rings; k++) {
			const ring_progress = progress - k * spacing
			if (ring_progress <= 0 || ring_progress > 1) {
				continue
			}
			const ring_radius = r * ring_progress
			const a = base_alpha * (1 - fade_factor * ring_progress)
			if (a <= 0) {
				continue
			}
			if (c == null) {
				color[0] = 0
				color[1] = 0
				color[2] = 0
			} else if (c) {
				color[0] = 1
				color[1] = 0
				color[2] = 0
			} else {
				color[0] = 1
				color[1] = 1
				color[2] = 1
			}
			color[3] = a
			draw_stroke(
				color,
				2,
				build_ring_vbo_from_angles(y, p, ring_radius, d)
			)
		}
	}
}
/**
 * @param {[ number, number, number, number ]} color
 * @param {number} line_width
 * @param {VboInfo} vbo_info
 * @returns {void}
 */
function draw_stroke(
	[ r, g, b, a ],
	line_width,
	vbo_info
) {
	context_3d.useProgram(stroke_p)
	context_3d.uniformMatrix4fv(u_proj_i, false, state.camera.proj)
	context_3d.uniformMatrix4fv(u_view_i, false, state.camera.view)
	context_3d.uniform2f(
		u_viewport_i,
		canvas.width,
		canvas.height
	)
	context_3d.uniform1f(u_thickness_px_i, line_width)
	context_3d.uniform4f(u_color_i, r * a, g * a, b * a, a)
	context_3d.bindVertexArray(vao_stroke_instanced)
	context_3d.bindBuffer(
		context_3d.ARRAY_BUFFER,
		vbo_info.vbo
	)
	const stride = vbo_info.stride
	context_3d.enableVertexAttribArray(0)
	context_3d.vertexAttribPointer(0, 3, context_3d.FLOAT, false, stride, 0)
	context_3d.vertexAttribDivisor(0, 1)
	context_3d.enableVertexAttribArray(1)
	context_3d.vertexAttribPointer(
		1,
		3,
		context_3d.FLOAT,
		false,
		stride,
		3 * 4
	)
	context_3d.vertexAttribDivisor(1, 1)
	context_3d.drawArraysInstanced(
		context_3d.TRIANGLE_STRIP,
		0,
		4,
		vbo_info.count | 0
	)
	context_3d.bindVertexArray(null)
}
/**
 * @param {Target3D} target
 * @param {number} alpha
 * @returns {void}
 */
export function draw_target_3d(target, alpha) {
	const { sky_sphere_radius: d } = constants.grid
	const {
		core_fill_3d,
		fill_3d,
		line_width,
		stroke_3d
	} = constants.target
	const { cp, cr, cy, p, r, y } = target
	const line_width_rad = px_to_rad(1)
	target_fill_color[0] = fill_3d[0]
	target_fill_color[1] = fill_3d[1]
	target_fill_color[2] = fill_3d[2]
	target_fill_color[3] = alpha
	target_stroke_color[0] = stroke_3d[0]
	target_stroke_color[1] = stroke_3d[1]
	target_stroke_color[2] = stroke_3d[2]
	target_stroke_color[3] = alpha
	draw_fill(
		target_fill_color,
		build_disc_vbo_from_angles(y, p, r, d)
	)
	draw_stroke(
		target_stroke_color,
		line_width,
		build_ring_vbo_from_angles(y, p, r + line_width_rad / 2, d)
	)
	if (cr) {
		target_core_color[0] = core_fill_3d[0]
		target_core_color[1] = core_fill_3d[1]
		target_core_color[2] = core_fill_3d[2]
		target_core_color[3] = alpha
		draw_fill(
			target_core_color,
			build_disc_vbo_from_angles(cy, cp, cr, d)
		)
		draw_stroke(
			target_stroke_color,
			line_width,
			build_ring_vbo_from_angles(cy, cp, cr + line_width_rad / 2, d)
		)
	}
}
/** @returns {void} */
export function prepare_3d_view() {
	const {
		dimension,
		dist,
		height,
		pitch,
		proj,
		vfov,
		view,
		width,
		yaw
	} = state.camera
	context_3d.clear(context_3d.COLOR_BUFFER_BIT)
	mat4.perspective(proj, vfov, width / height, .1, 2_000)
	mat4.view(
		view,
		yaw,
		pitch,
		0,
		dimension == "tpp" ? dist : 0
	)
}
/**
 * @param {boolean} is_hit
 * @param {boolean} is_crit
 * @returns {void}
 */
export function record_shot(is_hit, is_crit) {
	if (state.camera.dimension == "2d") {
		record_shot_2d(is_hit, is_crit)
	} else {
		record_shot_3d(is_hit, is_crit)
	}
}
/**
 * @param {boolean} is_hit
 * @param {boolean} is_crit
 * @returns {void}
 */
function record_shot_3d(is_hit, is_crit) {
	const { pitch, yaw } = state.camera
	const { rad_size } = state.impact
	const { now_s } = state.timer
	play_shot(is_hit, is_crit)
	const impact = impacts_3d_pool.obtain()
	impact.c = is_hit ? is_crit : void 0
	impact.p = pitch
	impact.r = rad_size
	impact.t = now_s
	impact.y = yaw
	state.impacts_3d.push(impact)
}
/** @returns {void} */
export function resize_3d() {
	const { fov, height, width } = state.camera
	state.camera.sens = calc_rad_per_px(fov, width)
	context_3d.viewport(
		0,
		0,
		canvas.width = width,
		canvas.height = height
	)
}