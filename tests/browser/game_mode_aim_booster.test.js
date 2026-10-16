import { load_page } from "./helpers/dom.js"
import {
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest"
const fitts_list = vi.hoisted(() => [])
vi.mock(
	"../../docs/js/render/renderer_2d.js",
	async import_original => {
		const original = await import_original()
		return {
			...original,
			draw_target: vi.fn(original.draw_target)
		}
	}
)
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
	"../../docs/js/struct/fitts.js",
	async import_original => {
		const original = await import_original()
		return {
			create_fitts() {
				const fitts = original.create_fitts()
				fitts_list.push(fitts)
				return fitts
			}
		}
	}
)
vi.mock(
	"../../docs/js/worker/manager.js",
	() => ({
		post_bg_worker_message: vi.fn(),
		post_writing_worker_message: vi.fn()
	})
)
const HEIGHT = 600
const START_MS = 10_000
const STORAGE_KEY = "aim_booster#runs"
const WIDTH = 800
let fresh_count = 0
const random_values = []
let constants
let dom
let logic
let mode
let renderer
let sfx
let state
let state_module
/** @returns {Promise<void>} */
async function load_mode() {
	const module = await import(/* @vite-ignore */ `../../docs/js/game_mode/aim_booster.js?fresh=${++fresh_count}`)
	mode = module.default
}
/** @returns {number} */
function next_random() {
	return random_values.length ? random_values.shift() : .5
}
/**
 * @param {string} style
 * @returns {number[]}
 */
function parse_hex(style) {
	return [ 1, 3, 5 ].map(
		i => parseInt(style.slice(i, i + 2), 16)
	)
		.concat(255)
}
/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} x
 * @param {number} y
 * @returns {number[]}
 */
function pixel(canvas, x, y) {
	const context = canvas.getContext("2d")
	return [
		...context.getImageData(x, y, 1, 1).data
	]
}
/** @returns {{ tp_5: number, tp_6: number }} */
function play_fitts_run() {
	const { we_factor } = constants.fitts
	random_values.push(.75, .5, .25, .5, .75, .5, .25, .5, .75, .5, .25, .5)
	start_run(START_MS)
	shoot_at(-132.5, 0)
	step(START_MS)
	step(START_MS + 250)
	shoot_at(134.5, 0)
	step(START_MS + 500)
	step(START_MS + 750)
	shoot_at(-130.5, 0)
	step(START_MS + 1_000)
	step(START_MS + 1_250)
	shoot_at(134.5, 0)
	step(START_MS + 1_500)
	step(START_MS + 1_750)
	shoot_at(-130.5, 0)
	mode.update_hud()
	expect(
		dom.run_score_el.getAttribute("value")
	).toBe("- / -")
	expect(
		dom.accuracy_el.getAttribute("value")
	).toBe("80%")
	step(START_MS + 2_000)
	step(START_MS + 2_250)
	shoot_at(132.5, 0)
	mode.update_hud()
	const tp_5 = Math.log2(
		265 / (we_factor * Math.sqrt(16 / 5)) + 1
	) / (2.25 / 5)
	expect(
		dom.run_score_el.getAttribute("value")
	).toBe(
		`${round2(tp_5)} / ${round2(tp_5)}`
	)
	expect(
		dom.accuracy_el.getAttribute("value")
	).toBe("83.33%")
	step(START_MS + 2_500)
	step(START_MS + 2_750)
	shoot_at(-132.5, 0)
	mode.update_hud()
	const tp_6 = Math.log2(
		265 / (we_factor * Math.sqrt(16 / 6)) + 1
	) / (2.75 / 6)
	expect(
		dom.run_score_el.getAttribute("value")
	).toBe(
		`${round2(tp_6)} / ${round2((tp_5 + tp_6) / 2)}`
	)
	expect(
		dom.accuracy_el.getAttribute("value")
	).toBe("85.71%")
	return { tp_5, tp_6 }
}
/** @returns {{ lives: string, spawn: string, targets: object[] }} */
function render_frame() {
	vi.mocked(renderer.context_2d.fillText).mockClear()
	vi.mocked(renderer.draw_target).mockClear()
	mode.render()
	const texts = vi.mocked(renderer.context_2d.fillText).mock.calls
	return {
		lives: texts[1][0],
		spawn: texts[0][0],
		targets: vi.mocked(renderer.draw_target).mock.calls.map(([ target ]) => target)
			.reverse()
	}
}
/**
 * @param {number} n
 * @returns {number}
 */
