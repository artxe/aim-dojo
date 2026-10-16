import { load_page } from "./helpers/dom.js"
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest"
const {
	post_bg_worker_message,
	post_writing_worker_message
} = vi.hoisted(
	() => ({
		post_bg_worker_message: vi.fn(),
		post_writing_worker_message: vi.fn()
	})
)
vi.mock(
	"../../docs/js/worker/manager.js",
	() => ({
		post_bg_worker_message,
		post_writing_worker_message
	})
)
const SENS = .001
const SPAWN_DIST = 162.5
const SWEEP = [
	...Array.from({ length: 64 }, (_, k) => k / 64),
	.9999
]
const TAU = Math.PI * 2
const random = vi.spyOn(Math, "random")
let instance = 0
/**
 * @param {Awaited<ReturnType<typeof setup>>} ctx
 * @param {number} now_ms
 * @returns {void}
 */
function at(ctx, now_ms) {
	ctx.state.timer.prev_ms = ctx.state.timer.now_ms
	ctx.state.timer.now_ms = now_ms
}
/**
 * @param {number[]} angles
 * @param {number} width
 * @param {number} center
 * @returns {void}
 */
function expect_wedge(angles, width, center) {
	const step = (TAU - width) / 64
	const wedge = find_wedge(angles)
	expect(wedge.width).toBeGreaterThanOrEqual(width - 1e-9)
	expect(wedge.width).toBeLessThanOrEqual(width + step + 1e-9)
	expect(
		Math.abs(wedge.center - center)
	).toBeLessThanOrEqual(step / 2 + 1e-9)
}
/**
 * @param {number} we_factor
 * @param {number} dist
 * @param {number[]} errors
 * @param {number[]} times_ms
 * @returns {number}
 */
function expected_throughput(we_factor, dist, errors, times_ms) {
	const n = errors.length
	let mean = 0
	let mt_ms = 0
	for (let i = 0; i < n; i++) {
		mean += errors[i] / n
		mt_ms += times_ms[i] / n
	}
	let variance = 0
	for (const e of errors) {
		variance += (e - mean) ** 2 / n
	}
	return Math.log2(
		dist / (we_factor * Math.sqrt(variance)) + 1
	) / (mt_ms / 1_000)
}
/**
 * @param {number[]} angles
 * @returns {{ center: number, width: number }}
 */
function find_wedge(angles) {
	const sorted = angles
		.map(a => (a % TAU + TAU) % TAU)
		.sort((a, b) => a - b)
	let start = sorted[sorted.length - 1]
	let width = sorted[0] + TAU - start
	for (let i = 1; i < sorted.length; i++) {
		const gap = sorted[i] - sorted[i - 1]
		if (gap > width) {
			start = sorted[i - 1]
			width = gap
		}
	}
	return {
		center: (start + width / 2) % TAU,
		width
	}
}
/**
 * @param {number} value
 * @returns {string}
 */
function fixed2(value) {
	return String(Number(value.toFixed(2)))
}
/**
 * @param {Awaited<ReturnType<typeof setup>>} ctx
 * @param {number} now_ms
 * @param {number} error
 * @returns {Target}
 */
function hit_2d(ctx, now_ms, error) {
	const { precision, state } = ctx
	at(ctx, now_ms)
	precision.on_frame()
	const t = read_target(ctx)
	const dx = t.cx - state.camera.x
	const dy = t.cy - state.camera.y
	const d = Math.hypot(dx, dy)
	state.camera.x = t.cx + dx / d * error
	state.camera.y = t.cy + dy / d * error
	precision.shoot()
	return t
}
/**
 * @param {Awaited<ReturnType<typeof setup>>} ctx
 * @returns {Target}
 */
function read_target(ctx) {
	const arc = vi.spyOn(ctx.context_2d, "arc")
	ctx.precision.render()
	const [ x, y, r ] = arc.mock.calls[1]
	const [ cx, cy, cr ] = arc.mock.calls[3]
	arc.mockRestore()
	return { cr, cx, cy, r, x, y }
}
/**
 * @param {GameSensName} sens
 */
async function setup(sens) {
	const { default: constants } = await import("../../docs/js/constants.js")
	const dom = await import("../../docs/js/controller/dom.js")
	const { context_2d } = await import("../../docs/js/render/renderer_2d.js")
	const { default: state } = await import("../../docs/js/state.js")
	instance++
	/** @type {{ default: GameMode }} */
	const { default: precision } = await import(
		/* @vite-ignore */`../../docs/js/game_mode/precision.js?instance=${instance}`
	)
	state.camera.height = 1_080
	state.camera.width = 1_920
	state.game.mode = "precision"
	state.game.sens = sens
	state.input.ads_stage = 0
	state.lang = "en"
	state.timer.now_ms = 1_000
	state.timer.prev_ms = 1_000
	state.timer.start_ms = 1_000
	precision.init()
	state.camera.sens = SENS
	return {
		constants,
		context_2d,
		dom,
		precision,
		state
	}
}
/**
 * @param {number} origin
 * @returns {Promise<{ dirs: number[], range: number }>}
 */
