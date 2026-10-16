import { load_page } from "./helpers/dom.js"
import { beforeAll, describe, expect, it, vi } from "vitest"
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
const GAME_MODE_NAMES = [
	"aim_booster",
	"h_tracking",
	"precision",
	"writing"
]
describe(
	"game_mode/index.js",
	() => {
		beforeAll(
			() => {
				localStorage.clear()
				load_page()
			}
		)
		it(
			"every mapped mode implements the GameMode lifecycle, with update_dimension only on the 2D/3D modes",
			async () => {
				const { default: game_mode } = await import("../../docs/js/game_mode/index.js")
				for (const name of GAME_MODE_NAMES) {
					const mode = game_mode[name]
					for (const key of [
						"clear_score",
						"dispose",
						"init",
						"on_frame",
						"render",
						"shoot",
						"update_hud"
					]) {
						expect(typeof mode[key]).toBe("function")
					}
				}
				expect(
					game_mode.aim_booster.update_dimension
				).toBeUndefined()
				expect(
					typeof game_mode.h_tracking.update_dimension
				).toBe("function")
				expect(
					typeof game_mode.precision.update_dimension
				).toBe("function")
				expect(
					game_mode.writing.update_dimension
				).toBeUndefined()
				expect(
					typeof game_mode.writing.on_move
				).toBe("function")
			}
		)
		it(
			"maps every GameModeName through a getter to that mode module's default export",
			async () => {
				const { default: game_mode } = await import("../../docs/js/game_mode/index.js")
				const modes = {
					aim_booster: (await import("../../docs/js/game_mode/aim_booster.js")).default,
					h_tracking: (await import("../../docs/js/game_mode/h_tracking.js")).default,
					precision: (await import("../../docs/js/game_mode/precision.js")).default,
					writing: (await import("../../docs/js/game_mode/writing.js")).default
				}
				expect(Object.keys(game_mode)).toEqual(GAME_MODE_NAMES)
				for (const name of GAME_MODE_NAMES) {
					const descriptor = Object.getOwnPropertyDescriptor(game_mode, name)
					expect(typeof descriptor?.get).toBe("function")
					expect(descriptor?.set).toBeUndefined()
					expect(game_mode[name]).toBe(modes[name])
				}
			}
		)
	}
)