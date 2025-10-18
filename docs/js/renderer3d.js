import { px_to_rad } from "./camera.js"
import config from "./config.js"
import { dir_from_yaw_pitch } from "./logic.js"
import mat4 from "./mat4.js"
import {
	convert_deg_across_aspect,
	cos,
	PI,
	sin,
	tan,
	TAU
} from "./math.js"
import state from "./state.js"
const canvas = new OffscreenCanvas(1, 1)
const context = /** @type {WebGL2RenderingContext} */(canvas.getContext(
	"webgl2",
	{
		alpha: true,
		antialias: true,
		desynchronized: true,
		premultipliedAlpha: true
	}
))/**/
const stroke_p = make_program(
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
const u_view_i = context.getUniformLocation(stroke_p, "u_view")
const u_proj_i = context.getUniformLocation(stroke_p, "u_proj")
const u_viewport_i = context.getUniformLocation(stroke_p, "u_viewport")
const u_thickness_px_i = context.getUniformLocation(stroke_p, "u_thickness_px")
const u_color_i = context.getUniformLocation(stroke_p, "u_color")
const vao_stroke_instanced = context.createVertexArray()
const fill_p = make_program(
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
const a_pos_fill = context.getAttribLocation(fill_p, "a_pos")
const u_color_fill = context.getUniformLocation(fill_p, "u_color")
const u_proj_fill = context.getUniformLocation(fill_p, "u_proj")
const u_view_fill = context.getUniformLocation(fill_p, "u_view")
const sky_sphere = (() => {
	const { sky_sphere_radius: r } = config.grid
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
		context.STATIC_DRAW
	)
})()
const sky_sphere_major = (() => {
	const { sky_sphere_radius: r } = config.grid
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
		context.STATIC_DRAW
	)
})()
context.blendFunc(
	context.ONE,
	context.ONE_MINUS_SRC_ALPHA
)
context.clearColor(0, 0, 0, 0)
context.disable(context.DEPTH_TEST)
context.enable(context.BLEND)
/**
 * @param {Float32Array} segments
 * @param {GLenum} [usage = context.STATIC_DRAW]
 * @returns {VboInfo}
 */
function build_fill_vbo(
	segments,
	usage = context.STATIC_DRAW
) {
	const vbo = context.createBuffer()
	context.bindBuffer(context.ARRAY_BUFFER, vbo)
	context.bufferData(
		context.ARRAY_BUFFER,
		segments,
		usage
	)
	return {
		vbo,
		count: (segments.length / 3) | 0,
		stride: (3 * 4) | 0
	}
}
/**
 * @param {number} yaw
 * @param {number} pitch
 * @param {number} radius_rad
 * @param {number} dist
 * @param {GLenum} [usage=context.DYNAMIC_DRAW]
 * @returns {VboInfo}
 */
function build_ring_vbo_from_angles(
	yaw,
	pitch,
	radius_rad,
	dist,
	usage = context.DYNAMIC_DRAW
) {
	const { view } = state.camera
	const vertex = 96
	/** @type {number[]} */
	const segments = []
	const d = dir_from_yaw_pitch(yaw, pitch)
	const center = [
		d[0] * dist,
		d[1] * dist,
		d[2] * dist
	]
	const right = [ view[0], view[4], view[8] ]
	const up = [ view[1], view[5], view[9] ]
	const r_world = tan(radius_rad) * dist
	for (let i = 0; i < vertex; i++) {
		const a0 = (i / vertex) * TAU
		const a1 = ((i + 1) / vertex) * TAU
		const c0 = cos(a0)
		const s0 = sin(a0)
		const c1 = cos(a1)
		const s1 = sin(a1)
		const p0 = [
			center[0] + (right[0] * c0 + up[0] * s0) * r_world,
			center[1] + (right[1] * c0 + up[1] * s0) * r_world,
			center[2] + (right[2] * c0 + up[2] * s0) * r_world
		]
		const p1 = [
			center[0] + (right[0] * c1 + up[0] * s1) * r_world,
			center[1] + (right[1] * c1 + up[1] * s1) * r_world,
			center[2] + (right[2] * c1 + up[2] * s1) * r_world
		]
		segments.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2])
	}
	return build_stroke_vbo(
		new Float32Array(segments),
		usage
	)
}
/**
 * @param {number} yaw
 * @param {number} pitch
 * @param {number} radius_rad
 * @param {number} dist
 * @param {GLenum} [usage=context.DYNAMIC_DRAW]
 * @returns {VboInfo}
 */
