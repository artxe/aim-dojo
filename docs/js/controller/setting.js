import {
	add_bg_video,
	delete_bg_video,
	get_bg_video_blob,
	list_bg_videos
} from "../bg_store.js"
import constants from "../constants.js"
import game_mode from "../game_mode/index.js"
import {
	set_bg_upload_video,
	update_bg_video,
	update_bg_volume
} from "../render/renderer_bg.js"
import { update_crosshair } from "../render/renderer_2d.js"
import state from "../state.js"
import {
	activate_bg_btn,
	bg_blur_input,
	bg_el,
	bg_iframe_el,
	bg_link_input,
	bg_type_input,
	bg_video_select,
	bgm_volume_input,
	bgm_volume_mobile_input,
	clear_aim_booster_btn,
	clear_flick_btn,
	clear_h_tracking_btn,
	clear_timing_btn,
	clear_twitch_btn,
	clear_v_tracking_btn,
	clear_writing_btn,
	copy_apo_filter_btn,
	crosshair_alpha_input,
	crosshair_color_input,
	crosshair_dot_input,
	crosshair_gap_input,
	crosshair_height_input,
	crosshair_rgba_el,
	crosshair_thickness_input,
	crosshair_width_input,
	modal_backdrop_btn,
	reset_crosshair_btn,
	save_bg_btn,
	send_toast,
	setting_btn,
	setting_scroll_el,
	setting_els,
	setting_view_el,
	sfx_volume_input,
	toast_el
} from "./dom.js"
let bg_apply_token = 0
let bg_shown_video = ""
const bg_snapshot = {
	type: state.bg.type,
	video_id: state.bg.video_id,
	youtube_link: state.bg.youtube_link
}
let bg_suppress = false
let setting_mouse_moved = false
{
	activate_bg_btn.addEventListener("click", on_click_activate_bg)
	bg_blur_input.addEventListener("change", on_change_bg_blur)
	bg_type_input.addEventListener("change", on_change_bg_type)
	bg_video_select.addEventListener(
		"selectaction",
		on_select_bg_video_action
	)
	bg_video_select.addEventListener(
		"selectremove",
		on_select_bg_video_remove
	)
	bgm_volume_input.addEventListener("input", on_input_bgm_volume)
	bgm_volume_mobile_input.addEventListener(
		"input",
		on_input_bgm_volume_mobile
	)
	clear_aim_booster_btn.addEventListener(
		"click",
		game_mode.aim_booster.clear_best_score
	)
	clear_flick_btn.addEventListener(
		"click",
		game_mode.flick.clear_best_score
	)
	clear_h_tracking_btn.addEventListener(
		"click",
		game_mode.h_tracking.clear_best_score
	)
	clear_timing_btn.addEventListener(
		"click",
		game_mode.timing.clear_best_score
	)
	clear_twitch_btn.addEventListener(
		"click",
		game_mode.twitch.clear_best_score
	)
	clear_v_tracking_btn.addEventListener(
		"click",
		game_mode.v_tracking.clear_best_score
	)
	clear_writing_btn.addEventListener(
		"click",
		game_mode.writing.clear_best_score
	)
	copy_apo_filter_btn.addEventListener(
		"click",
		on_click_copy_apo_filter
	)
	crosshair_alpha_input.addEventListener(
		"input",
		on_input_crosshair_alpha
	)
	crosshair_color_input.addEventListener(
		"change",
		on_change_crosshair_color
	)
	crosshair_dot_input.addEventListener(
		"change",
		on_change_crosshair_dot
	)
	crosshair_gap_input.addEventListener(
		"change",
		on_change_crosshair_gap
	)
	crosshair_height_input.addEventListener(
		"change",
		on_change_crosshair_height
	)
	crosshair_thickness_input.addEventListener(
		"change",
		on_change_crosshair_thickness
	)
	crosshair_width_input.addEventListener(
		"change",
		on_change_crosshair_width
	)
	modal_backdrop_btn.addEventListener("click", on_click_modal_backdrop)
	reset_crosshair_btn.addEventListener(
		"click",
		on_click_reset_crosshair
	)
	save_bg_btn.addEventListener("click", on_click_save_bg)
	setting_btn.addEventListener("click", on_click_setting)
	for (const section of setting_els) {
		section.addEventListener(
			"mouseenter",
			on_mouseenter_setting_section
		)
	}
	setting_view_el.addEventListener(
		"change",
		update_setting_hash_from_event
	)
	setting_view_el.addEventListener(
		"click",
		update_setting_hash_from_event
	)
	setting_view_el.addEventListener(
		"focusin",
		update_setting_hash_from_event
	)
	setting_view_el.addEventListener(
		"mousemove",
		on_mousemove_setting_view
	)
	sfx_volume_input.addEventListener("input", on_input_sfx_volume)
}
/**
 * @typedef {{
 *   type: BackgroundType
 *   video_id: string
 *   youtube_link: string
 * }} BgSpec
 */
