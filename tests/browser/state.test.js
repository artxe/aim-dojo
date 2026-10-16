import constants from "../../docs/js/constants.js"
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest"
let load_count = 0
/**
 * @param {string} language
 * @returns {Promise<string>}
 */
async function lang_for(language) {
	vi.spyOn(navigator, "language", "get").mockReturnValue(language)
	const { default: state } = await load_state()
	return state.lang
}
async function load_state() {
	const url = new URL(
		"../../docs/js/state.js",
		import.meta.url
	)
	url.searchParams.set("load", String(++load_count))
	return await import(/* @vite-ignore */url.href)
}
describe(
	"state.js",
	() => {
		beforeEach(
			() => {
				localStorage.clear()
				vi.spyOn(navigator, "language", "get").mockReturnValue("en-US")
				vi.stubGlobal("devicePixelRatio", 1)
				vi.stubGlobal(
					"screen",
					{ height: 1_080, width: 1_920 }
				)
			}
		)
		afterEach(
			() => {
				localStorage.clear()
				vi.restoreAllMocks()
				vi.unstubAllGlobals()
			}
		)
		it(
			"a stored ads_scope that is not a selectable scope of its game falls back to the default scope",
			async () => {
				/** @type {[string, string][]} */
				const entries = [
					[ "game.ads_scope.al", "awp" ],
					[ "game.ads_scope.cs2", "x1" ],
					[ "game.ads_scope.fn", "" ],
					[ "game.ads_scope.ow", "toString" ],
					[
						"game.ads_scope.pubg",
						"constructor"
					],
					[ "game.ads_scope.r6", "x7" ],
					[ "game.ads_scope.rb", "hipfire" ],
					[
						"game.ads_scope.val",
						"operator5"
					]
				]
				for (const [ key, value ] of entries) {
					localStorage.setItem(key, value)
				}
				const { default: state } = await load_state()
				expect(state.game.ads_scope).toEqual(constants.game.ads_scope)
			}
		)
		it(
			"a stored lang wins over navigator.language",
			async () => {
				localStorage.setItem("lang", "en")
				expect(await lang_for("ko-KR")).toBe("en")
			}
		)
		it(
			"a stored pubg_fov other than the base or fpp fov throws with the value",
			async () => {
				localStorage.setItem("game.pubg_fov", "90")
				await expect(load_state()).rejects.toThrow("90")
			}
		)
		it(
			"an empty localStorage seeds every persisted field from constants",
			async () => {
				const { default: state } = await load_state()
				expect(state.audio).toEqual(
					{
						bgm_volume: constants.audio.bgm_volume,
						sfx_volume: constants.audio.sfx_volume
					}
				)
				expect(state.bg).toEqual(
					{
						blur: true,
						type: constants.bg.type,
						video_id: "",
						youtube_link: constants.bg.youtube_link
					}
				)
				expect(state.cpi_norm).toEqual(
					{
						cpi: constants.cpi_norm.cpi,
						game: constants.cpi_norm.game,
						sens: constants.cpi_norm.default_sens[constants.cpi_norm.game],
						x: 0
					}
				)
				expect(state.crosshair).toEqual(constants.crosshair)
				expect(state.game.ads_scope).toEqual(constants.game.ads_scope)
				expect(state.game.ads_toggle).toBe(false)
				expect(state.game.cpi_scale).toBe(1)
				expect(state.game.height).toBe(1_080)
				expect(state.game.lol_sens).toBe(constants.game.lol_sens)
				expect(state.game.pubg_fov).toBe(constants.game.pubg_fov)
				expect(state.game.sens).toBe(constants.game.sens)
				expect(state.game.width).toBe(1_920)
				expect(state.lang).toBe("en")
				expect(state.render.scale).toBe(constants.render.scale)
			}
		)
		it(
			"bg.blur is on and ads_toggle off for any stored value but their exact strings",
			async () => {
				localStorage.setItem("bg.blur", "0")
				localStorage.setItem("game.ads_toggle", "1")
				const { default: state } = await load_state()
				expect(state.bg.blur).toBe(true)
				expect(state.game.ads_toggle).toBe(false)
			}
		)
		it(
			"cpi_norm.sens defaults to the default sens of the stored cpi_norm game",
			async () => {
				localStorage.setItem("cpi_norm.game", "mc")
				const { default: state } = await load_state()
				expect(state.cpi_norm.game).toBe("mc")
				expect(state.cpi_norm.sens).toBe(
					constants.cpi_norm.default_sens.mc
				)
			}
		)
		it(
			"every persisted field is read back from its localStorage key",
			async () => {
				/** @type {[string, string][]} */
				const entries = [
					[ "audio.bgm_volume", "3" ],
					[ "audio.sfx_volume", "7" ],
					[ "bg.blur", "false" ],
					[ "bg.type", "youtube" ],
					[ "bg.video_id", "clip-1" ],
					[
						"bg.youtube_link",
						"https://www.youtube.com/watch?v=abc"
					],
					[ "cpi_norm.cpi", "1600" ],
					[ "cpi_norm.game", "cs2" ],
					[ "cpi_norm.sens", "1.25" ],
					[ "cpi_norm.x", "500" ],
					[
						"crosshair.color",
						"rgba(255,0,0,1)"
					],
					[ "crosshair.dot", "3" ],
					[ "crosshair.gap", "5" ],
					[ "crosshair.height", "12" ],
					[ "crosshair.thickness", "4" ],
					[ "crosshair.width", "14" ],
					[ "game.ads_scope.al", "x4" ],
					[ "game.ads_scope.cs2", "aug" ],
					[ "game.ads_scope.fn", "scoped15" ],
					[ "game.ads_scope.ow", "ashe" ],
					[ "game.ads_scope.pubg", "x8" ],
					[ "game.ads_scope.r6", "x12" ],
					[ "game.ads_scope.rb", "pistol" ],
					[ "game.ads_scope.val", "vandal" ],
					[ "game.ads_toggle", "true" ],
					[ "game.height", "1440" ],
					[ "game.lol_sens", "25" ],
					[ "game.pubg_fov", "103" ],
					[ "game.sens", "pubg" ],
					[ "game.width", "2560" ],
					[ "lang", "ko" ],
					[ "render.scale", "50" ]
				]
				for (const [ key, value ] of entries) {
					localStorage.setItem(key, value)
				}
				const { default: state } = await load_state()
				expect(state.audio).toEqual(
					{ bgm_volume: 3, sfx_volume: 7 }
				)
				expect(state.bg).toEqual(
					{
						blur: false,
						type: "youtube",
						video_id: "clip-1",
						youtube_link: "https://www.youtube.com/watch?v=abc"
					}
				)
				expect(state.cpi_norm).toEqual(
					{
						cpi: 1_600,
						game: "cs2",
						sens: 1.25,
						x: 500
					}
				)
				expect(state.crosshair).toEqual(
					{
						color: "rgba(255,0,0,1)",
						dot: 3,
						gap: 5,
						height: 12,
						thickness: 4,
						width: 14
					}
				)
				expect(state.game.ads_scope).toEqual(
					{
						al: "x4",
						cs2: "aug",
						fn: "scoped15",
						ow: "ashe",
						pubg: "x8",
						r6: "x12",
						rb: "pistol",
						val: "vandal"
					}
				)
				expect(state.game.ads_toggle).toBe(true)
				expect(state.game.cpi_scale).toBe(.375)
				expect(state.game.height).toBe(1_440)
				expect(state.game.lol_sens).toBe(25)
				expect(state.game.pubg_fov).toBe(103)
				expect(state.game.sens).toBe("pubg")
				expect(state.game.width).toBe(2_560)
				expect(state.lang).toBe("ko")
				expect(state.render.scale).toBe(50)
			}
		)
		it(
			"game width and height fall back to the screen size times devicePixelRatio, rounded",
			async () => {
				vi.stubGlobal("devicePixelRatio", 1.25)
				vi.stubGlobal(
					"screen",
					{ height: 768, width: 1_366 }
				)
				localStorage.setItem("game.height", "0")
				localStorage.setItem("game.width", "wide")
				const { default: state } = await load_state()
				expect(state.game.height).toBe(960)
				expect(state.game.width).toBe(1_708)
			}
		)
		it(
			"lang is ko for a Korean navigator.language and en for any other when none is stored",
			async () => {
				expect(await lang_for("ko")).toBe("ko")
				expect(await lang_for("ko-KR")).toBe("ko")
				expect(await lang_for("en-GB")).toBe("en")
				expect(await lang_for("ja-JP")).toBe("en")
			}
		)
		it(
			"the pools build zeroed entries and hand recycled ones back",
			async () => {
				const {
					impacts_3d_pool,
					impacts_pool,
					shoots_pool
				} = await load_state()
				const impact_3d = impacts_3d_pool.obtain()
				const impact = impacts_pool.obtain()
				const shoot = shoots_pool.obtain()
				expect(impact_3d).toStrictEqual(
					{ c: void 0, p: 0, r: 0, t: 0, y: 0 }
				)
				expect(impact).toStrictEqual(
					{ c: void 0, r: 0, t: 0, x: 0, y: 0 }
				)
				expect(shoot).toStrictEqual(
					{ c: false, d: 0, e: 0, h: false, s: 0 }
				)
				impacts_3d_pool.recycle(impact_3d)
				impacts_pool.recycle(impact)
				shoots_pool.recycle(shoot)
				expect(impacts_3d_pool.obtain()).toBe(impact_3d)
				expect(impacts_pool.obtain()).toBe(impact)
				expect(shoots_pool.obtain()).toBe(shoot)
				expect(impacts_pool.obtain()).not.toBe(impact)
			}
		)
	}
)