function build_disc_vbo_from_angles(
	yaw,
	pitch,
	radius_rad,
	dist,
	usage = context.DYNAMIC_DRAW
) {
	const { view } = state.camera
	const vertex = 96
	/** @type {number[]} */
	const tris = []
	const d = dir_from_yaw_pitch(yaw, pitch)
	const cx = d[0] * dist
	const cy = d[1] * dist
	const cz = d[2] * dist
	const right = [ view[0], view[4], view[8] ]
	const up = [ view[1], view[5], view[9] ]
	const r_world = tan(radius_rad) * dist
	for (let i = 0; i < vertex; i++) {
		const a0 = (i / vertex) * TAU
		const a1 = ((i + 1) / vertex) * TAU
		const c0 = cos(a0)
		const s0 = sin(a0)
		const c1 = cos(a1)
		const s1 = sin(a1)
		const p0x = cx + (right[0] * c0 + up[0] * s0) * r_world
		const p0y = cy + (right[1] * c0 + up[1] * s0) * r_world
		const p0z = cz + (right[2] * c0 + up[2] * s0) * r_world
		const p1x = cx + (right[0] * c1 + up[0] * s1) * r_world
		const p1y = cy + (right[1] * c1 + up[1] * s1) * r_world
		const p1z = cz + (right[2] * c1 + up[2] * s1) * r_world
		tris.push(cx, cy, cz, p0x, p0y, p0z, p1x, p1y, p1z)
	}
	return build_fill_vbo(new Float32Array(tris), usage)
}
/**
 * @param {Float32Array} segments
 * @param {GLenum} [usage = context.STATIC_DRAW]
 * @returns {VboInfo}
 */
function build_stroke_vbo(
	segments,
	usage = context.STATIC_DRAW
) {
	const seg_count = (segments.length / 6) | 0
	const vbo = context.createBuffer()
	context.bindBuffer(context.ARRAY_BUFFER, vbo)
	context.bufferData(
		context.ARRAY_BUFFER,
		segments,
		usage
	)
	return {
		vbo,
		count: seg_count,
		stride: (6 * 4) | 0
	}
}
/**
 * @param {[ number, number, number, number ]} color
 * @param {VboInfo} vbo_info
 * @returns {void}
 */
