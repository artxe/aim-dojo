
export default /** @type {const} */({
	audio: { volume: .5 },
	crosshair: {
		color: "#0f0",
		height: 10,
		gap: 0,
		width: 2
	},
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
			score_mul: 200,
			start_target_per_sec: 2,
			target_height: 1080 / 4,
			target_radius: 20,
			target_width: 1920 / 4
		},
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
			size_lerp_ms: 250,
			size_steps: [ 1, 2, 3, 5 ],
			speed_lerp_ms: 150,
			speed_steps: [ 0.75, 1, 1.25 ]
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
			size_lerp_ms: 250,
			size_steps: [ 1, 2, 3, 5 ],
			speed_lerp_ms: 150,
			speed_steps: [ 0.5, 0.75, 1 ],
			v_speed_steps: [ 0, 0.75, 1, 1.25 ]
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