import constants from "../constants.js"
import { canvas_3d_el } from "../controller/dom.js"
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
const SPHERE_LATITUDE_SEGMENTS = 16
const SPHERE_LONGITUDE_SEGMENTS = 32
const STROKE_STRIDE = 24
const VERTEX = 96
let current_program = /** @type {WebGLProgram?} */(null)/**/
let frame_id = 0
let viewport_height = 0
let viewport_width = 0
const vao_empty = /** @type {WebGLVertexArrayObject} */(context_3d.createVertexArray())/**/
const disc_p = create_program(
	`#version 300 es
precision highp float;
uniform vec3 u_center;
uniform mat4 u_proj;
uniform float u_radius;
uniform mat4 u_view;
const float SEGMENTS = ${VERTEX}.0;
const float TAU = 6.283185307179586;
void main() {
int tri = gl_VertexID / 3;
int corner = gl_VertexID - tri * 3;
vec3 pos = u_center;
if (corner != 0) {
	float a = float(tri + corner - 1) / SEGMENTS * TAU;
	vec3 right = vec3(u_view[0].x, u_view[1].x, u_view[2].x);
	vec3 up = vec3(u_view[0].y, u_view[1].y, u_view[2].y);
	pos += (right * cos(a) + up * sin(a)) * u_radius;
}
gl_Position = u_proj * (u_view * vec4(pos, 1.0));
}`,
	`#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 out_color;
void main() { out_color = u_color; }`
)
const u_center_disc = context_3d.getUniformLocation(disc_p, "u_center")
const u_color_disc = context_3d.getUniformLocation(disc_p, "u_color")
const u_proj_disc = context_3d.getUniformLocation(disc_p, "u_proj")
const u_radius_disc = context_3d.getUniformLocation(disc_p, "u_radius")
const u_view_disc = context_3d.getUniformLocation(disc_p, "u_view")
let disc_frame = -1
const ring_p = create_program(
	`#version 300 es
precision highp float;
uniform vec3 u_center;
uniform mat4 u_proj;
uniform float u_radius;
uniform float u_thickness_px;
uniform mat4 u_view;
uniform vec2 u_viewport;
const float EPS = 1e-4;
const float SEGMENTS = ${VERTEX}.0;
const float TAU = 6.283185307179586;
void main() {
int vid = gl_VertexID;
float side = ( (vid & 1) == 0 ) ? -1.0 : 1.0;
float endpoint = (vid < 2) ? 0.0 : 1.0;
vec3 right = vec3(u_view[0].x, u_view[1].x, u_view[2].x);
vec3 up = vec3(u_view[0].y, u_view[1].y, u_view[2].y);
float a0 = float(gl_InstanceID) / SEGMENTS * TAU;
float a1 = float(gl_InstanceID + 1) / SEGMENTS * TAU;
vec4 a_view = u_view * vec4(u_center + (right * cos(a0) + up * sin(a0)) * u_radius, 1.0);
vec4 b_view = u_view * vec4(u_center + (right * cos(a1) + up * sin(a1)) * u_radius, 1.0);
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
gl_Position = vec4(base_ndc * base_clip.w, base_clip.zw);
}`,
	`#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 out_color;
void main(){ out_color = u_color; }`
)
const u_center_ring = context_3d.getUniformLocation(ring_p, "u_center")
const u_color_ring = context_3d.getUniformLocation(ring_p, "u_color")
const u_proj_ring = context_3d.getUniformLocation(ring_p, "u_proj")
const u_radius_ring = context_3d.getUniformLocation(ring_p, "u_radius")
const u_thickness_px_ring = context_3d.getUniformLocation(ring_p, "u_thickness_px")
const u_view_ring = context_3d.getUniformLocation(ring_p, "u_view")
const u_viewport_ring = context_3d.getUniformLocation(ring_p, "u_viewport")
let ring_frame = -1
let ring_thickness = 0
const sphere_p = create_program(
	`#version 300 es
precision highp float;
layout(location=0) in vec3 a_pos;
uniform vec3 u_center;
uniform mat4 u_proj;
uniform float u_radius;
uniform mat4 u_view;
out vec3 v_normal;
out vec3 v_view_pos;
void main() {
v_normal = mat3(u_view) * a_pos;
vec3 world_pos = u_center + a_pos * u_radius;
vec4 view_pos = u_view * vec4(world_pos, 1.0);
v_view_pos = view_pos.xyz;
gl_Position = u_proj * view_pos;
}`,
	`#version 300 es
precision mediump float;
in vec3 v_normal;
in vec3 v_view_pos;
uniform vec4 u_color;
uniform float u_line_width;
uniform vec4 u_stroke;
out vec4 out_color;
void main() {
vec3 normal = normalize(v_normal);
if (!gl_FrontFacing) normal = -normal;
float light = .55 + .45 * max(dot(
	normal,
	normalize(vec3(-.35, .55, .75))
), 0.0);
float facing = max(dot(normal, normalize(-v_view_pos)), 0.0);
float outline_width = max(fwidth(facing) * u_line_width, 1e-4);
float outline = 1.0 - smoothstep(
	0.0,
	outline_width,
	facing
);
out_color = mix(
	vec4(u_color.rgb * light, u_color.a),
	u_stroke,
	outline
);
}`
)
const u_center_sphere = context_3d.getUniformLocation(sphere_p, "u_center")
const u_color_sphere = context_3d.getUniformLocation(sphere_p, "u_color")
const u_line_width_sphere = context_3d.getUniformLocation(sphere_p, "u_line_width")
const u_proj_sphere = context_3d.getUniformLocation(sphere_p, "u_proj")
const u_radius_sphere = context_3d.getUniformLocation(sphere_p, "u_radius")
const u_stroke_sphere = context_3d.getUniformLocation(sphere_p, "u_stroke")
const u_view_sphere = context_3d.getUniformLocation(sphere_p, "u_view")
let sphere_frame = -1
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
const u_color_stroke = context_3d.getUniformLocation(stroke_p, "u_color")
const u_proj_stroke = context_3d.getUniformLocation(stroke_p, "u_proj")
const u_thickness_px_stroke = context_3d.getUniformLocation(stroke_p, "u_thickness_px")
const u_view_stroke = context_3d.getUniformLocation(stroke_p, "u_view")
const u_viewport_stroke = context_3d.getUniformLocation(stroke_p, "u_viewport")
let stroke_frame = -1
let stroke_thickness = 0
const grid_color_major = /** @type {[ number, number, number, number ]} */([ .227, .290, .407, .6 ])/**/
const grid_color_minor = /** @type {[ number, number, number, number ]} */([ .227, .290, .407, .3 ])/**/
const guide_color = /** @type {[ number, number, number, number ]} */([ 1, 1, 1, .2 ])/**/
const impact_color = /** @type {[ number, number, number, number ]} */([ 0, 0, 0, 0 ])/**/
const target_core_color = /** @type {[ number, number, number, number ]} */([ 0, 0, 0, 0 ])/**/
const target_fill_color = /** @type {[ number, number, number, number ]} */([ 0, 0, 0, 0 ])/**/
const target_stroke_color = /** @type {[ number, number, number, number ]} */([ 0, 0, 0, 0 ])/**/
let guide_capacity = 32
let guide_scratch = new Float32Array(guide_capacity * 6)
const guide_info = build_stroke_vbo(
	guide_scratch,
	context_3d.DYNAMIC_DRAW
)
const sphere_info = (() => {
	const count = SPHERE_LATITUDE_SEGMENTS
		* SPHERE_LONGITUDE_SEGMENTS * 6
	const vertices = new Float32Array(count * 3)
	let o = 0
	for (let y = 0; y < SPHERE_LATITUDE_SEGMENTS; y++) {
		const p0 = -PI / 2 + y / SPHERE_LATITUDE_SEGMENTS * PI
		const p1 = -PI / 2 + (y + 1) / SPHERE_LATITUDE_SEGMENTS * PI
		const cp0 = cos(p0)
		const cp1 = cos(p1)
		const sp0 = sin(p0)
		const sp1 = sin(p1)
		for (let x = 0; x < SPHERE_LONGITUDE_SEGMENTS; x++) {
			const y0 = x / SPHERE_LONGITUDE_SEGMENTS * TAU
			const y1 = (x + 1) / SPHERE_LONGITUDE_SEGMENTS * TAU
			const cy0 = cos(y0)
			const cy1 = cos(y1)
			const sy0 = sin(y0)
			const sy1 = sin(y1)
			const ax = sy0 * cp0
			const ay = sp0
			const az = -cy0 * cp0
			const bx = sy0 * cp1
			const by = sp1
			const bz = -cy0 * cp1
			const cx = sy1 * cp1
			const cy = sp1
			const cz = -cy1 * cp1
			const dx = sy1 * cp0
			const dy = sp0
			const dz = -cy1 * cp0
			vertices[o++] = ax
			vertices[o++] = ay
			vertices[o++] = az
			vertices[o++] = bx
			vertices[o++] = by
			vertices[o++] = bz
			vertices[o++] = cx
			vertices[o++] = cy
			vertices[o++] = cz
			vertices[o++] = ax
			vertices[o++] = ay
			vertices[o++] = az
			vertices[o++] = cx
			vertices[o++] = cy
			vertices[o++] = cz
			vertices[o++] = dx
			vertices[o++] = dy
			vertices[o++] = dz
		}
	}
	const vao = /** @type {WebGLVertexArrayObject} */(context_3d.createVertexArray())/**/
	const vbo = /** @type {WebGLBuffer} */(context_3d.createBuffer())/**/
	context_3d.bindVertexArray(vao)
	context_3d.bindBuffer(context_3d.ARRAY_BUFFER, vbo)
	context_3d.bufferData(
		context_3d.ARRAY_BUFFER,
		vertices,
		context_3d.STATIC_DRAW
	)
	context_3d.enableVertexAttribArray(0)
	context_3d.vertexAttribPointer(0, 3, context_3d.FLOAT, false, 12, 0)
	context_3d.bindVertexArray(null)
	return { count, vao, vbo }
})()
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
/**
 * @param {Float32Array} segments
 * @param {GLenum} [usage = context.STATIC_DRAW]
 * @returns {VboInfo}
 */
