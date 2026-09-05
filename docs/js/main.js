import constants from "./constants.js"
import "./render/renderer_bg.js"
import { update_cpi_norm_result } from "./controller/cpi_norm.js"
import {
	ads_toggle_input,
	al_ads_scope_select,
	bg_blur_input,
	bgm_volume_input,
	bgm_volume_mobile_input,
	cpi_norm_cpi_input,
	cpi_norm_game_select,
	cpi_norm_sens_input,
	crosshair_alpha_input,
	crosshair_color_input,
	crosshair_dot_input,
	crosshair_gap_input,
	crosshair_height_input,
	crosshair_rgba_el,
	crosshair_thickness_input,
	crosshair_width_input,
	cs2_ads_scope_select,
	fn_ads_scope_select,
	lang_select,
	lol_sens_input,
	monitor_height_input,
	monitor_width_input,
	ow_ads_scope_select,
	pubg_ads_scope_select,
	pubg_fov_select,
	r6_ads_scope_select,
	rb_ads_scope_select,
	sfx_volume_input,
	val_ads_scope_select,
	version_el
} from "./controller/dom.js"
import { init_game_sens } from "./controller/game_sens.js"
import "./controller/menu.js"
import {
	init_bg,
	parse_color,
	sync_setting_hash
} from "./controller/setting.js"
import { on_resize } from "./controller/window.js"
import { draw_crosshair_preview } from "./render/renderer_2d.js"
import state from "./state.js"
{
	const { a, b, g, r } = parse_color(state.crosshair.color)
	const { ads_scope } = state.game
	/** @type {Text} */
	let text
	ads_toggle_input.checked = state.game.ads_toggle
	al_ads_scope_select.value = ads_scope.al
	bg_blur_input.checked = state.bg.blur
	bgm_volume_input.value = String(state.audio.bgm_volume)
	bgm_volume_mobile_input.value = String(state.audio.bgm_volume)
	crosshair_alpha_input.value = String(a * 100)
	crosshair_color_input.value = `rgb(${r},${g},${b})`
	crosshair_dot_input.value = String(state.crosshair.dot)
	crosshair_gap_input.value = String(state.crosshair.gap)
	crosshair_height_input.value = String(state.crosshair.height)
	crosshair_rgba_el.style.color = crosshair_rgba_el.textContent = state.crosshair.color
	crosshair_thickness_input.value = String(state.crosshair.thickness)
	crosshair_width_input.value = String(state.crosshair.width)
	cpi_norm_cpi_input.value = String(state.cpi_norm.cpi)
	cpi_norm_game_select.value = state.cpi_norm.game
	cpi_norm_sens_input.value = String(state.cpi_norm.sens)
	cs2_ads_scope_select.value = ads_scope.cs2
	fn_ads_scope_select.value = ads_scope.fn
	lang_select.value = state.lang
	lol_sens_input.value = String(state.game.lol_sens)
	monitor_height_input.value = String(state.game.height)
	monitor_width_input.value = String(state.game.width)
	ow_ads_scope_select.value = ads_scope.ow
	pubg_ads_scope_select.value = ads_scope.pubg
	pubg_fov_select.value = String(state.game.pubg_fov)
	r6_ads_scope_select.value = ads_scope.r6
	rb_ads_scope_select.value = ads_scope.rb
	sfx_volume_input.value = String(state.audio.sfx_volume)
	val_ads_scope_select.value = ads_scope.val
	version_el.textContent = constants.version
	text = /** @type {Text} */(bgm_volume_input.nextSibling)/**/
	text.textContent = `${bgm_volume_input.value}%`
	text = /** @type {Text} */(bgm_volume_mobile_input.nextSibling)/**/
	text.textContent = `${bgm_volume_mobile_input.value}%`
	text = /** @type {Text} */(crosshair_alpha_input.nextSibling)/**/
	text.textContent = `${crosshair_alpha_input.value}%`
	text = /** @type {Text} */(sfx_volume_input.nextSibling)/**/
	text.textContent = `${sfx_volume_input.value}%`
	for (
		const key of [
			"aim_booster#best_score",
			"flick#best_score",
			"flick_180#best_score",
			"h_tracking#best_score",
			"timing#best_score",
			"twitch#best_score",
			"v_tracking#best_score",
			"writing#best_score"
		]
	) {
		localStorage.removeItem(key)
	}
	init_game_sens()
	init_bg()
	draw_crosshair_preview()
	on_resize()
	sync_setting_hash()
	update_cpi_norm_result()
}