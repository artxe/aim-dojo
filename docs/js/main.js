import constants from "./constants.js"
import "./render/renderer_bg.js"
import {
	bg_blur_input,
	bgm_volume_input,
	crosshair_alpha_input,
	crosshair_color_input,
	crosshair_dot_input,
	crosshair_gap_input,
	crosshair_height_input,
	crosshair_rgba_el,
	crosshair_thickness_input,
	crosshair_width_input,
	dpi_norm_dpi_input,
	dpi_norm_game_btn,
	dpi_norm_sens_input,
	lol_sens_input,
	monitor_res_btn,
	sfx_volume_input,
	version_el
} from "./controller/dom.js"
import "./controller/dpi_norm.js"
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
	/** @type {Text} */
	let text
	bg_blur_input.checked = state.bg.blur
	bgm_volume_input.value = String(state.audio.bgm_volume)
	crosshair_alpha_input.value = String(a * 100)
	crosshair_color_input.value = `rgb(${r},${g},${b})`
	crosshair_dot_input.value = String(state.crosshair.dot)
	crosshair_gap_input.value = String(state.crosshair.gap)
	crosshair_height_input.value = String(state.crosshair.height)
	crosshair_rgba_el.style.color = crosshair_rgba_el.textContent = state.crosshair.color
	crosshair_thickness_input.value = String(state.crosshair.thickness)
	crosshair_width_input.value = String(state.crosshair.width)
	dpi_norm_dpi_input.value = String(state.dpi_norm.dpi)
	dpi_norm_game_btn.value = state.dpi_norm.game
	dpi_norm_sens_input.value = String(state.dpi_norm.sens)
	lol_sens_input.value = String(state.game.lol_sens)
	monitor_res_btn.value = state.game.resolution
	sfx_volume_input.value = String(state.audio.sfx_volume)
	version_el.textContent = constants.version
	text = /** @type {Text} */(bgm_volume_input.nextSibling)/**/
	text.textContent = `${bgm_volume_input.value}%`
	text = /** @type {Text} */(crosshair_alpha_input.nextSibling)/**/
	text.textContent = `${crosshair_alpha_input.value}%`
	text = /** @type {Text} */(sfx_volume_input.nextSibling)/**/
	text.textContent = `${sfx_volume_input.value}%`
	init_game_sens()
	init_bg()
	draw_crosshair_preview()
	on_resize()
	sync_setting_hash()
}