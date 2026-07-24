import { convert_deg_across_aspect } from "./math.js"
export default /** @type {const} */({
	audio: { bgm_max_gain: 1, sfx_max_gain: 5 },
	crosshair: {
		color: "rgba(255,255,0,1)",
		dot: 0,
		gap: 4,
		height: 28,
		thickness: 2,
		width: 28
	},
	dpi: (() => {
		const x = 360
		return { x, y: x * 1.5 }
	})(),
	fov: {
		al: (() => {
			const hipfire = 70 * 1.55
			const x1 = 60 * 1.55
			return {
				hipfire,
				render: [
					convert_deg_across_aspect(hipfire, 4, 3),
					convert_deg_across_aspect(x1, 4, 3)
				],
				x1,
				x10: convert_deg_across_aspect(x1, 10, 1),
				x2: convert_deg_across_aspect(x1, 2, 1),
				x3: convert_deg_across_aspect(x1, 3, 1),
				x4: convert_deg_across_aspect(x1, 4, 1),
				x6: convert_deg_across_aspect(x1, 6, 1),
				x8: convert_deg_across_aspect(x1, 8, 1)
			}
		})(),
		bdo: { hipfire: 70, render: [ 70 ] },
		cs2: (() => {
			const hipfire = 90
			const x1 = 40
			return {
				aug: 45,
				auto2: 15,
				awp2: 10,
				hipfire,
				render: [
					convert_deg_across_aspect(hipfire, 4, 3),
					convert_deg_across_aspect(x1, 4, 3)
				],
				x1
			}
		})(),
		fn: {
			hipfire: 80,
			render: [
				convert_deg_across_aspect(80, 16, 9)
			],
			scope: 15
		},
		lol: {
			render: [
				convert_deg_across_aspect(103, 16, 9)
			]
		},
		mc: { hipfire: 110, render: [ 110 ] },
		ow: (() => {
			const hipfire = 103
			const widow = 30
			return {
				ashe: convert_deg_across_aspect(40, 9, 16),
				emre: convert_deg_across_aspect(42.5, 9, 16),
				freja: convert_deg_across_aspect(47.5, 9, 16),
				hipfire,
				render: [
					convert_deg_across_aspect(hipfire, 16, 9),
					widow
				],
				widow: convert_deg_across_aspect(widow, 9, 16)
			}
		})(),
		pubg: (() => {
			const base = 80
			const x1 = base / 1.5
			return {
				base,
				render: [
					convert_deg_across_aspect(103, 16, 9),
					convert_deg_across_aspect(base, 16, 9),
					convert_deg_across_aspect(x1, 16, 9)
				],
				x1,
				x15: base / 15,
				x2: base / 2,
				x3: base / 3,
				x4: base / 4 - 1,
				x6: base / 6,
				x8: base / 8
			}
		})(),
		r6: (() => {
			const base = 90
			const x1 = 81
			const x2_5 = convert_deg_across_aspect(base, 2.5, 1)
			return {
				base,
				render: [ x1, x2_5 ],
				x1,
				x12: convert_deg_across_aspect(base, 12, 1),
				x1_5: convert_deg_across_aspect(base, 1.5, 1),
				x2: convert_deg_across_aspect(base, 2, 1),
				x2_5,
				x3: convert_deg_across_aspect(base, 3, 1),
				x4: convert_deg_across_aspect(base, 4, 1),
				x5: convert_deg_across_aspect(base, 5, 1)
			}
		})(),
		sa: (() => {
			const hipfire = 85
			return {
				hipfire,
				render: [
					convert_deg_across_aspect(hipfire, 4, 3)
				]
			}
		})(),
		val: (() => {
			const hipfire = 103
			const operator2_5 = convert_deg_across_aspect(hipfire, 2.5, 1)
			return {
				guardian: convert_deg_across_aspect(hipfire, 1.5, 1),
				hipfire,
				marshal: convert_deg_across_aspect(hipfire, 3.5, 1),
				operator2_5,
				operator5: convert_deg_across_aspect(hipfire, 5, 1),
				render: [
					convert_deg_across_aspect(hipfire, 16, 9),
					convert_deg_across_aspect(operator2_5, 16, 9)
				],
				spectre: convert_deg_across_aspect(hipfire, 1.15, 1),
				vandal: convert_deg_across_aspect(hipfire, 1.25, 1)
			}
		})()
	},
	frame_limit: {
		space_hold_interval_ms: 1_000 / 30
	},
	grid: {
		major_every: 9,
		size: 80,
		sky_sphere_radius: 100
	},
	hud: {
		update_interval_ms: 50,
		window_ms: 30_000
	},
	impact: {
		duration_s: .15,
		fade_factor: .75,
		px_size: 20,
		rings: 2,
		spacing: .4
	},
	mode: {
		aim_booster: {
			inc_target_per_sec: 2,
			rewind_s: 10,
			start_target_per_sec: 2,
			target_height: 1_080 / 4,
			target_radius_mul: 3,
			target_radius_per_dist: .03,
			target_width: 1_920 / 4
		},
		flick: {
			first_dist_mul: 5,
			num_targets: 8,
			pitch_limit: 30,
			target_radius_mul: 1.5
		},
		h_tracking: {
			base_speed: .01,
			impact_interval_s: .1,
			move_change_interval_ms: 500,
			size_change_interval_ms: 2_000,
			size_lerp_ms: 500,
			size_steps: [ 1, 2, 5, 15 ],
			speed_lerp_ms: 250,
			speed_steps: [ .5, .75, 1 ]
		},
		timing: {
			base_speed: .01,
			cross_time_max: .9,
			cross_time_min: .3,
			size_steps: [ 1, 2, 3 ],
			speed_steps: [ 2, 3, 4 ],
			target_hide_duration_ms: 500,
			target_show_duration_ms: 1_000,
			y_range_mul: 5
		},
		twitch: {
			height_div: 6,
			target_hide_duration_ms: 500,
			target_radius_mul_max: 2,
			target_show_duration_ms: 1_000,
			width_div: 3
		},
		v_tracking: {
			base_speed: .01,
			impact_interval_s: .1,
			move_change_interval_ms: 500,
			pitch_limit: 90,
			size_change_interval_ms: 2_000,
			size_lerp_ms: 500,
			size_steps: [ 1, 2, 5, 25 ],
			speed_lerp_ms: 250,
			speed_steps: [ .75, 1, 1.25 ]
		},
		writing: {
			line_width: 2,
			offset_x: 10,
			sentences: [
				"Calm mind wins every fight.",
				"Control the moment, win the game.",
				"Discipline shapes destiny.",
				"Fear is a liar, ignore it.",
				"Focus creates reality.",
				"Fortune favors the bold.",
				"Hesitation leads to defeat.",
				"Move with purpose, strike with precision.",
				"One mistake costs everything.",
				"Precision is better than speed.",
				"Pressure reveals true skill.",
				"See clearly, act instantly.",
				"Stay calm, aim true, finish strong.",
				"Think less, react better.",
				"Train hard, win easy."
			]
		}
	},
	screen_saver: { delay_ms: 5_000 },
	target: {
		base_radius: 5,
		core_fill_3d: [ .11, .204, .29 ],
		core_fill_style: "#1c344a",
		fill_3d: [ .22, .35, .47 ],
		fill_style: "#385978",
		line_width: 1,
		stroke_3d: [ 1, 1, .27 ],
		stroke_style: "#ff4"
	},
	tpp: {
		bdo: 9,
		fn: 3,
		mc: 4,
		pubg: 3,
		render_dist_scale: 10
	},
	version: "v1.0.0"
})/**/