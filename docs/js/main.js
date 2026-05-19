import {
	active_game_sens,
	change_bg_video,
	on_resize,
	set_crosshair_color_inputs
} from "./controller/index.js"
import {
	aim_booster_score_el,
	bg_type_input,
	crosshair_dot_input,
	crosshair_gap_input,
	crosshair_height_input,
	crosshair_thickness_input,
	crosshair_width_input,
	dpi_norm_dpi_input,
	dpi_norm_game_btn,
	dpi_norm_sens_input,
	flick_score_el,
	full_tracking_score_el,
	lol_sens_input,
	monitor_res_btn,
	timing_score_el,
	tracking_score_el,
	twitch_score_el,
	version_el,
	writing_score_el
} from "./document.js"
import { draw_crosshair_preview } from "./render/renderer.js"
import state from "./state.js"
aim_booster_score_el.textContent = String(
	state.mode.aim_booster.best_score
)
bg_type_input.value = state.bg.type
set_crosshair_color_inputs(state.crosshair.color)
crosshair_dot_input.value = String(state.crosshair.dot)
crosshair_gap_input.value = String(state.crosshair.gap)
crosshair_height_input.value = String(state.crosshair.height)
crosshair_thickness_input.value = String(state.crosshair.thickness)
crosshair_width_input.value = String(state.crosshair.width)
dpi_norm_dpi_input.value = String(state.dpi_norm.dpi)
dpi_norm_game_btn.value = state.dpi_norm.game
dpi_norm_sens_input.value = String(state.dpi_norm.sens)
flick_score_el.textContent = String(state.mode.flick.best_score)
full_tracking_score_el.textContent = String(
	state.mode.full_tracking.best_score
)
lol_sens_input.value = String(state.game.lol_sens)
monitor_res_btn.value = state.game.resolution
timing_score_el.textContent = String(state.mode.timing.best_score)
tracking_score_el.textContent = String(state.mode.tracking.best_score)
twitch_score_el.textContent = String(state.mode.twitch.best_score)
version_el.textContent = "v1.0.0"
writing_score_el.textContent = String(state.mode.writing.best_score)
active_game_sens()
change_bg_video()
draw_crosshair_preview()
on_resize()