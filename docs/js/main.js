import {
	active_game_sens,
	update_game_sens
} from "./controller/game_sens.js"
import { on_resize } from "./controller/index.js"
import {
	change_bg_video,
	on_change_bg_type
} from "./controller/setting.js"
import {
	aiming_score_el,
	bg_type_input,
	dpi_norm_cs2_fov_btn,
	dpi_norm_cs2_sens_input,
	dpi_norm_cs2_zoom_input,
	dpi_norm_dpi_input,
	dpi_norm_fn_fov_btn,
	dpi_norm_fn_sens_input,
	dpi_norm_fn_zoom_input,
	dpi_norm_game_btn,
	dpi_norm_lol_sens_input,
	dpi_norm_mc_sens_input,
	dpi_norm_ow_fov_btn,
	dpi_norm_ow_sens_input,
	dpi_norm_ow_zoom_input,
	dpi_norm_pubg_fov_btn,
	dpi_norm_pubg_sens_input,
	dpi_norm_sa_fov_btn,
	dpi_norm_sa_sens_input,
	dpi_norm_val_fov_btn,
	dpi_norm_val_sens_input,
	dpi_norm_val_zoom_input,
	flick_score_el,
	mode_cycle_btn,
	monitor_res_btn,
	tolerance_input,
	tracking_score_el,
	twitch_score_el,
	version_el,
	writing_score_el
} from "./document.js"
import state from "./state.js"
monitor_res_btn.value = state.device.resolution
tolerance_input.value = String(state.game.tolerance)
aiming_score_el.textContent = localStorage.getItem("aiming.best_score") || "0"
flick_score_el.textContent = localStorage.getItem("flick.best_score") || "0"
tracking_score_el.textContent = localStorage.getItem("tracking.best_score") || "0"
twitch_score_el.textContent = localStorage.getItem("twitch.best_score") || "0"
writing_score_el.textContent = localStorage.getItem("writing.best_score") || "0"
const version = "v1.6.0"
if (localStorage.getItem("v") == version) {
	// no-op
} else {
	localStorage.clear()
	localStorage.setItem("v", version)
}
version_el.textContent = version
mode_cycle_btn.setAttribute(
	"on",
	state.game.cycle_id ? "true" : "false"
)
bg_type_input.value = state.bg.type
dpi_norm_dpi_input.value = String(state.dpi_norm.dpi)
dpi_norm_game_btn.value = state.dpi_norm.game
const { game } = state.dpi_norm
if (game == "cs2") {
	const { fov } = state.dpi_norm
	dpi_norm_cs2_fov_btn.value = fov
	dpi_norm_cs2_sens_input.value = String(state.dpi_norm.sens)
	if (fov != "hipfire") {
		dpi_norm_cs2_zoom_input.value = String(state.dpi_norm.zoom)
	}
} else if (game == "fn") {
	const { fov } = state.dpi_norm
	dpi_norm_fn_fov_btn.value = fov
	dpi_norm_fn_sens_input.value = String(state.dpi_norm.sens)
	if (fov != "hipfire") {
		dpi_norm_fn_zoom_input.value = String(state.dpi_norm.zoom)
	}
} else if (game == "lol") {
	dpi_norm_lol_sens_input.value = String(state.dpi_norm.sens)
} else if (game == "mc") {
	dpi_norm_mc_sens_input.value = String(state.dpi_norm.sens)
} else if (game == "ow") {
	const { fov } = state.dpi_norm
	dpi_norm_ow_fov_btn.value = fov
	dpi_norm_ow_sens_input.value = String(state.dpi_norm.sens)
	if (fov != "hipfire") {
		dpi_norm_ow_zoom_input.value = String(state.dpi_norm.zoom)
	}
} else if (game == "pubg") {
	dpi_norm_pubg_fov_btn.value = state.dpi_norm.fov
	dpi_norm_pubg_sens_input.value = String(state.dpi_norm.sens)
} else if (game == "sa") {
	dpi_norm_sa_fov_btn.value = state.dpi_norm.fov
	dpi_norm_sa_sens_input.value = String(state.dpi_norm.sens)
} else if (game == "val") {
	const { fov } = state.dpi_norm
	dpi_norm_val_fov_btn.value = fov
	dpi_norm_val_sens_input.value = String(state.dpi_norm.sens)
	if (fov != "hipfire") {
		dpi_norm_val_zoom_input.value = String(state.dpi_norm.zoom)
	}
} else {
	throw Error(game)
}
on_change_bg_type()
change_bg_video()
active_game_sens()
update_game_sens()
on_resize()