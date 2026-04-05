import {
	active_game_sens,
	change_bg_video,
	on_resize
} from "./controller/index.js"
import {
	aim_booster_score_el,
	bg_type_input,
	dpi_norm_dpi_input,
	dpi_norm_game_btn,
	dpi_norm_sens_input,
	flick_score_el,
	monitor_res_btn,
	tracking_score_el,
	twitch_score_el,
	v_tracking_score_el,
	version_el,
	writing_score_el
} from "./document.js"
import state from "./state.js"
monitor_res_btn.value = state.game.resolution
aim_booster_score_el.textContent = localStorage.getItem("aim_booster.best_score") || "0"
flick_score_el.textContent = localStorage.getItem("flick.best_score") || "0"
tracking_score_el.textContent = localStorage.getItem("tracking.best_score") || "0"
twitch_score_el.textContent = localStorage.getItem("twitch.best_score") || "0"
v_tracking_score_el.textContent = localStorage.getItem("v_tracking.best_score") || "0"
writing_score_el.textContent = localStorage.getItem("writing.best_score") || "0"
version_el.textContent = "v1.0.0"
bg_type_input.value = state.bg.type
dpi_norm_dpi_input.value = String(state.dpi_norm.dpi)
dpi_norm_game_btn.value = state.dpi_norm.game
dpi_norm_sens_input.value = String(state.dpi_norm.sens)
change_bg_video()
active_game_sens()
on_resize()