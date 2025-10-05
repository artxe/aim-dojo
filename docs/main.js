const TAU = Math.PI * 2
const Config = (() => {
	const _ = {
		audio: { volume: .5 },
		crosshair: {
			gap: 4,
			length: 12,
			outline: 0,
			thickness: 2
		},
		flick: {
			first_dist_mul: 4,
			inactive_alpha: .25,
			num_targets: 12
		},
		grid: { major_every: 5, size: 80 },
		hud: { update_interval_ms: 100 },
		impact: {
			duration_s: .15,
			fade_factor: .75,
			rings: 2,
			spacing: .4
		},
		stats: { window_ms: 30_000 },
		target: { base_radius: 5 },
		tracking: {
			base_speed: .01,
			impact_interval_s: .1,
			move_change_interval_ms: 500,
			size_change_interval_ms: 1_000,
			size_lerp_ms: 100,
			size_steps: [ 1, 1, 2, 3, 5, 8 ],
			speed_lerp_ms: 100,
			speed_steps: [ 1, 1, 2 ]
		},
		view: {
			hfov_deg: 103,
			sky_sphere_radius: 100
		}
	}
	return /** @type {DeepReadonly<typeof _>} */(_)/**/
})()
const HUD = (() => {
	const _ = {
		cycle_active_game_sens,
		update_game_sens,
		update_hud
	}
	/**
	 * @param {number} hfov_deg
	 * @returns {number}
	 */
	function calc_sens_ow(hfov_deg) {
		return Logic.compute_perspective_correction(hfov_deg)
			/ State.device.width
			/ Logic.to_rad(.0066)
	}
	/**
	 * @param {number} hfov_deg
	 * @param {number} [width]
	 * @returns {number}
	 */
	function calc_sens_pubg(
		hfov_deg,
		width = State.device.width
	) {
		const base_fov = 80
		const base_sens = 50
		const base_yaw = .0444400004444
		const step = 15.0515
		const sens50_yaw = Logic.to_rad(hfov_deg / base_fov * base_yaw)
		const rad_per_count = Logic.compute_perspective_correction(hfov_deg)
			/ width
		return base_sens + step * (Math.log(rad_per_count / sens50_yaw) / Math.LN2)
	}
	/**
	 * @param {number} hfov_deg
	 * @returns {number}
	 */
	function calc_sens_pubg_v(hfov_deg) {
		const { height, width } = State.device
		const aspect = width / height
		const vfov_deg = Logic.hfov_to_vfov(hfov_deg, aspect)
		const v_rad_per_count = Logic.compute_perspective_correction(vfov_deg)
			/ height
		const rad_per_count = Logic.compute_perspective_correction(hfov_deg)
			/ width
		return v_rad_per_count / rad_per_count
	}
	/**
	 * @param {number} hfov_deg
	 * @returns {number}
	 */
	function calc_sens_val(hfov_deg) {
		return Logic.compute_perspective_correction(hfov_deg)
			/ State.device.width
			/ Logic.to_rad(.07 * hfov_deg / 103)
	}
	/** @returns {void} */
	function cycle_active_game_sens() {
		let index = 0
		while (!game_el_list[index++].classList.contains("active")) {}
		game_el_list[index - 1].classList.remove("active")
		game_el_list[index %= game_el_list.length].classList.add("active")
	}
	/**
	 * @param {number} ms
	 * @returns {string}
	 */
	function format_duration_ms(ms) {
		/**
		 * @param {number} n
		 * @returns {string}
		 */
		function two(n) {
			return n < 10 ? "0" + n : "" + n
		}
		const total_sec = Math.floor(ms / 1_000)
		const s = total_sec % 60
		const m = Math.floor(total_sec / 60) % 60
		const h = Math.floor(total_sec / 3_600)
		return h > 0 ? `${h}:${two(m)}:${two(s)}` : `${two(m)}:${two(s)}`
	}
	/**
	 * @param {number} n
	 * @returns {number}
	 */
	function round_to_2(n) {
		return Number(n.toFixed(2))
	}
	/**
	 * @param {number} n
	 * @returns {number}
	 */
	function round_to_3(n) {
		return Number(n.toFixed(3))
	}
	/**
	 * @param {HTMLSpanElement} el
	 * @param {string|number} text
	 * @returns {void}
	 */
	function set_text_if_changed(el, text) {
		const s = String(text)
		if (el.textContent != s) el.textContent = s
	}
	/** @returns {void} */
	function update_game_sens() {
		const base_hfov = 103
		const val_hipfire = calc_sens_val(base_hfov)
		set_text_if_changed(
			val_hipfire_el,
			round_to_3(val_hipfire)
		)
		let zoom_fov = val_zoom_hfov(base_hfov, 1.15)
		const spectre = calc_sens_val(zoom_fov)
		set_text_if_changed(
			val_spectre_el,
			round_to_3(spectre / val_hipfire)
		)
		zoom_fov = val_zoom_hfov(base_hfov, 1.25)
		const vandal = calc_sens_val(zoom_fov)
		set_text_if_changed(
			val_vandal_el,
			round_to_3(vandal / val_hipfire)
		)
		zoom_fov = val_zoom_hfov(base_hfov, 1.5)
		const guardian = calc_sens_val(zoom_fov)
		set_text_if_changed(
			val_guardian_el,
			round_to_3(guardian / val_hipfire)
		)
		zoom_fov = val_zoom_hfov(base_hfov, 3.5)
		const marshal = calc_sens_val(zoom_fov)
		set_text_if_changed(
			val_marshal_el,
			round_to_3(marshal / val_hipfire)
		)
		zoom_fov = val_zoom_hfov(base_hfov, 2.5)
		const operator25 = calc_sens_val(zoom_fov)
		set_text_if_changed(
			val_operator25_el,
			round_to_3(operator25 / val_hipfire)
		)
		zoom_fov = val_zoom_hfov(base_hfov, 5)
		const operator5 = calc_sens_val(zoom_fov)
		set_text_if_changed(
			val_operator5_el,
			round_to_3(operator5 / val_hipfire)
		)
		const pubg_fov = 80
		const pubg_fpp = calc_sens_pubg(base_hfov)
		set_text_if_changed(
			pubg_fpp_el,
			Math.round(pubg_fpp)
		)
		const pubg_tpp = calc_sens_pubg(
			pubg_fov,
			State.device.width * .9
		)
		set_text_if_changed(
			pubg_tpp_el,
			Math.round(pubg_tpp)
		)
		const pubg_ads = calc_sens_pubg(pubg_fov)
		set_text_if_changed(
			pubg_ads_el,
			Math.round(pubg_ads)
		)
		const pubg_v = calc_sens_pubg_v(pubg_fov)
		set_text_if_changed(pubg_v_el, round_to_2(pubg_v))
		const pubg_x2 = calc_sens_pubg(pubg_fov / 2)
		set_text_if_changed(pubg_x2_el, Math.round(pubg_x2))
		const pubg_x3 = calc_sens_pubg(pubg_fov / 3)
		set_text_if_changed(pubg_x3_el, Math.round(pubg_x3))
		const pubg_x4 = calc_sens_pubg(pubg_fov / 4)
		set_text_if_changed(pubg_x4_el, Math.round(pubg_x4))
		const pubg_x6 = calc_sens_pubg(pubg_fov / 6)
		set_text_if_changed(pubg_x6_el, Math.round(pubg_x6))
		const pubg_x8 = calc_sens_pubg(pubg_fov / 8)
		set_text_if_changed(pubg_x8_el, Math.round(pubg_x8))
		const pubg_x15 = calc_sens_pubg(pubg_fov / 15)
		set_text_if_changed(
			pubg_x15_el,
			Math.round(pubg_x15)
		)
		const ow_hipfire = calc_sens_ow(base_hfov)
		set_text_if_changed(
			ow_hipfire_el,
			round_to_2(ow_hipfire)
		)
		const widow = calc_sens_ow(50.94)
		set_text_if_changed(
			ow_widow_el,
			round_to_2(widow / ow_hipfire * 100)
		)
		const ashe = calc_sens_ow(65.8)
		set_text_if_changed(
			ow_ashe_el,
			round_to_2(ashe / ow_hipfire * 100)
		)
		const freja = calc_sens_ow(76.32)
		set_text_if_changed(
			ow_freja_el,
			round_to_2(freja / ow_hipfire * 100)
		)
	}
	/** @returns {void} */
	function update_hud() {
		const { mode } = State.game
		const { now_ms, start_ms } = State.timer
		if (mode == "flick") {
			const { count_crit, count_hit, count_shoot } = State.stats
			const score = count_crit * 150 + count_hit * 250 - count_shoot * 100
			if (State.camera.mode == "2d") {
				if (score > State.flick.best_score) {
					State.flick.best_score = score
					localStorage.setItem(
						"flick.best_score",
						String(score)
					)
				}
				set_text_if_changed(
					best_score_el,
					`${score} / ${State.flick.best_score}`
				)
			} else {
				if (score > State.flick.best_score_3d) {
					State.flick.best_score_3d = score
					localStorage.setItem(
						"flick.best_score_3d",
						String(score)
					)
				}
				set_text_if_changed(
					best_score_el,
					`${score} / ${State.flick.best_score_3d}`
				)
			}
			set_text_if_changed(
				accuracy_el,
				count_shoot ? round_to_2(count_hit / count_shoot * 100) : 0
			)
			set_text_if_changed(
				crit_rate_el,
				count_hit ? round_to_2(count_crit / count_hit * 100) : 0
			)
		} else if (mode == "tracking") {
			const {
				sum_crit_ms,
				sum_hit_ms,
				sum_shoot_ms
			} = State.stats
			const score = (sum_crit_ms + sum_hit_ms) | 0
			if (State.camera.mode == "2d") {
				if (score > State.tracking.best_score) {
					State.tracking.best_score = score
					localStorage.setItem(
						"tracking.best_score",
						String(score)
					)
				}
				set_text_if_changed(
					best_score_el,
					`${score} / ${State.tracking.best_score}`
				)
			} else {
				if (score > State.tracking.best_score_3d) {
					State.tracking.best_score_3d = score
					localStorage.setItem(
						"tracking.best_score_3d",
						String(score)
					)
				}
				set_text_if_changed(
					best_score_el,
					`${score} / ${State.tracking.best_score_3d}`
				)
			}
			set_text_if_changed(
				accuracy_el,
				sum_shoot_ms
					? round_to_2(
						sum_hit_ms / sum_shoot_ms * 100
					)
					: 0
			)
			set_text_if_changed(
				crit_rate_el,
				sum_hit_ms ? round_to_2(sum_crit_ms / sum_hit_ms * 100) : 0
			)
		} else {
			throw Error()
		}
		set_text_if_changed(
			timer_el,
			format_duration_ms(now_ms - start_ms)
		)
	}
	/**
	 * @param {number} base_hfov
	 * @param {number} zoom
	 * @returns {number}
	 */
	function val_zoom_hfov(base_hfov, zoom) {
		const half_rad = Logic.to_rad(base_hfov / 2)
		const zoom_rad = 2 * Math.atan(Math.tan(half_rad) / zoom)
		return zoom_rad * 180 / Math.PI
	}
	const accuracy_el = /** @type {HTMLSpanElement} */(document.getElementById("accuracy"))/**/
	const best_score_el = /** @type {HTMLSpanElement} */(document.getElementById("best_score"))/**/
	const crit_rate_el = /** @type {HTMLSpanElement} */(document.getElementById("crit_rate"))/**/
	const game_el_list = document.getElementsByClassName("game")
	const ow_ashe_el = /** @type {HTMLSpanElement} */(document.getElementById("ow_ashe"))/**/
	const ow_freja_el = /** @type {HTMLSpanElement} */(document.getElementById("ow_freja"))/**/
	const ow_hipfire_el = /** @type {HTMLSpanElement} */(document.getElementById("ow_hipfire"))/**/
	const ow_widow_el = /** @type {HTMLSpanElement} */(document.getElementById("ow_widow"))/**/
	const pubg_ads_el = /** @type {HTMLSpanElement} */(document.getElementById("pubg_ads"))/**/
	const pubg_fpp_el = /** @type {HTMLSpanElement} */(document.getElementById("pubg_fpp"))/**/
	const pubg_tpp_el = /** @type {HTMLSpanElement} */(document.getElementById("pubg_tpp"))/**/
	const pubg_v_el = /** @type {HTMLSpanElement} */(document.getElementById("pubg_v"))/**/
	const pubg_x15_el = /** @type {HTMLSpanElement} */(document.getElementById("pubg_x15"))/**/
	const pubg_x2_el = /** @type {HTMLSpanElement} */(document.getElementById("pubg_x2"))/**/
	const pubg_x3_el = /** @type {HTMLSpanElement} */(document.getElementById("pubg_x3"))/**/
	const pubg_x4_el = /** @type {HTMLSpanElement} */(document.getElementById("pubg_x4"))/**/
	const pubg_x6_el = /** @type {HTMLSpanElement} */(document.getElementById("pubg_x6"))/**/
	const pubg_x8_el = /** @type {HTMLSpanElement} */(document.getElementById("pubg_x8"))/**/
	const timer_el = /** @type {HTMLSpanElement} */(document.getElementById("timer"))/**/
	const val_guardian_el = /** @type {HTMLSpanElement} */(document.getElementById("val_guardian"))/**/
	const val_hipfire_el = /** @type {HTMLSpanElement} */(document.getElementById("val_hipfire"))/**/
	const val_marshal_el = /** @type {HTMLSpanElement} */(document.getElementById("val_marshal"))/**/
	const val_operator25_el = /** @type {HTMLSpanElement} */(document.getElementById("val_operator25"))/**/
	const val_operator5_el = /** @type {HTMLSpanElement} */(document.getElementById("val_operator5"))/**/
	const val_spectre_el = /** @type {HTMLSpanElement} */(document.getElementById("val_spectre"))/**/
	const val_vandal_el = /** @type {HTMLSpanElement} */(document.getElementById("val_vandal"))/**/
	return _
})()
const Logic = (() => {
	const _ = {
		compute_perspective_correction,
		dir_from_yaw_pitch,
		hfov_to_vfov,
		on_frame,
		px_to_rad,
		shoot,
		start_game,
		stop_game,
		to_rad
	}
	/**
	 * @param {number} r
	 * @param {number} base
	 * @returns {number}
	 */
	function calc_core_radius(r, base) {
		return Math.max(r / 3, base / 2)
	}
	/**
	 * @param {number} n
	 * @returns {number}
	 */
	function clamp_01(n) {
		return n < 0 ? 0 : n > 1 ? 1 : n
	}
	/**
	 * @param {number} fov_deg
	 * @returns {number}
	 */
	function compute_perspective_correction(fov_deg) {
		/**
		 * @param {number} a
		 * @param {number} b
		 * @param {number} eps
		 * @param {number} whole
		 * @param {number} depth
		 * @returns {number}
		 */
		function adaptive_simpson(a, b, eps, whole, depth) {
			const c = (a + b) / 2
			const left = simpson(a, c)
			const right = simpson(c, b)
			const delta = left + right - whole
			if (depth <= 0 || Math.abs(delta) < 15 * eps) {
				return left + right + delta / 15
			}
			return adaptive_simpson(a, c, eps / 2, left, depth - 1)
				+ adaptive_simpson(c, b, eps / 2, right, depth - 1)
		}
		/**
		 * @param {number} t
		 * @returns {number}
		 */
		function integrand(t) {
			const s = Math.sin(t)
			return Math.sqrt(1 - m_neg * s * s)
		}
		/**
		 * @param {number} a
		 * @param {number} b
		 * @returns {number}
		 */
		function simpson(a, b) {
			const c = (a + b) / 2
			const h = b - a
			return (h / 6) * (integrand(a) + 4 * integrand(c) + integrand(b))
		}
		const eps = 1e-10
		const max_depth = 20
		const fov_rad = to_rad(fov_deg)
		const half_fov = fov_rad / 2
		const tan_half_fov = Math.tan(half_fov)
		const m_neg = -tan_half_fov * tan_half_fov
		const a = 0
		const b = half_fov
		const whole = simpson(a, b)
		const e_inc = adaptive_simpson(a, b, eps, whole, max_depth)
		const ratio = (2 / fov_rad) * e_inc * Math.cos(half_fov)
		return 2 * tan_half_fov * ratio
	}
	/**
	 * @param {number} r
	 * @param {number} cr
	 * @returns {number}
	 */
	function core_offset_angle(r, cr) {
		return r - cr
	}
	/**
	 * @param {number} yaw
	 * @param {number} pitch
	 * @returns {[ number, number, number ]}
	 */
	function dir_from_yaw_pitch(yaw, pitch) {
		const cx = Math.cos(yaw)
		const sx = Math.sin(yaw)
		const cy = Math.cos(pitch)
		const sy = Math.sin(pitch)
		return [ sx * cy, sy, -cx * cy ]
	}
	/**
	 * @param {[ number, number, number ]} a
	 * @param {[ number, number, number ]} b
	 * @returns {number}
	 */
	function dot(a, b) {
		return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
	}
	/**
	 * @param {number} h_deg
	 * @param {number} aspect
	 * @returns {number}
	 */
	function hfov_to_vfov(h_deg, aspect) {
		const h_rad = h_deg * Math.PI / 180
		const v_rad = 2 * Math.atan(Math.tan(h_rad / 2) / aspect)
		const v_deg = v_rad * 180 / Math.PI
		return v_deg
	}
	/**
	 * @param {number} a
	 * @param {number} b
	 * @param {number} t
	 * @returns {number}
	 */
	function linear_interpolate(a, b, t) {
		return a + (b - a) * t
	}
	/**
	 * @param {number} now_ms
	 * @returns {void}
	 */
	function on_frame(now_ms) {
		const { stats, timer } = State
		const { mode } = State.game
		const { shoots } = stats
		timer.prev_ms = timer.now_ms
		timer.now_ms = now_ms
		timer.now_s = SFX.now()
		const window_ms = now_ms - Config.stats.window_ms
		while (shoots.length) {
			const first = shoots.at()
			const { c, e, h, s } = first
			if (window_ms >= e) {
				const ms = e - s
				stats.count_shoot--
				stats.sum_shoot_ms -= ms
				if (h) {
					stats.count_hit--
					stats.sum_hit_ms -= ms
					if (c) {
						stats.count_crit--
						stats.sum_crit_ms -= ms
					}
				}
				shoots.drop()
			} else if (window_ms >= s) {
				const ms = window_ms - s
				stats.sum_shoot_ms -= ms
				if (h) {
					stats.sum_hit_ms -= ms
					if (c) {
						stats.sum_crit_ms -= ms
					}
				}
				first.s = window_ms
				break
			} else {
				break
			}
		}
		if (mode == "flick") {
			if (State.camera.mode == "2d") {
				if (!State.flick.targets.length) {
					const { base_radius } = Config.target
					const { num_targets } = Config.flick
					const { targets } = State.flick
					const base_d = Config.flick.first_dist_mul * base_radius
					let { x, y } = State.camera
					let i = 1
					while (i <= num_targets) {
						const theta = Math.random() * TAU
						const dist = base_d * i
						x += Math.cos(theta) * dist
						y += Math.sin(theta) * dist
						const r = base_radius * Math.sqrt(i)
						const cr = calc_core_radius(r, base_radius)
						const cy = y - r + cr
						targets[num_targets - i++] = { cr, cx: x, cy, r, x, y }
					}
				}
			} else if (!State.flick.targets_3d.length) {
				const { base_radius } = Config.target
				const base_radius_rad = px_to_rad(base_radius)
				const { first_dist_mul, num_targets } = Config.flick
				const { targets_3d } = State.flick
				const range_rad = Logic.to_rad(40)
				const base_d = first_dist_mul * base_radius_rad
				let { pitch: p, yaw: y } = State.camera
				let i = 1
				while (i <= num_targets) {
					const theta = Math.random() * TAU
					const dist = base_d * i
					const dy_desired = Math.cos(theta) * dist
					const dp_desired = Math.sin(theta) * dist
					const p_target_raw = p + dp_desired
					const p_target = Math.max(
						-range_rad,
						Math.min(range_rad, p_target_raw)
					)
					const dp_used = p_target - p
					const dy_mag = Math.sqrt(
						Math.max(
							0,
							dist * dist - dp_used * dp_used
						)
					)
					const dy_sign = Math.sign(dy_desired) || 1
					const dy_used = dy_sign * dy_mag
					y += dy_used
					p += dp_used
					const r = base_radius_rad * Math.sqrt(i)
					const cr = calc_core_radius(r, base_radius_rad)
					const cp = p + core_offset_angle(r, cr)
					targets_3d[num_targets - i++] = { cp, cr, cy: y, p, r, y }
				}
			}
		} else if (mode == "tracking") {
			const { base_radius } = Config.target
			const {
				base_speed,
				size_lerp_ms,
				size_steps,
				speed_lerp_ms,
				speed_steps
			} = Config.tracking
			const { tracking } = State
			const {
				move,
				size_lerp,
				speed_lerp,
				target,
				target_3d
			} = tracking
			if (State.input.mb_left) {
				if (State.camera.mode == "2d") {
					const speed = target.r * move.speed * move.direction
					target.x += speed * (now_ms - timer.prev_ms)
					if (speed_lerp.active) {
						const p = clamp_01(
							(now_ms - speed_lerp.start_ms) / speed_lerp_ms
						)
						if (p == 1) {
							speed_lerp.active = false
							move.speed = speed_lerp.to
						} else {
							move.speed = linear_interpolate(speed_lerp.from, speed_lerp.to, p)
						}
					} else if (now_ms >= tracking.next_change_move_ms) {
						if (Math.random() < (move.direction_change_rate += .2)) {
							move.direction *= -1
							move.direction_change_rate = 0
						}
						const index = (Math.random() * speed_steps.length) | 0
						speed_lerp.active = true
						speed_lerp.from = move.speed
						speed_lerp.start_ms = now_ms
						speed_lerp.to = base_speed * speed_steps[index]
						tracking.next_change_move_ms = now_ms + Config.tracking.move_change_interval_ms
					}
					if (size_lerp.active) {
						const p = clamp_01(
							(now_ms - size_lerp.start_ms) / size_lerp_ms
						)
						if (p == 1) {
							size_lerp.active = false
							target.r = size_lerp.to
						} else {
							target.r = linear_interpolate(size_lerp.from, size_lerp.to, p)
						}
						target.cr = calc_core_radius(target.r, base_radius)
					} else if (now_ms >= tracking.next_change_size_ms) {
						const index = (Math.random() * size_steps.length) | 0
						size_lerp.active = true
						size_lerp.from = target.r
						size_lerp.start_ms = now_ms
						size_lerp.to = base_radius * size_steps[index]
						tracking.next_change_size_ms = now_ms + Config.tracking.size_change_interval_ms
					}
					const theta = to_rad(move.direction * 30 - 90)
					const cd = target.r - target.cr
					target.cx = target.x + cd * Math.cos(theta)
					target.cy = target.y + cd * Math.sin(theta)
				} else {
					const base_radius_rad = px_to_rad(base_radius)
					const dt = (now_ms - timer.prev_ms)
					const speed = target_3d.r * move.speed * move.direction
					target_3d.y += speed * dt
					if (speed_lerp.active) {
						const p = clamp_01(
							(now_ms - speed_lerp.start_ms) / speed_lerp_ms
						)
						if (p == 1) {
							speed_lerp.active = false
							move.speed = speed_lerp.to
						} else {
							move.speed = linear_interpolate(speed_lerp.from, speed_lerp.to, p)
						}
					} else if (now_ms >= tracking.next_change_move_ms) {
						if (Math.random() < (move.direction_change_rate += .2)) {
							move.direction *= -1
							move.direction_change_rate = 0
						}
						const index = (Math.random() * speed_steps.length) | 0
						speed_lerp.active = true
						speed_lerp.from = move.speed
						speed_lerp.start_ms = now_ms
						speed_lerp.to = base_speed * speed_steps[index]
						tracking.next_change_move_ms = now_ms + Config.tracking.move_change_interval_ms
					}
					if (size_lerp.active) {
						const p = clamp_01(
							(now_ms - size_lerp.start_ms) / size_lerp_ms
						)
						if (p == 1) {
							size_lerp.active = false
							target_3d.r = size_lerp.to
						} else {
							target_3d.r = linear_interpolate(size_lerp.from, size_lerp.to, p)
						}
						target_3d.cr = calc_core_radius(target_3d.r, base_radius_rad)
						target_3d.cp = target_3d.p + core_offset_angle(target_3d.r, target_3d.cr)
					} else if (now_ms >= tracking.next_change_size_ms) {
						const index = (Math.random() * size_steps.length) | 0
						size_lerp.active = true
						size_lerp.from = target_3d.r
						size_lerp.start_ms = now_ms
						size_lerp.to = px_to_rad(
							base_radius * size_steps[index]
						)
						tracking.next_change_size_ms = now_ms + Config.tracking.size_change_interval_ms
					}
					const theta = to_rad(move.direction * 30 - 90)
					const alpha = core_offset_angle(target_3d.r, target_3d.cr)
					target_3d.cp = target_3d.p - alpha * Math.sin(theta)
					target_3d.cy = target_3d.y + alpha * Math.cos(theta)
				}
				shoot()
			}
		} else {
			throw Error()
		}
		Renderer.draw()
		if (now_ms >= State.hud.next_update_ms) {
			State.hud.next_update_ms = now_ms + Config.hud.update_interval_ms
			HUD.update_hud()
		}
		State.game.raf_id = requestAnimationFrame(on_frame)
	}
	/**
	 * @param {number} px
	 * @returns {number}
	 */
	function px_to_rad(px) {
		return Math.atan(
			(2 * px / State.device.width) * Math.tan(
				to_rad(Config.view.hfov_deg) / 2
			)
		)
	}
	/** @returns {void} */
	function shoot() {
		const { camera, game, stats, timer, tracking } = State
		const {
			mode: camera_mode,
			pitch,
			x: xx,
			y: yy,
			yaw
		} = camera
		const { mode } = game
		const { now_ms, now_s, prev_ms } = timer
		let is_hit = false
		let is_crit = false
		if (mode == "flick") {
			if (camera_mode == "2d") {
				const { targets } = State.flick
				const { cr, cy, r, x, y } = targets[targets.length - 1]
				const dx = x - xx
				is_hit = dx ** 2 + (y - yy) ** 2 <= r * r
				is_crit = dx ** 2 + (cy - yy) ** 2 <= cr * cr
				if (is_hit) {
					if (is_crit) {
						SFX.play_crit()
					} else {
						SFX.play_hit()
					}
					State.impacts.push(
						{ c: is_crit, r, t: now_s, x: xx, y: yy }
					)
					targets.length--
				}
			} else {
				const { targets_3d } = State.flick
				const { cr, cp, p, r, y } = targets_3d[targets_3d.length - 1]
				const d_cam = dir_from_yaw_pitch(yaw, pitch)
				const d_body = dir_from_yaw_pitch(y, p)
				const d_core = dir_from_yaw_pitch(y, cp)
				const hit_body = dot(d_cam, d_body) >= Math.cos(r)
				const hit_core = dot(d_cam, d_core) >= Math.cos(cr)
				is_hit = hit_body
				is_crit = hit_core
				if (is_hit) {
					if (is_crit) SFX.play_crit()
					else SFX.play_hit()
					State.impacts_3d.push(
						{
							c: is_crit,
							p: pitch,
							r,
							t: State.timer.now_s,
							y: yaw
						}
					)
					targets_3d.length--
				}

			}
		} else if (mode == "tracking") {
			if (camera_mode == "2d") {
				const { cr, cy, r, x, y } = tracking.target
				const dx = x - xx
				is_hit = dx ** 2 + (y - yy) ** 2 <= r * r
				is_crit = dx ** 2 + (cy - yy) ** 2 <= cr * cr
				if (is_hit && now_s >= tracking.next_impact_s) {
					if (is_crit) {
						SFX.play_crit()
					} else {
						SFX.play_hit()
					}
					State.impacts.push(
						{ c: is_crit, r, t: now_s, x: xx, y: yy }
					)
					tracking.next_impact_s = now_s + Config.tracking.impact_interval_s
				}
			} else {
				const { cp, cr, cy, p, r, y } = tracking.target_3d
				const d_cam = dir_from_yaw_pitch(yaw, pitch)
				const d_body = dir_from_yaw_pitch(y, p)
				const d_core = dir_from_yaw_pitch(cy, cp)
				is_hit = dot(d_cam, d_body) >= Math.cos(r)
				is_crit = dot(d_cam, d_core) >= Math.cos(cr)
				if (is_hit && now_s >= tracking.next_impact_s) {
					if (is_crit) {
						SFX.play_crit()
					} else {
						SFX.play_hit()
					}
					State.impacts_3d.push(
						{
							c: is_crit,
							p: pitch,
							r,
							t: now_s,
							y: yaw
						}
					)
					tracking.next_impact_s = now_s + Config.tracking.impact_interval_s
				}
			}
		} else {
			throw Error()
		}
		stats.shoots.push(
			{
				c: is_crit,
				e: now_ms,
				h: is_hit,
				s: prev_ms
			}
		)
		stats.count_shoot++
		stats.sum_shoot_ms += now_ms - prev_ms
		if (is_hit) {
			stats.count_hit++
			stats.sum_hit_ms += now_ms - prev_ms
			if (is_crit) {
				stats.count_crit++
				stats.sum_crit_ms += now_ms - prev_ms
			}
		}
	}
	/**
	 * @param {CameraMode} camera_mode
	 * @param {GameMode} game_mode
	 * @returns {void}
	 */
	function start_game(camera_mode, game_mode) {
		try {
			document.body.requestPointerLock({ unadjustedMovement: true })
			document.body.requestFullscreen()
		} catch {
			document.exitPointerLock()
			return
		}
		const now_ms = State.timer.now_ms = State.timer.start_ms = performance.now()
		State.camera.mode = camera_mode
		State.game.mode = game_mode
		State.game.raf_id = requestAnimationFrame(() => on_frame(now_ms))
		if (game_mode == "flick") {
			return
		} else if (game_mode == "tracking") {
			const {
				move_change_interval_ms,
				size_change_interval_ms
			} = Config.tracking
			const { tracking } = State
			tracking.next_change_size_ms = now_ms + size_change_interval_ms
			tracking.next_change_move_ms = now_ms + move_change_interval_ms
			const { base_radius } = Config.target
			const { move, target, target_3d } = tracking
			move.direction = 1
			move.speed = Config.tracking.base_speed
			tracking.move.direction_change_rate = 0
			tracking.next_impact_s = 0
			if (camera_mode == "2d") {
				const r = base_radius
				target.cr = calc_core_radius(r, r)
				target.cx = 0
				target.cy = target.cr - r
				target.r = r
				target.x = 0
				target.y = 0
			} else {
				const r = px_to_rad(base_radius)
				const cr = calc_core_radius(r, r)
				target_3d.cp = Math.atan(
					Math.max(0, Math.tan(r) - Math.tan(cr))
				)
				target_3d.cr = cr
				target_3d.cy = 0
				target_3d.p = 0
				target_3d.r = r
				target_3d.y = 0
			}
		} else {
			throw Error()
		}
	}
	/** @returns {void} */
	function stop_game() {
		const { camera, game, stats } = State
		const mode = game.mode
		cancelAnimationFrame(game.raf_id)
		stats.count_crit = 0
		stats.count_hit = 0
		stats.count_shoot = 0
		State.game.mode = null
		State.input.mb_left = false
		stats.shoots.clear()
		stats.sum_crit_ms = 0
		stats.sum_hit_ms = 0
		stats.sum_shoot_ms = 0
		if (camera.mode == "2d") {
			camera.x = 0
			camera.y = 0
			State.impacts.clear()
		} else {
			camera.pitch = 0
			camera.yaw = 0
			State.impacts_3d.clear()
		}
		if (mode == "flick") {
			if (camera.mode == "2d") {
				State.flick.targets = []
			} else {
				State.flick.targets_3d = []
			}
		} else if (mode == "tracking") {
			return
		} else {
			throw Error()
		}
	}
	/**
	 * @param {number} deg
	 * @returns {number}
	 */
	function to_rad(deg) {
		return deg * Math.PI / 180
	}
	return _
})()
const Mat4 = (() => {
	const _ = {
		identity,
		multiply,
		perspective,
		view
	}
	/** @returns {Float32Array<ArrayBuffer>} */
	function identity() {
		const m = new Float32Array(16)
		m[0] = 1
		m[5] = 1
		m[10] = 1
		m[15] = 1
		return m
	}
	/**
	 * @param {Float32Array} a
	 * @param {Float32Array} b
	 * @returns {Float32Array<ArrayBuffer>}
	 */
	function multiply(a, b) {
		const o = new Float32Array(16)
		o[0] = a[0] * b[0] + a[4] * b[1] + a[8] * b[2] + a[12] * b[3]
		o[1] = a[1] * b[0] + a[5] * b[1] + a[9] * b[2] + a[13] * b[3]
		o[2] = a[2] * b[0] + a[6] * b[1] + a[10] * b[2] + a[14] * b[3]
		o[3] = a[3] * b[0] + a[7] * b[1] + a[11] * b[2] + a[15] * b[3]
		o[4] = a[0] * b[4] + a[4] * b[5] + a[8] * b[6] + a[12] * b[7]
		o[5] = a[1] * b[4] + a[5] * b[5] + a[9] * b[6] + a[13] * b[7]
		o[6] = a[2] * b[4] + a[6] * b[5] + a[10] * b[6] + a[14] * b[7]
		o[7] = a[3] * b[4] + a[7] * b[5] + a[11] * b[6] + a[15] * b[7]
		o[8] = a[0] * b[8] + a[4] * b[9] + a[8] * b[10] + a[12] * b[11]
		o[9] = a[1] * b[8] + a[5] * b[9] + a[9] * b[10] + a[13] * b[11]
		o[10] = a[2] * b[8] + a[6] * b[9] + a[10] * b[10] + a[14] * b[11]
		o[11] = a[3] * b[8] + a[7] * b[9] + a[11] * b[10] + a[15] * b[11]
		o[12] = a[0] * b[12] + a[4] * b[13] + a[8] * b[14] + a[12] * b[15]
		o[13] = a[1] * b[12] + a[5] * b[13] + a[9] * b[14] + a[13] * b[15]
		o[14] = a[2] * b[12] + a[6] * b[13] + a[10] * b[14] + a[14] * b[15]
		o[15] = a[3] * b[12] + a[7] * b[13] + a[11] * b[14] + a[15] * b[15]
		return o
	}

	/**
	 * @param {number} fovy_deg
	 * @param {number} aspect
	 * @param {number} near
	 * @param {number} far
	 * @returns {Float32Array<ArrayBuffer>}
	 */
	function perspective(fovy_deg, aspect, near, far) {
		const f = 1 / Math.tan((fovy_deg * Math.PI / 180) / 2)
		const nf = 1 / (near - far)
		const m = new Float32Array(16)
		m[0] = f / aspect
		m[1] = 0
		m[2] = 0
		m[3] = 0
		m[4] = 0
		m[5] = f
		m[6] = 0
		m[7] = 0
		m[8] = 0
		m[9] = 0
		m[10] = (far + near) * nf
		m[11] = -1
		m[12] = 0
		m[13] = 0
		m[14] = (2 * far * near) * nf
		m[15] = 0
		return m
	}
	/**
	 * @param {number} yaw
	 * @param {number} pitch
	 * @param {number} [roll = 0]
	 * @returns {Float32Array<ArrayBuffer>}
	 */
	function view(yaw, pitch, roll = 0) {
		const cx = Math.cos(yaw)
		const sx = Math.sin(yaw)
		const cy = Math.cos(pitch)
		const sy = Math.sin(pitch)
		const fwd_x = sx * cy
		const fwd_y = sy
		const fwd_z = -cx * cy
		const up_x = 0
		const up_y = 1
		const up_z = 0
		let s_x = fwd_y * up_z - fwd_z * up_y
		let s_y = fwd_z * up_x - fwd_x * up_z
		let s_z = fwd_x * up_y - fwd_y * up_x
		const s_len = Math.hypot(s_x, s_y, s_z) || 1
		s_x = s_x / s_len
		s_y = s_y / s_len
		s_z = s_z / s_len
		let u_x = s_y * fwd_z - s_z * fwd_y
		let u_y = s_z * fwd_x - s_x * fwd_z
		let u_z = s_x * fwd_y - s_y * fwd_x
		if (roll) {
			const cr = Math.cos(roll)
			const sr = Math.sin(roll)
			const rs_x = s_x * cr + u_x * sr
			const rs_y = s_y * cr + u_y * sr
			const rs_z = s_z * cr + u_z * sr
			const ru_x = -s_x * sr + u_x * cr
			const ru_y = -s_y * sr + u_y * cr
			const ru_z = -s_z * sr + u_z * cr
			s_x = rs_x
			s_y = rs_y
			s_z = rs_z
			u_x = ru_x
			u_y = ru_y
			u_z = ru_z
		}
		const m = identity()
		m[0] = s_x
		m[4] = s_y
		m[8] = s_z
		m[1] = u_x
		m[5] = u_y
		m[9] = u_z
		m[2] = -fwd_x
		m[6] = -fwd_y
		m[10] = -fwd_z
		m[12] = 0
		m[13] = 0
		m[14] = 0
		return m
	}
	return _
})()
const Renderer = (() => {
	const _ = { draw, resize }
	/** @returns {void} */
	function draw() {
		const { height, width } = State.device
		context.save()
		context.clearRect(0, 0, width, height)
		context.translate(
			Math.round(width / 2),
			Math.round(height / 2)
		)
		if (State.camera.mode == "2d") {
			draw_grid()
			if (State.game.mode) {
				draw_paths()
				draw_targets()
				draw_impacts()
			}
		} else {
			context.drawImage(
				Renderer3D.image(),
				-Math.round(width / 2),
				-Math.round(height / 2)
			)
		}
		draw_crosshair()
		context.restore()
	}
	/** @returns {void} */
	function draw_crosshair() {
		const { gap, length, outline, thickness } = Config.crosshair
		context.save()
		context.drawImage(
			crosshair_image,
			-outline - thickness,
			-gap / 2 - length - outline * 2
		)
		context.restore()
	}
	/** @returns {void} */
	function draw_paths() {
		const { x: xx, y: yy } = State.camera
		const { mode } = State.game
		context.save()
		context.translate(-xx, -yy)
		context.globalAlpha = .4
		context.lineWidth = 2
		context.strokeStyle = "white"
		context.beginPath()
		context.moveTo(xx, yy)
		if (mode == "flick") {
			const { targets } = State.flick
			for (let i = targets.length - 1; i >= 0; i--) {
				const { cy, x } = targets[i]
				context.lineTo(x, cy)
			}
		} else if (mode == "tracking") {
			const { cy, x } = State.tracking.target
			context.lineTo(x, cy)
		}
		context.stroke()
		context.restore()
	}
	/** @returns {void} */
	function draw_grid() {
		const { x, y } = State.camera
		context.save()
		context.translate(-x, -y)
		context.fillStyle = grid_pattern
		context.fillRect(
			x - State.device.width / 2,
			y - State.device.height / 2,
			State.device.width,
			State.device.height
		)
		context.restore()
	}
	/** @returns {void} */
	function draw_impacts() {
		const { impacts } = State
		if (!impacts.length) return
		const {
			duration_s,
			fade_factor,
			rings,
			spacing
		} = Config.impact
		const { x: xx, y: yy } = State.camera
		const { now_s } = State.timer
		const alpha = .9
		const max_life = duration_s + spacing * (rings - 1)
		context.save()
		context.translate(-xx, -yy)
		context.globalCompositeOperation = "lighter"
		context.lineWidth = 2
		while (impacts.length) {
			if (now_s - impacts.at().t > max_life) {
				impacts.drop()
			}
			break
		}
		let index = 0
		while (index < impacts.length) {
			const { c, r, t, x, y } = State.impacts.at(index)
			const p = (now_s - t) / duration_s
			const base = c ? "red" : "white"
			const dot_alpha = alpha * (1 - fade_factor * Math.min(1, p))
			if (p <= 1) {
				context.fillStyle = base
				context.globalAlpha = dot_alpha
				context.beginPath()
				context.arc(x, y, 2, 0, TAU)
				context.fill()
			}
			for (let k = 0; k < rings; k++) {
				const p2 = p - k * spacing
				if (p2 <= 0 || p2 > 1) continue
				const pr = r * p2
				const ring_alpha = alpha * (1 - fade_factor * p2)
				if (ring_alpha <= 0 || pr <= 0) continue
				context.globalAlpha = ring_alpha
				context.strokeStyle = base
				context.beginPath()
				context.arc(x, y, pr, 0, TAU)
				context.stroke()
			}
			index++
		}
		context.restore()
	}
	/**
	 * @param {Target} target
	 * @param {number} alpha
	 * @returns {void}
	 */
	function draw_target(target, alpha) {
		const { x: xx, y: yy } = State.camera
		const { cr, cx, cy, r, x, y } = target
		const line_width = 1.5
		context.save()
		context.translate(-xx, -yy)
		context.globalAlpha = alpha
		context.lineWidth = line_width
		context.strokeStyle = "red"
		context.beginPath()
		context.arc(x, y, r + line_width, 0, TAU)
		context.stroke()
		context.fillStyle = "#385978"
		context.beginPath()
		context.arc(x, y, r, 0, TAU)
		context.fill()
		context.beginPath()
		context.arc(cx, cy, cr + line_width, 0, TAU)
		context.stroke()
		context.fillStyle = "#1c344a"
		context.beginPath()
		context.arc(cx, cy, cr, 0, TAU)
		context.fill()
		context.restore()
	}
	/** @returns {void} */
	function draw_targets() {
		if (State.game.mode == "flick") {
			const { targets } = State.flick
			for (let i = 0; i + 1 < targets.length; i++) {
				draw_target(
					targets[i],
					Config.flick.inactive_alpha
				)
			}
			draw_target(targets[targets.length - 1], 1)
		} else if (State.game.mode == "tracking") {
			draw_target(State.tracking.target, 1)
		} else {
			throw Error()
		}
	}
	/** @returns {void} */
	function resize() {
		canvas_el.width = State.device.width = innerWidth * devicePixelRatio
		canvas_el.height = State.device.height = innerHeight * devicePixelRatio
		Renderer3D.resize()
		draw()
	}
	const canvas_el = /** @type {HTMLCanvasElement} */(document.getElementById("canvas"))/**/
	const context = /** @type {CanvasRenderingContext2D} */(canvas_el.getContext("2d"))/**/
	const crosshair_image = (() => {
		const { gap, length, outline, thickness } = Config.crosshair
		const off = new OffscreenCanvas(
			outline * 2 + thickness * 2,
			gap + length * 2 + outline * 4
		)
		const off_context = /** @type {OffscreenCanvasRenderingContext2D} */(off.getContext("2d"))/**/
		off_context.fillStyle = "black"
		off_context.fillRect(
			outline,
			outline,
			thickness * 2,
			length
		)
		off_context.fillRect(
			outline,
			gap + length + outline * 3,
			thickness * 2,
			length
		)
		if (outline) {
			off_context.globalAlpha = .75
			off_context.lineWidth = outline
			off_context.strokeStyle = "lime"
			off_context.strokeRect(
				outline / 2,
				outline / 2,
				outline + thickness * 2,
				length + outline
			)
			off_context.strokeRect(
				outline / 2,
				gap + length + outline * 2.5,
				outline + thickness * 2,
				length + outline
			)
		}
		return off
	})()
	const grid_pattern = (() => {
		const { size } = Config.grid
		const pattern_size = size * Config.grid.major_every
		const off = new OffscreenCanvas(pattern_size, pattern_size)
		const off_context = /** @type {OffscreenCanvasRenderingContext2D} */(off.getContext("2d"))/**/
		off_context.lineWidth = 1.5
  		off_context.strokeStyle = "rgba(58,74,104,.12)"
		off_context.beginPath()
		for (let x = 0; x <= pattern_size; x += size) {
			const x_px = Math.round(x) + .5
			off_context.moveTo(x_px, 0)
			off_context.lineTo(x_px, pattern_size)
		}
		for (let y = 0; y <= pattern_size; y += size) {
			const y_px = Math.round(y) + .5
			off_context.moveTo(0, y_px)
			off_context.lineTo(pattern_size, y_px)
		}
		off_context.stroke()
		off_context.lineWidth = 2
 		off_context.strokeStyle = "rgba(58,74,104,.35)"
		const max_px = Math.round(pattern_size) + .5
		off_context.beginPath()
		off_context.moveTo(max_px, 0)
		off_context.lineTo(max_px, pattern_size)
		off_context.moveTo(0, max_px)
		off_context.lineTo(pattern_size, max_px)
		off_context.stroke()
		return /** @type {CanvasPattern} */(off_context.createPattern(off, "repeat"))/**/
	})()
	return _
})()
const Renderer3D = await (async () => {
	const _ = { image, resize }
	/**
	 * @param {Float32Array} segments
	 * @param {GLenum} [usage = context.STATIC_DRAW]
	 * @returns {VboInfo}
	 */
	function build_fill_vbo(
		segments,
		usage = context.STATIC_DRAW
	) {
		const vbo = context.createBuffer()
		context.bindBuffer(context.ARRAY_BUFFER, vbo)
		context.bufferData(
			context.ARRAY_BUFFER,
			segments,
			usage
		)
		return {
			vbo,
			count: (segments.length / 3) | 0,
			stride: (3 * 4) | 0
		}
	}
	/**
	 * @param {number} yaw
	 * @param {number} pitch
	 * @param {number} radius_rad
	 * @param {number} dist
	 * @param {GLenum} [usage=context.DYNAMIC_DRAW]
	 * @returns {VboInfo}
	 */
	function build_ring_vbo_from_angles(
		yaw,
		pitch,
		radius_rad,
		dist,
		usage = context.DYNAMIC_DRAW
	) {
		const vertex = 96
		/** @type {number[]} */
		const segments = []
		const d = Logic.dir_from_yaw_pitch(yaw, pitch)
		const center = [
			d[0] * dist,
			d[1] * dist,
			d[2] * dist
		]
		const v = State.camera.view
		const right = [ v[0], v[4], v[8] ]
		const up = [ v[1], v[5], v[9] ]
		const r_world = Math.tan(radius_rad) * dist
		for (let i = 0; i < vertex; i++) {
			const a0 = (i / vertex) * TAU
			const a1 = ((i + 1) / vertex) * TAU
			const c0 = Math.cos(a0)
			const s0 = Math.sin(a0)
			const c1 = Math.cos(a1)
			const s1 = Math.sin(a1)
			const p0 = [
				center[0] + (right[0] * c0 + up[0] * s0) * r_world,
				center[1] + (right[1] * c0 + up[1] * s0) * r_world,
				center[2] + (right[2] * c0 + up[2] * s0) * r_world
			]
			const p1 = [
				center[0] + (right[0] * c1 + up[0] * s1) * r_world,
				center[1] + (right[1] * c1 + up[1] * s1) * r_world,
				center[2] + (right[2] * c1 + up[2] * s1) * r_world
			]
			segments.push(p0[0], p0[1], p0[2], p1[0], p1[1], p1[2])
		}
		return build_stroke_vbo(
			new Float32Array(segments),
			usage
		)
	}
	/**
	 * @param {number} yaw
	 * @param {number} pitch
	 * @param {number} radius_rad
	 * @param {number} dist
	 * @param {GLenum} [usage=context.DYNAMIC_DRAW]
	 * @returns {VboInfo}
	 */
	function build_disc_vbo_from_angles(
		yaw,
		pitch,
		radius_rad,
		dist,
		usage = context.DYNAMIC_DRAW
	) {
		const vertex = 96
		/** @type {number[]} */
		const tris = []
		const d = Logic.dir_from_yaw_pitch(yaw, pitch)
		const cx = d[0] * dist
		const cy = d[1] * dist
		const cz = d[2] * dist
		const v = State.camera.view
		const right = [ v[0], v[4], v[8] ]
		const up = [ v[1], v[5], v[9] ]
		const r_world = Math.tan(radius_rad) * dist
		for (let i = 0; i < vertex; i++) {
			const a0 = (i / vertex) * TAU
			const a1 = ((i + 1) / vertex) * TAU
			const c0 = Math.cos(a0)
			const s0 = Math.sin(a0)
			const c1 = Math.cos(a1)
			const s1 = Math.sin(a1)
			const p0x = cx + (right[0] * c0 + up[0] * s0) * r_world
			const p0y = cy + (right[1] * c0 + up[1] * s0) * r_world
			const p0z = cz + (right[2] * c0 + up[2] * s0) * r_world
			const p1x = cx + (right[0] * c1 + up[0] * s1) * r_world
			const p1y = cy + (right[1] * c1 + up[1] * s1) * r_world
			const p1z = cz + (right[2] * c1 + up[2] * s1) * r_world
			tris.push(cx, cy, cz, p0x, p0y, p0z, p1x, p1y, p1z)
		}
		return build_fill_vbo(new Float32Array(tris), usage)
	}
	/**
	 * @param {Float32Array} segments
	 * @param {GLenum} [usage = context.STATIC_DRAW]
	 * @returns {VboInfo}
	 */
	function build_stroke_vbo(
		segments,
		usage = context.STATIC_DRAW
	) {
		const n = (segments.length / 6) | 0
		const floats_per_vert = 3 + 3 + 1 + 1
		const data = new Float32Array(n * 4 * floats_per_vert)
		let di = 0
		let si = 0
		for (let i = 0; i < n; i++) {
			const ax = segments[si++]
			const ay = segments[si++]
			const az = segments[si++]
			const bx = segments[si++]
			const by = segments[si++]
			const bz = segments[si++]
			/**
			 * @param {number} px
			 * @param {number} py
			 * @param {number} pz
			 * @param {number} qx
			 * @param {number} qy
			 * @param {number} qz
			 * @param {number} side
			 * @param {number} endpoint
			 * @returns {void}
			 */
			const pack = (px, py, pz, qx, qy, qz, side, endpoint) => {
				data[di++] = px
				data[di++] = py
				data[di++] = pz
				data[di++] = qx
				data[di++] = qy
				data[di++] = qz
				data[di++] = side
				data[di++] = endpoint
			}
			pack(ax, ay, az, bx, by, bz, -1, 0)
			pack(ax, ay, az, bx, by, bz, +1, 0)
			pack(ax, ay, az, bx, by, bz, -1, 1)
			pack(ax, ay, az, bx, by, bz, +1, 1)
		}
		const vbo = context.createBuffer()
		context.bindBuffer(context.ARRAY_BUFFER, vbo)
		context.bufferData(context.ARRAY_BUFFER, data, usage)
		return {
			vbo,
			count: n * 4,
			stride: (floats_per_vert * 4) | 0
		}
	}
	/**
	 * @param {[ number, number, number, number ]} color
	 * @param {VboInfo} vbo_info
	 * @returns {void}
	 */
	function draw_fill(color, vbo_info) {
		context.useProgram(fill_p)
		context.uniformMatrix4fv(
			u_proj_fill,
			false,
			State.camera.proj
		)
		context.uniformMatrix4fv(
			u_view_fill,
			false,
			State.camera.view
		)
		context.uniform4f(
			u_color_fill,
			color[0],
			color[1],
			color[2],
			color[3]
		)
		context.bindBuffer(
			context.ARRAY_BUFFER,
			vbo_info.vbo
		)
		context.enableVertexAttribArray(a_pos_fill)
		context.vertexAttribPointer(
			a_pos_fill,
			3,
			context.FLOAT,
			false,
			vbo_info.stride,
			0
		)
		context.drawArrays(
			context.TRIANGLES,
			0,
			vbo_info.count
		)
		context.disableVertexAttribArray(a_pos_fill)
	}
	/** @returns {void} */
	function draw_grid() {
		draw_stroke(
			[ .227, .290, .407, .12 ],
			1.5,
			sky_sphere
		)
  		draw_stroke(
  			[ .227, .290, .407, .35 ],
  			2,
  			sky_sphere_major
  		)
	}
	/** @returns {void} */
	function draw_impacts() {
		const { impacts_3d } = State
		if (!impacts_3d.length) return
		const {
			duration_s,
			fade_factor,
			rings,
			spacing
		} = Config.impact
		const { sky_sphere_radius: d } = Config.view
		const { now_s } = State.timer
		const max_life = duration_s + spacing * (rings - 1)
		const base_alpha = .9
		while (impacts_3d.length) {
			if (now_s - impacts_3d.at().t > max_life) impacts_3d.drop()
			else break
		}
		for (let i = 0; i < impacts_3d.length; i++) {
			const { c, p, r, t, y } = impacts_3d.at(i)
			const progress = (now_s - t) / duration_s
			for (let k = 0; k < rings; k++) {
				const p2 = progress - k * spacing
				if (p2 <= 0 || p2 > 1) continue
				const rr = r * p2
				const a = base_alpha * (1 - fade_factor * p2)
				if (a <= 0) continue
				const vbo = build_ring_vbo_from_angles(y, p, rr, d)
				/** @type {[ number, number, number, number ]} */
				const col = c ? [ 1, 0, 0, a ] : [ 1, 1, 1, a ]
				draw_stroke(col, 2, vbo)
				context.deleteBuffer(vbo.vbo)
			}
		}
	}
	/** @returns {void} */
	function draw_paths() {
		const { sky_sphere_radius: d } = Config.view
		/** @type {number[]} */
		const segments = []
		const cam_dir = Logic.dir_from_yaw_pitch(
			State.camera.yaw,
			State.camera.pitch
		)
		let prev = [
			cam_dir[0] * d,
			cam_dir[1] * d,
			cam_dir[2] * d
		]
		if (State.game.mode == "flick") {
			const { targets_3d } = State.flick
			if (!targets_3d.length) return
			for (let i = targets_3d.length - 1; i >= 0; i--) {
				const t = targets_3d[i]
				const dir = Logic.dir_from_yaw_pitch(t.cy, t.cp)
				const pos = [ dir[0] * d, dir[1] * d, dir[2] * d ]
				segments.push(
					prev[0],
					prev[1],
					prev[2],
					pos[0],
					pos[1],
					pos[2]
				)
				prev = pos
			}
		} else if (State.game.mode == "tracking") {
			const { target_3d } = State.tracking
			const dir = Logic.dir_from_yaw_pitch(target_3d.cy, target_3d.cp)
			const pos = [ dir[0] * d, dir[1] * d, dir[2] * d ]
			segments.push(
				prev[0],
				prev[1],
				prev[2],
				pos[0],
				pos[1],
				pos[2]
			)
		} else {
			throw Error()
		}
		if (segments.length === 0) return
		const vbo_info = build_stroke_vbo(
			new Float32Array(segments),
			context.DYNAMIC_DRAW
		)
		draw_stroke([ 1, 1, 1, .4 ], 2, vbo_info)
		context.deleteBuffer(vbo_info.vbo)
	}
	/**
	 * @param {[ number, number, number, number ]} color
	 * @param {number} line_width
	 * @param {VboInfo} vbo_info
	 * @returns {void}
	 */
	function draw_stroke(color, line_width, vbo_info) {
		context.useProgram(stroke_p)
		context.uniformMatrix4fv(u_proj, false, State.camera.proj)
		context.uniformMatrix4fv(u_view, false, State.camera.view)
		context.uniform2f(
			u_viewport_thick,
			canvas.width,
			canvas.height
		)
		context.uniform1f(u_thickness_px, line_width)
		context.uniform4f(
			u_color_thick,
			color[0],
			color[1],
			color[2],
			color[3]
		)
		context.bindBuffer(
			context.ARRAY_BUFFER,
			vbo_info.vbo
		)
		const stride = vbo_info.stride
		context.enableVertexAttribArray(a_pos_a)
		context.vertexAttribPointer(
			a_pos_a,
			3,
			context.FLOAT,
			false,
			stride,
			0
		)
		context.enableVertexAttribArray(a_pos_b)
		context.vertexAttribPointer(
			a_pos_b,
			3,
			context.FLOAT,
			false,
			stride,
			3 * 4
		)
		context.enableVertexAttribArray(a_side)
		context.vertexAttribPointer(
			a_side,
			1,
			context.FLOAT,
			false,
			stride,
			6 * 4
		)
		context.enableVertexAttribArray(a_endpoint)
		context.vertexAttribPointer(
			a_endpoint,
			1,
			context.FLOAT,
			false,
			stride,
			7 * 4
		)
		const verts_per_seg = 4
		const seg_count = (vbo_info.count / verts_per_seg) | 0
		for (let i = 0; i < seg_count; i++) {
			context.drawArrays(
				context.TRIANGLE_STRIP,
				i * verts_per_seg,
				verts_per_seg
			)
		}
		context.disableVertexAttribArray(a_pos_a)
		context.disableVertexAttribArray(a_pos_b)
		context.disableVertexAttribArray(a_side)
		context.disableVertexAttribArray(a_endpoint)
	}
	/**
	 * @param {Target3D} target
	 * @param {number} alpha
	 * @returns {void}
	 */
	function draw_target(target, alpha) {
		const { sky_sphere_radius: d } = Config.view
		const { cp, cr, cy, p, r, y } = target
		const line_width = 1.5
		const line_width_rad = Logic.px_to_rad(line_width)
		/** @type {[ number, number, number, number ]} */
		const body_fill = [ .22, .35, .47, alpha ]
		/** @type {[ number, number, number, number ]} */
		const core_fill = [ .11, .204, .29, alpha ]
		/** @type {[ number, number, number, number ]} */
		const outline_col = [ 1, 0, 0, alpha ]
		let vbo = build_disc_vbo_from_angles(y, p, r, d)
		draw_fill(body_fill, vbo)
		context.deleteBuffer(vbo.vbo)
		vbo = build_ring_vbo_from_angles(y, p, r + line_width_rad / 2, d)
		draw_stroke(outline_col, line_width, vbo)
		context.deleteBuffer(vbo.vbo)
		vbo = build_disc_vbo_from_angles(cy, cp, cr, d)
		draw_fill(core_fill, vbo)
		context.deleteBuffer(vbo.vbo)
		vbo = build_ring_vbo_from_angles(cy, cp, cr + line_width_rad / 2, d)
		draw_stroke(outline_col, line_width, vbo)
		context.deleteBuffer(vbo.vbo)
	}
	/** @returns {void} */
	function draw_targets() {
		if (State.game.mode == "flick") {
			const { targets_3d } = State.flick
			if (!targets_3d.length) return
			const { inactive_alpha } = Config.flick
			for (let i = 0; i + 1 < targets_3d.length; i++) {
				draw_target(targets_3d[i], inactive_alpha)
			}
			draw_target(
				targets_3d[targets_3d.length - 1],
				1
			)
		} else if (State.game.mode == "tracking") {
			draw_target(State.tracking.target_3d, 1)
		} else {
			throw Error()
		}
	}
	/** @returns {ImageBitmap} */
	function image() {
		const aspect = canvas.width / canvas.height
		const vfov_deg = Logic.hfov_to_vfov(Config.view.hfov_deg, aspect)
		const yaw = State.camera.yaw
		const pitch = State.camera.pitch
		context.clearColor(0, 0, 0, 0)
		context.clear(
			context.COLOR_BUFFER_BIT | context.DEPTH_BUFFER_BIT
		)
		context.enable(context.BLEND)
		context.blendFunc(
			context.SRC_ALPHA,
			context.ONE_MINUS_SRC_ALPHA
		)
		State.camera.proj = Mat4.perspective(vfov_deg, aspect, .1, 2_000)
		State.camera.view = Mat4.view(yaw, pitch)
		draw_grid()
		if (State.game.mode) {
			draw_paths()
			draw_targets()
			draw_impacts()
		}
		return canvas.transferToImageBitmap()
	}
	/**
	 * @param {string} vs_src
	 * @param {string} fs_src
	 * @returns {WebGLProgram}
	 */
	function make_program(vs_src, fs_src) {
		const p = context.createProgram()
		const vs = make_shader(context.VERTEX_SHADER, vs_src)
		const fs = make_shader(context.FRAGMENT_SHADER, fs_src)
		context.attachShader(p, vs)
		context.attachShader(p, fs)
		context.linkProgram(p)
		context.deleteShader(vs)
		context.deleteShader(fs)
		context.getProgramParameter(p, context.LINK_STATUS)
		return p
	}
	/**
	 * @param {GLenum} type
	 * @param {string} src
	 * @returns {WebGLShader}
	 */
	function make_shader(type, src) {
		const s = /** @type {WebGLShader } */(context.createShader(type))/**/
		context.shaderSource(s, src)
		context.compileShader(s)
		context.getShaderParameter(s, context.COMPILE_STATUS)
		return s
	}
	/** * @returns {void} */
	function resize() {
		canvas.width = State.device.width
		canvas.height = State.device.height
		context.viewport(0, 0, canvas.width, canvas.height)
	}
	const canvas = new OffscreenCanvas(1, 1)
	const context = /** @type {WebGL2RenderingContext} */(canvas.getContext(
		"webgl2",
		{
			alpha: true,
			antialias: true,
			desynchronized: true,
			premultipliedAlpha: true
		}
	))/**/
	const stroke_p = make_program(
		`#version 300 es
precision highp float;
in vec3 a_pos_a;
in vec3 a_pos_b;
in float a_side;
in float a_endpoint;
uniform mat4 u_proj;
uniform mat4 u_view;
uniform vec2 u_viewport;
uniform float u_thickness_px;
const float EPS = 1e-2;
void main() {
	vec4 a_view = u_view * vec4(a_pos_a, 1.0);
	vec4 b_view = u_view * vec4(a_pos_b, 1.0);
	bool a_front = (a_view.z <= -EPS);
	bool b_front = (b_view.z <= -EPS);
	if (!a_front && !b_front) {
		gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
		return;
	}
	if (a_front != b_front) {
		vec3 pa = a_view.xyz;
		vec3 pb = b_view.xyz;
		float t = (-EPS - pa.z) / (pb.z - pa.z);
		vec3 pI = mix(pa, pb, t);
		if (!a_front) a_view = vec4(pI, 1.0);
		else b_view = vec4(pI, 1.0);
	}
	vec4 a_clip = u_proj * a_view;
	vec4 b_clip = u_proj * b_view;
	vec2 a_ndc = a_clip.xy / a_clip.w;
	vec2 b_ndc = b_clip.xy / b_clip.w;
	vec2 dir_ndc = normalize(b_ndc - a_ndc);
	vec2 nrm_ndc = vec2(-dir_ndc.y, dir_ndc.x);
	vec2 px_to_ndc = 2.0 / u_viewport;
	vec2 offset_ndc = nrm_ndc * u_thickness_px * 0.5 * vec2(px_to_ndc.x, px_to_ndc.y);
	vec4 base_clip = mix(a_clip, b_clip, a_endpoint);
	vec2 base_ndc = base_clip.xy / base_clip.w;
	base_ndc += offset_ndc * a_side;
	vec2 base_clip_xy = base_ndc * base_clip.w;
	gl_Position = vec4(base_clip_xy, base_clip.zw);
}
`,
		`#version 300 es
precision mediump float;
uniform vec4 u_color;
out vec4 out_color;
void main() { out_color = u_color; }`
	)
	const a_pos_a = context.getAttribLocation(stroke_p, "a_pos_a")
	const a_pos_b = context.getAttribLocation(stroke_p, "a_pos_b")
	const a_side = context.getAttribLocation(stroke_p, "a_side")
	const a_endpoint = context.getAttribLocation(stroke_p, "a_endpoint")
	const u_view = context.getUniformLocation(stroke_p, "u_view")
	const u_proj = context.getUniformLocation(stroke_p, "u_proj")
	const u_viewport_thick = context.getUniformLocation(stroke_p, "u_viewport")
	const u_thickness_px = context.getUniformLocation(stroke_p, "u_thickness_px")
	const u_color_thick = context.getUniformLocation(stroke_p, "u_color")
	const fill_p = make_program(
		`#version 300 es
  precision highp float;
  in vec3 a_pos;
  uniform mat4 u_proj;
  uniform mat4 u_view;
  void main() {
	gl_Position = u_proj * (u_view * vec4(a_pos, 1.0));
  }`,
		`#version 300 es
  precision mediump float;
  uniform vec4 u_color;
  out vec4 out_color;
  void main() { out_color = u_color; }`
	)
	const a_pos_fill = context.getAttribLocation(fill_p, "a_pos")
	const u_color_fill = context.getUniformLocation(fill_p, "u_color")
	const u_proj_fill = context.getUniformLocation(fill_p, "u_proj")
	const u_view_fill = context.getUniformLocation(fill_p, "u_view")
	const sky_sphere = (() => {
		const { sky_sphere_radius: r } = Config.view
		const seg_w = 36
		const seg_h = 18
		/** @type {number[]} */
		const segments = []
		for (let y = 1; y < seg_h; y++) {
			const v = y / seg_h
			const phi = v * Math.PI
			const c_y = Math.cos(phi)
			const s_y = Math.sin(phi)
			for (let x = 0; x < seg_w; x++) {
				const th1 = (x / seg_w) * TAU
				const th2 = ((x + 1) / seg_w) * TAU
				const p1x = Math.sin(th1) * s_y * r
				const p1y = c_y * r
				const p1z = -Math.cos(th1) * s_y * r
				const p2x = Math.sin(th2) * s_y * r
				const p2y = c_y * r
				const p2z = -Math.cos(th2) * s_y * r
				segments.push(p1x, p1y, p1z, p2x, p2y, p2z)
			}
		}
		for (let x = 0; x < seg_w; x++) {
			const th = (x / seg_w) * TAU
			const c_x = Math.cos(th)
			const s_x = Math.sin(th)
			for (let y = 0; y < seg_h; y++) {
				const v1 = (y / seg_h) * Math.PI
				const v2 = ((y + 1) / seg_h) * Math.PI
				const p1x = s_x * Math.sin(v1) * r
				const p1y = Math.cos(v1) * r
				const p1z = -c_x * Math.sin(v1) * r
				const p2x = s_x * Math.sin(v2) * r
				const p2y = Math.cos(v2) * r
				const p2z = -c_x * Math.sin(v2) * r
				segments.push(p1x, p1y, p1z, p2x, p2y, p2z)
			}
		}
		return build_stroke_vbo(
			new Float32Array(segments),
			context.STATIC_DRAW
		)
	})()
	const sky_sphere_major = (() => {
		const { sky_sphere_radius: r } = Config.view
		const seg_w = 36
		const seg_h = 18
		/** @type {number[]} */
		const segments = []
		const phi = Math.PI * .5
		const cy = Math.cos(phi)
		const sy = Math.sin(phi)
		for (let x = 0; x < seg_w; x++) {
			const th1 = (x / seg_w) * TAU
			const th2 = ((x + 1) / seg_w) * TAU
			const p1x = Math.sin(th1) * sy * r
			const p1y = cy * r
			const p1z = -Math.cos(th1) * sy * r
			const p2x = Math.sin(th2) * sy * r
			const p2y = cy * r
			const p2z = -Math.cos(th2) * sy * r
			segments.push(p1x, p1y, p1z, p2x, p2y, p2z)
		}
		const th_list = [
			0,
			Math.PI * .5,
			Math.PI,
			Math.PI * 1.5
		]
		for (const th of th_list) {
			const cx = Math.cos(th)
			const sx = Math.sin(th)
			for (let y = 0; y < seg_h; y++) {
				const v1 = (y / seg_h) * Math.PI
				const v2 = ((y + 1) / seg_h) * Math.PI
				const p1x = sx * Math.sin(v1) * r
				const p1y = Math.cos(v1) * r
				const p1z = -cx * Math.sin(v1) * r
				const p2x = sx * Math.sin(v2) * r
				const p2y = Math.cos(v2) * r
				const p2z = -cx * Math.sin(v2) * r
				segments.push(p1x, p1y, p1z, p2x, p2y, p2z)
			}
		}
		return build_stroke_vbo(
			new Float32Array(segments),
			context.STATIC_DRAW
		)
	})()
	return _
})()
const SFX = await (async () => {
	const _ = { now, play_crit, play_hit }
	/** @returns {number} */
	function now() {
		return context.currentTime
	}
	/** @returns {void} */
	function play_crit() {
		const t = now()
		wake(t)
		const src = context.createBufferSource()
		src.buffer = crit_sound
		src.connect(master)
		src.start(t)
	}
	/** @returns {void} */
	function play_hit() {
		const t = now()
		wake(t)
		const src = context.createBufferSource()
		src.buffer = hit_sound
		src.connect(master)
		src.start(t)
	}
	/**
	 * @param {number} t
	 * @returns {void}
	 */
	function wake(t) {
		if (context.state !== "running") context.resume()
		const target = Config.audio.volume
		if (Math.abs(master.gain.value - target) > 1e-3) {
			master.gain.cancelScheduledValues(t)
			master.gain.setTargetAtTime(target, t, .01)
		}
	}
	const context = new AudioContext()
	const master = context.createGain()
	master.gain.value = 0
	master.connect(context.destination)
	const [ crit_sound, hit_sound ] = await Promise.all(
		[
			(() => {
				const sr = context.sampleRate
				const duration = .25
				const off = new OfflineAudioContext(1, Math.ceil(sr * duration), sr)
				const t0 = 0
				const highpass = off.createBiquadFilter()
				highpass.type = "highpass"
				highpass.frequency.value = 700
				const air = off.createBiquadFilter()
				air.type = "peaking"
				air.frequency.value = 6_000
				air.Q.value = 1
				air.gain.value = 6
				const shaper = off.createWaveShaper()
				const shaper_curve = new Float32Array(256)
				for (let i = 0; i < 256; i++) {
					const x = i / 128 - 1
					shaper_curve[i] = Math.tanh(2 * x)
				}
				shaper.curve = shaper_curve
				shaper.oversample = "2x"
				const mix = off.createGain()
				mix.gain.value = 1
				mix.connect(highpass)
				highpass.connect(air)
				air.connect(shaper)
				shaper.connect(off.destination)
				const base_hz = 1_600
				const ratio_list = [ 1, 2.41, 3.01, 3.77 ]
				const gain_list = [ .24, .16, .11, .09 ]
				const total_s = .18
				const bell_env = off.createGain()
				bell_env.gain.setValueAtTime(0, t0)
				bell_env.gain.linearRampToValueAtTime(.85, t0 + .002)
				bell_env.gain.exponentialRampToValueAtTime(.0001, t0 + total_s)
				bell_env.connect(mix)
				for (let i = 0; i < ratio_list.length; i++) {
					const osc = off.createOscillator()
					osc.type = "sine"
					osc.frequency.setValueAtTime(base_hz * ratio_list[i], t0)
					const g = off.createGain()
					g.gain.value = gain_list[i]
					g.gain.exponentialRampToValueAtTime(
						.0001,
						t0 + (total_s - .02) + i * .01
					)
					osc.connect(g)
					g.connect(bell_env)
					osc.start(t0)
					osc.stop(t0 + total_s + .04)
				}
				const click_len = .026
				const click_sharp = .9
				const click_body_amt = .14
				const click_bandpass_freq = 4_800
				const click_q_factor = 2 + click_sharp * .8
				const click_body_freq = 1_500
				const click_gain_mul = .55
				const noise_frames = Math.round(sr * Math.min(.05, click_len))
				const noise_buf = off.createBuffer(1, noise_frames, sr)
				const ch = noise_buf.getChannelData(0)
				for (let i = 0; i < noise_frames; i++) {
					const fade = 1 - i / noise_frames
					ch[i] = (Math.random() * 2 - 1) * fade
				}
				const noise = off.createBufferSource()
				noise.buffer = noise_buf
				const click_highpass = off.createBiquadFilter()
				click_highpass.type = "highpass"
				click_highpass.frequency.value = 250 + click_sharp * 700
				const click_bandpass = off.createBiquadFilter()
				click_bandpass.type = "bandpass"
				click_bandpass.frequency.value = click_bandpass_freq
				click_bandpass.Q.value = click_q_factor
				const pulse = off.createOscillator()
				pulse.type = "square"
				pulse.frequency.value = 2_000 + click_sharp * 4_200
				const pulse_gain = off.createGain()
				pulse_gain.gain.value = (.002 + click_sharp * .010) * click_gain_mul
				const body = off.createOscillator()
				body.type = "sine"
				body.frequency.value = click_body_freq
				const body_gain = off.createGain()
				body_gain.gain.value = .02 * click_body_amt * click_gain_mul
				const click_env = off.createGain()
				click_env.gain.setValueAtTime(1.0, t0)
				click_env.gain.exponentialRampToValueAtTime(
					.001,
					t0 + Math.max(.018, click_len)
				)
				click_env.connect(mix)
				noise.connect(click_highpass)
					.connect(click_bandpass)
					.connect(click_env)
				pulse.connect(pulse_gain)
					.connect(click_env)
				body.connect(body_gain)
					.connect(click_env)
				noise.start(t0)
				noise.stop(t0 + Math.min(.05, click_len))
				pulse.start(t0)
				pulse.stop(t0 + .02 + click_sharp * .02)
				body.start(t0)
				body.stop(t0 + click_len * 1.1)
				return off.startRendering()
			})(),
			(() => {
				const sr = context.sampleRate
				const duration = .08
				const off = new OfflineAudioContext(1, Math.ceil(sr * duration), sr)
				const t0 = 0
				const len = .035
				const sharp = .8
				const body_amt = .55
				const bp_freq = 1_400
				const q_factor = .8 + sharp * 1.5
				const body_freq = 320
				const noise_len = Math.round(sr * .03)
				const noise_buf = off.createBuffer(1, noise_len, sr)
				const ch = noise_buf.getChannelData(0)
				for (let i = 0; i < noise_len; i++) {
					ch[i] = (Math.random() * 2 - 1) * (1 - i / noise_len)
				}
				const noise = off.createBufferSource()
				noise.buffer = noise_buf
				const pulse = off.createOscillator()
				pulse.type = "square"
				pulse.frequency.value = 2_000 + sharp * 4_000
				const pulse_gain = off.createGain()
				pulse_gain.gain.value = (.002 + sharp * .01)
				const body = off.createOscillator()
				body.type = "sine"
				body.frequency.value = body_freq
				const body_gain = off.createGain()
				body_gain.gain.value = .02 * body_amt
				const highpass = off.createBiquadFilter()
				highpass.type = "highpass"
				highpass.frequency.value = 250 + sharp * 600
				const bandpass = off.createBiquadFilter()
				bandpass.type = "bandpass"
				bandpass.frequency.value = bp_freq
				bandpass.Q.value = q_factor
				const env = off.createGain()
				env.gain.setValueAtTime(1, t0)
				env.gain.exponentialRampToValueAtTime(.001, t0 + Math.max(.02, len))
				const shaper = off.createWaveShaper()
				const curve = new Float32Array(256)
				for (let i = 0; i < 256; i++) {
					const x = i / 128 - 1
					curve[i] = Math.tanh(2.2 * x)
				}
				shaper.curve = curve
				shaper.oversample = "2x"
				noise.connect(highpass)
					.connect(bandpass)
					.connect(env)
				pulse.connect(pulse_gain)
					.connect(env)
				body.connect(body_gain)
					.connect(env)
				env.connect(shaper)
					.connect(off.destination)
				noise.start(t0)
				noise.stop(t0 + Math.min(.06, len))
				pulse.start(t0)
				pulse.stop(t0 + .02 + sharp * .02)
				body.start(t0)
				body.stop(t0 + len * 1.2)
				return off.startRendering()
			})()
		]
	)
	return _
})()
const State = (() => {
	const _ = {
		camera: {
			/** @type {"2d" | "3d"} */
			mode: "2d",
			pitch: 0,
			proj: new Float32Array(16),
			view: new Float32Array(16),
			x: 0,
			y: 0,
			yaw: 0
		},
		device: { height: 0, width: 0 },
		flick: {
			best_score: Number(
				localStorage.getItem("flick.best_score") || 0
			),
			best_score_3d: Number(
				localStorage.getItem("flick.best_score_3d") || 0
			),
			/** @type {Target[]} */
			targets: [],
			/** @type {Target3D[]} */
			targets_3d: []
		},
		game: {
			/** @type {GameMode?} */
			mode: null,
			raf_id: 0
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
		input: { mb_left: false },
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
			best_score_3d: Number(
				localStorage.getItem("tracking.best_score_3d") || 0
			),
			move: {
				direction: 0,
				speed: 0,
				direction_change_rate: 0
			},
			next_impact_s: 0,
			next_change_size_ms: 0,
			next_change_move_ms: 0,
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
			target: { cr: 0, cx: 0, cy: 0, r: 0, x: 0, y: 0 },
			target_3d: { cp: 0, cr: 0, cy: 0, p: 0, r: 0, y: 0 }
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
	return _
})()
{
	const flick_btn = /** @type {HTMLButtonElement} */(document.getElementById("flick"))/**/
	const flick_3d_btn = /** @type {HTMLButtonElement} */(document.getElementById("flick_3d"))/**/
	const tracking_btn = /** @type {HTMLButtonElement} */(document.getElementById("tracking"))/**/
	const tracking_3d_btn = /** @type {HTMLButtonElement} */(document.getElementById("tracking_3d"))/**/
	addEventListener(
		"resize",
		on_resize,
		{ passive: true }
	)
	document.addEventListener("fullscreenchange", on_resize)
	document.addEventListener("keydown", on_keydown)
	document.addEventListener(
		"pointercancel",
		on_pointercancel
	)
	document.addEventListener("pointerdown", on_pointerdown)
	document.addEventListener(
		"pointerlockchange",
		on_pointerlockchange
	)
	document.addEventListener(
		"pointermove",
		on_pointermove,
		{ passive: true }
	)
	document.addEventListener("pointerup", on_pointerup)
	flick_btn.addEventListener("click", on_click)
	flick_3d_btn.addEventListener("click", on_click)
	tracking_btn.addEventListener("click", on_click)
	tracking_3d_btn.addEventListener("click", on_click)
	on_resize()
	/**
	 * @param {MouseEvent} ev
	 * @returns {void}
	 */
	function on_click(ev) {
		if (ev.target == flick_btn) {
			Logic.start_game("2d", "flick")
		} else if (ev.target == flick_3d_btn) {
			Logic.start_game("3d", "flick")
		} else if (ev.target == tracking_btn) {
			Logic.start_game("2d", "tracking")
		} else if (ev.target == tracking_3d_btn) {
			Logic.start_game("3d", "tracking")
		} else {
			throw Error()
		}
	}
	/**
	 * @param {KeyboardEvent} ev
	 * @returns {void}
	 */
	function on_keydown(ev) {
		if (ev.code == "Tab") {
			ev.preventDefault()
			HUD.cycle_active_game_sens()
		}
	}
	/** @returns {void} */
	function on_pointercancel() {
		if (State.game.mode) {
			State.input.mb_left = false
		}
	}
	/**
	 * @param {MouseEvent} ev
	 * @returns {void}
	 */
	function on_pointerdown(ev) {
		if (ev.button == 0 && State.game.mode) {
			State.input.mb_left = true
			Logic.shoot()
		}
	}
	/**
	 * @param {MouseEvent} ev
	 * @returns {void}
	 */
	function on_pointermove(ev) {
		if (!State.game.mode) return
		if (State.camera.mode == "2d") {
			State.camera.x += ev.movementX
			State.camera.y += ev.movementY
		} else {
			const { hfov_deg } = Config.view
			const { camera } = State
			const sens = Logic.compute_perspective_correction(hfov_deg)
				/ State.device.width
			const pitch_limit = Math.PI / 2 - 1e-4
			camera.yaw += ev.movementX * sens
			camera.pitch -= ev.movementY * sens
			camera.pitch = Math.max(
				Math.min(camera.pitch, pitch_limit),
				-pitch_limit
			)
		}
	}
	/**
	 * @param {MouseEvent} ev
	 * @returns {void}
	 */
	function on_pointerup(ev) {
		if (ev.button == 0 && State.game.mode) {
			State.input.mb_left = false
		}
	}
	/** @returns {void} */
	function on_pointerlockchange() {
		if (document.pointerLockElement) {
			document.body.classList.add("locked")
		} else {
			document.body.classList.remove("locked")
			if (State.game.mode) {
				Logic.stop_game()
			}
		}
	}
	/** @returns {void} */
	function on_resize() {
		Renderer.resize()
		HUD.update_game_sens()
	}
}