/**
 * @param {BgVideo} video
 * @returns {HTMLLIElement}
 */
function bg_video_option(video) {
	const li = document.createElement("li")
	li.className = "ai=center cs=pointer flex g=8 p=5"
	li.setAttribute("data-id", video.id)
	li.setAttribute("data-label", video.name)
	li.setAttribute("data-removable", "")
	li.setAttribute("data-value", video.id)
	li.setAttribute("aria-label", video.name)
	const clip = document.createElement("span")
	clip.className = "flex=1 min-width=0 o=hidden ws=nowrap"
	if (video.name.length > 18) {
		const track = document.createElement("span")
		const text = `${video.name}    `
		track.className = `a=bg-marquee_${(video.name.length / 10).toFixed(2)}s_linear_infinite d=inline-block`
		track.setAttribute("data-select-track", "")
		track.textContent = text + text
		clip.append(track)
	} else {
		clip.textContent = video.name
	}
	const button = document.createElement("button")
	button.className = "bd=none bg=none c=#f88 cs=pointer flex-shrink=0"
	button.setAttribute(
		"aria-label",
		`Remove ${video.name}`
	)
	button.setAttribute("data-remove", "")
	button.tabIndex = -1
	button.textContent = "×"
	li.append(clip, button)
	return li
}
/** @returns {void} */
function close_setting_view() {
	setting_view_el.removeAttribute("active")
	replace_hash("")
}
/**
 * @param {BgSpec} spec
 * @returns {void}
 */