function build_stroke_vbo(
	segments,
	usage = context_3d.STATIC_DRAW
) {
	const vao = /** @type {WebGLVertexArrayObject} */(context_3d.createVertexArray())/**/
	const vbo = /** @type {WebGLBuffer} */(context_3d.createBuffer())/**/
	context_3d.bindVertexArray(vao)
	context_3d.bindBuffer(context_3d.ARRAY_BUFFER, vbo)
	context_3d.bufferData(
		context_3d.ARRAY_BUFFER,
		segments,
		usage
	)
	context_3d.enableVertexAttribArray(0)
	context_3d.vertexAttribPointer(
		0,
		3,
		context_3d.FLOAT,
		false,
		STROKE_STRIDE,
		0
	)
	context_3d.vertexAttribDivisor(0, 1)
	context_3d.enableVertexAttribArray(1)
	context_3d.vertexAttribPointer(
		1,
		3,
		context_3d.FLOAT,
		false,
		STROKE_STRIDE,
		12
	)
	context_3d.vertexAttribDivisor(1, 1)
	context_3d.bindVertexArray(null)
	return {
		count: segments.length / 6 | 0,
		vao,
		vbo
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
			guide_info.vbo
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
		guide_info.vbo
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
 * @param {number} yaw
 * @param {number} pitch
 * @param {number} radius_rad
 * @param {number} dist
 * @param {[ number, number, number, number ]} color
 * @returns {void}
 */
function draw_disc(yaw, pitch, radius_rad, dist, color) {
	const a = color[3]
	const cos_pitch = cos(pitch)
	if (current_program != disc_p) {
		current_program = disc_p
		context_3d.useProgram(disc_p)
	}
	if (disc_frame != frame_id) {
		disc_frame = frame_id
		context_3d.uniformMatrix4fv(
			u_proj_disc,
			false,
			state.camera.proj
		)
		context_3d.uniformMatrix4fv(
			u_view_disc,
			false,
			state.camera.view
		)
	}
	context_3d.uniform3f(
		u_center_disc,
		sin(yaw) * cos_pitch * dist,
		sin(pitch) * dist,
		-cos(yaw) * cos_pitch * dist
	)
	context_3d.uniform1f(
		u_radius_disc,
		tan(radius_rad) * dist
	)
	context_3d.uniform4f(
		u_color_disc,
		color[0] * a,
		color[1] * a,
		color[2] * a,
		a
	)
	context_3d.bindVertexArray(vao_empty)
	context_3d.drawArrays(
		context_3d.TRIANGLES,
		0,
		VERTEX * 3
	)
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
		duration_ms,
		fade_factor,
		rings,
		spacing
	} = constants.impact
	const { sky_sphere_radius: d } = constants.grid
	const { impacts_3d } = state
	const { now_ms } = state.timer
	if (!impacts_3d.length) {
		return
	}
	const max_life_ms = duration_ms * (1 + spacing * (rings - 1))
	const base_alpha = .9
	const color = impact_color
	while (impacts_3d.length) {
		const first = impacts_3d.at()
		if (now_ms - first.t > max_life_ms) {
			impacts_3d_pool.recycle(first)
			impacts_3d.drop()
		} else {
			break
		}
	}
	const count = impacts_3d.length
	for (let i = 0; i < count; i++) {
		const { c, p, r, t, y } = impacts_3d.at(i)
		const progress = (now_ms - t) / duration_ms
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
			draw_ring(y, p, ring_radius, d, color, 2)
		}
	}
}
/**
 * @param {number} yaw
 * @param {number} pitch
 * @param {number} radius_rad
 * @param {number} dist
 * @param {[ number, number, number, number ]} color
 * @param {number} line_width
 * @returns {void}
 */
