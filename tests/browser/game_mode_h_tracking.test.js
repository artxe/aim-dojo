import { load_page } from "./helpers/dom.js"
import { fresh_import } from "./helpers/fresh_import.js"
import {
	afterAll,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest"
vi.mock(
	"../../docs/js/sfx.js",
	() => ({
		play_hit: vi.fn(),
		play_miss: vi.fn(),
		play_shot: vi.fn(),
		set_audio_visible: vi.fn()
	})
)
vi.mock(
	"../../docs/js/worker/manager.js",
	() => ({
		post_bg_worker_message: vi.fn(),
		post_writing_worker_message: vi.fn()
	})
)
const CORE_Y = -2.5 * Math.sqrt(3) / 2
const H_TRACKING = "../../../docs/js/game_mode/h_tracking.js"
const LEVEL_KEY = "h_tracking#level"
const RUNS_KEY = "h_tracking#runs"
const native_random = Math.random
/** @type {number[]} */
const random_queue = []
const random_spy = vi.spyOn(Math, "random").mockImplementation(
	() => random_queue.length ? Number(random_queue.shift()) : native_random()
)
/** @type {typeof import("../../docs/js/constants.js").default} */
let constants
/** @type {CanvasRenderingContext2D} */
let context_2d
/** @type {typeof import("../../docs/js/controller/dom.js")} */
let dom
/** @type {WebGL2RenderingContext} */
let gl
/** @type {Required<GameMode>} */
let h
/** @type {typeof import("../../docs/js/sfx.js")} */
let sfx
/** @type {typeof import("../../docs/js/state.js").shoots_pool} */
let shoots_pool
/** @type {typeof import("../../docs/js/state.js").default} */
let state
/**
 * @param {number} bits_per_s
 * @returns {void}
 */
function bank(bits_per_s) {
	begin("lol")
	state.input.mb_left = true
	state.camera.x = 3
	frame(10)
	state.input.mb_left = false
	state.timer.now_ms = state.timer.start_ms + 80 / bits_per_s
	h.update_hud()
	h.dispose()
}
/** @returns {number} */
function base_rad() {
	const { dist, sens } = state.camera
	return sens * constants.target.base_radius * (1 + dist / constants.grid.sky_sphere_radius)
}
/**
 * @param {GameSensName} sens
 * @param {number} [blink_random]
 * @param {number} [start_ms]
 * @returns {void}
 */
function begin(
	sens,
	blink_random = .99,
	start_ms = 1_000
) {
	random_queue.push(blink_random)
	state.camera.height = 1_080
	state.camera.width = 1_920
	state.game.mode = "h_tracking"
	state.game.sens = sens
	state.timer.now_ms = start_ms
	state.timer.prev_ms = start_ms
	state.timer.start_ms = start_ms
	h.init()
}
/**
 * @param {number} dt
 * @returns {void}
 */
function frame(dt) {
	state.timer.prev_ms = state.timer.now_ms
	state.timer.now_ms += dt
	h.on_frame()
}
/** @returns {Record<string, string | null>} */
function hud() {
	return {
		accuracy: dom.accuracy_el.getAttribute("value"),
		crit_rate: dom.crit_rate_el.getAttribute("value"),
		level: dom.level_el.getAttribute("value"),
		run_score: dom.run_score_el.getAttribute("value")
	}
}
/** @returns {Promise<void>} */
async function load_h_tracking() {
	h = (await fresh_import(H_TRACKING)).default
}
/** @returns {{ cr: number, cx: number, cy: number, r: number, x: number, y: number }} */
function read_2d() {
	const arc = vi.spyOn(context_2d, "arc")
	h.render()
	const [ x, y, r ] = arc.mock.calls[1]
	const [ cx, cy, cr ] = arc.mock.calls[3]
	arc.mockRestore()
	return { cr, cx, cy, r, x, y }
}
/** @returns {{ cp: number, cr: number, cy: number, p: number, r: number, y: number }} */
function read_3d() {
	const uniform1f = vi.spyOn(gl, "uniform1f")
	const uniform3f = vi.spyOn(gl, "uniform3f")
	h.render()
	const body = read_disc(uniform1f, uniform3f, 0)
	const core = read_disc(uniform1f, uniform3f, 2)
	uniform1f.mockRestore()
	uniform3f.mockRestore()
	return {
		cp: core.p,
		cr: core.r,
		cy: core.y,
		p: body.p,
		r: body.r,
		y: body.y
	}
}
/**
 * @param {import("vitest").MockInstance<WebGL2RenderingContext["uniform1f"]>} uniform1f
 * @param {import("vitest").MockInstance<WebGL2RenderingContext["uniform3f"]>} uniform3f
 * @param {number} index
 * @returns {{ p: number, r: number, y: number }}
 */
function read_disc(uniform1f, uniform3f, index) {
	const { sky_sphere_radius: d } = constants.grid
	const order = uniform3f.mock.invocationCallOrder[index]
	const [ , x, y, z ] = uniform3f.mock.calls[index]
	const radius_index = uniform1f.mock.invocationCallOrder.findIndex(o => o > order)
	return {
		p: Math.asin(y / d),
		r: Math.atan(
			uniform1f.mock.calls[radius_index][1] / d
		),
		y: Math.atan2(x, -z)
	}
}
/** @returns {string} */
function score() {
	return String(
		dom.run_score_el.getAttribute("value")
	).split(" / ")[0]
}
/** @returns {Record<string, number>} */
function stats() {
	const {
		count_crit,
		count_hit,
		count_shoot,
		sum_crit_ms,
		sum_hit_ms,
		sum_shoot_ms
	} = state.stats
	return {
		count_crit,
		count_hit,
		count_shoot,
		sum_crit_ms,
		sum_hit_ms,
		sum_shoot_ms
	}
}
/**
 * @param {number} now_ms
 * @returns {string}
 */
function track_bits_at(now_ms) {
	state.timer.now_ms = now_ms
	h.check_stats()
	state.timer.start_ms = now_ms - 1_000
	h.update_hud()
	return score()
}
describe(
	"game_mode/h_tracking.js",
	() => {
		beforeAll(
			async () => {
				localStorage.clear()
				load_page()
				constants = (await import("../../docs/js/constants.js")).default
				dom = await import("../../docs/js/controller/dom.js")
				context_2d = (await import("../../docs/js/render/renderer_2d.js")).context_2d
				await import("../../docs/js/render/renderer_3d.js")
				gl = /** @type {WebGL2RenderingContext} */(dom.canvas_3d_el.getContext("webgl2"))/**/
				sfx = await import("../../docs/js/sfx.js")
				const state_module = await import("../../docs/js/state.js")
				shoots_pool = state_module.shoots_pool
				state = state_module.default
			}
		)
		beforeEach(
			async () => {
				localStorage.clear()
				random_queue.length = 0
				vi.clearAllMocks()
				state.input.ads_stage = 0
				state.input.key_a = false
				state.input.key_e = false
				state.input.key_q = false
				state.input.key_r = false
				state.input.key_w = false
				state.input.mb_left = false
				state.input.mb_right = false
				state.lang = "en"
				await load_h_tracking()
			}
		)
		afterAll(
			() => {
				random_spy.mockRestore()
			}
		)
		describe(
			"blink",
			() => {
				it(
					"a 3D blink jumps along yaw by 2 * r * amp and is credited on the first on-target frame",
					() => {
						begin("val", 0)
						const b = base_rad()
						frame(1_990)
						state.input.mb_left = true
						random_queue.push(.99, .99, .99, 0, .99, .99)
						frame(10)
						expect(read_3d().y).toBeCloseTo(6.6 * b, 12)
						expect(state.stats.shoots.at(-1).d).toBe(0)
						state.input.mb_left = false
						frame(490)
						state.input.mb_left = true
						state.camera.yaw = 7.2 * b
						frame(10)
						expect(state.stats.shoots.at(-1).d).toBeCloseTo(2.04, 9)
						expect(random_queue).toHaveLength(0)
					}
				)
				it(
					"a 3D blink that would leave the view lands on the other side",
					() => {
						begin("val", 0)
						const b = base_rad()
						frame(1_990)
						state.input.mb_left = true
						state.camera.yaw = .05 - state.camera.fov * Math.PI / 360
						random_queue.push(.99, .99, .99, 1, .99, .99)
						frame(10)
						expect(read_3d().y).toBeCloseTo(-15.4 * b, 12)
						expect(random_queue).toHaveLength(0)
					}
				)
				it(
					"a blink jumps 2 * r * lerp(blink_dist_min, blink_dist_max, random) along x and its log2(amp + 1) bits are credited once, on the first on-target frame",
					() => {
						begin("lol", 0)
						frame(1_990)
						state.input.mb_left = true
						random_queue.push(.99, .99, .99, 0, .99, .99)
						frame(10)
						expect(read_2d().x).toBeCloseTo(33, 9)
						expect(state.stats.shoots.at(-1).d).toBe(0)
						state.input.mb_left = false
						frame(490)
						state.input.mb_left = true
						state.camera.x = 36
						frame(10)
						expect(state.stats.shoots.at(-1).h).toBe(true)
						expect(state.stats.shoots.at(-1).d).toBeCloseTo(2.04, 9)
						random_queue.push(.99, .99)
						state.camera.x = 39
						frame(10)
						expect(state.stats.shoots.at(-1).d).toBeCloseTo(.04, 9)
						expect(random_queue).toHaveLength(0)
					}
				)
				it(
					"a blink that would leave the view lands on the other side",
					() => {
						begin("lol", 0)
						frame(1_990)
						state.input.mb_left = true
						state.camera.x = 900
						random_queue.push(.99, .99, .99, 1, 0, .99)
						frame(10)
						expect(read_2d().x).toBeCloseTo(83, 9)
						expect(random_queue).toHaveLength(0)
					}
				)
				it(
					"a newer blink replaces a pending one: only its bits are credited",
					() => {
						begin("lol", 0)
						frame(1_990)
						state.input.mb_left = true
						state.camera.y = 500
						random_queue.push(.99, .99, .99, 0, .99, 0)
						frame(10)
						state.input.mb_left = false
						frame(1_990)
						state.input.mb_left = true
						random_queue.push(1, .99, .99)
						frame(10)
						expect(read_2d().x).toBeCloseTo(436, 9)
						expect(state.stats.shoots.at(-1).d).toBe(0)
						state.camera.x = 439
						state.camera.y = 0
						random_queue.push(.99, .99, .99)
						frame(10)
						expect(state.stats.shoots.at(-1).d).toBeCloseTo(.04 + Math.log2(9), 9)
						expect(random_queue).toHaveLength(0)
					}
				)
			}
		)
		describe(
			"dispose",
			() => {
				it(
					"drops a pending blink and the size and speed lerps, so the next run starts from the base target and speed",
					() => {
						begin("lol", 0)
						frame(1_990)
						state.input.mb_left = true
						state.camera.y = 500
						random_queue.push(.99, .99, 0, 0, .99, .99)
						frame(10)
						h.dispose()
						begin("lol", .99, 10_000)
						state.input.mb_left = true
						state.camera.x = 3
						frame(10)
						expect(state.stats.shoots.at(-1).d).toBeCloseTo(.08, 12)
						expect(read_2d().r).toBe(5)
						state.camera.x = 6
						frame(10)
						expect(read_2d().x).toBeCloseTo(6, 9)
						expect(random_queue).toHaveLength(0)
					}
				)
				it(
					"ends the run: no mode, default HUD labels without values, and the run state cleared",
					() => {
						begin("val")
						state.input.mb_left = true
						frame(10)
						h.update_hud()
						state.camera.yaw = .3
						expect(state.impacts_3d.length).toBe(1)
						h.dispose()
						expect(state.game.mode).toBe(null)
						expect(dom.run_score_el.textContent).toBe("Score")
						expect(dom.accuracy_el.textContent).toBe("Accuracy")
						expect(dom.crit_rate_el.textContent).toBe("Critical")
						expect(hud()).toEqual(
							{
								accuracy: null,
								crit_rate: null,
								level: null,
								run_score: null
							}
						)
						expect(state.impacts_3d.length).toBe(0)
						expect(state.impact.rad_size).toBe(0)
						expect(state.stats.shoots.length).toBe(0)
						expect(state.stats.count_shoot).toBe(0)
						expect(state.camera.yaw).toBe(0)
					}
				)
				it(
					"resets the aim guide",
					() => {
						begin("lol")
						state.camera.x = 2_000
						frame(10)
						frame(200)
						h.dispose()
						begin("lol", .99, 10_000)
						const line_to = vi.spyOn(context_2d, "lineTo")
						h.render()
						state.camera.x = 2_000
						frame(10)
						h.render()
						expect(line_to).not.toHaveBeenCalled()
						line_to.mockRestore()
					}
				)
				it(
					"resets the track bits, the unfinished trial and the run average",
					() => {
						begin("lol")
						state.input.mb_left = true
						state.camera.x = 3
						frame(10)
						state.timer.now_ms += 10
						h.update_hud()
						expect(hud().run_score).toBe("4 / 4")
						state.camera.y = 100
						state.timer.prev_ms = state.timer.now_ms
						state.timer.now_ms += 3_990
						h.shoot()
						h.dispose()
						expect(
							localStorage.getItem(LEVEL_KEY)
						).toBe(null)
						begin("lol", .99, 10_000)
						state.camera.x = 3
						frame(10)
						h.update_hud()
						expect(hud().run_score).toBe("8 / 8")
						state.timer.prev_ms = state.timer.now_ms
						state.timer.now_ms += 990
						h.shoot()
						h.update_hud()
						expect(hud().level).toBe("50")
					}
				)
			}
		)
		describe(
			"init",
			() => {
				it(
					"in 2D builds a base-radius target at the origin with a half-radius core tilted core_angle_deg toward the motion",
					() => {
						begin("lol")
						expect(state.camera.dimension).toBe("2d")
						const t = read_2d()
						expect(t.x).toBe(0)
						expect(t.y).toBe(0)
						expect(t.r).toBe(5)
						expect(t.cr).toBe(2.5)
						expect(t.cx).toBeCloseTo(1.25, 12)
						expect(t.cy).toBeCloseTo(CORE_Y, 12)
					}
				)
				it(
					"in 3D derives the view first and builds the target in radians from px_to_rad(base_radius)",
					() => {
						begin("val")
						const b = base_rad()
						expect(state.camera.dimension).toBe("fpp")
						expect(state.impact.rad_size).toBeCloseTo(
							state.camera.sens * constants.impact.px_size,
							12
						)
						const t = read_3d()
						expect(t.y).toBeCloseTo(0, 12)
						expect(t.p).toBeCloseTo(0, 12)
						expect(t.r).toBeCloseTo(b, 12)
						expect(t.cr).toBeCloseTo(b / 2, 12)
						expect(t.cy).toBeCloseTo(b / 4, 12)
						expect(t.cp).toBeCloseTo(b * Math.sqrt(3) / 4, 12)
					}
				)
				it(
					"labels the HUD for bit/s tracking and clears the previous run state",
					() => {
						dom.reset_hud_labels()
						state.camera.x = 40
						state.camera.yaw = .3
						state.stats.count_shoot = 3
						state.stats.sum_hit_ms = 7
						begin("lol")
						expect(dom.run_score_el.textContent).toBe("Bit/s")
						expect(dom.accuracy_el.textContent).toBe("On Target")
						expect(dom.crit_rate_el.textContent).toBe("Critical")
						expect(state.camera.x).toBe(0)
						expect(state.camera.yaw).toBe(0)
						expect(state.stats.count_shoot).toBe(0)
						expect(state.stats.sum_hit_ms).toBe(0)
						expect(random_queue).toHaveLength(0)
					}
				)
			}
		)
		describe(
			"lerps",
			() => {
				it(
					"every move_change_interval_ms speed and core angle lerp over speed_lerp_ms to base_speed * speed_steps[i] * direction * speed_scale, and the flip chance grows by direction_change_step until it flips",
					() => {
						begin("lol")
						state.input.mb_left = true
						random_queue.push(.3, 0)
						frame(500)
						frame(250)
						frame(10)
						expect(read_2d().x).toBeCloseTo(226.5, 9)
						random_queue.push(.3, .99)
						frame(240)
						frame(125)
						const mid = read_2d()
						expect(mid.x).toBeCloseTo(281.25, 9)
						expect(mid.cx).toBeCloseTo(281.25, 9)
						expect(mid.cy).toBeCloseTo(-2.5, 9)
						frame(125)
						frame(10)
						const end = read_2d()
						expect(end.x).toBeCloseTo(268.875, 9)
						expect(end.cx - end.x).toBeCloseTo(-1.25, 9)
						expect(end.cy).toBeCloseTo(CORE_Y, 9)
						expect(random_queue).toHaveLength(0)
					}
				)
				it(
					"every size_change_interval_ms the radius lerps over size_lerp_ms to base_radius * size_steps[i] with the core at calc_core_radius(r, base), while travel per ms stays base_radius * speed",
					() => {
						begin("lol")
						state.input.mb_left = true
						random_queue.push(.99, .99)
						frame(1_990)
						random_queue.push(.99)
						frame(10)
						expect(read_2d().r).toBe(5)
						frame(250)
						const mid = read_2d()
						expect(mid.r).toBeCloseTo(15, 9)
						expect(mid.cr).toBeCloseTo(5, 9)
						expect(mid.cx - mid.x).toBeCloseTo(5, 9)
						expect(mid.cy - mid.y).toBeCloseTo(-5 * Math.sqrt(3), 9)
						random_queue.push(.99, .99)
						frame(250)
						const end = read_2d()
						expect(end.r).toBe(25)
						expect(end.cr).toBeCloseTo(25 / 3, 9)
						frame(10)
						expect(read_2d().x - end.x).toBeCloseTo(3, 9)
						expect(random_queue).toHaveLength(0)
					}
				)
				it(
					"the same size lerp runs in radians in 3D from px_to_rad(base_radius)",
					() => {
						begin("val")
						const b = base_rad()
						state.input.mb_left = true
						random_queue.push(.99, .99)
						frame(1_990)
						random_queue.push(0)
						frame(10)
						frame(250)
						const mid = read_3d()
						expect(mid.r).toBeCloseTo(1.25 * b, 12)
						expect(mid.cr).toBeCloseTo(b / 2, 12)
						random_queue.push(.99, .99)
						frame(250)
						const end = read_3d()
						expect(end.r).toBeCloseTo(1.5 * b, 12)
						expect(end.cr).toBeCloseTo(b / 2, 12)
						frame(10)
						expect(read_3d().y - end.y).toBeCloseTo(.6 * b, 12)
						expect(random_queue).toHaveLength(0)
					}
				)
			}
		)
		describe(
			"load",
			() => {
				it(
					"a stored h_tracking#level is the starting level",
					async () => {
						localStorage.setItem(LEVEL_KEY, "0.25")
						await load_h_tracking()
						begin("lol")
						state.input.mb_left = true
						frame(10)
						expect(read_2d().x).toBeCloseTo(2.1, 9)
						h.update_hud()
						expect(hud().level).toBe("25")
					}
				)
				it(
					"exports the GameMode hooks with check_stats and update_dimension, and no on_move: tracking samples per frame",
					() => {
						expect(Object.keys(h)).toEqual(
							[
								"check_stats",
								"clear_score",
								"dispose",
								"init",
								"on_frame",
								"render",
								"shoot",
								"update_dimension",
								"update_hud"
							]
						)
					}
				)
				it(
					"the menu shows the best of h_tracking#runs, taking the max of a legacy comma-joined ring",
					async () => {
						localStorage.setItem(RUNS_KEY, "3.5,7.257,1")
						await load_h_tracking()
						expect(
							dom.h_tracking_score_el.textContent
						).toBe("7.26")
						expect(
							dom.clear_h_tracking_btn.disabled
						).toBe(false)
					}
				)
				it(
					"the staircase starts at constants.staircase.start_level, which sets the speed to base_speed * lerp(speed_scale_min, speed_scale_max, level)",
					() => {
						begin("lol")
						state.input.mb_left = true
						frame(10)
						expect(read_2d().x).toBeCloseTo(3, 9)
						h.update_hud()
						expect(hud().level).toBe("50")
					}
				)
				it(
					"with nothing stored the menu shows a 0 best and disables the clear button",
					() => {
						expect(
							dom.h_tracking_score_el.textContent
						).toBe("0")
						expect(
							dom.clear_h_tracking_btn.disabled
						).toBe(true)
					}
				)
			}
		)
		describe(
			"on_frame and shoot",
			() => {
				it(
					"without a tracking input nothing moves or records, and the right button alone is not a tracking input",
					() => {
						begin("lol")
						state.input.mb_right = true
						frame(10)
						frame(10)
						expect(read_2d().x).toBe(0)
						expect(state.stats.shoots.length).toBe(0)
						expect(state.stats.count_shoot).toBe(0)
					}
				)
				it.each(
					[
						"key_a",
						"key_e",
						"key_q",
						"key_r",
						"key_w",
						"mb_left"
					]
				)(
					"%s drives tracking: the target travels base_radius * speed px per ms and the frame is one shoot entry from prev_ms to now_ms",
					flag => {
						begin("lol")
						state.input[flag] = true
						frame(10)
						expect(read_2d().x).toBeCloseTo(3, 9)
						expect(state.stats.shoots.length).toBe(1)
						const entry = state.stats.shoots.at()
						expect(entry.s).toBe(1_000)
						expect(entry.e).toBe(1_010)
						expect(entry.h).toBe(true)
						expect(entry.c).toBe(false)
						expect(stats()).toEqual(
							{
								count_crit: 0,
								count_hit: 1,
								count_shoot: 1,
								sum_crit_ms: 0,
								sum_hit_ms: 10,
								sum_shoot_ms: 10
							}
						)
					}
				)
				it(
					"2D crits follow the drawn core, which leans off the body's vertical axis as in 3D",
					() => {
						begin("lol")
						state.input.mb_left = true
						state.camera.x = 4.25 + 2
						state.camera.y = CORE_Y
						frame(10)
						state.camera.x = 6 - 2
						frame(10)
						const inside = state.stats.shoots.at(0)
						const outside = state.stats.shoots.at(1)
						expect(inside.h).toBe(true)
						expect(inside.c).toBe(true)
						expect(outside.h).toBe(true)
						expect(outside.c).toBe(false)
						expect(state.stats.count_crit).toBe(1)
						expect(state.stats.sum_crit_ms).toBe(10)
					}
				)
				it(
					"3D tracking moves the target px_to_rad(base_radius) * speed rad per ms along yaw and crits at the drawn core",
					() => {
						begin("val")
						const b = base_rad()
						state.input.mb_left = true
						state.camera.pitch = b * Math.sqrt(3) / 4
						state.camera.yaw = .85 * b
						frame(10)
						expect(state.impacts_3d.length).toBe(1)
						expect(sfx.play_shot).toHaveBeenCalledWith(true, true)
						state.camera.pitch = -b / 2
						state.camera.yaw = 1.2 * b
						frame(10)
						expect(state.impacts_3d.length).toBe(1)
						state.camera.yaw = 10 * b
						frame(10)
						const t = read_3d()
						expect(t.y).toBeCloseTo(1.8 * b, 12)
						expect(t.cy).toBeCloseTo(2.05 * b, 12)
						expect(t.cp).toBeCloseTo(b * Math.sqrt(3) / 4, 12)
						const core = state.stats.shoots.at(0)
						const body = state.stats.shoots.at(1)
						const miss = state.stats.shoots.at(2)
						expect([ core.h, core.c ]).toEqual([ true, true ])
						expect([ body.h, body.c ]).toEqual([ true, false ])
						expect([ miss.h, miss.c ]).toEqual([ false, false ])
						expect(core.d).toBeCloseTo(.08, 12)
						expect(body.d).toBeCloseTo(.08, 12)
						expect(miss.d).toBe(0)
					}
				)
				it(
					"an on-target frame earns log2(|speed| * move_change_interval_ms / (2 * size_mul) + 1) / move_change_interval_ms bits per ms; a miss earns none",
					() => {
						begin("lol")
						state.input.mb_left = true
						state.camera.x = 3
						state.camera.y = 2
						frame(10)
						state.camera.x = 100
						frame(10)
						const hit = state.stats.shoots.at(0)
						const miss = state.stats.shoots.at(1)
						expect(hit.h).toBe(true)
						expect(hit.d).toBeCloseTo(.08, 12)
						expect(miss.h).toBe(false)
						expect(miss.c).toBe(false)
						expect(miss.d).toBe(0)
						expect(stats()).toEqual(
							{
								count_crit: 0,
								count_hit: 1,
								count_shoot: 2,
								sum_crit_ms: 0,
								sum_hit_ms: 10,
								sum_shoot_ms: 20
							}
						)
					}
				)
				it(
					"on-target time records one hit impact per impact_interval_ms and misses record none",
					() => {
						begin("lol")
						state.input.mb_left = true
						state.camera.y = 100
						frame(10)
						expect(state.impacts.length).toBe(0)
						expect(sfx.play_shot).not.toHaveBeenCalled()
						state.camera.y = 2
						for (let i = 2; i <= 12; i++) {
							state.camera.x = 3 * i
							frame(10)
						}
						expect(state.stats.count_hit).toBe(11)
						expect(state.impacts.length).toBe(2)
						expect(state.impacts.at(0).t).toBe(1_020)
						expect(state.impacts.at(1).t).toBe(1_120)
						expect(sfx.play_shot).toHaveBeenCalledTimes(2)
						expect(sfx.play_shot).toHaveBeenCalledWith(true, false)
					}
				)
			}
		)
		describe(
			"render",
			() => {
				it(
					"2D render clears the canvas, draws the world translated by -camera around the centre and restores the context",
					() => {
						begin("lol")
						state.camera.x = 12
						state.camera.y = -7
						const before = context_2d.getTransform().toString()
						const clear_rect = vi.spyOn(context_2d, "clearRect")
						const translate = vi.spyOn(context_2d, "translate")
						h.render()
						expect(clear_rect).toHaveBeenCalledWith(0, 0, 1_920, 1_080)
						expect(translate.mock.calls).toEqual([ [ 960, 540 ], [ -12, 7 ] ])
						expect(
							context_2d.getTransform().toString()
						).toBe(before)
						clear_rect.mockRestore()
						translate.mockRestore()
					}
				)
				it(
					"3D render prepares the view before drawing the target and still clears the 2D canvas",
					() => {
						begin("val")
						state.camera.proj.fill(0)
						const clear = vi.spyOn(gl, "clear")
						const clear_rect = vi.spyOn(context_2d, "clearRect")
						const draw = vi.spyOn(gl, "drawArrays")
						h.render()
						expect(clear).toHaveBeenCalledWith(gl.COLOR_BUFFER_BIT)
						expect(
							clear.mock.invocationCallOrder[0]
						).toBeLessThan(
							draw.mock.invocationCallOrder[0]
						)
						expect(state.camera.proj[0]).not.toBe(0)
						expect(draw).toHaveBeenCalledTimes(2)
						expect(clear_rect).toHaveBeenCalledWith(0, 0, 1_920, 1_080)
						clear.mockRestore()
						clear_rect.mockRestore()
						draw.mockRestore()
					}
				)
				it(
					"the 2D aim guide is drawn to the drawn core once the target has been off screen for guide.delay_ms and hidden as soon as it is back",
					() => {
						begin("lol")
						const line_to = vi.spyOn(context_2d, "lineTo")
						state.camera.x = 2_000
						frame(10)
						frame(199)
						h.render()
						expect(line_to).not.toHaveBeenCalled()
						frame(1)
						h.render()
						expect(line_to).toHaveBeenCalledTimes(1)
						expect(line_to.mock.calls[0][0]).toBeCloseTo(1.25, 12)
						expect(line_to.mock.calls[0][1]).toBeCloseTo(CORE_Y, 12)
						line_to.mockClear()
						state.camera.x = 0
						frame(10)
						h.render()
						expect(line_to).not.toHaveBeenCalled()
						state.camera.x = 2_000
						frame(10)
						frame(199)
						h.render()
						expect(line_to).not.toHaveBeenCalled()
						line_to.mockRestore()
					}
				)
				it(
					"the 3D aim guide is uploaded and drawn only while shown",
					() => {
						begin("val")
						const upload = vi.spyOn(gl, "bufferSubData")
						state.camera.yaw = 2
						frame(10)
						h.render()
						expect(upload).not.toHaveBeenCalled()
						frame(200)
						h.render()
						expect(upload).toHaveBeenCalledTimes(1)
						state.camera.yaw = 0
						frame(10)
						h.render()
						expect(upload).toHaveBeenCalledTimes(1)
						upload.mockRestore()
					}
				)
			}
		)
		describe(
			"staircase",
			() => {
				it(
					"a trial below band_min lowers the level one step",
					() => {
						begin("lol")
						state.camera.y = 100
						state.timer.now_ms += 5_000
						h.shoot()
						h.update_hud()
						expect(hud().level).toBe("42")
						h.dispose()
						expect(
							localStorage.getItem(LEVEL_KEY)
						).toBe("0.42")
					}
				)
				it(
					"a trial inside the band keeps the level but still persists it",
					() => {
						begin("lol")
						state.timer.now_ms += 4_000
						h.shoot()
						state.camera.y = 100
						state.timer.prev_ms = state.timer.now_ms
						state.timer.now_ms += 1_000
						h.shoot()
						h.update_hud()
						expect(hud().level).toBe("50")
						h.dispose()
						expect(
							localStorage.getItem(LEVEL_KEY)
						).toBe("0.5")
					}
				)
				it(
					"a trial_ms of shoot time fully on target raises the level one step, shown in the HUD and persisted under h_tracking#level on dispose",
					async () => {
						begin("lol")
						state.timer.now_ms += 5_000
						h.shoot()
						h.update_hud()
						expect(hud().level).toBe("58")
						h.dispose()
						expect(
							localStorage.getItem(LEVEL_KEY)
						).toBe("0.58")
						await load_h_tracking()
						begin("lol")
						state.input.mb_left = true
						frame(10)
						expect(read_2d().x).toBeCloseTo(3.288, 9)
					}
				)
				it(
					"an unfinished trial feeds nothing and leaves h_tracking#level unwritten",
					() => {
						begin("lol")
						state.timer.now_ms += 4_999
						h.shoot()
						h.update_hud()
						expect(hud().level).toBe("50")
						h.dispose()
						expect(
							localStorage.getItem(LEVEL_KEY)
						).toBe(null)
					}
				)
				it(
					"the level drives speed only: the next move change scales base_speed by speed_scale while sizes stay base_radius * size_steps[i]",
					() => {
						begin("lol")
						state.timer.now_ms += 5_000
						h.shoot()
						state.input.mb_left = true
						random_queue.push(.99, .99, .99, 0, .99, .99)
						frame(10)
						frame(500)
						const grown = read_2d()
						expect(grown.r).toBe(25)
						random_queue.push(.99, .99)
						frame(10)
						expect(read_2d().x - grown.x).toBeCloseTo(3.288, 9)
						expect(random_queue).toHaveLength(0)
					}
				)
			}
		)
		describe(
			"stats and HUD",
			() => {
				it(
					"check_stats drops entries that ended by now - window_ms, clips the straddling one in place and recycles only the dropped ones",
					() => {
						const { shoots } = state.stats
						begin("lol")
						state.input.mb_left = true
						state.camera.x = 31.25
						state.camera.y = CORE_Y
						frame(100)
						state.camera.x = 60
						state.camera.y = 3
						frame(100)
						state.camera.y = 100
						frame(100)
						state.camera.x = 121.25
						state.camera.y = CORE_Y
						frame(100)
						const [ e1, e2, e3, e4 ] = [ 0, 1, 2, 3 ].map(i => shoots.at(i))
						expect(
							[ e1.h, e1.c, e2.h, e2.c, e3.h, e4.h, e4.c ]
						).toEqual(
							[ true, true, true, false, false, true, true ]
						)
						expect(stats()).toEqual(
							{
								count_crit: 2,
								count_hit: 3,
								count_shoot: 4,
								sum_crit_ms: 200,
								sum_hit_ms: 300,
								sum_shoot_ms: 400
							}
						)
						expect(track_bits_at(1_400)).toBe("2.4")
						expect(shoots.length).toBe(4)
						expect(e1.s).toBe(1_000)
						expect(track_bits_at(31_150)).toBe("1.2")
						expect(shoots.length).toBe(3)
						expect(shoots.at()).toBe(e2)
						expect(e2.s).toBe(1_150)
						expect(e2.d).toBeCloseTo(.4, 12)
						expect(stats()).toEqual(
							{
								count_crit: 1,
								count_hit: 2,
								count_shoot: 3,
								sum_crit_ms: 100,
								sum_hit_ms: 150,
								sum_shoot_ms: 250
							}
						)
						expect(track_bits_at(31_250)).toBe("0.8")
						expect(shoots.at()).toBe(e3)
						expect(e3.s).toBe(1_250)
						expect(e3.d).toBe(0)
						expect(stats()).toEqual(
							{
								count_crit: 1,
								count_hit: 1,
								count_shoot: 2,
								sum_crit_ms: 100,
								sum_hit_ms: 100,
								sum_shoot_ms: 150
							}
						)
						expect(track_bits_at(31_350)).toBe("0.4")
						expect(shoots.at()).toBe(e4)
						expect(e4.s).toBe(1_350)
						expect(e4.d).toBeCloseTo(.4, 12)
						expect(stats()).toEqual(
							{
								count_crit: 1,
								count_hit: 1,
								count_shoot: 1,
								sum_crit_ms: 50,
								sum_hit_ms: 50,
								sum_shoot_ms: 50
							}
						)
						expect(track_bits_at(31_400)).toBe("0")
						h.check_stats()
						expect(shoots.length).toBe(0)
						expect(stats()).toEqual(
							{
								count_crit: 0,
								count_hit: 0,
								count_shoot: 0,
								sum_crit_ms: 0,
								sum_hit_ms: 0,
								sum_shoot_ms: 0
							}
						)
						expect(shoots_pool.obtain()).toBe(e4)
						expect(shoots_pool.obtain()).toBe(e3)
						expect(shoots_pool.obtain()).toBe(e2)
						expect(shoots_pool.obtain()).toBe(e1)
						expect([ e1, e2, e3, e4 ]).not.toContain(shoots_pool.obtain())
					}
				)
				it(
					"clear_score zeroes the best, removes h_tracking#runs, disables the clear button and toasts in the player's language",
					async () => {
						localStorage.setItem(RUNS_KEY, "7")
						await load_h_tracking()
						expect(
							dom.h_tracking_score_el.textContent
						).toBe("7")
						h.clear_score()
						expect(localStorage.getItem(RUNS_KEY)).toBe(null)
						expect(
							dom.h_tracking_score_el.textContent
						).toBe("0")
						expect(
							dom.clear_h_tracking_btn.disabled
						).toBe(true)
						expect(
							dom.toast_el.firstElementChild?.textContent
						).toBe(
							"H-Tracking score has been reset!"
						)
						state.lang = "ko"
						h.clear_score()
						expect(
							dom.toast_el.firstElementChild?.textContent
						).toBe(
							"H-Tracking 점수를 초기화했습니다!"
						)
						bank(2)
						expect(
							Number(localStorage.getItem(RUNS_KEY))
						).toBeCloseTo(2, 9)
					}
				)
				it(
					"counts a frame once when the tracking input fires shoot() again within it",
					() => {
						begin("lol")
						state.input.mb_left = true
						state.camera.x = 3
						frame(10)
						h.shoot()
						h.shoot()
						expect(state.stats.count_shoot).toBe(1)
						expect(state.stats.sum_shoot_ms).toBe(10)
						expect(state.stats.shoots).toHaveLength(1)
						frame(10)
						expect(state.stats.count_shoot).toBe(2)
						expect(state.stats.sum_shoot_ms).toBe(20)
					}
				)
				it(
					"the bit/s denominator is min(now_ms - start_ms, window_ms) / 1000",
					() => {
						begin("lol")
						state.input.mb_left = true
						state.camera.x = 300
						random_queue.push(.99, .99)
						frame(1_000)
						expect(state.stats.shoots.at(-1).d).toBeCloseTo(8, 9)
						h.update_hud()
						expect(score()).toBe("8")
						state.timer.start_ms = state.timer.now_ms - 30_000
						h.update_hud()
						expect(score()).toBe("0.27")
						state.timer.start_ms = state.timer.now_ms - 60_000
						h.update_hud()
						expect(score()).toBe("0.27")
					}
				)
				it(
					"the h_tracking#runs best is an all-time max, and a run with nothing banked leaves it alone",
					() => {
						bank(4)
						expect(
							Number(localStorage.getItem(RUNS_KEY))
						).toBeCloseTo(4, 9)
						bank(2)
						expect(
							Number(localStorage.getItem(RUNS_KEY))
						).toBeCloseTo(4, 9)
						expect(
							dom.h_tracking_score_el.textContent
						).toBe("4")
						bank(6)
						expect(
							Number(localStorage.getItem(RUNS_KEY))
						).toBeCloseTo(6, 9)
						localStorage.setItem(RUNS_KEY, "untouched")
						begin("lol")
						h.dispose()
						expect(localStorage.getItem(RUNS_KEY)).toBe("untouched")
						expect(
							dom.h_tracking_score_el.textContent
						).toBe("6")
					}
				)
				it(
					"update_hud banks only non-zero scores into the run average, and dispose pushes that average to the h_tracking#runs best",
					() => {
						begin("lol")
						state.input.mb_left = true
						state.camera.x = 3
						frame(10)
						h.update_hud()
						expect(hud().run_score).toBe("8 / 8")
						state.timer.now_ms += 30
						h.update_hud()
						expect(hud().run_score).toBe("2 / 5")
						state.timer.now_ms += 30_000
						h.check_stats()
						h.update_hud()
						expect(hud().run_score).toBe("0 / 5")
						h.dispose()
						expect(
							Number(localStorage.getItem(RUNS_KEY))
						).toBeCloseTo(5, 9)
						expect(
							dom.h_tracking_score_el.textContent
						).toBe("5")
						expect(
							dom.clear_h_tracking_btn.disabled
						).toBe(false)
					}
				)
				it(
					"update_hud shows track_bits / elapsed_s, the on-target and crit shares of time and the level, and schedules the next update",
					() => {
						begin("lol")
						h.update_hud()
						expect(hud()).toEqual(
							{
								accuracy: "0%",
								crit_rate: "0%",
								level: "50",
								run_score: "0 / 0"
							}
						)
						expect(state.hud.next_update_ms).toBe(1_050)
						state.input.mb_left = true
						state.camera.x = 4.25
						state.camera.y = CORE_Y
						frame(10)
						state.camera.x = 6
						state.camera.y = 3
						frame(10)
						state.camera.y = 100
						frame(10)
						state.camera.x = 13.25
						state.camera.y = CORE_Y
						frame(10)
						h.update_hud()
						expect(hud()).toEqual(
							{
								accuracy: "75%",
								crit_rate: "66.67%",
								level: "50",
								run_score: "6 / 6"
							}
						)
						expect(state.hud.next_update_ms).toBe(1_090)
						state.timer.now_ms += 40
						h.update_hud()
						expect(hud().run_score).toBe("3 / 4.5")
					}
				)
			}
		)
		describe(
			"update_dimension",
			() => {
				it(
					"RMB in an ADS game re-derives the zoomed 3D view without converting the target, and release restores hipfire",
					() => {
						begin("val")
						const b = base_rad()
						const hip_fov = state.camera.fov
						const hip_sens = state.camera.sens
						state.input.mb_left = true
						frame(10)
						state.input.mb_right = true
						state.input.ads_stage = 1
						h.update_dimension()
						h.update_dimension()
						expect(state.camera.dimension).toBe("fpp")
						expect(state.camera.view_fov).toBe(constants.fov.val.ads.operator)
						expect(state.camera.fov).toBeLessThan(hip_fov)
						expect(state.camera.sens).toBeLessThan(hip_sens)
						const zoomed = read_3d()
						expect(zoomed.y).toBeCloseTo(.6 * b, 12)
						expect(zoomed.r).toBeCloseTo(b, 12)
						state.input.ads_stage = 0
						state.input.mb_right = false
						h.update_dimension()
						expect(state.camera.fov).toBeCloseTo(hip_fov, 9)
						expect(state.camera.sens).toBeCloseTo(hip_sens, 12)
						expect(read_3d().y).toBeCloseTo(.6 * b, 12)
					}
				)
				it(
					"a view change from 2d to 3d converts the camera, the target and an in-flight size lerp once; repeating it converts nothing",
					() => {
						begin("lol")
						frame(1_990)
						state.input.mb_left = true
						random_queue.push(.99, .99, .99)
						frame(10)
						frame(250)
						state.camera.x = 50
						state.game.sens = "val"
						h.update_dimension()
						const s = state.camera.sens
						expect(state.camera.dimension).toBe("fpp")
						expect(state.camera.x).toBe(0)
						expect(state.camera.y).toBe(0)
						expect(state.camera.yaw).toBeCloseTo(50 * s, 12)
						expect(state.camera.pitch).toBeCloseTo(0, 12)
						const t = read_3d()
						expect(t.y).toBeCloseTo(78 * s, 12)
						expect(t.p).toBeCloseTo(0, 12)
						expect(t.r).toBeCloseTo(15 * s, 12)
						expect(t.cr).toBeCloseTo(5 * s, 12)
						expect(t.cy).toBeCloseTo(78 * s, 12)
						expect(t.cp).toBeCloseTo(10 * s, 12)
						frame(10)
						h.update_dimension()
						expect(state.camera.yaw).toBeCloseTo(50 * s, 12)
						const moved = read_3d()
						expect(moved.y).toBeCloseTo(81 * s, 12)
						expect(moved.r).toBeCloseTo(15.4 * s, 12)
						random_queue.push(.99, .99)
						frame(240)
						expect(read_3d().r).toBeCloseTo(25 * s, 12)
						expect(random_queue).toHaveLength(0)
					}
				)
				it(
					"a view change from 3d to 2d converts the camera, the target and an in-flight size lerp once; repeating it converts nothing",
					() => {
						begin("val")
						const b = base_rad()
						frame(1_990)
						state.input.mb_left = true
						random_queue.push(.99, .99, .99)
						frame(10)
						frame(250)
						state.camera.pitch = .05
						state.camera.yaw = .1
						state.game.sens = "lol"
						h.update_dimension()
						const s = state.camera.sens
						expect(state.camera.dimension).toBe("2d")
						expect(state.camera.x).toBeCloseTo(.1 / s, 6)
						expect(state.camera.y).toBeCloseTo(-.05 / s, 6)
						expect(state.camera.pitch).toBe(0)
						expect(state.camera.yaw).toBe(0)
						const t = read_2d()
						expect(t.x).toBeCloseTo(15.6 * b / s, 6)
						expect(t.y).toBeCloseTo(0, 9)
						expect(t.r).toBeCloseTo(3 * b / s, 6)
						expect(t.cr).toBeCloseTo(b / s, 6)
						expect(t.cx).toBeCloseTo(t.x, 9)
						expect(t.cy).toBeCloseTo(-2 * b / s, 6)
						h.update_dimension()
						expect(read_2d()).toEqual(t)
						expect(state.camera.x).toBeCloseTo(.1 / s, 6)
						random_queue.push(.99, .99)
						frame(250)
						expect(read_2d().r).toBeCloseTo(5 * b / s, 6)
						expect(random_queue).toHaveLength(0)
					}
				)
				it(
					"the camera converts when either coordinate is off-centre and is left alone when centred",
					() => {
						begin("lol")
						state.camera.y = 30
						state.game.sens = "val"
						h.update_dimension()
						expect(state.camera.pitch).toBeCloseTo(-30 * state.camera.sens, 12)
						expect(state.camera.yaw).toBe(0)
						begin("lol")
						state.game.sens = "val"
						h.update_dimension()
						expect(state.camera.pitch).toBe(0)
						expect(state.camera.yaw).toBe(0)
						begin("val")
						state.camera.yaw = .2
						state.game.sens = "lol"
						h.update_dimension()
						expect(state.camera.x).toBeCloseTo(.2 / state.camera.sens, 6)
						expect(state.camera.y).toBeCloseTo(0, 9)
						expect(state.camera.yaw).toBe(0)
						begin("val")
						state.game.sens = "lol"
						h.update_dimension()
						expect(state.camera.x).toBe(0)
						expect(state.camera.y).toBe(0)
					}
				)
				it(
					"with a 2d view it returns before converting anything, however often it runs",
					() => {
						begin("lol")
						state.input.mb_left = true
						frame(10)
						state.camera.x = 7
						state.camera.y = -4
						state.input.ads_stage = 1
						h.update_dimension()
						h.update_dimension()
						expect(state.camera.dimension).toBe("2d")
						expect(
							[
								state.camera.x,
								state.camera.y,
								state.camera.yaw,
								state.camera.pitch
							]
						).toEqual([ 7, -4, 0, 0 ])
						expect(read_2d().x).toBeCloseTo(3, 9)
					}
				)
			}
		)
	}
)