/* eslint
no-restricted-syntax: [
	"error",
	{ "selector": "ImportDeclaration:not([source.value='./math.js'])" }
]
*/
import { random } from "./math.js"
export default /** @type {const} */({
	audio: { volume: .5 },
	crosshair: {
		color: "#FF0000",
		dot: 6,
		gap: 8,
		height: 12,
		thickness: 2,
		width: 12
	},
	dpi: { x: 350, y: 650 },
	grid: {
		major_every: 9,
		size: 80,
		sky_sphere_radius: 100
	},
	hud: { update_interval_ms: 50 },
	impact: {
		duration_s: .15,
		fade_factor: .75,
		rings: 2,
		spacing: .4
	},
	mode: {
		aim_booster: {
			inc_target_per_sec: 2,
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
		full_tracking: {
			base_speed: .01,
			impact_interval_s: .1,
			move_change_interval_ms: 500,
			pitch_limit: 30,
			size_change_interval_ms: 1_500,
			size_lerp_ms: 500,
			size_steps: [ 1, 2, 3, 5 ],
			speed_lerp_ms: 250,
			speed_steps: [ .5, .75, 1 ],
			v_speed_steps: [ 0, .25, .5, .75 ]
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
		tracking: {
			base_speed: .01,
			impact_interval_s: .1,
			move_change_interval_ms: 500,
			size_change_interval_ms: 2_000,
			size_lerp_ms: 500,
			size_steps: [ 1, 2, 5, 25 ],
			speed_lerp_ms: 250,
			speed_steps: [ .75, 1, 1.25 ]
		},
		twitch: {
			height_div: 6,
			target_hide_duration_ms: 500,
			target_radius_mul_max: 2,
			target_show_duration_ms: 1_000,
			width_div: 3
		},
		writing: {
			line_width: 2,
			offset_x: 10,
			text: (() => {
				const lines = [
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
				for (let i = lines.length - 1; i > 0; i--) {
					const j = (random() * (i + 1) | 0)
					;[ lines[i], lines[j] ] = [ lines[j], lines[i] ]
				}
				return lines.join("\n")
			})()
		}
	},
	stats: { window_ms: 30_000 },
	target: {
		base_radius: 5,
		core_fill_3d: [ .11, .204, .29 ],
		core_fill_style: "#1c344a",
		fill_3d: [ .22, .35, .47 ],
		fill_style: "#385978",
		line_width: 1,
		stroke_3d: [ 1, 1, .27 ],
		stroke_style: "#ff4"
	}
})/**/