function draw_ring(
	yaw,
	pitch,
	radius_rad,
	dist,
	color,
	line_width
) {
	const a = color[3]
	const cos_pitch = cos(pitch)
	if (current_program != ring_p) {
		current_program = ring_p
		context_3d.useProgram(ring_p)
	}
	if (ring_frame != frame_id) {
		ring_frame = frame_id
		context_3d.uniformMatrix4fv(
			u_proj_ring,
			false,
			state.camera.proj
		)
		context_3d.uniformMatrix4fv(
			u_view_ring,
			false,
			state.camera.view
		)
		context_3d.uniform2f(
			u_viewport_ring,
			viewport_width,
			viewport_height
		)
	}
	if (ring_thickness != line_width) {
		ring_thickness = line_width
		context_3d.uniform1f(u_thickness_px_ring, line_width)
	}
	context_3d.uniform3f(
		u_center_ring,
		sin(yaw) * cos_pitch * dist,
		sin(pitch) * dist,
		-cos(yaw) * cos_pitch * dist
	)
	context_3d.uniform1f(
		u_radius_ring,
		tan(radius_rad) * dist
	)
	context_3d.uniform4f(
		u_color_ring,
		color[0] * a,
		color[1] * a,
		color[2] * a,
		a
	)
	context_3d.bindVertexArray(vao_empty)
	context_3d.drawArraysInstanced(
		context_3d.TRIANGLE_STRIP,
		0,
		4,
		VERTEX
	)
}
/**
 * @param {[ number, number, number, number ]} color
 * @param {number} line_width
 * @param {VboInfo} vbo_info
 * @returns {void}
 */
