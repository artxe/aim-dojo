import { lol_sens_to_dpi_scale } from "./calc/calc_sens.js"
import constants from "./constants.js"
import { create_pool } from "./pool.js"
export const impacts_3d_pool = create_pool(
	() => {
		/** @type {{ c: boolean | undefined, p: number, r: number, t: number, y: number }} */
		const impact = { c: void 0, p: 0, r: 0, t: 0, y: 0 }
		return impact
	}
)
export const impacts_pool = create_pool(
	() => {
		/** @type {{ c: boolean | undefined, r: number, t: number, x: number, y: number }} */
		const impact = { c: void 0, r: 0, t: 0, x: 0, y: 0 }
		return impact
	}
)
export const shoots_pool = create_pool(
	() => ({ c: false, e: 0, h: false, s: 0 })
)
export default {
	audio: {
		bgm_volume: Number(
			localStorage.getItem("audio.bgm_volume") || 10
		),
		sfx_volume: Number(
			localStorage.getItem("audio.sfx_volume") || 10
		)
	},
	bg: {
		blur: localStorage.getItem("bg.blur") != "false",
		type: /** @type {BackgroundType} */(localStorage.getItem("bg.type") || "default")/**/,
		video_id: localStorage.getItem("bg.video_id") || "",
		youtube_link: localStorage.getItem("bg.youtube_link") || "https://www.youtube.com/watch?v=83C3TZ4Zm_o"
	},
	camera: {
		/** @type {"2d"|"fpp"|"tpp"} */
		dimension: "2d",
		dist: 0,
		fov: 0,
		height: 0,
		pitch: 0,
		proj: new Float32Array(16),
		sens: 0,
		vfov: 0,
		view: new Float32Array(16),
		width: 0,
		x: 0,
		y: 0,
		yaw: 0
	},
	crosshair: {
		color: localStorage.getItem("crosshair.color") || constants.crosshair.color,
		dot: Number(
			localStorage.getItem("crosshair.dot") || constants.crosshair.dot
		),
		gap: Number(
			localStorage.getItem("crosshair.gap") || constants.crosshair.gap
		),
		height: Number(
			localStorage.getItem("crosshair.height") || constants.crosshair.height
		),
		thickness: Number(
			localStorage.getItem("crosshair.thickness") || constants.crosshair.thickness
		),
		width: Number(
			localStorage.getItem("crosshair.width") || constants.crosshair.width
		)
	},
	dpi_norm: /** @type {DpiNormalizerState} */({
		dpi: Number(
			localStorage.getItem("dpi_norm.dpi") || 800
		),
		...(() => {
			const game = /** @type {GameSensName} */(localStorage.getItem("dpi_norm.game") || "lol")/**/
			let sens
			if (game == "al") {
				sens = Number(
					localStorage.getItem("dpi_norm.sens") || 5
				)
			} else if (game == "bdo") {
				sens = Number(
					localStorage.getItem("dpi_norm.sens") || 54
				)
			} else if (game == "cs2") {
				sens = Number(
					localStorage.getItem("dpi_norm.sens") || 2.5
				)
			} else if (game == "fn") {
				sens = Number(
					localStorage.getItem("dpi_norm.sens") || 50
				)
			} else if (game == "lol") {
				sens = Number(
					localStorage.getItem("dpi_norm.sens") || 50
				)
			} else if (game == "mc") {
				sens = Number(
					localStorage.getItem("dpi_norm.sens") || 0.5
				)
			} else if (game == "ow") {
				sens = Number(
					localStorage.getItem("dpi_norm.sens") || 15
				)
			} else if (game == "pubg") {
				sens = Number(
					localStorage.getItem("dpi_norm.sens") || 50
				)
			} else if (game == "r6") {
				sens = Number(
					localStorage.getItem("dpi_norm.sens") || 50
				)
			} else if (game == "sa") {
				sens = Number(
					localStorage.getItem("dpi_norm.sens") || 50
				)
			} else if (game == "val") {
				sens = Number(
					localStorage.getItem("dpi_norm.sens") || 1
				)
			} else {
				throw Error(game)
			}
			return { game, sens: sens }
		})()
	})/**/,
	game: {
		/** @type {GameModeName?} */
		mode: null,
		/** @type {number} */
		raf_id: 0,
		/** @type {number} */
		rest_timeout: 0,
		sens: /** @type {GameSensName} */(localStorage.getItem("game.sens") || "lol")/**/,
		...(() => {
			const lol_sens = Number(
				localStorage.getItem("game.lol_sens") || 50
			)
			const pubg_fov = /** @type {PubgFov} */(Number(
				localStorage.getItem("game.pubg_fov") || 80
			))/**/
			const resolution = /** @type {MonitorResolution} */(localStorage.getItem("game.resolution") || "fhd")/**/
			if (pubg_fov != 80 && pubg_fov != 103) {
				throw Error(pubg_fov)
			}
			let height
			let width
			if (resolution == "fhd") {
				height = 1_080
				width = 1_920
			} else if (resolution == "hd") {
				height = 720
				width = 1_280
			} else if (resolution == "qhd") {
				height = 1_440
				width = 2_560
			} else {
				throw Error(resolution)
			}
			return {
				dpi_scale: lol_sens_to_dpi_scale(lol_sens),
				height,
				lol_sens,
				pubg_fov,
				resolution,
				width
			}
		})()
	},
	hud: { next_update_ms: 0 },
	impact: { rad_size: 0 },
	/**
	 * @type {ReturnType<typeof create_queue<{
	 *	 c: boolean | undefined
	 *	 r: number
	 *	 t: number
	 *	 x: number
	 *	 y: number
	 * }>>}
	 */
	impacts: create_queue(),
	/**
	 * @type {ReturnType<typeof create_queue<{
	 *	 c: boolean | undefined
	 *	 p: number
	 *	 r: number
	 *	 t: number
	 *	 y: number
	 * }>>}
	 */
	impacts_3d: create_queue(),
	input: {
		key_a: false,
		key_e: false,
		key_q: false,
		key_r: false,
		key_space: false,
		key_w: false,
		mb_left: false,
		mb_right: false
	},
	stats: {
		count_crit: 0,
		count_hit: 0,
		count_shoot: 0,
		/**
		 * @type {ReturnType<typeof create_queue<{
		 *	 c: boolean
		 *	 e: number
		 *	 h: boolean
		 *	 s: number
		 * }>>}
		 */
		shoots: create_queue(),
		sum_crit_ms: 0,
		sum_hit_ms: 0,
		sum_shoot_ms: 0
	},
	timer: {
		fps: 0,
		next_frame_ms: 0,
		now_ms: 0,
		now_s: 0,
		prev_ms: 0,
		start_ms: 0
	}
}
/**
 * @template T
 * @returns {{
 *	 readonly array: T[]
 *	 at(index?: number): T
 *	 clear(): void
 *	 drop(): void
 *	 readonly length: number
 *	 push(v: T): void
 * }}
 */
export function create_queue() {
	/**	@type {T[]} */
	const q = []
	let head = 0
	const THRESH = 2_048
	return {
		/** @returns {T[]} */
		get array() {
			return q
		},
		/**
		 * @param {number} [index = 0]
		 * @returns {T}
		 */
		at(index = 0) {
			if (index < 0) {
				const i = q.length + index
				return /** @type {T} */(i >= head ? q[i] : void 0)/**/
			}
			return /** @type {T} */(head + index < q.length ? q[head + index] : void 0)/**/
		},
		/** @returns {void} */
		clear() {
			q.length = 0
			head = 0
		},
		/** @returns {void} */
		drop() {
			if (head >= q.length) {
				return
			}
			if (++head > THRESH && head > (q.length >>> 1)) {
				q.copyWithin(0, head)
				q.length -= head
				head = 0
			}
		},
		/** @returns {number} */
		get length() {
			return q.length - head
		},
		/**
		 * @param {T} v
		 * @returns {void}
		 */
		push(v) {
			q.push(v)
		}
	}
}