function commit_bg(spec) {
	bg_snapshot.type = spec.type
	bg_snapshot.video_id = spec.video_id
	bg_snapshot.youtube_link = spec.youtube_link
	localStorage.setItem("bg.type", spec.type)
	localStorage.setItem("bg.video_id", spec.video_id)
	localStorage.setItem(
		"bg.youtube_link",
		spec.youtube_link
	)
	if (spec.type != "youtube") {
		bg_iframe_el.removeAttribute("src")
	}
}
/** @returns {string} */
function get_crosshair_color() {
	const alpha = Number(crosshair_alpha_input.value) / 100
	const b = Number.parseInt(
		crosshair_color_input.value.slice(5, 7),
		16
	)
	const g = Number.parseInt(
		crosshair_color_input.value.slice(3, 5),
		16
	)
	const r = Number.parseInt(
		crosshair_color_input.value.slice(1, 3),
		16
	)
	return `rgba(${r},${g},${b},${Number(alpha.toFixed(2))})`
}
/** @returns {Promise<void>} */
export async function init_bg() {
	update_bg_blur()
	await set_bg_widgets(bg_snapshot)
	await show_bg(bg_snapshot)
	if (bg_snapshot.type == "youtube") {
		bg_el.setAttribute("activate", "")
	}
}
/** @returns {void} */
function on_change_bg_blur() {
	localStorage.setItem(
		"bg.blur",
		String(bg_blur_input.checked)
	)
	state.bg.blur = bg_blur_input.checked
	update_bg_blur()
}
/** @returns {void} */
function on_change_bg_type() {
	if (bg_suppress) {
		return
	}
	if (bg_type_input.value == "youtube") {
		bg_link_input.value = bg_snapshot.youtube_link
	}
}
/** @returns {void} */
function on_change_crosshair_color() {
	localStorage.setItem(
		"crosshair.color",
		crosshair_rgba_el.style.color = crosshair_rgba_el.textContent = state.crosshair.color = get_crosshair_color()
	)
	update_crosshair()
}
/** @returns {void} */
function on_change_crosshair_dot() {
	localStorage.setItem(
		"crosshair.dot",
		crosshair_dot_input.value
	)
	state.crosshair.dot = Number(crosshair_dot_input.value)
	update_crosshair()
}
/** @returns {void} */
function on_change_crosshair_gap() {
	localStorage.setItem(
		"crosshair.gap",
		crosshair_gap_input.value
	)
	state.crosshair.gap = Number(crosshair_gap_input.value)
	update_crosshair()
}
/** @returns {void} */
function on_change_crosshair_height() {
	localStorage.setItem(
		"crosshair.height",
		crosshair_height_input.value
	)
	state.crosshair.height = Number(crosshair_height_input.value)
	update_crosshair()
}
/** @returns {void} */
function on_change_crosshair_thickness() {
	localStorage.setItem(
		"crosshair.thickness",
		crosshair_thickness_input.value
	)
	state.crosshair.thickness = Number(
		crosshair_thickness_input.value
	)
	update_crosshair()
}
/** @returns {void} */
function on_change_crosshair_width() {
	localStorage.setItem(
		"crosshair.width",
		crosshair_width_input.value
	)
	state.crosshair.width = Number(crosshair_width_input.value)
	update_crosshair()
}
/** @returns {Promise<void>} */
async function on_click_activate_bg() {
	try {
		await show_bg(staged_bg())
	} catch (error) {
		send_toast(String(error), 3_000)
		await show_bg(bg_snapshot)
		return
	}
	bg_el.setAttribute("activate", "")
}
/** @returns {void} */
function on_click_copy_apo_filter() {
	// eslint-disable-next-line max-len
	const filter = "# GraphicEQ: 25 0; 40 0; 63 0; 100 0; 160 0; 250 0; 400 -2.5; 630 -5; 1000 -2.5; 1600 5; 2500 15; 4000 10; 6300 5; 10000 -2.5; 16000 0"
	navigator.clipboard.writeText(filter)
	send_toast(`Copied!\n${filter}`, 1_500)
}
/** @returns {void} */
export function on_click_modal_backdrop() {
	if (bg_el.hasAttribute("activate")) {
		bg_el.removeAttribute("activate")
		if (toast_el.textContent) {
			for (const span of toast_el.children) {
				clearTimeout(
					Number(span.getAttribute("timer"))
				)
			}
			toast_el.textContent = ""
		}
		show_bg(bg_snapshot).catch(
			error => send_toast(String(error), 3_000)
		)
	} else if (setting_view_el.hasAttribute("active")) {
		close_setting_view()
		reset_bg_widgets()
	}
}
/** @returns {void} */
function on_click_reset_crosshair() {
	const {
		color,
		dot,
		gap,
		height,
		thickness,
		width
	} = constants.crosshair
	const { a, b, g, r } = parse_color(color)
	const text = /** @type {Text} */(crosshair_alpha_input.nextSibling)/**/
	crosshair_alpha_input.value = String(a * 100)
	text.textContent = `${crosshair_alpha_input.value}%`
	crosshair_color_input.value = `rgb(${r},${g},${b})`
	crosshair_dot_input.value = String(state.crosshair.dot = dot)
	crosshair_gap_input.value = String(state.crosshair.gap = gap)
	crosshair_height_input.value = String(
		state.crosshair.height = height
	)
	crosshair_rgba_el.style.color = crosshair_rgba_el.textContent = state.crosshair.color = color
	crosshair_thickness_input.value = String(
		state.crosshair.thickness = thickness
	)
	crosshair_width_input.value = String(state.crosshair.width = width)
	localStorage.setItem("crosshair.color", color)
	localStorage.setItem(
		"crosshair.dot",
		crosshair_dot_input.value
	)
	localStorage.setItem(
		"crosshair.gap",
		crosshair_gap_input.value
	)
	localStorage.setItem(
		"crosshair.height",
		crosshair_height_input.value
	)
	localStorage.setItem(
		"crosshair.thickness",
		crosshair_thickness_input.value
	)
	localStorage.setItem(
		"crosshair.width",
		crosshair_width_input.value
	)
	send_toast(
		"Crosshair has been reset!",
		1_500
	)
	update_crosshair()
}
/** @returns {Promise<void>} */
async function on_click_save_bg() {
	const spec = staged_bg()
	try {
		await show_bg(spec)
	} catch (error) {
		send_toast(String(error), 3_000)
		await show_bg(bg_snapshot)
		return
	}
	commit_bg(spec)
	if (spec.type == "youtube") {
		bg_el.setAttribute("activate", "")
		send_toast("Please press ESC", 2_000)
	}
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_click_setting(ev) {
	ev.preventDefault()
	open_setting_view("setting")
}
/** @returns {void} */
function on_input_bgm_volume() {
	bgm_volume_mobile_input.value = bgm_volume_input.value
	update_bgm_volume()
}
/** @returns {void} */
function on_input_bgm_volume_mobile() {
	bgm_volume_input.value = bgm_volume_mobile_input.value
	update_bgm_volume()
}
/** @returns {void} */
function on_input_crosshair_alpha() {
	const text = /** @type {Text} */(crosshair_alpha_input.nextSibling)/**/
	text.textContent = `${crosshair_alpha_input.value}%`
	localStorage.setItem(
		"crosshair.color",
		crosshair_rgba_el.style.color = crosshair_rgba_el.textContent = state.crosshair.color = get_crosshair_color()
	)
	update_crosshair()
}
/** @returns {void} */
function on_input_sfx_volume() {
	const text = /** @type {Text} */(sfx_volume_input.nextSibling)/**/
	text.textContent = `${sfx_volume_input.value}%`
	localStorage.setItem(
		"audio.sfx_volume",
		sfx_volume_input.value
	)
	state.audio.sfx_volume = Number(sfx_volume_input.value)
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_mouseenter_setting_section(ev) {
	if (!setting_mouse_moved) {
		return
	}
	if (ev.currentTarget instanceof HTMLElement) {
		update_setting_hash_from_element(ev.currentTarget)
	}
}
/**
 * @param {MouseEvent} ev
 * @returns {void}
 */
function on_mousemove_setting_view(ev) {
	if (ev.movementX || ev.movementY) {
		setting_mouse_moved = true
	}
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function on_select_bg_video_action(ev) {
	const action = /** @type {CustomEvent<string>} */(ev)/**/.detail
	if (action == "upload") {
		open_upload_dialog()
	} else {
		throw Error(action)
	}
}
/**
 * @param {Event} ev
 * @returns {Promise<void>}
 */
async function on_select_bg_video_remove(ev) {
	const delete_id = /** @type {CustomEvent<string>} */(ev)/**/.detail
	await delete_bg_video(delete_id)
	if (bg_snapshot.video_id == delete_id) {
		commit_bg(
			{
				type: "default",
				video_id: "",
				youtube_link: bg_snapshot.youtube_link
			}
		)
		await show_bg(bg_snapshot)
	}
	await render_bg_options(
		bg_video_select.value == delete_id ? "" : bg_video_select.value
	)
}
/**
 * @param {Event} ev
 * @returns {Promise<void>}
 */
async function on_upload_file(ev) {
	const input = ev.currentTarget
	if (!(input instanceof HTMLInputElement)) {
		return
	}
	const file = input.files?.[0]
	if (!file) {
		return
	}
	const id = crypto.randomUUID()
	const before_type = bg_type_input.value
	const before_value = bg_video_select.value
	try {
		await add_bg_video(id, file)
	} catch (error) {
		send_toast(String(error), 3_000)
		return
	}
	if (
		bg_type_input.value != before_type
		|| bg_video_select.value != before_value
	) {
		await render_bg_options(bg_video_select.value)
		return
	}
	await render_bg_options(id)
}
/**
 * @param {string} id
 * @returns {void}
 */
function open_setting_view(id) {
	setting_view_el.setAttribute("active", "")
	replace_hash(id)
	scroll_setting_hash_target()
}
/** @returns {void} */
function open_upload_dialog() {
	bg_video_select.close()
	const input = document.createElement("input")
	input.accept = "video/*"
	input.type = "file"
	input.addEventListener("change", on_upload_file)
	input.click()
}
/**
 * @param {string} color
 * @returns {{ a: number, b: number, g: number, r: number }}
 */
export function parse_color(color) {
	const hex = color.match(
		/^#([\da-f]{2})([\da-f]{2})([\da-f]{2})([\da-f]{2})?$/i
	)
	if (hex) {
		return {
			a: hex[4] ? Number.parseInt(hex[4], 16) / 255 : 1,
			b: Number.parseInt(hex[3], 16),
			g: Number.parseInt(hex[2], 16),
			r: Number.parseInt(hex[1], 16)
		}
	}
	const rgba = color.match(
		/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/i
	)
	if (rgba) {
		return {
			a: rgba[4] ? Number(rgba[4]) : 1,
			b: Number(rgba[3]),
			g: Number(rgba[2]),
			r: Number(rgba[1])
		}
	}
	return parse_color(constants.crosshair.color)
}
/**
 * @param {string} select_id
 * @returns {Promise<void>}
 */
async function render_bg_options(select_id) {
	const videos = await list_bg_videos()
	for (const li of bg_video_select.querySelectorAll("li[data-id]")) {
		li.remove()
	}
	const options_el = /** @type {HTMLUListElement} */(bg_video_select.querySelector("[data-select-options]"))/**/
	const upload_li = bg_video_select.querySelector("li[data-action='upload']")
	for (const video of videos) {
		options_el.insertBefore(
			bg_video_option(video),
			upload_li
		)
	}
	const current = select_id
		? videos.find(video => video.id == select_id)
		: null
	if (current) {
		bg_video_select.value = current.id
	} else {
		bg_video_select.value = "default"
	}
	bg_video_select.close()
}
/**
 * @param {string} hash
 * @returns {void}
 */
function replace_hash(hash) {
	const url = new URL(location.href)
	url.hash = hash
	history.replaceState(null, "", url.href)
}
/** @returns {Promise<void>} */
async function reset_bg_widgets() {
	await set_bg_widgets(bg_snapshot)
}
/**
 * @param {HTMLElement} [target]
 * @returns {void}
 */
function scroll_setting_hash_target(target) {
	setting_mouse_moved = false
	if (!target) {
		setting_scroll_el.scrollTop = 0
	} else {
		target.scrollIntoView({ block: "start" })
	}
}
/**
 * @param {BgSpec} spec
 * @returns {Promise<void>}
 */
async function set_bg_widgets(spec) {
	bg_suppress = true
	try {
		bg_link_input.value = spec.youtube_link
		await render_bg_options(
			spec.type == "video" ? spec.video_id : ""
		)
		bg_type_input.value = spec.type == "youtube" ? "youtube" : "video"
	} finally {
		bg_suppress = false
	}
}
/**
 * @param {BgSpec} spec
 * @returns {Promise<void>}
 */
async function show_bg(spec) {
	const token = ++bg_apply_token
	let shown = "default"
	if (spec.type == "youtube") {
		const embed = youtube_embed_src(spec.youtube_link)
		if (bg_iframe_el.src != embed) {
			bg_iframe_el.src = embed
		}
		set_bg_upload_video(null)
		bg_shown_video = ""
		state.bg.youtube_link = spec.youtube_link
		shown = "youtube"
	} else if (spec.type == "video" && spec.video_id) {
		if (bg_shown_video != spec.video_id) {
			const blob = await get_bg_video_blob(spec.video_id)
			if (token != bg_apply_token) {
				return
			}
			if (!blob) {
				throw Error("Video not found")
			}
			set_bg_upload_video(blob)
			bg_shown_video = spec.video_id
		}
		state.bg.video_id = spec.video_id
		shown = "video"
	} else {
		set_bg_upload_video(null)
		bg_shown_video = ""
	}
	if (shown != "youtube" && bg_snapshot.type != "youtube") {
		bg_iframe_el.removeAttribute("src")
	}
	state.bg.type = /** @type {BackgroundType} */(shown)/**/
	bg_el.setAttribute("data-show", shown)
	update_bg_video()
}
/** @returns {BgSpec} */
function staged_bg() {
	if (bg_type_input.value == "youtube") {
		return {
			type: "youtube",
			video_id: bg_snapshot.video_id,
			youtube_link: bg_link_input.value
		}
	}
	const source = bg_video_select.value
	if (source && source != "default") {
		return {
			type: "video",
			video_id: source,
			youtube_link: bg_snapshot.youtube_link
		}
	}
	return {
		type: "default",
		video_id: "",
		youtube_link: bg_snapshot.youtube_link
	}
}
/** @returns {void} */
export function sync_setting_hash() {
	const id = decodeURIComponent(location.hash.slice(1))
	const target = document.getElementById(id)
	if (id == "setting") {
		setting_view_el.setAttribute("active", "")
		scroll_setting_hash_target()
	} else if (
		target instanceof HTMLElement
		&& setting_view_el.contains(target)
	) {
		setting_view_el.setAttribute("active", "")
		scroll_setting_hash_target(target)
	} else if (setting_view_el.hasAttribute("active")) {
		setting_view_el.removeAttribute("active")
		reset_bg_widgets()
	}
}
/**
 * @param {HTMLElement} el
 * @returns {void}
 */
function update_setting_hash_from_element(el) {
	const section = el.closest("fieldset[id^='setting-']")
	if (
		section instanceof HTMLElement
		&& setting_view_el.hasAttribute("active")
	) {
		replace_hash(section.id)
	}
}
/**
 * @param {Event} ev
 * @returns {void}
 */
function update_setting_hash_from_event(ev) {
	if (ev.target instanceof HTMLElement) {
		update_setting_hash_from_element(ev.target)
	}
}
/** @returns {void} */
function update_bg_blur() {
	document.body.toggleAttribute("bg-blur", state.bg.blur)
}
/** @returns {void} */
function update_bgm_volume() {
	let text = /** @type {Text} */(bgm_volume_input.nextSibling)/**/
	text.textContent = `${bgm_volume_input.value}%`
	text = /** @type {Text} */(bgm_volume_mobile_input.nextSibling)/**/
	text.textContent = `${bgm_volume_mobile_input.value}%`
	localStorage.setItem(
		"audio.bgm_volume",
		bgm_volume_input.value
	)
	state.audio.bgm_volume = Number(bgm_volume_input.value)
	update_bg_volume()
}
/**
 * @param {string} link
 * @returns {string}
 */
function youtube_embed_src(link) {
	const { host, pathname, searchParams } = new URL(link)
	let video_id
	if (host == "youtu.be") {
		video_id = pathname.slice(1)
	} else if (host == "www.youtube.com") {
		video_id = searchParams.get("v") || ""
	} else {
		throw Error("Unsupported URL")
	}
	if (!video_id) {
		throw Error("Unsupported URL")
	}
	return `https://www.youtube.com/embed/${video_id}?loop=1&playlist=${video_id}`
}