function draw_stroke(color, line_width, vbo_info) {
	const a = color[3]
	if (current_program != stroke_p) {
		current_program = stroke_p
		context_3d.useProgram(stroke_p)
	}
	if (stroke_frame != frame_id) {
		stroke_frame = frame_id
		context_3d.uniformMatrix4fv(
			u_proj_stroke,
			false,
			state.camera.proj
		)
		context_3d.uniformMatrix4fv(
			u_view_stroke,
			false,
			state.camera.view
		)
		context_3d.uniform2f(
			u_viewport_stroke,
			viewport_width,
			viewport_height
		)
	}
	if (stroke_thickness != line_width) {
		stroke_thickness = line_width
		context_3d.uniform1f(
			u_thickness_px_stroke,
			line_width
		)
	}
	context_3d.uniform4f(
		u_color_stroke,
		color[0] * a,
		color[1] * a,
		color[2] * a,
		a
	)
	context_3d.bindVertexArray(vbo_info.vao)
	context_3d.drawArraysInstanced(
		context_3d.TRIANGLE_STRIP,
		0,
		4,
		vbo_info.count
	)
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
	draw_disc(y, p, r, d, target_fill_color)
	draw_ring(
		y,
		p,
		r + line_width_rad / 2,
		d,
		target_stroke_color,
		line_width
	)
	if (cr) {
		target_core_color[0] = core_fill_3d[0]
		target_core_color[1] = core_fill_3d[1]
		target_core_color[2] = core_fill_3d[2]
		target_core_color[3] = alpha
		draw_disc(cy, cp, cr, d, target_core_color)
		draw_ring(
			cy,
			cp,
			cr + line_width_rad / 2,
			d,
			target_stroke_color,
			line_width
		)
	}
}
/**
 * @param {number} yaw
 * @param {number} pitch
 * @param {number} dist
 * @param {number} radius
 * @param {number} alpha
 * @returns {void}
 */
