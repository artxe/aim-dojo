import { convert_deg_across_aspect } from "./math.js"
export default /** @type {const} */({
	audio: { bgm_max_gain: 1, sfx_max_gain: 5 },
	cpi: (() => {
		let psi = 1.5
		for (let i = 0; i < 5; i++) {
			psi -= (psi ** 3 - psi ** 2 - 1) / (3 * psi ** 2 - 2 * psi)
		}
		return { psi, x: 361 }
	})(),
	crosshair: {
		color: "rgba(0,255,0,1)",
		dot: 0,
		gap: 4,
		height: 10,
		thickness: 4,
		width: 10
	},
	fov: /** @satisfies {FovConstants} */({
		al: (() => {
			const hipfire = 70 * 1.55
			const x1 = 60 * 1.55
			const x10 = convert_deg_across_aspect(x1, 10, 1)
			const x2 = convert_deg_across_aspect(x1, 2, 1)
			const x3 = convert_deg_across_aspect(x1, 3, 1)
			const x4 = convert_deg_across_aspect(x1, 4, 1)
			const x6 = convert_deg_across_aspect(x1, 6, 1)
			const x8 = convert_deg_across_aspect(x1, 8, 1)
			return {
				ads: { x1, x10, x2, x3, x4, x6, x8 },
				axis: "43",
				hipfire,
				x1,
				x10,
				x2,
				x3,
				x4,
				x6,
				x8
			}
		})(),
		bdo: { axis: "v", hipfire: 70, zoom: 40 },
		cs2: (() => {
			const aug = 45
			const auto2 = 15
			const awp2 = 10
			const hipfire = 90
			const x1 = 40
			return {
				ads: { aug, auto: x1, awp: x1 },
				ads_ref: { aug: x1, auto: x1, awp: x1 },
				ads_stage2: { aug: 0, auto: auto2, awp: awp2 },
				aug,
				auto2,
				awp2,
				axis: "43",
				hipfire,
				x1
			}
		})(),
		fn: (() => {
			const hipfire = 80
			const scoped15 = 15
			const scoped40 = 40
			const targeting65 = 65
			return {
				ads: {
					scoped15,
					scoped40,
					targeting65,
					targeting80: hipfire
				},
				axis: "h",
				hipfire,
				scoped15,
				scoped40,
				targeting65
			}
		})(),
		lol: { axis: "v", hipfire: 120 },
		mc: { axis: "v", hipfire: 110 },
		ow: (() => {
			const ashe = 40
			const emre = 42.5
			const freja = 47.5
			const widow = 30
			return {
				ads: { ashe, emre, freja, widow },
				axis: "h",
				hipfire: 103,
				scopes: { ashe, axis: "v", emre, freja, widow }
			}
		})(),
		pubg: (() => {
			const base = 80
			const x1 = base - 5
			const x15 = base / 12
			const x2 = base / 2
			const x3 = base / 3
			const x4 = base / 4 - 1
			const x6 = base / 6
			const x8 = base / 8
			return {
				ads: { x1, x15, x2, x3, x4, x6, x8 },
				axis: "h",
				base,
				x1,
				x15,
				x2,
				x3,
				x4,
				x6,
				x8
			}
		})(),
		r6: (() => {
			const base = 90
			const x1 = 81
			const x12 = convert_deg_across_aspect(base, 12, 1)
			const x1_5 = convert_deg_across_aspect(base, 1.5, 1)
			const x2 = convert_deg_across_aspect(base, 2, 1)
			const x2_5 = convert_deg_across_aspect(base, 2.5, 1)
			const x3 = convert_deg_across_aspect(base, 3, 1)
			const x4 = convert_deg_across_aspect(base, 4, 1)
			const x5 = convert_deg_across_aspect(base, 5, 1)
			return {
				ads: { x1, x12, x1_5, x2, x2_5, x3, x4, x5 },
				axis: "v",
				base,
				x1,
				x12,
				x1_5,
				x2,
				x2_5,
				x3,
				x4,
				x5
			}
		})(),
		rb: (() => {
			const exogun = 75
			const minigun = 112.5
			const pistol = 60
			const rifle = 45
			const shotgun = 90
			const slingshot = 105
			return {
				ads: {
					exogun,
					minigun,
					pistol,
					rifle,
					shotgun,
					slingshot
				},
				ads_ref: {
					exogun: rifle,
					minigun: rifle,
					pistol: rifle,
					rifle,
					shotgun: rifle,
					slingshot: rifle
				},
				axis: "v",
				base: 120,
				rivals: {
					exogun,
					hipfire: 70,
					minigun,
					pistol,
					rifle,
					shotgun,
					slingshot
				}
			}
		})(),
		sa: (() => {
			const hipfire = 85
			return {
				axis: "43",
				hipfire,
				x15: convert_deg_across_aspect(hipfire, 15, 1),
				x15_sens: .15,
				x5: convert_deg_across_aspect(hipfire, 5, 1),
				x5_sens: .25
			}
		})(),
		val: (() => {
			const hipfire = 103
			const guardian = convert_deg_across_aspect(hipfire, 1.5, 1)
			const marshal = convert_deg_across_aspect(hipfire, 3.5, 1)
			const operator2_5 = convert_deg_across_aspect(hipfire, 2.5, 1)
			const operator5 = convert_deg_across_aspect(hipfire, 5, 1)
			const spectre = convert_deg_across_aspect(hipfire, 1.15, 1)
			const vandal = convert_deg_across_aspect(hipfire, 1.25, 1)
			return {
				ads: {
					guardian,
					marshal,
					operator: operator2_5,
					spectre,
					vandal
				},
				ads_ref: {
					guardian: vandal,
					marshal: operator2_5,
					operator: operator2_5,
					spectre: vandal,
					vandal
				},
				ads_stage2: {
					guardian: 0,
					marshal: 0,
					operator: operator5,
					spectre: 0,
					vandal: 0
				},
				axis: "h",
				guardian,
				hipfire,
				marshal,
				operator2_5,
				operator5,
				spectre,
				vandal
			}
		})()
	}),
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
		duration_ms: 150,
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
		flick_180: {
			opposite_radius_mul: 20,
			random_radius_mul: 4,
			spawn_range: 30,
			travel_duration_ms: 300
		},
		h_tracking: {
			base_speed: .01,
			impact_interval_ms: 100,
			move_change_interval_ms: 500,
			size_change_interval_ms: 2_000,
			size_lerp_ms: 500,
			size_steps: [ 1.5, 2, 5, 15 ],
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
			impact_interval_ms: 100,
			move_change_interval_ms: 500,
			pitch_limit: 90,
			size_change_interval_ms: 2_000,
			size_lerp_ms: 500,
			size_steps: [ 1.5, 2, 5, 25 ],
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
	sens: {
		al: {
			decimals: 2,
			mul_decimals: 2,
			scale: .022
		},
		bdo: {
			decimals: 0,
			offset: .000_125,
			step: .000_023_75
		},
		cs2: {
			decimals: 2,
			mul_decimals: 2,
			scale: .022
		},
		fn: { decimals: 1, scale: .005_555 },
		mc: {
			base: 1.2,
			decimals: 16,
			offset: .2,
			percent: 200,
			step: .6
		},
		ow: {
			decimals: 2,
			mul_decimals: 2,
			scale: .006_6
		},
		pubg: {
			base_sens: 50,
			base_yaw: .044_440_000_444_4,
			converted_base: .02,
			decimals: 6,
			step: 15.051_5
		},
		r6: {
			decimals: 6,
			scale: .005_73,
			yaw_unit: .02
		},
		rb: {
			decimals: 3,
			grid: 5,
			mul_decimals: 2,
			scale: .5
		},
		sa: {
			decimals: 0,
			offset: .000_45,
			step: .000_03
		},
		val: {
			decimals: 3,
			mul_decimals: 3,
			scale: .07
		}
	},
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
		fn_ads: 1,
		mc: 4,
		pubg: 3,
		render_dist_scale: 10
	},
	version: "v1.0.0"
})/**/