function draw_fill([ r, g, b, a ], vbo_info) {
	context.useProgram(fill_p)
	context.uniformMatrix4fv(
		u_proj_fill,
		false,
		state.camera.proj
	)
	context.uniformMatrix4fv(
		u_view_fill,
		false,
		state.camera.view
	)
	context.uniform4f(u_color_fill, r * a, g * a, b * a, a)
	context.bindBuffer(
		context.ARRAY_BUFFER,
		vbo_info.vbo
	)
	context.enableVertexAttribArray(a_pos_fill)
	context.vertexAttribPointer(
		a_pos_fill,
		3,
		context.FLOAT,
		false,
		vbo_info.stride,
		0
	)
	context.drawArrays(
		context.TRIANGLES,
		0,
		vbo_info.count
	)
	context.disableVertexAttribArray(a_pos_fill)
}
/** @returns {void} */
function draw_grid() {
	draw_stroke(
		[ .227, .290, .407, .3 ],
		1,
		sky_sphere
	)
	draw_stroke(
		[ .227, .290, .407, .6 ],
		2,
		sky_sphere_major
	)
}
/** @returns {void} */
function draw_impacts() {
	const {
		duration_s,
		fade_factor,
		rings,
		spacing
	} = config.impact
	const { sky_sphere_radius: d } = config.grid
	const { impacts_3d } = state
	const { now_s } = state.timer
	if (!impacts_3d.length) return
	const max_life = duration_s + spacing * (rings - 1)
	const base_alpha = .9
	while (impacts_3d.length) {
		if (now_s - impacts_3d.at().t > max_life) impacts_3d.drop()
		else break
	}
	for (let i = 0; i < impacts_3d.length; i++) {
		const { c, p, r, t, y } = impacts_3d.at(i)
		const progress = (now_s - t) / duration_s
		for (let k = 0; k < rings; k++) {
			const p2 = progress - k * spacing
			if (p2 <= 0 || p2 > 1) continue
			const rr = r * p2
			const a = base_alpha * (1 - fade_factor * p2)
			if (a <= 0) continue
			const vbo = build_ring_vbo_from_angles(y, p, rr, d)
			/** @type {[ number, number, number, number ]} */
			const col = c ? [ 1, 0, 0, a ] : [ 1, 1, 1, a ]
			draw_stroke(col, 2, vbo)
			context.deleteBuffer(vbo.vbo)
		}
	}
}
/** @returns {void} */
function draw_paths() {
	const { sky_sphere_radius: d } = config.grid
	const { targets_3d } = state.flick
	const { mode } = state.game
	const { target_3d } = state.tracking
	const { target: warmup_target } = state.warmup
	/** @type {number[]} */
	const segments = []
	const cam_dir = dir_from_yaw_pitch(
		state.camera.yaw,
		state.camera.pitch
	)
	let prev = [
		cam_dir[0] * d,
		cam_dir[1] * d,
		cam_dir[2] * d
	]
	if (mode == "flick") {
		if (!targets_3d.length) return
		for (let i = targets_3d.length - 1; i >= 0; i--) {
			const t = targets_3d[i]
			const dir = dir_from_yaw_pitch(t.cy, t.cp)
			const pos = [ dir[0] * d, dir[1] * d, dir[2] * d ]
			segments.push(
				prev[0],
				prev[1],
				prev[2],
				pos[0],
				pos[1],
				pos[2]
			)
			prev = pos
		}
	} else if (mode == "tracking") {
		const dir = dir_from_yaw_pitch(target_3d.cy, target_3d.cp)
		const pos = [ dir[0] * d, dir[1] * d, dir[2] * d ]
		segments.push(
			prev[0],
			prev[1],
			prev[2],
			pos[0],
			pos[1],
			pos[2]
		)
	} else if (mode == "warmup") {
		const dir = dir_from_yaw_pitch(
			warmup_target.cy,
			warmup_target.cp
		)
		const pos = [ dir[0] * d, dir[1] * d, dir[2] * d ]
		segments.push(
			prev[0],
			prev[1],
			prev[2],
			pos[0],
			pos[1],
			pos[2]
		)
	} else {
		throw Error(String(mode))
	}
	if (segments.length === 0) return
	const vbo_info = build_stroke_vbo(
		new Float32Array(segments),
		context.DYNAMIC_DRAW
	)
	draw_stroke([ 1, 1, 1, .2 ], 2, vbo_info)
	context.deleteBuffer(vbo_info.vbo)
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
	context.useProgram(stroke_p)
	context.uniformMatrix4fv(u_proj_i, false, state.camera.proj)
	context.uniformMatrix4fv(u_view_i, false, state.camera.view)
	context.uniform2f(
		u_viewport_i,
		canvas.width,
		canvas.height
	)
	context.uniform1f(u_thickness_px_i, line_width)
	context.uniform4f(u_color_i, r * a, g * a, b * a, a)
	context.bindVertexArray(vao_stroke_instanced)
	context.bindBuffer(
		context.ARRAY_BUFFER,
		vbo_info.vbo
	)
	const stride = vbo_info.stride
	context.enableVertexAttribArray(0)
	context.vertexAttribPointer(0, 3, context.FLOAT, false, stride, 0)
	context.vertexAttribDivisor(0, 1)
	context.enableVertexAttribArray(1)
	context.vertexAttribPointer(
		1,
		3,
		context.FLOAT,
		false,
		stride,
		3 * 4
	)
	context.vertexAttribDivisor(1, 1)
	const seg_count = vbo_info.count | 0
	context.drawArraysInstanced(
		context.TRIANGLE_STRIP,
		0,
		4,
		seg_count
	)
	context.bindVertexArray(null)
	context.disableVertexAttribArray(0)
	context.disableVertexAttribArray(1)
}
/**
 * @param {Target3D} target
 * @param {number} alpha
 * @returns {void}
 */
