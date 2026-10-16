import { load_page } from "./helpers/dom.js"
import { beforeAll, describe, expect, it, vi } from "vitest"
/**
 * @param {number} now_ms
 * @param {number} start_ms
 * @returns {Promise<string>}
 */
async function timer_text(now_ms, start_ms) {
	const { default: state } = await import("../../docs/js/state.js")
	const dom = await import("../../docs/js/controller/dom.js")
	const { update_hud } = await import("../../docs/js/controller/hud.js")
	state.timer.fps = 0
	state.timer.fps_ms = now_ms
	state.timer.now_ms = now_ms
	state.timer.start_ms = start_ms
	update_hud({ update_hud: vi.fn() })
	return String(dom.timer_el.textContent).split(" / ")[1]
}
describe(
	"controller/hud.js",
	() => {
		beforeAll(load_page)
		it(
			"fps and the frame counter stay untouched before fps_interval_ms has passed",
			async () => {
				const { default: constants } = await import("../../docs/js/constants.js")
				const { default: state } = await import("../../docs/js/state.js")
				const dom = await import("../../docs/js/controller/dom.js")
				const { update_hud } = await import("../../docs/js/controller/hud.js")
				state.timer.fps = 59.6
				state.timer.fps_ms = 100
				state.timer.frame_count = 12
				state.timer.now_ms = 100 + constants.hud.fps_interval_ms - 1
				update_hud({ update_hud: vi.fn() })
				expect(state.timer.fps).toBe(59.6)
				expect(state.timer.fps_ms).toBe(100)
				expect(state.timer.frame_count).toBe(12)
				expect(dom.timer_el.textContent).toMatch(/^60 \//)
			}
		)
		it(
			"fps is a frame count, not 1000 over the last frame delta",
			async () => {
				const { default: constants } = await import("../../docs/js/constants.js")
				const { default: state } = await import("../../docs/js/state.js")
				const { update_hud } = await import("../../docs/js/controller/hud.js")
				const interval = constants.hud.fps_interval_ms
				state.timer.fps_ms = 0
				state.timer.frame_count = 30
				state.timer.now_ms = interval
				state.timer.prev_ms = interval - 1
				update_hud({ update_hud: vi.fn() })
				expect(state.timer.fps).toBe(30 * 1_000 / interval)
			}
		)
		it(
			"fps is the frame count over the elapsed time once fps_interval_ms has passed, and resets the counter",
			async () => {
				const { default: constants } = await import("../../docs/js/constants.js")
				const { default: state } = await import("../../docs/js/state.js")
				const dom = await import("../../docs/js/controller/dom.js")
				const { update_hud } = await import("../../docs/js/controller/hud.js")
				const interval = constants.hud.fps_interval_ms
				state.timer.fps_ms = 1_000
				state.timer.frame_count = 48
				state.timer.now_ms = 1_000 + interval + 300
				update_hud({ update_hud: vi.fn() })
				expect(state.timer.fps).toBe(48 * 1_000 / (interval + 300))
				expect(state.timer.fps_ms).toBe(1_000 + interval + 300)
				expect(state.timer.frame_count).toBe(0)
				expect(dom.timer_el.textContent).toMatch(/^60 \//)
			}
		)
		it(
			"the error text is a percentage with a plus sign only when positive and two decimals",
			async () => {
				const { default: state } = await import("../../docs/js/state.js")
				const dom = await import("../../docs/js/controller/dom.js")
				const { update_hud } = await import("../../docs/js/controller/hud.js")
				/** @type {[number, string][]} */
				const cases = [
					[ .0123, "error: +1.23%" ],
					[ .012349, "error: +1.23%" ],
					[ -.5, "error: -50%" ],
					[ -.00456, "error: -0.46%" ],
					[ 0, "error: 0%" ],
					[ -1e-9, "error: 0%" ]
				]
				for (const [ ratio, text ] of cases) {
					state.camera.sens_error = ratio
					update_hud({ update_hud: vi.fn() })
					expect(dom.sens_error_el.textContent).toBe(text)
				}
			}
		)
		it(
			"the fov text is 2D in the 2d view",
			async () => {
				const { default: state } = await import("../../docs/js/state.js")
				const dom = await import("../../docs/js/controller/dom.js")
				const { update_hud } = await import("../../docs/js/controller/hud.js")
				state.camera.dimension = "2d"
				state.camera.fov = 90
				update_hud({ update_hud: vi.fn() })
				expect(dom.fov_el.textContent).toBe("2D")
			}
		)
		it(
			"the fov text is the dimension and the fov rounded to two decimals in a 3D view",
			async () => {
				const { default: state } = await import("../../docs/js/state.js")
				const dom = await import("../../docs/js/controller/dom.js")
				const { update_hud } = await import("../../docs/js/controller/hud.js")
				state.camera.dimension = "fpp"
				state.camera.fov = 90.5
				update_hud({ update_hud: vi.fn() })
				expect(dom.fov_el.textContent).toBe("fpp 90.5°")
				state.camera.dimension = "tpp"
				state.camera.fov = 73.4567
				update_hud({ update_hud: vi.fn() })
				expect(dom.fov_el.textContent).toBe("tpp 73.46°")
			}
		)
		it(
			"the timer shows h:mm:ss from one hour on",
			async () => {
				expect(await timer_text(3_600_000, 0)).toBe("1:00:00")
				expect(await timer_text(3_661_000, 0)).toBe("1:01:01")
				expect(
					await timer_text(
						11 * 3_600_000 + 23 * 60_000 + 45_000,
						0
					)
				).toBe("11:23:45")
			}
		)
		it(
			"the timer shows mm:ss under an hour with zero padding",
			async () => {
				expect(await timer_text(0, 0)).toBe("00:00")
				expect(await timer_text(65_999, 0)).toBe("01:05")
				expect(
					await timer_text(70_000, 10_000)
				).toBe("01:00")
				expect(await timer_text(3_599_999, 0)).toBe("59:59")
			}
		)
		it(
			"update_hud calls the mode's update_hud once",
			async () => {
				const { update_hud } = await import("../../docs/js/controller/hud.js")
				const mode = { update_hud: vi.fn() }
				update_hud(mode)
				expect(mode.update_hud).toHaveBeenCalledTimes(1)
			}
		)
	}
)