import constants from "./constants.js"
import {
	active_game_sens,
	change_bg_video,
	on_resize
} from "./controller/index.js"
import {
	aim_booster_score_el,
	bg_type_input,
	crosshair_color_el,
	crosshair_dot_el,
	crosshair_gap_el,
	crosshair_height_el,
	crosshair_thickness_el,
	crosshair_width_el,
	dpi_el,
	dpi_norm_dpi_input,
	dpi_norm_game_btn,
	dpi_norm_sens_input,
	dpi_x_el,
	dpi_y_el,
	flick_score_el,
	full_tracking_score_el,
	monitor_res_btn,
	sens_mult_el,
	timing_score_el,
	tracking_score_el,
	twitch_score_el,
	version_el,
	writing_score_el,
	yx_ratio_btn
} from "./document.js"
import { round_to } from "./math.js"
import state from "./state.js"
monitor_res_btn.value = state.game.resolution
aim_booster_score_el.textContent = String(
	state.mode.aim_booster.best_score
)
flick_score_el.textContent = String(state.mode.flick.best_score)
full_tracking_score_el.textContent = String(
	state.mode.full_tracking.best_score
)
timing_score_el.textContent = String(state.mode.timing.best_score)
tracking_score_el.textContent = String(state.mode.tracking.best_score)
twitch_score_el.textContent = String(state.mode.twitch.best_score)
writing_score_el.textContent = String(state.mode.writing.best_score)
version_el.textContent = "v1.0.0"
bg_type_input.value = state.bg.type
dpi_norm_dpi_input.value = String(state.dpi_norm.dpi)
dpi_norm_game_btn.value = state.dpi_norm.game
dpi_norm_sens_input.value = String(state.dpi_norm.sens)
dpi_x_el.textContent = String(constants.dpi.x)
dpi_y_el.textContent = String(constants.dpi.y)
dpi_el.textContent = constants.dpi.x % 25 == 0 ? String(constants.dpi.x * 2) : "1000"
sens_mult_el.textContent = constants.dpi.x % 25 == 0 ? "0.5" : String(constants.dpi.x / 1_000)
yx_ratio_btn.textContent = String(
	round_to(
		constants.dpi.y / constants.dpi.x,
		5
	)
)
crosshair_color_el.textContent = constants.crosshair.color
crosshair_color_el.style.color = constants.crosshair.color
crosshair_dot_el.textContent = String(constants.crosshair.dot)
crosshair_width_el.textContent = String(constants.crosshair.width)
crosshair_height_el.textContent = String(constants.crosshair.height)
crosshair_gap_el.textContent = String(constants.crosshair.gap)
crosshair_thickness_el.textContent = String(constants.crosshair.thickness)
change_bg_video()
active_game_sens()
on_resize()