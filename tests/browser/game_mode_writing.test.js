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
const FIRING_INPUTS = [
	"key_a",
	"key_e",
	"key_q",
	"key_r",
	"key_w",
	"mb_left",
	"mb_right"
]
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
 * @param {Awaited<ReturnType<typeof setup>>} ctx
 * @returns {WritingWorkerRequest}
 */
function flush(ctx) {
	ctx.writing.check_stats?.()
	const { calls } = post_writing_worker_message.mock
	const [ message, transfer ] = calls[calls.length - 1]
	expect(message.fn).toBe("check_writing_stats")
	expect(transfer).toHaveLength(1)
	expect(transfer[0]).toBe(message.segments.buffer)
	return message
}
/**
 * @param {Awaited<ReturnType<typeof setup>>} ctx
 * @param {number} x
 * @param {number} y
 * @returns {void}
 */
function move(ctx, x, y) {
	ctx.state.camera.x = x
	ctx.state.camera.y = y
	ctx.writing.on_move?.()
}
/**
 * @param {Awaited<ReturnType<typeof setup>>["state"]} state
 * @returns {void}
 */
function release(state) {
	for (const key of FIRING_INPUTS) {
		state.input[key] = false
	}
}
/** @returns {number} */
function set_text_count() {
	return post_writing_worker_message.mock.calls
		.filter(
			([ message ]) => message.fn == "set_writing_text"
		)
		.length
}
async function setup() {
	const { default: constants } = await import("../../docs/js/constants.js")
	const dom = await import("../../docs/js/controller/dom.js")
	const { context_2d } = await import("../../docs/js/render/renderer_2d.js")
	const { default: state } = await import("../../docs/js/state.js")
	instance++
	/** @type {{ check_writing_stats: (count_hit: number, count_shoot: number) => void, default: GameMode }} */
	const module = await import(
		/* @vite-ignore */`../../docs/js/game_mode/writing.js?instance=${instance}`
	)
	state.camera.height = 1_080
	state.camera.width = 1_920
	state.camera.x = 0
	state.camera.y = 0
	state.game.mode = "writing"
	state.game.sens = "val"
	state.input.ads_stage = 0
	release(state)
	state.lang = "en"
	state.stats.count_hit = 0
	state.stats.count_shoot = 0
	state.timer.now_ms = 1_000
	state.timer.prev_ms = 1_000
	state.timer.start_ms = 1_000
	post_writing_worker_message.mockClear()
	module.default.init()
	return {
		check_writing_stats: module.check_writing_stats,
		constants,
		context_2d,
		dom,
		state,
		writing: module.default
	}
}
describe(
	"game_mode/writing.js",
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
			"build_text posts set_writing_text once per run with the bold monospace text's alpha buffer transferred",
			async () => {
				const ctx = await setup()
				const { constants, state, writing } = ctx
				const { size } = constants.grid
				const {
					font_ratio,
					offset_x,
					sentences,
					text_alpha
				} = constants.mode.writing
				expect(set_text_count()).toBe(1)
				const [ message, transfer ] = post_writing_worker_message.mock.calls[0]
				expect(message.fn).toBe("set_writing_text")
				expect(message.height).toBe(sentences.length * size)
				const measure = /** @type {OffscreenCanvasRenderingContext2D} */(new OffscreenCanvas(1, 1).getContext("2d"))/**/
				measure.font = `bold ${size * font_ratio | 0}px monospace`
				let max_w = 0
				for (const line of sentences) {
					max_w = Math.max(
						max_w,
						Math.ceil(
							measure.measureText(line).width
						)
					)
				}
				expect(message.width).toBe(max_w + offset_x * 2)
				expect(message.text_data).toHaveLength(
					message.width * message.height * 4
				)
				expect(transfer).toHaveLength(1)
				expect(transfer[0]).toBe(message.text_data.buffer)
				let max_alpha = 0
				for (let i = 3; i < message.text_data.length; i += 4) {
					max_alpha = Math.max(max_alpha, message.text_data[i])
				}
				expect(
					Math.abs(max_alpha - text_alpha * 255)
				).toBeLessThanOrEqual(1)
				writing.on_frame()
				writing.check_stats?.()
				writing.update_hud()
				expect(set_text_count()).toBe(1)
				writing.dispose()
				state.game.mode = "writing"
				writing.init()
				expect(set_text_count()).toBe(2)
			}
		)
		it(
			"build_text shuffles the sentences in place each run: with random() = 0 Fisher-Yates rotates them left by one",
			async () => {
				random.mockReturnValue(0)
				/** @type {string[]} */
				const fonts = []
				const fill_text = vi.spyOn(
					OffscreenCanvasRenderingContext2D.prototype,
					"fillText"
				)
					.mockImplementation(
						/** @this {OffscreenCanvasRenderingContext2D} */
						function() {
							fonts.push(this.font)
						}
					)
				const { constants, state, writing } = await setup()
				const { size } = constants.grid
				const { font_ratio, offset_x, sentences } = constants.mode.writing
				const n = sentences.length
				expect(fill_text.mock.calls).toEqual(
					sentences.map(
						(_, r) => [
							sentences[(r + 1) % n],
							offset_x,
							r * size + size / 2
						]
					)
				)
				expect(new Set(fonts)).toEqual(
					new Set(
						[
							`bold ${size * font_ratio | 0}px monospace`
						]
					)
				)
				fill_text.mockClear()
				writing.dispose()
				state.game.mode = "writing"
				writing.init()
				expect(
					fill_text.mock.calls.map(([ line ]) => line)
				).toEqual(
					sentences.map(
						(_, r) => sentences[(r + 2) % n]
					)
				)
				fill_text.mockRestore()
			}
		)
		it(
			"check_writing_stats writes the worker counts only while writing is the mode",
			async () => {
				const { check_writing_stats, state } = await setup()
				check_writing_stats(5, 9)
				expect(
					[
						state.stats.count_hit,
						state.stats.count_shoot
					]
				).toEqual([ 5, 9 ])
				state.game.mode = "precision"
				check_writing_stats(1, 2)
				state.game.mode = null
				check_writing_stats(1, 2)
				expect(
					[
						state.stats.count_hit,
						state.stats.count_shoot
					]
				).toEqual([ 5, 9 ])
			}
		)
		it(
			"dispose banks the run average as the all-time record under writing#runs, restores the HUD and resets the run",
			async () => {
				const ctx = await setup()
				const {
					check_writing_stats,
					dom,
					state,
					writing
				} = ctx
				const close = vi.spyOn(ImageBitmap.prototype, "close")
				state.camera.x = 30
				state.camera.y = -20
				check_writing_stats(300, 400)
				at(ctx, 11_000)
				writing.update_hud()
				writing.dispose()
				expect(close).toHaveBeenCalledTimes(1)
				expect(
					localStorage.getItem("writing#runs")
				).toBe("22.5")
				expect(
					dom.writing_score_el.textContent
				).toBe("22.5")
				expect(dom.clear_writing_btn.disabled).toBe(false)
				expect(state.game.mode).toBeNull()
				expect(dom.run_score_el.textContent).toBe("Score")
				expect(dom.accuracy_el.textContent).toBe("Accuracy")
				expect(dom.crit_rate_el.textContent).toBe("Critical")
				expect(
					dom.run_score_el.hasAttribute("value")
				).toBe(false)
				expect(
					dom.accuracy_el.hasAttribute("value")
				).toBe(false)
				expect(
					[ state.camera.x, state.camera.y ]
				).toEqual([ 0, 0 ])
				expect(
					[
						state.stats.count_hit,
						state.stats.count_shoot
					]
				).toEqual([ 0, 0 ])
				expect(state.impact.rad_size).toBe(0)
				state.game.mode = "writing"
				state.timer.start_ms = state.timer.now_ms
				writing.init()
				check_writing_stats(100, 400)
				at(ctx, 21_000)
				writing.update_hud()
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe("2.5 / 2.5")
				writing.dispose()
				expect(
					localStorage.getItem("writing#runs")
				).toBe("22.5")
				expect(
					dom.writing_score_el.textContent
				).toBe("22.5")
				close.mockRestore()
			}
		)
		it(
			"dispose drops the old run's strokes, pending delta and pen, so the next run starts clean",
			async () => {
				const ctx = await setup()
				const {
					constants,
					context_2d,
					state,
					writing
				} = ctx
				state.input.mb_left = true
				move(ctx, 0, 0)
				move(ctx, 2, 0)
				at(ctx, 2_000)
				move(ctx, 4, 0)
				at(
					ctx,
					1_000 + constants.hud.window_ms
				)
				writing.on_frame()
				writing.dispose()
				expect(
					localStorage.getItem("writing#runs")
				).toBeNull()
				state.game.mode = "writing"
				writing.init()
				expect(flush(ctx)).toMatchObject(
					{
						drop_count: 0,
						segments: new Float64Array(0)
					}
				)
				const line_to = vi.spyOn(context_2d, "lineTo")
				writing.render()
				expect(line_to).not.toHaveBeenCalled()
				move(ctx, 10, 0)
				move(ctx, 12, 0)
				expect(flush(ctx).segments).toEqual(
					new Float64Array([ 12, 0, 10, 0 ])
				)
				line_to.mockRestore()
			}
		)
		it(
			"every movement key and mouse button held draws, and nothing held draws nothing",
			async () => {
				const ctx = await setup()
				const { state, writing } = ctx
				/** @type {number[]} */
				const expected = []
				let x = 0
				for (const key of FIRING_INPUTS) {
					state.input[key] = true
					move(ctx, x, 0)
					move(ctx, x + 2, 0)
					expected.push(x + 2, 0, x, 0)
					state.input[key] = false
					writing.on_frame()
					move(ctx, x + 5, 0)
					x += 10
				}
				expect(flush(ctx).segments).toEqual(new Float64Array(expected))
			}
		)
		it(
			"init labels the HUD Px/s, On Text and Critical and forces the 2D view after update_camera_view filled the camera",
			async () => {
				const { constants, dom, state } = await setup()
				expect(dom.run_score_el.textContent).toBe("Px/s")
				expect(dom.accuracy_el.textContent).toBe("On Text")
				expect(dom.crit_rate_el.textContent).toBe("Critical")
				expect(state.camera.dimension).toBe("2d")
				expect(state.camera.view_fov).toBe(constants.fov.val.hipfire)
				expect(state.camera.sens).toBeGreaterThan(0)
				expect(state.impact.rad_size).toBeGreaterThan(0)
			}
		)
		it(
			"on_frame lifts the pen only once nothing is held, so the next stroke starts where the pen lands",
			async () => {
				const ctx = await setup()
				const { state, writing } = ctx
				state.input.mb_left = true
				move(ctx, 0, 0)
				move(ctx, 2, 0)
				writing.on_frame()
				move(ctx, 4, 0)
				state.input.mb_left = false
				writing.on_frame()
				state.input.mb_left = true
				move(ctx, 10, 0)
				move(ctx, 12, 0)
				expect(flush(ctx).segments).toEqual(
					new Float64Array(
						[ 2, 0, 0, 0, 4, 0, 2, 0, 12, 0, 10, 0 ]
					)
				)
			}
		)
		it(
			"render draws the grid, the text image at the world origin and the strokes under the camera translate, a new subpath only at gaps",
			async () => {
				const ctx = await setup()
				const { context_2d, state, writing } = ctx
				state.input.mb_left = true
				move(ctx, 0, 0)
				move(ctx, 2, 0)
				move(ctx, 4, 0)
				state.input.mb_left = false
				writing.on_frame()
				state.input.mb_left = true
				move(ctx, 10, 0)
				move(ctx, 12, 0)
				const before = context_2d.getTransform()
				const draw_image = vi.spyOn(context_2d, "drawImage")
				const line_to = vi.spyOn(context_2d, "lineTo")
				const move_to = vi.spyOn(context_2d, "moveTo")
				const translate = vi.spyOn(context_2d, "translate")
				writing.render()
				const [ image, x, y ] = draw_image.mock.calls[0]
				expect(image).toBeInstanceOf(ImageBitmap)
				expect([ x, y ]).toEqual([ 0, 0 ])
				expect(
					/** @type {ImageBitmap} */(image)/**/.width
				).toBe(
					post_writing_worker_message.mock.calls[0][0].width
				)
				expect(move_to.mock.calls).toEqual([ [ 0, 0 ], [ 10, 0 ] ])
				expect(line_to.mock.calls).toEqual(
					[ [ 2, 0 ], [ 4, 0 ], [ 12, 0 ] ]
				)
				expect(translate.mock.calls).toEqual([ [ 960, 540 ], [ -12, -0 ] ])
				expect(context_2d.getTransform()).toEqual(before)
				for (const spy of [
					draw_image,
					line_to,
					move_to,
					translate
				]) {
					spy.mockRestore()
				}
			}
		)
		it(
			"segments older than window_ms age out on on_frame and are reported once as drop_count",
			async () => {
				const ctx = await setup()
				const { constants, state, writing } = ctx
				const { window_ms } = constants.hud
				state.input.mb_left = true
				move(ctx, 0, 0)
				move(ctx, 2, 0)
				at(ctx, 2_000)
				move(ctx, 4, 0)
				at(ctx, 3_000)
				move(ctx, 6, 0)
				expect(flush(ctx).segments).toHaveLength(12)
				at(ctx, 1_999 + window_ms)
				writing.on_frame()
				expect(flush(ctx)).toMatchObject(
					{
						drop_count: 1,
						segments: new Float64Array(0)
					}
				)
				expect(flush(ctx).drop_count).toBe(0)
				at(ctx, 3_000 + window_ms)
				writing.on_frame()
				expect(flush(ctx).drop_count).toBe(2)
			}
		)
		it(
			"the pen appends a segment from the last point once the crosshair moved line_width px, and check_stats posts only that delta",
			async () => {
				const ctx = await setup()
				const { constants, state, writing } = ctx
				move(ctx, 5, 5)
				state.input.mb_left = true
				state.camera.x = 0
				state.camera.y = 0
				writing.shoot()
				move(ctx, 1, 1)
				move(ctx, 2, 0)
				move(ctx, 2, 1.9)
				move(ctx, 2, 2)
				expect(flush(ctx)).toEqual(
					{
						drop_count: 0,
						fn: "check_writing_stats",
						line_width: constants.mode.writing.line_width,
						segments: new Float64Array([ 2, 0, 0, 0, 2, 2, 2, 0 ])
					}
				)
				move(ctx, 4, 2)
				expect(flush(ctx).segments).toEqual(
					new Float64Array([ 4, 2, 2, 2 ])
				)
				expect(flush(ctx).segments).toEqual(new Float64Array(0))
			}
		)
		it(
			"the record loads from writing#runs (a legacy ring keeps its maximum) and clear_score resets it with a toast in the player's language",
			async () => {
				localStorage.setItem("writing#runs", "1,4.5,2")
				const { dom, state, writing } = await setup()
				expect(
					dom.writing_score_el.textContent
				).toBe("4.5")
				expect(dom.clear_writing_btn.disabled).toBe(false)
				writing.clear_score()
				expect(
					localStorage.getItem("writing#runs")
				).toBeNull()
				expect(
					dom.writing_score_el.textContent
				).toBe("0")
				expect(dom.clear_writing_btn.disabled).toBe(true)
				expect(
					dom.toast_el.firstElementChild?.textContent
				).toBe(
					"Writing score has been reset!"
				)
				state.lang = "ko"
				writing.clear_score()
				expect(
					dom.toast_el.firstElementChild?.textContent
				).toBe(
					"Writing 점수를 초기화했습니다!"
				)
			}
		)
		it(
			"the stroke ring compacts in place once more than half of it aged out",
			async () => {
				const ctx = await setup()
				const {
					constants,
					context_2d,
					state,
					writing
				} = ctx
				state.input.mb_left = true
				move(ctx, 0, 0)
				for (let i = 1; i <= 4_096; i++) {
					at(ctx, 1_000 + i)
					move(ctx, i * 2, 0)
				}
				flush(ctx)
				at(
					ctx,
					4_000 + constants.hud.window_ms
				)
				writing.on_frame()
				move(ctx, 4_097 * 2, 0)
				expect(flush(ctx)).toMatchObject(
					{
						drop_count: 3_000,
						segments: new Float64Array([ 8_194, 0, 8_192, 0 ])
					}
				)
				const line_to = vi.spyOn(context_2d, "lineTo")
				const move_to = vi.spyOn(context_2d, "moveTo")
				writing.render()
				expect(move_to.mock.calls).toEqual([ [ 6_000, 0 ] ])
				expect(line_to).toHaveBeenCalledTimes(1_097)
				expect(line_to.mock.calls[0]).toEqual([ 6_002, 0 ])
				expect(line_to.mock.calls[1_096]).toEqual([ 8_194, 0 ])
				line_to.mockRestore()
				move_to.mockRestore()
			}
		)
		it(
			"the stroke ring doubles past its capacity and keeps every pending segment in order",
			async () => {
				const ctx = await setup()
				const { state } = ctx
				state.input.mb_left = true
				move(ctx, 0, 0)
				/** @type {number[]} */
				const expected = []
				for (let i = 1; i <= 4_097; i++) {
					at(ctx, 1_000 + i)
					move(ctx, i * 2, 0)
					expected.push(i * 2, 0, i * 2 - 2, 0)
				}
				expect(flush(ctx).segments).toEqual(new Float64Array(expected))
			}
		)
		it(
			"update_hud scores count_hit squared over count_shoot per elapsed second, the window capping the elapsed time",
			async () => {
				const ctx = await setup()
				const {
					check_writing_stats,
					constants,
					dom,
					state,
					writing
				} = ctx
				const { update_interval_ms, window_ms } = constants.hud
				writing.update_hud()
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe("0 / 0")
				expect(
					dom.accuracy_el.getAttribute("value")
				).toBe("0%")
				expect(state.hud.next_update_ms).toBe(1_000 + update_interval_ms)
				check_writing_stats(300, 400)
				writing.update_hud()
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe("0 / 0")
				expect(
					dom.accuracy_el.getAttribute("value")
				).toBe("75%")
				at(ctx, 11_000)
				writing.update_hud()
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe("22.5 / 22.5")
				at(ctx, 1_000 + window_ms + 10_000)
				writing.update_hud()
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe("7.5 / 15")
				expect(state.hud.next_update_ms).toBe(
					1_000 + window_ms + 10_000 + update_interval_ms
				)
				check_writing_stats(0, 0)
				writing.update_hud()
				expect(
					dom.run_score_el.getAttribute("value")
				).toBe("0 / 15")
				expect(
					dom.accuracy_el.getAttribute("value")
				).toBe("0%")
			}
		)
	}
)