async function sweep_spawns(origin) {
	const ctx = await setup("lol")
	const { constants, precision, state } = ctx
	const range = constants.mode.precision.pitch_limit * Math.PI / 180 / SENS
	/** @type {number[]} */
	const dirs = []
	for (const u of SWEEP) {
		random.mockReturnValueOnce(.5)
			.mockReturnValueOnce(u)
		state.camera.x = 0
		state.camera.y = origin
		precision.on_frame()
		const t = read_target(ctx)
		expect(
			Math.hypot(t.cx, t.cy - origin)
		).toBeCloseTo(SPAWN_DIST, 6)
		expect(Math.abs(t.cy)).toBeLessThanOrEqual(range + 1e-6)
		dirs.push(
			Math.atan2(t.cy - origin, t.cx)
		)
		state.camera.x = t.cx
		state.camera.y = t.cy
		precision.shoot()
	}
	return { dirs, range }
}
describe(
	"game_mode/precision.js",
	() => {
		beforeAll(
			() => {
				load_page()
			}
		)
		beforeEach(
			() => {
				localStorage.clear()
				random.mockReturnValue(.5)
			}
		)
		afterEach(
			() => {
				random.mockReset()
			}
		)
		afterAll(
			() => {
				random.mockRestore()
			}
		)
		it(
			"3D trials measure yaw and pitch toward the core of the live target",
			async () => {
				const ctx = await setup("val")
				const { constants, dom, precision, state } = ctx
				const dist = 32.5 * 5 * SENS
				const errors = [ SENS, -SENS, SENS, -SENS, SENS ]
				const times = [ 300, 500, 300, 500, 300 ]
				precision.shoot()
				let now = 1_000
				for (let i = 0; i < errors.length; i++) {
					now += times[i]
					at(ctx, now)
					precision.on_frame()
					state.camera.yaw += -dist - errors[i]
					precision.shoot()
				}
				expect(state.stats.count_crit).toBe(5)
				precision.update_hud()
				const score = expected_throughput(
					constants.fitts.we_factor,
					dist,
					errors,
					times
				)
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe(
					`${fixed2(score)} / ${fixed2(score)}`
				)
			}
		)
		it(
			"Fitts: each click on the live target is one trial toward its core and TP is ID_e over MT with W_e = we_factor x SD of the signed axial errors",
			async () => {
				const ctx = await setup("lol")
				const { constants, dom, precision } = ctx
				const { trial_min, we_factor } = constants.fitts
				const errors = [ 1, -1, 1, -1, 1, -1 ]
				const times = [ 300, 500, 300, 500, 300, 500 ]
				precision.shoot()
				let now = 1_000
				/** @type {number[]} */
				const scores = []
				for (let i = 0; i < errors.length; i++) {
					now += times[i]
					hit_2d(ctx, now, errors[i])
					precision.update_hud()
					const n = i + 1
					if (n < trial_min) {
						expect(
							dom.run_score_el.getAttribute("value")
						).toBe("- / -")
					} else {
						scores.push(
							expected_throughput(
								we_factor,
								SPAWN_DIST,
								errors.slice(0, n),
								times.slice(0, n)
							)
						)
						const average = scores.reduce((a, b) => a + b) / scores.length
						expect(
							dom.run_score_el.getAttribute("value")
						).toBe(
							`${fixed2(scores[scores.length - 1])} / ${fixed2(average)}`
						)
					}
				}
				expect(
					dom.accuracy_el.getAttribute("value")
				).toBe(`${fixed2(6 / 7 * 100)}%`)
				expect(
					dom.crit_rate_el.getAttribute("value")
				).toBe("100%")
				const average = (scores[0] + scores[1]) / 2
				precision.dispose()
				expect(
					Number(
						localStorage.getItem("precision#runs")
					)
				).toBeCloseTo(average, 9)
				expect(
					dom.precision_score_el.textContent
				).toBe(fixed2(average))
				expect(
					dom.clear_precision_btn.disabled
				).toBe(false)
			}
		)
		it(
			"a 2D target converted to 3D keeps its core where the crosshair angle points",
			async () => {
				const ctx = await setup("lol")
				const { precision, state } = ctx
				precision.on_frame()
				const t = read_target(ctx)
				state.game.sens = "val"
				precision.update_dimension?.()
				const { sens } = state.camera
				expect(state.camera.yaw).toBe(0)
				expect(state.camera.pitch).toBe(0)
				state.camera.yaw = t.cx * sens
				state.camera.pitch = -t.cy * sens
				precision.shoot()
				expect(state.stats.count_crit).toBe(1)
			}
		)
		it(
			"a 2D target spawns near..far base radii from the crosshair, sized by the staircase alone, its one-arg core half the body tangent inside the top",
			async () => {
				const ctx = await setup("lol")
				const { constants, precision, state } = ctx
				const { base_radius } = constants.target
				const { far_dist_mul, near_dist_mul } = constants.mode.precision
				for (const u of [ 0, .5, .99 ]) {
					random.mockReturnValue(u)
					const { x, y } = state.camera
					precision.on_frame()
					const t = read_target(ctx)
					expect(Math.hypot(t.cx - x, t.cy - y)).toBeCloseTo(
						(near_dist_mul + u * (far_dist_mul - near_dist_mul)) * base_radius,
						6
					)
					expect(t.r).toBeCloseTo(base_radius * .85, 9)
					expect(t.cr).toBeCloseTo(t.r / 2, 9)
					expect(t.x).toBe(t.cx)
					expect(t.y - t.cy).toBeCloseTo(t.r - t.cr, 9)
					state.camera.x = t.cx
					state.camera.y = t.cy
					precision.shoot()
				}
			}
		)
		it(
			"a 3D target spawns at the same base-radius multiples in radians around the crosshair, core on top of the body",
			async () => {
				const ctx = await setup("val")
				const { precision, state } = ctx
				const base = 5 * SENS
				const r = base * .85
				const core_yaw = -32.5 * base
				const body_pitch = -(r - r / 2)
				precision.on_frame()
				state.camera.yaw = core_yaw
				state.camera.pitch = body_pitch - r * 1.05
				precision.shoot()
				expect(state.stats.count_hit).toBe(0)
				state.camera.pitch = body_pitch - r * .95
				precision.shoot()
				expect(state.stats.count_hit).toBe(1)
				expect(state.stats.count_crit).toBe(0)
				precision.on_frame()
				state.camera.yaw = core_yaw * 2
				precision.shoot()
				expect(state.stats.count_hit).toBe(2)
				expect(state.stats.count_crit).toBe(1)
			}
		)
		it(
			"a click with no live target becomes the origin and start time of the next trial",
			async () => {
				const ctx = await setup("lol")
				const { constants, dom, precision, state } = ctx
				const errors = [ 1, -1, 1, -1, 1 ]
				precision.shoot()
				let now = 1_000
				for (const error of errors) {
					hit_2d(ctx, now + 300, error)
					state.camera.y -= 50
					now += 1_300
					at(ctx, now)
					precision.shoot()
				}
				precision.update_hud()
				const score = expected_throughput(
					constants.fitts.we_factor,
					SPAWN_DIST,
					errors,
					[ 300, 300, 300, 300, 300 ]
				)
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe(
					`${fixed2(score)} / ${fixed2(score)}`
				)
			}
		)
		it(
			"a spawn distance that reaches a pitch limit only through rounding still spawns inside it",
			async () => {
				const ctx = await setup("lol")
				const { constants, precision, state } = ctx
				const {
					far_dist_mul,
					near_dist_mul,
					pitch_limit
				} = constants.mode.precision
				const range = pitch_limit * Math.PI / 180 / SENS
				const dist = (near_dist_mul + .501 * (far_dist_mul - near_dist_mul)) * constants.target.base_radius
				for (const origin of [
					360.823_775_598_298_8,
					-360.823_775_598_298_8
				]) {
					expect(
						Math.abs(origin) + dist >= range
					).toBe(true)
					expect(
						(range - Math.abs(origin)) / dist
					).toBeGreaterThan(1)
					random.mockReturnValueOnce(.501)
						.mockReturnValueOnce(.5)
					state.camera.x = 0
					state.camera.y = origin
					precision.on_frame()
					const t = read_target(ctx)
					expect(
						Math.hypot(t.cx, t.cy - origin)
					).toBeCloseTo(dist, 6)
					expect(Math.abs(t.cy)).toBeLessThanOrEqual(range + 1e-6)
					state.camera.x = t.cx
					state.camera.y = t.cy
					precision.shoot()
				}
			}
		)
		it(
			"below trial_min trials the HUD shows - and dispose banks nothing",
			async () => {
				const ctx = await setup("lol")
				const { dom, precision } = ctx
				precision.shoot()
				for (let i = 1; i <= 4; i++) {
					hit_2d(
						ctx,
						1_000 + i * 400,
						i % 2 ? 1 : -1
					)
				}
				precision.update_hud()
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe("- / -")
				precision.dispose()
				expect(
					localStorage.getItem("precision#runs")
				).toBeNull()
				expect(
					dom.precision_score_el.textContent
				).toBe("0")
				expect(
					dom.clear_precision_btn.disabled
				).toBe(true)
			}
		)
		it(
			"check_stats drops shoots and Fitts trials older than window_ms, decrementing their counts and recycling the entries",
			async () => {
				const ctx = await setup("lol")
				const { constants, dom, precision, state } = ctx
				const { window_ms } = constants.hud
				precision.shoot()
				const errors = [ 1, -1, 1, -1, 1, -1 ]
				for (let i = 0; i < errors.length; i++) {
					hit_2d(ctx, 1_300 + i * 400, errors[i])
				}
				precision.on_frame()
				const t = read_target(ctx)
				at(ctx, 3_700)
				state.camera.x = t.x
				state.camera.y = t.y + 3
				precision.shoot()
				expect(
					[
						state.stats.count_shoot,
						state.stats.count_hit,
						state.stats.count_crit
					]
				).toEqual([ 8, 7, 6 ])
				precision.update_hud()
				const score = String(
					dom.run_score_el.getAttribute("value")
				).split(" / ")[0]
				expect(Number(score)).toBeGreaterThan(0)
				const newest = state.stats.shoots.at(-1)
				at(ctx, 1_000 + window_ms)
				precision.check_stats?.()
				expect(
					[
						state.stats.count_shoot,
						state.stats.count_hit,
						state.stats.count_crit
					]
				).toEqual([ 7, 7, 6 ])
				at(ctx, 1_300 + window_ms)
				precision.check_stats?.()
				expect(
					[
						state.stats.count_shoot,
						state.stats.count_hit,
						state.stats.count_crit
					]
				).toEqual([ 6, 6, 5 ])
				at(ctx, 2_900 + window_ms)
				precision.check_stats?.()
				expect(
					[
						state.stats.count_shoot,
						state.stats.count_hit,
						state.stats.count_crit
					]
				).toEqual([ 2, 2, 1 ])
				precision.update_hud()
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe(`- / ${score}`)
				at(ctx, 3_700 + window_ms)
				precision.check_stats?.()
				expect(
					[
						state.stats.count_shoot,
						state.stats.count_hit,
						state.stats.count_crit
					]
				).toEqual([ 0, 0, 0 ])
				expect(state.stats.shoots.length).toBe(0)
				precision.shoot()
				expect(state.stats.shoots.at()).toBe(newest)
			}
		)
		it(
			"clear_score resets the record, removes precision#runs and confirms with a toast in the player's language",
			async () => {
				localStorage.setItem("precision#runs", "4.5")
				const { dom, precision, state } = await setup("lol")
				expect(
					dom.precision_score_el.textContent
				).toBe("4.5")
				precision.clear_score()
				expect(
					localStorage.getItem("precision#runs")
				).toBeNull()
				expect(
					dom.precision_score_el.textContent
				).toBe("0")
				expect(
					dom.clear_precision_btn.disabled
				).toBe(true)
				expect(
					dom.toast_el.firstElementChild?.textContent
				).toBe(
					"Precision score has been reset!"
				)
				state.lang = "ko"
				precision.clear_score()
				expect(
					dom.toast_el.firstElementChild?.textContent
				).toBe(
					"Precision 점수를 초기화했습니다!"
				)
				precision.dispose()
				expect(
					localStorage.getItem("precision#runs")
				).toBeNull()
			}
		)
		it(
			"dispose banks the run average as the all-time record under precision#runs and a weaker later run keeps it",
			async () => {
				const ctx = await setup("lol")
				const { constants, dom, precision, state } = ctx
				const { we_factor } = constants.fitts
				const errors = [ 1, -1, 1, -1, 1 ]
				/**
				 * @param {number} slow
				 * @returns {number}
				 */
				function run(slow) {
					const times = errors.map(
						(_, i) => (i % 2 ? 500 : 300) * slow
					)
					let now = state.timer.now_ms
					precision.shoot()
					for (let i = 0; i < errors.length; i++) {
						now += times[i]
						hit_2d(ctx, now, errors[i])
					}
					precision.update_hud()
					return expected_throughput(we_factor, SPAWN_DIST, errors, times)
				}
				const fast = run(1)
				precision.dispose()
				const record = localStorage.getItem("precision#runs")
				expect(Number(record)).toBeCloseTo(fast, 9)
				state.game.mode = "precision"
				precision.init()
				expect(run(2)).toBeLessThan(fast)
				precision.dispose()
				expect(
					localStorage.getItem("precision#runs")
				).toBe(record)
				expect(
					dom.precision_score_el.textContent
				).toBe(fixed2(fast))
			}
		)
		it(
			"dispose nulls the mode, restores the HUD labels, clears the HUD values and resets every per-run value",
			async () => {
				const ctx = await setup("lol")
				const { constants, dom, precision, state } = ctx
				const { trial_shots } = constants.mode.precision
				precision.shoot()
				for (let i = 2; i < trial_shots; i++) {
					hit_2d(
						ctx,
						1_000 + i * 300,
						i % 2 ? 1 : -1
					)
				}
				precision.on_frame()
				state.camera.x += 5_000
				at(ctx, 9_000)
				precision.on_frame()
				at(ctx, 9_500)
				precision.on_frame()
				precision.update_hud()
				expect(
					dom.run_score_el.getAttribute("value")
				).not.toBe("- / -")
				const lines = vi.spyOn(ctx.context_2d, "lineTo")
				precision.render()
				expect(lines).toHaveBeenCalled()
				lines.mockClear()
				precision.dispose()
				expect(state.game.mode).toBeNull()
				expect(dom.run_score_el.textContent).toBe("Score")
				expect(dom.accuracy_el.textContent).toBe("Accuracy")
				expect(dom.crit_rate_el.textContent).toBe("Critical")
				for (const el of [
					dom.accuracy_el,
					dom.crit_rate_el,
					dom.level_el,
					dom.run_score_el
				]) {
					expect(el.hasAttribute("value")).toBe(false)
				}
				expect(state.camera.x).toBe(0)
				expect(state.camera.y).toBe(0)
				expect(state.impact.rad_size).toBe(0)
				expect(state.impacts.length).toBe(0)
				expect(state.stats.shoots.length).toBe(0)
				expect(state.stats.count_shoot).toBe(0)
				expect(
					localStorage.getItem("precision#level")
				).toBeNull()
				state.game.mode = "precision"
				precision.init()
				state.camera.sens = SENS
				precision.render()
				expect(lines).not.toHaveBeenCalled()
				at(ctx, 10_000)
				precision.on_frame()
				const t = read_target(ctx)
				expect(Math.hypot(t.cx, t.cy)).toBeCloseTo(SPAWN_DIST, 6)
				hit_2d(ctx, 10_100, 0)
				precision.update_hud()
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe("- / -")
				expect(
					dom.level_el.getAttribute("value")
				).toBe("50")
				lines.mockRestore()
			}
		)
		it(
			"every trial_shots shots feed the hit rate to the staircase, shrinking the next target, and dispose persists precision#level",
			async () => {
				const ctx = await setup("lol")
				const { constants, dom, precision } = ctx
				const { trial_shots } = constants.mode.precision
				for (let i = 1; i < trial_shots; i++) {
					hit_2d(ctx, 1_000 + i * 100, 0)
				}
				precision.update_hud()
				expect(
					dom.level_el.getAttribute("value")
				).toBe("50")
				hit_2d(ctx, 1_000 + trial_shots * 100, 0)
				precision.update_hud()
				expect(
					dom.level_el.getAttribute("value")
				).toBe("58")
				precision.on_frame()
				expect(read_target(ctx).r).toBeCloseTo(5 * (1.2 - .7 * .58), 9)
				precision.dispose()
				expect(
					localStorage.getItem("precision#level")
				).toBe("0.58")
			}
		)
		it(
			"init labels the HUD Bit/s, Accuracy and Critical, resets the run state and picks the view from the sens game",
			async () => {
				const { default: state } = await import("../../docs/js/state.js")
				state.camera.pitch = .3
				state.camera.x = 12
				state.camera.y = -7
				state.camera.yaw = 1.2
				state.stats.count_crit = 2
				state.stats.count_hit = 3
				state.stats.count_shoot = 4
				const { dom } = await setup("lol")
				expect(dom.run_score_el.textContent).toBe("Bit/s")
				expect(dom.accuracy_el.textContent).toBe("Accuracy")
				expect(dom.crit_rate_el.textContent).toBe("Critical")
				expect(state.camera.dimension).toBe("2d")
				expect(state.camera.pitch).toBe(0)
				expect(state.camera.x).toBe(0)
				expect(state.camera.y).toBe(0)
				expect(state.camera.yaw).toBe(0)
				expect(state.stats.count_crit).toBe(0)
				expect(state.stats.count_hit).toBe(0)
				expect(state.stats.count_shoot).toBe(0)
				await setup("val")
				expect(state.camera.dimension).toBe("fpp")
			}
		)
		it(
			"near the bottom pitch limit a spawn never crosses it and fills every direction but the wedge around straight down",
			async () => {
				const probe = await setup("lol")
				const range = probe.constants.mode.precision.pitch_limit * Math.PI / 180 / SENS
				const origin = range - 150
				const { dirs } = await sweep_spawns(origin)
				expect_wedge(
					dirs,
					2 * Math.acos((range - origin) / SPAWN_DIST),
					.5 * Math.PI
				)
			}
		)
		it(
			"near the top pitch limit a spawn never crosses it and fills every direction but the wedge around straight up",
			async () => {
				const probe = await setup("lol")
				const range = probe.constants.mode.precision.pitch_limit * Math.PI / 180 / SENS
				const origin = -range + 150
				const { dirs } = await sweep_spawns(origin)
				expect_wedge(
					dirs,
					2 * Math.acos((range + origin) / SPAWN_DIST),
					1.5 * Math.PI
				)
			}
		)
		it(
			"on_frame keeps the live target instead of respawning it",
			async () => {
				const ctx = await setup("lol")
				ctx.precision.on_frame()
				const first = read_target(ctx)
				random.mockReturnValue(0)
				at(ctx, 1_500)
				ctx.precision.on_frame()
				expect(read_target(ctx)).toEqual(first)
			}
		)
		it(
			"render 2D draws the world under the camera translate, restores the context and shows the aim guide only after guide.delay_ms off-screen",
			async () => {
				const ctx = await setup("lol")
				const {
					constants,
					context_2d,
					precision,
					state
				} = ctx
				const { delay_ms } = constants.guide
				const before = context_2d.getTransform()
				const translate = vi.spyOn(context_2d, "translate")
				const line_to = vi.spyOn(context_2d, "lineTo")
				precision.render()
				expect(line_to).not.toHaveBeenCalled()
				precision.on_frame()
				const t = read_target(ctx)
				state.camera.x = 5_000
				translate.mockClear()
				precision.render()
				expect(translate.mock.calls).toEqual(
					[ [ 960, 540 ], [ -5_000, -0 ] ]
				)
				expect(context_2d.getTransform()).toEqual(before)
				at(ctx, 1_100)
				precision.on_frame()
				at(ctx, 1_099 + delay_ms)
				precision.on_frame()
				precision.render()
				expect(line_to).not.toHaveBeenCalled()
				at(ctx, 1_100 + delay_ms)
				precision.on_frame()
				precision.render()
				expect(line_to).toHaveBeenCalledWith(t.x, t.cy)
				line_to.mockClear()
				state.camera.x = 0
				precision.on_frame()
				precision.render()
				expect(line_to).not.toHaveBeenCalled()
				translate.mockRestore()
				line_to.mockRestore()
			}
		)
		it(
			"render 3D prepares the view, draws the target discs and the aim guide only after guide.delay_ms off-screen, and clears the 2D canvas",
			async () => {
				const ctx = await setup("val")
				const {
					constants,
					context_2d,
					precision,
					state
				} = ctx
				const { delay_ms } = constants.guide
				const draw_arrays = vi.spyOn(
					WebGL2RenderingContext.prototype,
					"drawArrays"
				)
				const buffer_sub_data = vi.spyOn(
					WebGL2RenderingContext.prototype,
					"bufferSubData"
				)
				const clear_rect = vi.spyOn(context_2d, "clearRect")
				const before = context_2d.getTransform()
				precision.render()
				expect(draw_arrays).not.toHaveBeenCalled()
				expect(clear_rect).toHaveBeenCalledWith(0, 0, 1_920, 1_080)
				precision.on_frame()
				precision.shoot()
				precision.render()
				expect(draw_arrays).toHaveBeenCalledTimes(2)
				expect(buffer_sub_data).not.toHaveBeenCalled()
				expect(context_2d.getTransform()).toEqual(before)
				state.camera.yaw += Math.PI
				at(ctx, 1_100)
				precision.on_frame()
				precision.render()
				expect(buffer_sub_data).not.toHaveBeenCalled()
				at(ctx, 1_100 + delay_ms)
				precision.on_frame()
				precision.render()
				expect(buffer_sub_data).toHaveBeenCalledTimes(1)
				draw_arrays.mockRestore()
				buffer_sub_data.mockRestore()
				clear_rect.mockRestore()
			}
		)
		it(
			"shoot pushes a shoots entry stamped prev_ms..now_ms with every field set and an impact at the crosshair",
			async () => {
				const ctx = await setup("lol")
				const { precision, state } = ctx
				precision.on_frame()
				at(ctx, 1_016)
				state.camera.x = 30
				state.camera.y = 20
				precision.shoot()
				expect(state.stats.shoots.at(-1)).toEqual(
					{
						c: false,
						d: 0,
						e: 1_016,
						h: false,
						s: 1_000
					}
				)
				expect(state.impacts.at(-1)).toEqual(
					{
						c: void 0,
						r: 20,
						t: 1_016,
						x: 30,
						y: 20
					}
				)
				hit_2d(ctx, 1_032, 0)
				expect(state.stats.shoots.at(-1)).toEqual(
					{
						c: true,
						d: 0,
						e: 1_032,
						h: true,
						s: 1_016
					}
				)
				expect(state.impacts.at(-1)?.c).toBe(true)
				const ctx_3d = await setup("val")
				ctx_3d.state.camera.pitch = .1
				ctx_3d.state.camera.yaw = .2
				ctx_3d.precision.shoot()
				expect(ctx_3d.state.impacts_3d.at(-1)).toMatchObject(
					{ c: void 0, p: .1, t: 1_000, y: .2 }
				)
				expect(
					ctx_3d.state.stats.shoots.length
				).toBe(1)
			}
		)
		it(
			"the HUD shows hits over shots as accuracy, crits over hits as critical, 0% before any shot, and the level in percent",
			async () => {
				const ctx = await setup("lol")
				const { constants, dom, precision, state } = ctx
				precision.update_hud()
				expect(
					dom.accuracy_el.getAttribute("value")
				).toBe("0%")
				expect(
					dom.crit_rate_el.getAttribute("value")
				).toBe("0%")
				expect(
					dom.level_el.getAttribute("value")
				).toBe("50")
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe("- / -")
				expect(state.hud.next_update_ms).toBe(
					1_000 + constants.hud.update_interval_ms
				)
				precision.on_frame()
				precision.shoot()
				hit_2d(ctx, 1_100, 0)
				precision.on_frame()
				const t = read_target(ctx)
				state.camera.x = t.x
				state.camera.y = t.y + 3
				precision.shoot()
				precision.update_hud()
				expect(
					dom.accuracy_el.getAttribute("value")
				).toBe(`${fixed2(2 / 3 * 100)}%`)
				expect(
					dom.crit_rate_el.getAttribute("value")
				).toBe("50%")
			}
		)
		it(
			"the record loads from precision#runs, keeping the maximum of a legacy comma-joined ring",
			async () => {
				localStorage.setItem("precision#runs", "2.5,7.25,3")
				const { dom } = await setup("lol")
				expect(
					dom.precision_score_el.textContent
				).toBe("7.25")
				expect(
					dom.clear_precision_btn.disabled
				).toBe(false)
			}
		)
		it(
			"the staircase level loaded from precision#level sets the target size while the distance stays a random draw",
			async () => {
				localStorage.setItem("precision#level", "1")
				const hard = await setup("lol")
				hard.precision.on_frame()
				const small = read_target(hard)
				expect(small.r).toBeCloseTo(2.5, 9)
				expect(Math.hypot(small.cx, small.cy)).toBeCloseTo(SPAWN_DIST, 6)
				hard.precision.update_hud()
				expect(
					hard.dom.level_el.getAttribute("value")
				).toBe("100")
				localStorage.setItem("precision#level", "0")
				const easy = await setup("lol")
				easy.precision.on_frame()
				const big = read_target(easy)
				expect(big.r).toBeCloseTo(6, 9)
				expect(Math.hypot(big.cx, big.cy)).toBeCloseTo(SPAWN_DIST, 6)
			}
		)
		it(
			"update_dimension 3D -> 2D with the crosshair at the origin converts only the live target",
			async () => {
				const ctx = await setup("val")
				const { precision, state } = ctx
				precision.on_frame()
				state.game.sens = "lol"
				precision.update_dimension?.()
				const scale = SENS / state.camera.sens
				expect(state.camera.x).toBe(0)
				expect(state.camera.y).toBe(0)
				const t = read_target(ctx)
				expect(t.cx).toBeCloseTo(-SPAWN_DIST * scale, 9)
				expect(t.cy).toBeCloseTo(0, 9)
				expect(t.r).toBeCloseTo(4.25 * scale, 9)
				state.game.sens = "val"
				precision.update_dimension?.()
				state.camera.pitch = 0
				state.camera.yaw = .1
				state.game.sens = "lol"
				precision.update_dimension?.()
				expect(state.camera.x).toBeCloseTo(.1 / state.camera.sens, 9)
				expect(state.camera.y).toBeCloseTo(0, 9)
			}
		)
		it(
			"update_dimension between two 3D views changes neither the camera angles nor the target",
			async () => {
				const ctx = await setup("val")
				const { precision, state } = ctx
				precision.on_frame()
				state.input.ads_stage = 1
				precision.update_dimension?.()
				expect(state.camera.dimension).toBe("fpp")
				expect(state.camera.yaw).toBe(0)
				expect(state.camera.pitch).toBe(0)
				state.camera.yaw = -32.5 * 5 * SENS
				precision.shoot()
				expect(state.stats.count_crit).toBe(1)
				state.input.ads_stage = 0
			}
		)
		it(
			"update_dimension converts the camera and the live target 2D -> 3D and back, keeping their angles",
			async () => {
				const ctx = await setup("lol")
				const { precision, state } = ctx
				precision.on_frame()
				const t = read_target(ctx)
				state.camera.x = 40
				state.camera.y = -30
				state.game.sens = "val"
				precision.update_dimension?.()
				const sens_3d = state.camera.sens
				expect(state.camera.dimension).toBe("fpp")
				expect(state.camera.x).toBe(0)
				expect(state.camera.y).toBe(0)
				expect(state.camera.yaw).toBeCloseTo(40 * sens_3d, 12)
				expect(state.camera.pitch).toBeCloseTo(30 * sens_3d, 12)
				const { pitch, yaw } = state.camera
				precision.update_dimension?.()
				expect(state.camera.yaw).toBe(yaw)
				expect(state.camera.pitch).toBe(pitch)
				state.game.sens = "lol"
				precision.update_dimension?.()
				const scale = sens_3d / state.camera.sens
				expect(state.camera.dimension).toBe("2d")
				expect(state.camera.pitch).toBe(0)
				expect(state.camera.yaw).toBe(0)
				expect(state.camera.x).toBeCloseTo(40 * scale, 9)
				expect(state.camera.y).toBeCloseTo(-30 * scale, 9)
				const back = read_target(ctx)
				expect(back.cx).toBeCloseTo(t.cx * scale, 9)
				expect(back.cy).toBeCloseTo(t.cy * scale, 9)
				expect(back.r).toBeCloseTo(t.r * scale, 9)
				expect(back.cr).toBeCloseTo(t.cr * scale, 9)
				expect(back.y - back.cy).toBeCloseTo(back.r - back.cr, 9)
			}
		)
		it(
			"update_dimension drops the pending click, so the hit after it forms no trial",
			async () => {
				const ctx = await setup("lol")
				const { dom, precision } = ctx
				precision.shoot()
				for (let i = 1; i <= 6; i++) {
					precision.update_dimension?.()
					hit_2d(
						ctx,
						1_000 + i * 400,
						i % 2 ? 1 : -1
					)
				}
				precision.update_hud()
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe("- / -")
			}
		)
		it(
			"update_dimension keeps a 2D view as is: no camera or target conversion",
			async () => {
				const ctx = await setup("lol")
				const { precision, state } = ctx
				precision.on_frame()
				const before = read_target(ctx)
				state.camera.x = 30
				state.camera.y = -20
				precision.update_dimension?.()
				expect(state.camera.dimension).toBe("2d")
				expect(state.camera.x).toBe(30)
				expect(state.camera.y).toBe(-20)
				expect(state.camera.pitch).toBe(0)
				expect(state.camera.yaw).toBe(0)
				expect(read_target(ctx)).toEqual(before)
			}
		)
		it(
			"update_dimension with no live target converts only the camera and the next frame spawns in the new view",
			async () => {
				const ctx = await setup("lol")
				const { precision, state } = ctx
				const hit = hit_2d(ctx, 1_100, 0)
				state.game.sens = "val"
				precision.update_dimension?.()
				const { pitch, sens, yaw } = state.camera
				expect(yaw).toBeCloseTo(hit.cx * sens, 12)
				expect(pitch).toBeCloseTo(-hit.cy * sens, 12)
				precision.on_frame()
				state.camera.yaw = yaw - 32.5 * 5 * sens
				precision.shoot()
				expect(state.stats.count_crit).toBe(2)
				state.game.sens = "lol"
				precision.update_dimension?.()
				expect(state.camera.dimension).toBe("2d")
				const { x, y } = state.camera
				precision.on_frame()
				const t = read_target(ctx)
				expect(Math.hypot(t.cx - x, t.cy - y)).toBeCloseTo(SPAWN_DIST, 6)
			}
		)
		it(
			"when the spawn distance passes both pitch limits a spawn crosses neither and fills only the left and right arcs",
			async () => {
				const probe = await setup("lol")
				const limits = probe.constants.mode.precision
				const pitch_limit = limits.pitch_limit
				limits.pitch_limit = 5
				try {
					const { dirs, range } = await sweep_spawns(0)
					expect(range).toBeLessThan(SPAWN_DIST)
					for (const dir of dirs) {
						expect(
							Math.abs(Math.sin(dir) * SPAWN_DIST)
						).toBeLessThanOrEqual(range + 1e-6)
					}
					expect(
						dirs.some(dir => Math.cos(dir) > 0)
					).toBe(true)
					expect(
						dirs.some(dir => Math.cos(dir) < 0)
					).toBe(true)
					expect(
						dirs.some(dir => Math.sin(dir) > 0)
					).toBe(true)
					expect(
						dirs.some(dir => Math.sin(dir) < 0)
					).toBe(true)
				} finally {
					limits.pitch_limit = pitch_limit
				}
			}
		)
		it(
			"with the crosshair just past a pitch limit every spawn lands back inside it",
			async () => {
				const probe = await setup("lol")
				const range = probe.constants.mode.precision.pitch_limit * Math.PI / 180 / SENS
				const below = await sweep_spawns(range + 4)
				expect_wedge(
					below.dirs,
					2 * Math.acos(-4 / SPAWN_DIST),
					.5 * Math.PI
				)
				const above = await sweep_spawns(-range - 4)
				expect_wedge(
					above.dirs,
					2 * Math.acos(-4 / SPAWN_DIST),
					1.5 * Math.PI
				)
			}
		)
	}
)