function round2(n) {
	return Math.round(n * 100) / 100
}
/**
 * @param {number} now_ms
 * @returns {void}
 */
function set_now(now_ms) {
	state.timer.prev_ms = state.timer.now_ms
	state.timer.now_ms = now_ms
}
/**
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function shoot_at(x, y) {
	state.camera.x = x
	state.camera.y = y
	mode.shoot()
}
/**
 * @param {number} now_ms
 * @returns {void}
 */
function start_run(now_ms) {
	state.game.mode = "aim_booster"
	state.timer.now_ms = now_ms
	state.timer.prev_ms = now_ms
	state.timer.start_ms = now_ms
	mode.init()
}
/**
 * @param {number} now_ms
 * @returns {void}
 */
function step(now_ms) {
	set_now(now_ms)
	mode.on_frame()
}
describe(
	"game_mode/aim_booster.js",
	() => {
		beforeAll(
			async () => {
				vi.spyOn(Math, "random").mockImplementation(next_random)
				localStorage.clear()
				load_page()
				constants = (await import("../../docs/js/constants.js")).default
				dom = await import("../../docs/js/controller/dom.js")
				logic = await import("../../docs/js/logic.js")
				renderer = await import("../../docs/js/render/renderer_2d.js")
				sfx = await import("../../docs/js/sfx.js")
				state_module = await import("../../docs/js/state.js")
				state = state_module.default
				vi.spyOn(renderer.context_2d, "fillText")
			}
		)
		beforeEach(
			async () => {
				random_values.length = 0
				localStorage.clear()
				vi.clearAllMocks()
				dom.canvas_crosshair_el.height = HEIGHT
				dom.canvas_crosshair_el.width = WIDTH
				dom.canvas_el.height = HEIGHT
				dom.canvas_el.width = WIDTH
				state.camera.height = HEIGHT
				state.camera.width = WIDTH
				state.game.mode = null
				state.game.sens = "val"
				state.lang = "en"
				await load_mode()
			}
		)
		it(
			"check_stats drops shots that left the HUD window, un-counting and recycling them, and keeps newer ones",
			() => {
				const { window_ms } = constants.hud
				start_run(START_MS)
				step(START_MS)
				step(START_MS + 250)
				shoot_at(0, 0)
				const first = state.stats.shoots.at()
				step(START_MS + 5_000)
				shoot_at(300, 200)
				expect(state.stats).toMatchObject(
					{ count_hit: 1, count_shoot: 2 }
				)
				set_now(
					START_MS + 250 + window_ms + 1_000
				)
				mode.check_stats()
				expect(state.stats).toMatchObject(
					{ count_hit: 0, count_shoot: 1 }
				)
				expect(state.stats.shoots.length).toBe(1)
				expect(state.stats.shoots.at().e).toBe(START_MS + 5_000)
				expect(
					state_module.shoots_pool.obtain()
				).toBe(first)
				set_now(
					START_MS + 5_000 + window_ms + 1_000
				)
				mode.check_stats()
				expect(state.stats).toMatchObject(
					{ count_hit: 0, count_shoot: 0 }
				)
				expect(state.stats.shoots.length).toBe(0)
			}
		)
		it(
			"clear_score forgets the record, removes aim_booster#runs, zeroes the menu score and toasts in the player's language",
			async () => {
				localStorage.setItem(STORAGE_KEY, "12.5")
				await load_mode()
				expect(
					dom.aim_booster_score_el.textContent
				).toBe("12.5")
				mode.clear_score()
				expect(
					localStorage.getItem(STORAGE_KEY)
				).toBeNull()
				expect(
					dom.aim_booster_score_el.textContent
				).toBe("0")
				expect(
					dom.clear_aim_booster_btn.disabled
				).toBe(true)
				expect(
					dom.toast_el.firstElementChild?.textContent
				).toBe(
					"Aim Booster score has been reset!"
				)
				state.lang = "ko"
				mode.clear_score()
				expect(
					dom.toast_el.firstElementChild?.textContent
				).toBe(
					"Aim Booster 점수를 초기화했습니다!"
				)
				const { tp_5, tp_6 } = play_fitts_run()
				mode.dispose()
				expect((tp_5 + tp_6) / 2).toBeLessThan(12.5)
				expect(
					Number(
						localStorage.getItem(STORAGE_KEY)
					)
				).toBeCloseTo((tp_5 + tp_6) / 2, 12)
			}
		)
		it(
			"counts a shot exactly on the rim as a hit and one just beyond it as a miss",
			() => {
				start_run(START_MS)
				step(START_MS)
				step(START_MS + 1_000)
				expect(render_frame().targets[0].r).toBe(17.5)
				shoot_at(17.6, 0)
				expect(state.stats).toMatchObject(
					{ count_hit: 0, count_shoot: 1 }
				)
				shoot_at(17.5, 0)
				expect(state.stats).toMatchObject(
					{ count_hit: 1, count_shoot: 2 }
				)
			}
		)
		it(
			"dispose banks the run mean into the all-time record and persists String(record.value) under aim_booster#runs",
			() => {
				const { tp_5, tp_6 } = play_fitts_run()
				mode.dispose()
				const mean = (tp_5 + tp_6) / 2
				const stored = localStorage.getItem(STORAGE_KEY)
				expect(stored).toBe(String(Number(stored)))
				expect(Number(stored)).toBeCloseTo(mean, 12)
				expect(
					dom.aim_booster_score_el.textContent
				).toBe(String(round2(mean)))
				expect(
					dom.clear_aim_booster_btn.disabled
				).toBe(false)
			}
		)
		it(
			"dispose ends the run: mode null, default HUD labels, HUD values and run state cleared, nothing banked without a score",
			() => {
				start_run(START_MS)
				step(START_MS)
				step(START_MS + 250)
				shoot_at(0, 0)
				mode.update_hud()
				expect(
					dom.accuracy_el.hasAttribute("value")
				).toBe(true)
				set_now(START_MS + 1_000)
				mode.dispose()
				expect(state.game.mode).toBeNull()
				expect(
					[
						dom.run_score_el.textContent,
						dom.accuracy_el.textContent,
						dom.crit_rate_el.textContent
					]
				).toEqual(
					[ "Score", "Accuracy", "Critical" ]
				)
				expect(
					dom.accuracy_el.hasAttribute("value")
				).toBe(false)
				expect(
					dom.crit_rate_el.hasAttribute("value")
				).toBe(false)
				expect(
					dom.run_score_el.hasAttribute("value")
				).toBe(false)
				expect(state.impact.rad_size).toBe(0)
				expect(state.impacts.length).toBe(0)
				expect(state.stats.shoots.length).toBe(0)
				expect(state.stats).toMatchObject(
					{ count_hit: 0, count_shoot: 0 }
				)
				expect(
					localStorage.getItem(STORAGE_KEY)
				).toBeNull()
				expect(
					dom.aim_booster_score_el.textContent
				).toBe("0")
			}
		)
		it(
			"dispose keeps a higher stored best over a lower run mean",
			async () => {
				localStorage.setItem(STORAGE_KEY, "99")
				await load_mode()
				play_fitts_run()
				mode.dispose()
				expect(
					localStorage.getItem(STORAGE_KEY)
				).toBe("99")
				expect(
					dom.aim_booster_score_el.textContent
				).toBe("99")
			}
		)
		it(
			"expires Fitts trials with the HUD window, showing '-' for the live score but keeping the run mean",
			() => {
				const { tp_5, tp_6 } = play_fitts_run()
				set_now(START_MS + 32_000)
				mode.check_stats()
				mode.update_hud()
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe(
					`- / ${round2((tp_5 + tp_6) / 2)}`
				)
				expect(
					dom.accuracy_el.getAttribute("value")
				).toBe("100%")
			}
		)
		it(
			"expires a target at twice target_grow_ms with the full miss effect at its position and one life lost",
			() => {
				const { px_size } = constants.impact
				random_values.push(.25, .75)
				start_run(START_MS)
				step(START_MS)
				const [ first ] = render_frame().targets
				const { x, y } = first
				step(START_MS + 3_999)
				expect(render_frame().lives).toBe("♥ ♥ ♥")
				expect(sfx.play_miss).not.toHaveBeenCalled()
				const impact = { c: true, r: 0, t: 0, x: 0, y: 0 }
				state_module.impacts_pool.recycle(impact)
				step(START_MS + 4_000)
				expect(sfx.play_miss).toHaveBeenCalledTimes(1)
				expect(sfx.play_hit).not.toHaveBeenCalled()
				expect(state.impacts.at(-1)).toBe(impact)
				expect(impact).toStrictEqual(
					{
						c: void 0,
						r: px_size,
						t: START_MS + 4_000,
						x,
						y
					}
				)
				const { lives, targets } = render_frame()
				expect(lives).toBe("♥ ♥ ♡")
				expect(targets).not.toContain(first)
				expect(targets.length).toBe(8)
			}
		)
		it(
			"grows a target to target_diameter / 2 over target_grow_ms and shrinks it back on the same clock, its core r * core_ratio at its centre",
			() => {
				const {
					core_ratio,
					target_diameter,
					target_grow_ms
				} = constants.mode.aim_booster
				/**
				 * @param {number} age
				 * @returns {number}
				 */
				function radius(age) {
					return target_diameter / 2 * (age <= target_grow_ms ? age / target_grow_ms : 2 - age / target_grow_ms)
				}
				start_run(START_MS)
				step(START_MS)
				const [ target ] = render_frame().targets
				expect(target).toMatchObject({ cr: 0, r: 0 })
				for (const age of [ 1_000, 2_000, 3_000, 3_999 ]) {
					step(START_MS + age)
					expect(render_frame().targets[0]).toBe(target)
					expect(target.r).toBeCloseTo(radius(age), 9)
					expect(target.cr).toBeCloseTo(radius(age) * core_ratio, 9)
					expect([ target.cx, target.cy ]).toEqual([ target.x, target.y ])
				}
				expect(radius(2_000)).toBe(35)
				expect(target.r).toBeCloseTo(.0175, 9)
			}
		)
		it(
			"hits the oldest target under the crosshair, removes it and pushes a pooled hit impact and shot entry",
			() => {
				const { px_size } = constants.impact
				start_run(START_MS)
				step(START_MS)
				step(START_MS + 500)
				step(START_MS + 1_000)
				const [ oldest, middle, newest ] = render_frame().targets
				expect(
					[ oldest.r, middle.r, newest.r ]
				).toEqual([ 17.5, 8.75, 0 ])
				const entry = { c: true, d: 7, e: -1, h: false, s: -1 }
				const impact = { c: true, r: 0, t: 0, x: 0, y: 0 }
				state_module.impacts_pool.recycle(impact)
				state_module.shoots_pool.recycle(entry)
				shoot_at(1, 0)
				expect(sfx.play_hit).toHaveBeenCalledTimes(1)
				expect(sfx.play_miss).not.toHaveBeenCalled()
				const { targets } = render_frame()
				expect(targets.length).toBe(2)
				expect(targets[0]).toBe(middle)
				expect(targets[1]).toBe(newest)
				expect(state.impacts.at(-1)).toBe(impact)
				expect(impact).toStrictEqual(
					{
						c: false,
						r: px_size,
						t: START_MS + 1_000,
						x: 1,
						y: 0
					}
				)
				expect(state.stats.shoots.at(-1)).toBe(entry)
				expect(entry).toStrictEqual(
					{
						c: false,
						d: 0,
						e: START_MS + 1_000,
						h: true,
						s: START_MS + 500
					}
				)
				expect(state.stats).toMatchObject(
					{ count_hit: 1, count_shoot: 1 }
				)
			}
		)
		it(
			"init resets the run, keeps update_camera_view's projection but forces 2d, and labels the HUD Bit/s, Accuracy, Spawn",
			() => {
				state.camera.x = 50
				state.camera.y = -20
				state.impacts.push(
					{ c: void 0, r: 1, t: 0, x: 0, y: 0 }
				)
				state.stats.count_hit = 4
				state.stats.count_shoot = 9
				start_run(START_MS)
				const { fov, sens, sens_error } = state.camera
				const { rad_size } = state.impact
				expect(state.camera.dimension).toBe("2d")
				expect(
					[ state.camera.x, state.camera.y ]
				).toEqual([ 0, 0 ])
				expect(state.impacts.length).toBe(0)
				expect(state.stats).toMatchObject(
					{ count_hit: 0, count_shoot: 0 }
				)
				expect(sens).toBeGreaterThan(0)
				expect(rad_size).toBeGreaterThan(0)
				expect(
					[
						dom.run_score_el.textContent,
						dom.accuracy_el.textContent,
						dom.crit_rate_el.textContent
					]
				).toEqual(
					[ "Bit/s", "Accuracy", "Spawn" ]
				)
				logic.update_camera_view()
				expect(state.camera.dimension).toBe("fpp")
				expect(state.camera).toMatchObject({ fov, sens, sens_error })
				expect(state.impact.rad_size).toBe(rad_size)
			}
		)
		it(
			"is a fixed-2D mode with check_stats and no on_move or update_dimension",
			() => {
				expect(typeof mode.check_stats).toBe("function")
				expect(mode.on_move).toBeUndefined()
				expect(mode.update_dimension).toBeUndefined()
			}
		)
		it(
			"keeps every target on a miss, plays the miss sound and pushes a pooled miss impact and shot entry",
			() => {
				const { px_size } = constants.impact
				start_run(START_MS)
				step(START_MS)
				step(START_MS + 500)
				const before = render_frame().targets
				const entry = { c: true, d: 7, e: -1, h: true, s: -1 }
				const impact = { c: true, r: 0, t: 0, x: 0, y: 0 }
				state_module.impacts_pool.recycle(impact)
				state_module.shoots_pool.recycle(entry)
				shoot_at(200, -150)
				expect(sfx.play_miss).toHaveBeenCalledTimes(1)
				expect(sfx.play_hit).not.toHaveBeenCalled()
				expect(render_frame().targets).toEqual(before)
				expect(state.impacts.at(-1)).toBe(impact)
				expect(impact).toStrictEqual(
					{
						c: void 0,
						r: px_size,
						t: START_MS + 500,
						x: 200,
						y: -150
					}
				)
				expect(state.stats.shoots.at(-1)).toBe(entry)
				expect(entry).toStrictEqual(
					{
						c: false,
						d: 0,
						e: START_MS + 500,
						h: false,
						s: START_MS
					}
				)
				expect(state.stats).toMatchObject(
					{ count_hit: 0, count_shoot: 1 }
				)
			}
		)
		it(
			"makes each click one Fitts trial toward the hit target, else the nearest live one, and only a click origin when none is live",
			() => {
				const fitts = fitts_list.at(-1)
				const click = vi.spyOn(fitts, "click")
				const trial = vi.spyOn(fitts, "trial")
				random_values.push(.5, .5, .625, .5)
				start_run(START_MS)
				shoot_at(10, 20)
				expect(state.stats).toMatchObject(
					{ count_hit: 0, count_shoot: 1 }
				)
				step(START_MS)
				step(START_MS + 500)
				shoot_at(100, 0)
				step(START_MS + 2_000)
				const [ oldest, nearest ] = render_frame().targets
				expect(oldest).toMatchObject({ r: 35, x: 0, y: 0 })
				expect(nearest).toMatchObject({ r: 26.25, x: 66.25, y: 0 })
				shoot_at(34, 0)
				expect(state.stats).toMatchObject(
					{ count_hit: 1, count_shoot: 3 }
				)
				expect(click.mock.calls).toEqual([ [ 10, 20, START_MS ] ])
				expect(trial.mock.calls).toEqual(
					[
						[ 66.25, 0, 100, 0, START_MS + 500 ],
						[ 0, 0, 34, 0, START_MS + 2_000 ]
					]
				)
			}
		)
		it(
			"on_frame clamps the crosshair to the screen half-extents",
			() => {
				start_run(START_MS)
				state.camera.x = 5_000
				state.camera.y = -5_000
				step(START_MS)
				expect(
					[ state.camera.x, state.camera.y ]
				).toEqual([ WIDTH / 2, -HEIGHT / 2 ])
				state.camera.x = -WIDTH
				state.camera.y = HEIGHT
				step(START_MS + 16)
				expect(
					[ state.camera.x, state.camera.y ]
				).toEqual([ -WIDTH / 2, HEIGHT / 2 ])
			}
		)
		it(
			"render paints a full-grown target on the 2D canvas with a core of r * core_ratio, unshifted by the camera, and offsets the crosshair instead",
			() => {
				const { core_fill_style, fill_style } = constants.target
				start_run(START_MS)
				step(START_MS)
				step(START_MS + 2_000)
				state.camera.x = 40
				state.camera.y = 20
				mode.render()
				const core = parse_hex(core_fill_style)
				const body = parse_hex(fill_style)
				expect(
					pixel(
						dom.canvas_el,
						WIDTH / 2,
						HEIGHT / 2
					)
				).toEqual(core)
				expect(
					pixel(
						dom.canvas_el,
						WIDTH / 2 + 5,
						HEIGHT / 2
					)
				).toEqual(core)
				expect(
					pixel(
						dom.canvas_el,
						WIDTH / 2 + 9,
						HEIGHT / 2
					)
				).toEqual(body)
				expect(
					pixel(
						dom.canvas_crosshair_el,
						WIDTH / 2 + 40 - 8,
						HEIGHT / 2 + 20 - 1
					)[3]
				).toBeGreaterThan(0)
				expect(
					pixel(
						dom.canvas_crosshair_el,
						WIDTH / 2 - 8,
						HEIGHT / 2 - 1
					)[3]
				).toBe(0)
			}
		)
		it(
			"render writes the spawn rate and lives, draws every live target at full alpha with the oldest on top, and restores the context",
			() => {
				const { lives_y } = constants.mode.aim_booster
				const restore = vi.spyOn(renderer.context_2d, "restore")
				const save = vi.spyOn(renderer.context_2d, "save")
				start_run(START_MS)
				step(START_MS)
				step(START_MS + 500)
				const { targets } = render_frame()
				expect(
					renderer.context_2d.fillText.mock.calls
				).toEqual(
					[
						[ "2/s", 0, 0 ],
						[ "♥ ♥ ♥", 0, lives_y ]
					]
				)
				expect(
					renderer.draw_target.mock.calls
				).toEqual(
					[
						[ targets[1], 1 ],
						[ targets[0], 1 ]
					]
				)
				expect(targets[0].t).toBe(START_MS)
				expect(save.mock.calls.length).toBe(restore.mock.calls.length)
				expect(
					renderer.context_2d.getTransform().isIdentity
				).toBe(true)
			}
		)
		it(
			"restarts from the beginning after a run whose shots all fall within the last rewind_s, or that has none",
			() => {
				start_run(START_MS)
				step(START_MS)
				step(START_MS + 250)
				shoot_at(0, 0)
				set_now(START_MS + 15_000)
				mode.dispose()
				start_run(START_MS + 100_000)
				expect(render_frame().spawn).toBe("2/s")
				step(START_MS + 100_000)
				expect(render_frame().targets.length).toBe(1)
				set_now(START_MS + 161_000)
				mode.dispose()
				start_run(START_MS + 200_000)
				expect(render_frame().spawn).toBe("2/s")
				step(START_MS + 200_000)
				expect(render_frame().targets.length).toBe(1)
			}
		)
		it(
			"resumes the next run rewind_s before the quit: spawn rate and count continue from there",
			() => {
				start_run(START_MS)
				step(START_MS)
				shoot_at(0, 0)
				set_now(START_MS + 61_000)
				mode.dispose()
				start_run(START_MS + 100_000)
				expect(render_frame().spawn).toBe("3.37/s")
				step(START_MS + 100_000)
				expect(render_frame().targets.length).toBe(0)
				step(START_MS + 100_250)
				expect(render_frame().targets.length).toBe(0)
				step(START_MS + 100_300)
				expect(render_frame().targets.length).toBe(1)
			}
		)
		it(
			"reuses a target recycled by a hit for the next spawn with every field refilled",
			() => {
				random_values.push(.25, .75, .75, .25)
				start_run(START_MS)
				step(START_MS)
				step(START_MS + 250)
				const [ first ] = render_frame().targets
				expect(first.r).toBeGreaterThan(0)
				shoot_at(first.x, first.y)
				expect(render_frame().targets).toEqual([])
				step(START_MS + 500)
				const [ second ] = render_frame().targets
				expect(second).toBe(first)
				expect(second).toStrictEqual(
					{
						cr: 0,
						cx: 132.5,
						cy: -87.5,
						r: 0,
						t: START_MS + 500,
						x: 132.5,
						y: -87.5
					}
				)
			}
		)
		it(
			"rewinds the spawn clock by rewind_s on the last life lost, refilling the lives and clearing the board",
			() => {
				start_run(START_MS)
				step(START_MS)
				step(START_MS + 25_000)
				expect(render_frame()).toMatchObject({ lives: "♥ ♥ ♡" })
				step(START_MS + 27_000)
				expect(render_frame().targets.length).toBe(66)
				step(START_MS + 29_000)
				expect(sfx.play_miss).toHaveBeenCalledTimes(61)
				expect(render_frame()).toMatchObject(
					{ lives: "♥ ♥ ♥", targets: [] }
				)
				mode.update_hud()
				expect(
					dom.crit_rate_el.getAttribute("value")
				).toBe("2.3/s")
				step(START_MS + 29_250)
				expect(render_frame().targets.length).toBe(0)
				step(START_MS + 29_300)
				expect(render_frame().targets.length).toBe(1)
			}
		)
		it(
			"scores Fitts throughput log2(De / (we_factor * SD) + 1) / MT in bit/s from trial_min trials on, banking each non-zero HUD score",
			() => {
				const { tp_5, tp_6 } = play_fitts_run()
				expect(constants.fitts.trial_min).toBe(5)
				expect(tp_5).toBeGreaterThan(0)
				expect(tp_6).toBeGreaterThan(0)
			}
		)
		it(
			"seeds the menu score from the best of aim_booster#runs, a legacy comma-joined ring included",
			async () => {
				localStorage.setItem(STORAGE_KEY, "3,7.456,2")
				await load_mode()
				expect(
					dom.aim_booster_score_el.textContent
				).toBe("7.46")
				expect(
					dom.clear_aim_booster_btn.disabled
				).toBe(false)
			}
		)
		it(
			"shows a zero menu score with the clear button disabled when nothing is stored",
			() => {
				expect(
					dom.aim_booster_score_el.textContent
				).toBe("0")
				expect(
					dom.clear_aim_booster_btn.disabled
				).toBe(true)
			}
		)
		it(
			"spawns inside the grid inset by target_diameter, so a full-grown target stays on the grid",
			() => {
				const {
					grid_height,
					grid_width,
					target_diameter
				} = constants.mode.aim_booster
				random_values.push(0, 0, .75, .25)
				start_run(START_MS)
				step(START_MS)
				step(START_MS + 500)
				const [ first, second ] = render_frame().targets
				const left = target_diameter / 2 - grid_width / 2
				const top = target_diameter / 2 - grid_height / 2
				expect(first).toMatchObject(
					{ cx: left, cy: top, x: left, y: top }
				)
				expect(second).toMatchObject(
					{
						cx: -left / 2,
						cy: top / 2,
						x: -left / 2,
						y: top / 2
					}
				)
			}
		)
		it(
			"spawns the first target at once, then at start_target_per_sec rising by inc_target_per_sec per minute",
			() => {
				const {
					inc_target_per_sec,
					start_target_per_sec
				} = constants.mode.aim_booster
				start_run(START_MS)
				expect(render_frame().spawn).toBe(`${start_target_per_sec}/s`)
				step(START_MS)
				expect(render_frame().targets.length).toBe(1)
				step(START_MS + 250)
				expect(render_frame().targets.length).toBe(1)
				step(START_MS + 500)
				expect(render_frame().targets.length).toBe(2)
				step(START_MS + 30_000)
				const spawned = Math.floor(
					1 + start_target_per_sec * 30 + inc_target_per_sec * 30 ** 2 / 120
				)
				expect(spawned).toBe(76)
				expect(render_frame().targets.length).toBe(spawned - 2)
			}
		)
		it(
			"starts the run after dispose clean: no targets, full lives, no Fitts trials and no banked samples",
			() => {
				play_fitts_run()
				mode.dispose()
				start_run(START_MS + 100_000)
				expect(render_frame()).toMatchObject(
					{
						lives: "♥ ♥ ♥",
						spawn: "2/s",
						targets: []
					}
				)
				mode.update_hud()
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe("- / -")
			}
		)
		it(
			"update_hud schedules the next update, shows hits over shots in percent and the spawn rate rising per minute",
			() => {
				const { update_interval_ms } = constants.hud
				start_run(START_MS)
				mode.update_hud()
				expect(state.hud.next_update_ms).toBe(START_MS + update_interval_ms)
				expect(
					dom.accuracy_el.getAttribute("value")
				).toBe("0%")
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe("- / -")
				expect(
					dom.crit_rate_el.getAttribute("value")
				).toBe("2/s")
				step(START_MS)
				step(START_MS + 250)
				shoot_at(0, 0)
				shoot_at(300, 0)
				shoot_at(-300, 0)
				mode.update_hud()
				expect(
					dom.accuracy_el.getAttribute("value")
				).toBe("33.33%")
				set_now(START_MS + 60_000)
				mode.update_hud()
				expect(
					dom.crit_rate_el.getAttribute("value")
				).toBe("4/s")
				set_now(START_MS + 90_000)
				mode.update_hud()
				expect(
					dom.crit_rate_el.getAttribute("value")
				).toBe("5/s")
				expect(render_frame().spawn).toBe("5/s")
			}
		)
	}
)