export function draw_target_sphere_3d(yaw, pitch, dist, radius, alpha) {
	const { fill_3d, line_width, stroke_3d } = constants.target
	const cos_pitch = cos(pitch)
	context_3d.clear(context_3d.DEPTH_BUFFER_BIT)
	context_3d.enable(context_3d.DEPTH_TEST)
	if (current_program != sphere_p) {
		current_program = sphere_p
		context_3d.useProgram(sphere_p)
	}
	if (sphere_frame != frame_id) {
		sphere_frame = frame_id
		context_3d.uniformMatrix4fv(
			u_proj_sphere,
			false,
			state.camera.proj
		)
		context_3d.uniformMatrix4fv(
			u_view_sphere,
			false,
			state.camera.view
		)
		context_3d.uniform1f(u_line_width_sphere, line_width)
	}
	context_3d.uniform3f(
		u_center_sphere,
		sin(yaw) * cos_pitch * dist,
		sin(pitch) * dist,
		-cos(yaw) * cos_pitch * dist
	)
	context_3d.uniform4f(
		u_color_sphere,
		fill_3d[0] * alpha,
		fill_3d[1] * alpha,
		fill_3d[2] * alpha,
		alpha
	)
	context_3d.uniform1f(u_radius_sphere, radius)
	context_3d.uniform4f(
		u_stroke_sphere,
		stroke_3d[0] * alpha,
		stroke_3d[1] * alpha,
		stroke_3d[2] * alpha,
		alpha
	)
	context_3d.bindVertexArray(sphere_info.vao)
	context_3d.drawArrays(
		context_3d.TRIANGLES,
		0,
		sphere_info.count
	)
	context_3d.disable(context_3d.DEPTH_TEST)
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
	frame_id++
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
	const { now_ms } = state.timer
	play_shot(is_hit, is_crit)
	const impact = impacts_3d_pool.obtain()
	impact.c = is_hit ? is_crit : void 0
	impact.p = pitch
	impact.r = rad_size
	impact.t = now_ms
	impact.y = yaw
	state.impacts_3d.push(impact)
}
/** @returns {void} */
export function resize_3d() {
	const { height, width } = state.camera
	canvas.height = height
	canvas.width = width
	viewport_height = canvas.height
	viewport_width = canvas.width
	context_3d.viewport(0, 0, width, height)
}
{
	context_3d.blendFunc(
		context_3d.ONE,
		context_3d.ONE_MINUS_SRC_ALPHA
	)
	context_3d.clearColor(0, 0, 0, 0)
	context_3d.disable(context_3d.DEPTH_TEST)
	context_3d.enable(context_3d.BLEND)
}