function draw_target(target, alpha) {
	const { sky_sphere_radius: d } = config.grid
	const { cp, cr, cy, p, r, y } = target
	const line_width = 1
	const line_width_rad = px_to_rad(1)
	/** @type {[ number, number, number, number ]} */
	const body_fill = [ .22, .35, .47, alpha ]
	/** @type {[ number, number, number, number ]} */
	const core_fill = [ .11, .204, .29, alpha ]
	/** @type {[ number, number, number, number ]} */
	const outline_col = [ 1, 0, 0, alpha ]
	let vbo = build_disc_vbo_from_angles(y, p, r, d)
	draw_fill(body_fill, vbo)
	context.deleteBuffer(vbo.vbo)
	vbo = build_ring_vbo_from_angles(y, p, r + line_width_rad / 2, d)
	draw_stroke(outline_col, line_width, vbo)
	context.deleteBuffer(vbo.vbo)
	vbo = build_disc_vbo_from_angles(cy, cp, cr, d)
	draw_fill(core_fill, vbo)
	context.deleteBuffer(vbo.vbo)
	vbo = build_ring_vbo_from_angles(cy, cp, cr + line_width_rad / 2, d)
	draw_stroke(outline_col, line_width, vbo)
	context.deleteBuffer(vbo.vbo)
}
/** @returns {void} */
function draw_targets() {
	const { targets_3d } = state.flick
	const { mode } = state.game
	const { target_3d } = state.tracking
	const { target: warmup_target } = state.warmup
	if (mode == "flick") {
		if (!targets_3d.length) return
		for (let i = 0; i + 1 < targets_3d.length; i++) {
			draw_target(
				targets_3d[i],
				1 / 2 ** (targets_3d.length - i - 1)
			)
		}
		draw_target(
			targets_3d[targets_3d.length - 1],
			1
		)
	} else if (mode == "tracking") {
		draw_target(target_3d, 1)
	} else if (mode == "warmup") {
		draw_target(warmup_target, 1)
	} else {
		throw Error(String(mode))
	}
}
/** @returns {ImageBitmap} */
export function image() {
	const { fov, pitch, yaw } = state.camera
	const { mode } = state.game
	const aspect = canvas.width / canvas.height
	const vfov_deg = convert_deg_across_aspect(fov, canvas.width, canvas.height)
	context.clear(context.COLOR_BUFFER_BIT)
	state.camera.proj = mat4.perspective(vfov_deg, aspect, .1, 2_000)
	state.camera.view = mat4.view(yaw, pitch)
	draw_grid()
	if (mode) {
		draw_paths()
		draw_targets()
		draw_impacts()
	}
	return canvas.transferToImageBitmap()
}
/**
 * @param {string} vs_src
 * @param {string} fs_src
 * @returns {WebGLProgram}
 */
function make_program(vs_src, fs_src) {
	const p = context.createProgram()
	const vs = make_shader(context.VERTEX_SHADER, vs_src)
	const fs = make_shader(context.FRAGMENT_SHADER, fs_src)
	context.attachShader(p, vs)
	context.attachShader(p, fs)
	context.linkProgram(p)
	context.deleteShader(vs)
	context.deleteShader(fs)
	context.getProgramParameter(p, context.LINK_STATUS)
	return p
}
/**
 * @param {GLenum} type
 * @param {string} src
 * @returns {WebGLShader}
 */
function make_shader(type, src) {
	const s = /** @type {WebGLShader } */(context.createShader(type))/**/
	context.shaderSource(s, src)
	context.compileShader(s)
	context.getShaderParameter(s, context.COMPILE_STATUS)
	return s
}
/** * @returns {void} */
export function resize_3d() {
	const { height, width } = state.device
	canvas.width = width
	canvas.height = height
	context.viewport(0, 0, width, height)
}