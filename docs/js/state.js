export default {
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
	device: { height: 0, width: 0 },
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
	game: {
		cycle_id: 1,
		height: Number(
			localStorage.getItem("game.height") || 1080
		),
		/** @type {GameMode?} */
		mode: null,
		raf_id: 0,
		sens: /** @type {GameName} */(localStorage.getItem("game.sens") || "lol")/**/,
		tolerance: Number(
			localStorage.getItem("game.tolerance") || 7
		),
		width: Number(
			localStorage.getItem("game.width") || 1920
		)
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
	warmup: {
		best_score: Number(
			localStorage.getItem("warmup.best_score") || 0
		),
		peak_score: 0,
		/** @type {Target3D} */
		target: { cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 }
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