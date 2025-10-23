const device_resolution = /** @type {MonitorResolution} */(localStorage.getItem("device.resolution") || "fhd")/**/
let game_height
let game_width
if (device_resolution == "fhd") {
	game_height = 1080
	game_width = 1920
} else if (device_resolution == "hd") {
	game_height = 720
	game_width = 1280
} else if (device_resolution == "qhd") {
	game_height = 1440
	game_width = 2560
} else {
	throw Error(device_resolution)
}
export default {
	bg: {
		chzzk_link: localStorage.getItem("bg.chzzk_link") || "",
		soop_link: localStorage.getItem("bg.soop_link") || "",
		type: /** @type {BackgroundType} */(localStorage.getItem("bg.type") || "default")/**/,
		web_view_link: localStorage.getItem("bg.web_view_link") || "",
		youtube_link: localStorage.getItem("bg.youtube_link") || ""
	},
	camera: {
		fov: 103,
		/** @type {"2d" | "3d"} */
		dimension: "2d",
		pitch: 0,
		proj: new Float32Array(16),
		view: new Float32Array(16),
		x: 0,
		y: 0,
		yaw: 0,
		zoom: 51.5
	},
	device: {
		height: 0,
		resolution: device_resolution,
		width: 0
	},
	game: {
		cycle_id: Number(
			localStorage.getItem("game.cycle_id") || 1
		),
		height: game_height,
		/** @type {GameModeName?} */
		mode: null,
		raf_id: 0,
		sens: /** @type {GameSensName} */(localStorage.getItem("game.sens") || "lol")/**/,
		tolerance: Number(
			localStorage.getItem("game.tolerance") || 2
		),
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
		aiming: {
			best_score: Number(
				localStorage.getItem("aiming.best_score") || 0
			),
			peak_score: 0,
			/** @type {Target} */
			target: { cr: 0, cx: 0, cy: 0, r: 0, x: 0, y: 0 },
			/** @type {Target3D} */
			target_3d: { cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 }
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
				direction: 0,
				speed: 0,
				direction_change_rate: 0
			},
			next_impact_s: 0,
			next_change_size_ms: 0,
			next_change_move_ms: 0,
			peak_score: 0,
			size_lerp: {
				active: false,
				start_ms: 0,
				from: 0,
				to: 0
			},
			speed_lerp: {
				active: false,
				start_ms: 0,
				from: 0,
				to: 0
			},
			/** @type {Target} */
			target: { cr: 0, cx: 0, cy: 0, r: 0, x: 0, y: 0 },
			/** @type {Target3D} */
			target_3d: { cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 }
		},
		writing: {
			best_score: Number(
				localStorage.getItem("writing.best_score") || 0
			),
			/** @type {ReturnType<typeof create_queue<Line>>} */
			lines: create_queue(),
			peak_score: 0,
			/** @type {{ x: number, y: number }?} */
			pointer: null
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
		/** @returns {void} */
		clear() {
			q = []
			head = 0
		},
		/** @returns {void} */
		drop() {
			if (head >= q.length) return
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