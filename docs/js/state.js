import constants from "./constants.js"
import { ceil, max } from "./math.js"
const game_resolution = /** @type {MonitorResolution} */(localStorage.getItem("game.resolution") || "fhd")/**/
let game_height
let game_width
if (game_resolution == "fhd") {
	game_height = 1_080
	game_width = 1_920
} else if (game_resolution == "hd") {
	game_height = 720
	game_width = 1_280
} else if (game_resolution == "qhd") {
	game_height = 1_440
	game_width = 2_560
} else {
	throw Error(game_resolution)
}
const dpi_norm_game = /** @type {GameSensName} */(localStorage.getItem("dpi_norm.game") || "lol")/**/
let dpi_norm_fov
let dpi_norm_sens
let dpi_norm_zoom
if (dpi_norm_game == "cs2") {
	dpi_norm_fov = localStorage.getItem("dpi_norm.fov") || "hipfire"
	dpi_norm_sens = Number(
		localStorage.getItem("dpi_norm.sens") || 2.5
	)
	if (dpi_norm_fov != "hipfire") {
		dpi_norm_zoom = Number(
			localStorage.getItem("dpi_norm.zoom") || 1
		)
	}
} else if (dpi_norm_game == "fn") {
	dpi_norm_fov = localStorage.getItem("dpi_norm.fov") || "hipfire"
	dpi_norm_sens = Number(
		localStorage.getItem("dpi_norm.sens") || 50
	)
	if (dpi_norm_fov != "hipfire") {
		dpi_norm_zoom = Number(
			localStorage.getItem("dpi_norm.zoom") || 100
		)
	}
} else if (dpi_norm_game == "lol") {
	dpi_norm_sens = Number(
		localStorage.getItem("dpi_norm.sens") || 50
	)
} else if (dpi_norm_game == "mc") {
	dpi_norm_sens = Number(
		localStorage.getItem("dpi_norm.sens") || 50
	)
} else if (dpi_norm_game == "ow") {
	dpi_norm_fov = localStorage.getItem("dpi_norm.fov") || "hipfire"
	dpi_norm_sens = Number(
		localStorage.getItem("dpi_norm.sens") || 15
	)
	if (dpi_norm_fov != "hipfire") {
		dpi_norm_zoom = Number(
			localStorage.getItem("dpi_norm.zoom") || 100
		)
	}
} else if (dpi_norm_game == "pubg") {
	dpi_norm_fov = localStorage.getItem("dpi_norm.fov") || "hipfire"
	dpi_norm_sens = Number(
		localStorage.getItem("dpi_norm.sens") || 50
	)
} else if (dpi_norm_game == "sa") {
	dpi_norm_fov = localStorage.getItem("dpi_norm.fov") || "hipfire"
	dpi_norm_sens = Number(
		localStorage.getItem("dpi_norm.sens") || 50
	)
} else if (dpi_norm_game == "val") {
	dpi_norm_fov = localStorage.getItem("dpi_norm.fov") || "hipfire"
	dpi_norm_sens = Number(
		localStorage.getItem("dpi_norm.sens") || 1
	)
	if (dpi_norm_fov != "hipfire") {
		dpi_norm_zoom = Number(
			localStorage.getItem("dpi_norm.zoom") || 1
		)
	}
} else {
	throw Error(dpi_norm_game)
}
const { text_data, text_image } = (() => {
	const { size } = constants.grid
	const { offset_x, text } = constants.mode.writing
	const lines = text.split("\n")
	const rows = lines.length
	const font_px = (size * .78) | 0
	const off = new OffscreenCanvas(1, 1)
	const off_context = /** @type {OffscreenCanvasRenderingContext2D} */(off.getContext("2d"))/**/
	off_context.font = `${font_px}px bold monospace`
	let max_w = 0
	for (const line of lines) {
		max_w = max(
			max_w,
			ceil(
				off_context.measureText(line).width
			)
		)
	}
	off.height = rows * size
	off.width = max_w + offset_x * 2
	off_context.save()
	off_context.fillStyle = "white"
	off_context.font = `${font_px}px bold monospace`
	off_context.globalAlpha = .5
	off_context.textAlign = "left"
	off_context.textBaseline = "middle"
	for (let r = 0; r < rows; r++) {
		const line = lines[r]
		if (!line) {
			continue
		}
		const cy = r * size + size / 2
		off_context.fillText(line, offset_x, cy)
	}
	off_context.restore()
	return {
		text_data: off_context.getImageData(0, 0, off.width, off.height).data,
		text_image: off.transferToImageBitmap()
	}
})()
export default {
	bg: {
		soop_link: localStorage.getItem("bg.soop_link") || "",
		type: /** @type {BackgroundType} */(localStorage.getItem("bg.type") || "default")/**/,
		webview_link: localStorage.getItem("bg.web_view_link") || "",
		youtube_link: localStorage.getItem("bg.youtube_link") || ""
	},
	camera: {
		/** @type {"2d"|"3d"} */
		dimension: "2d",
		fov: 103,
		height: 0,
		pitch: 0,
		proj: new Float32Array(16),
		view: new Float32Array(16),
		width: 0,
		x: 0,
		y: 0,
		yaw: 0,
		zoom: 51.5
	},
	dpi_norm: /** @type {DpiNormalizerState} */({
		dpi: Number(
			localStorage.getItem("dpi_norm.dpi") || 800
		),
		fov: dpi_norm_fov,
		game: dpi_norm_game,
		sens: dpi_norm_sens,
		zoom: dpi_norm_zoom
	})/**/,
	game: {
		height: game_height,
		/** @type {GameModeName?} */
		mode: null,
		/** @type {number} */
		raf_id: 0,
		resolution: game_resolution,
		/** @type {number} */
		rest_timeout: 0,
		sens: /** @type {GameSensName} */(localStorage.getItem("game.sens") || "lol")/**/,
		width: game_width
	},
	hud: { next_update_ms: 0 },
	/**
	 * @type {ReturnType<typeof create_queue<{
	 *	 c: boolean
	 *	 r: number
	 *	 t: number
	 *	 x: number
	 *	 y: number
	 * }>>}
	 */
	impacts: create_queue(),
	/**
	 * @type {ReturnType<typeof create_queue<{
	 *	 c: boolean
	 *	 p: number
	 *	 r: number
	 *	 t: number
	 *	 y: number
	 * }>>}
	 */
	impacts_3d: create_queue(),
	input: { mb_left: false, mb_right: false },
	mode: {
		aim_booster: {
			best_score: Number(
				localStorage.getItem("aim_booster.best_score") || 0
			),
			count: 0,
			peak_score: 0,
			start_ms: 0,
			/** @type {(Target & { t: number })[]} */
			targets: []
		},
		flick: {
			best_score: Number(
				localStorage.getItem("flick.best_score") || 0
			),
			peak_score: 0,
			/** @type {Target[]} */
			targets: [],
			/** @type {Target3D[]} */
			targets_3d: []
		},
		tracking: {
			best_score: Number(
				localStorage.getItem("tracking.best_score") || 0
			),
			move: {
				/** @type {1|-1} */
				direction: 1,
				direction_change_rate: 0,
				speed: 0
			},
			next_impact_s: 0,
			next_change_move_ms: 0,
			next_change_size_ms: 0,
			peak_score: 0,
			size_lerp: {
				active: false,
				from: 0,
				start_ms: 0,
				to: 0
			},
			speed_lerp: {
				active: false,
				from: 0,
				start_ms: 0,
				to: 0
			},
			/** @type {Target} */
			target: { cr: 0, cx: 0, cy: 0, r: 0, x: 0, y: 0 },
			/** @type {Target3D} */
			target_3d: { cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 }
		},
		twitch: {
			best_score: Number(
				localStorage.getItem("twitch.best_score") || 0
			),
			next_hide_ms: 0,
			next_show_ms: 0,
			peak_score: 0,
			/** @type {Target?} */
			target: null,
			/** @type {Target3D?} */
			target_3d: null
		},
		v_tracking: {
			best_score: Number(
				localStorage.getItem("v_tracking.best_score") || 0
			),
			move: {
				/** @type {1|-1} */
				direction: 1,
				direction_change_rate: 0,
				speed: 0
			},
			next_impact_s: 0,
			next_change_move_ms: 0,
			next_change_size_ms: 0,
			next_change_v_move_ms: 0,
			peak_score: 0,
			size_lerp: {
				active: false,
				from: 0,
				start_ms: 0,
				to: 0
			},
			speed_lerp: {
				active: false,
				from: 0,
				start_ms: 0,
				to: 0
			},
			/** @type {Target} */
			target: { cr: 0, cx: 0, cy: 0, r: 0, x: 0, y: 0 },
			/** @type {Target3D} */
			target_3d: { cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 },
			v_move: {
				/** @type {1|-1} */
				direction: 1,
				direction_change_rate: 0,
				speed: 0
			},
			v_speed_lerp: {
				active: false,
				from: 0,
				start_ms: 0,
				to: 0
			}
		},
		writing: {
			best_score: Number(
				localStorage.getItem("writing.best_score") || 0
			),
			/** @type {ReturnType<typeof create_queue<Line>>} */
			lines: create_queue(),
			peak_score: 0,
			/** @type {{ x: number, y: number }?} */
			pointer: null,
			text_data,
			text_image
		}
	},
	stats: {
		/**
		 * @type {ReturnType<typeof create_queue<{
		 *	 c: boolean
		 *	 e: number
		 *	 h: boolean
		 *	 s: number
		 * }>>}
		 */
		shoots: create_queue(),
		count_crit: 0,
		count_hit: 0,
		count_shoot: 0,
		sum_crit_ms: 0,
		sum_hit_ms: 0,
		sum_shoot_ms: 0
	},
	timer: {
		fps: 0,
		now_ms: 0,
		now_s: 0,
		prev_ms: 0,
		start_ms: 0
	}
}
/** @template T */
function create_queue() {
	/**	@type {T[]} */
	let q = []
	let head = 0
	const THRESH = 2_048
	return {
		/** @returns {T[]} */
		get array() {
			return q
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
				q = q.slice(head)
				head = 0
			}
		},
		/**
		 * @param {number} [index = 0]
		 * @returns {T}
		 */
		at(index = 0) {
			if (index < 0) {
				index += q.length
			}
			return /** @type {T} */(head + index < q.length ? q[head + index] : void 0)/**/
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