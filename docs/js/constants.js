
export default /** @type {const} */({
	audio: { volume: .5 },
	crosshair: { height: 28, width: 28 },
	grid: {
		major_every: 9,
		size: 80,
		sky_sphere_radius: 100
	},
	hud: { update_interval_ms: 100 },
	impact: {
		duration_s: .15,
		fade_factor: .75,
		rings: 2,
		spacing: .4
	},
	mode: {
		aiming: {
			base_speed: .005,
			required_dwell_ms: 100,
			score_mul: 800
		},
		flick: {
			first_dist_mul: 4,
			num_targets: 20,
			pitch_limit: 30,
			score_mul: 200
		},
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
		twitch: {
			score_mul: 1500,
			target_hide_duration_ms: 1_000,
			target_show_duration_ms: 500
		},
		writing: {
			line_width: 4,
			offset_x: 10,
			text: `Veni, vidi, vici.
Give me liberty, or give me death!
I have a dream.
May the Force be with you.
I'm gonna make him an offer he can't refuse.
Life is like a box of chocolates. You never know what you're gonna get.
Cogito, ergo sum.
To be, or not to be, that is the question.
In the middle of difficulty lies opportunity.
Stay hungry, stay foolish.
Yes we can.`
		}
	},
	stats: { window_ms: 30_000 },
	target: { base_radius: 5 }
})/**/