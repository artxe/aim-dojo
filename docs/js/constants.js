
export default /** @type {const} */({
	audio: { volume: .5 },
	crosshair: { height: 24, width: 24 },
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
		flick: {
			first_dist_mul: 5,
			num_targets: 8,
			pitch_limit: 30,
			score_mul: 375
		},
		tracking: {
			base_speed: .01,
			impact_interval_s: .1,
			move_change_interval_ms: 500,
			size_change_interval_ms: 1_000,
			size_lerp_ms: 100,
			size_steps: [ 1, 2, 3, 5, 8 ],
			speed_lerp_ms: 100,
			speed_steps: [ 1, 1, 1.5 ]
		},
		twitch: {
			height_div: 6,
			score_mul: 2.5,
			target_hide_duration_ms: 500,
			target_show_duration_ms: 1_000,
			width_div: 3
		},
		v_tracking: {
			base_speed: .01,
			impact_interval_s: .1,
			move_change_interval_ms: 500,
			pitch_limit: 30,
			size_change_interval_ms: 1_000,
			size_lerp_ms: 100,
			size_steps: [ 1, 2, 3, 5, 8 ],
			speed_lerp_ms: 100,
			speed_steps: [ 1, 1, 1.5 ]
		},
		writing: {
			line_width: 2,
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