import {
	bg_upload_video_el,
	bg_video_canvas_el
} from "../controller/dom.js"
import state from "../state.js"
import { post_bg_worker_message } from "../worker/manager.js"
const CAN_WORKER_BG = typeof OffscreenCanvas != "undefined"
	&& typeof globalThis.VideoFrame != "undefined"
	&& typeof MediaSource != "undefined"
	&& /** @type {*} */(MediaSource)/**/.canConstructInDedicatedWorker == true
	&& "transferControlToOffscreen" in HTMLCanvasElement.prototype
	&& "requestVideoFrameCallback" in HTMLVideoElement.prototype
const VIDEO_FRAME = globalThis.VideoFrame
let bg_audio_enabled = false
let bg_frame_in_flight = false
let bg_frame_pending = /** @type {VideoFrame | null} */(null)/**/
let bg_last_forward_time = -1
let bg_last_presented_frame = -1
let bg_upload_url = ""
let bg_video_el = /** @type {HTMLVideoElement | null} */(null)/**/
let bg_video_frame_callback = 0
let bg_video_visible = !document.hidden
{
	if (CAN_WORKER_BG) {
		const canvas = bg_video_canvas_el.transferControlToOffscreen()
		post_bg_worker_message(
			{
				canvas,
				dpr: get_bg_dpr(),
				fn: "init",
				height: innerHeight,
				visible: bg_video_visible,
				width: innerWidth
			},
			[ canvas ]
		)
	}
}
/**
 * @param {MediaSourceHandle} handle
 * @returns {void}
 */
function create_bg_video_el(handle) {
	const video = document.createElement("video")
	video.autoplay = true
	video.className = "fixed h=1 l=0 op=.01 pe=none t=0 w=1"
	video.loop = false
	video.muted = true
	video.playsInline = true
	video.preload = "auto"
	video.srcObject = /** @type {*} */(handle)/**/
	video.addEventListener(
		"loadedmetadata",
		start_bg_video_frames,
		{ once: true }
	)
	video.addEventListener("timeupdate", forward_bg_time)
	document.body.append(video)
	bg_video_el = video
	update_bg_video()
}
/** @returns {void} */
export function enable_bg_audio() {
	bg_audio_enabled = true
	update_bg_video()
}
/** @returns {void} */
function forward_bg_time() {
	if (!bg_video_el) {
		return
	}
	const { currentTime } = bg_video_el
	if (currentTime < bg_last_forward_time + 1) {
		return
	}
	bg_last_forward_time = currentTime
	post_bg_worker_message(
		{ fn: "time", time: currentTime }
	)
}
/** @returns {number} */
function get_bg_dpr() {
	return devicePixelRatio || 1
}
/**
 * @param {DOMHighResTimeStamp} _now
 * @param {*} metadata
 * @returns {void}
 */
function on_bg_video_frame(_now, metadata) {
	bg_video_frame_callback = 0
	try {
		post_bg_video_frame(metadata)
	} finally {
		queue_bg_video_frame()
	}
}
/**
 * @param {*} data
 * @returns {void}
 */
export function on_bg_worker_message(data) {
	if (data.fn == "handle") {
		create_bg_video_el(data.handle)
	} else if (data.fn == "frame") {
		bg_frame_in_flight = false
		post_pending_bg_video_frame()
	} else if (data.fn == "started") {
		update_bg_video()
	} else {
		throw Error(data.fn)
	}
}
/**
 * @param {*} metadata
 * @returns {void}
 */
function post_bg_video_frame(metadata) {
	if (!bg_video_el || !bg_video_visible) {
		return
	}
	const { mediaTime, presentedFrames } = metadata
	if (presentedFrames == bg_last_presented_frame) {
		return
	}
	bg_last_presented_frame = presentedFrames
	const frame = new VIDEO_FRAME(
		bg_video_el,
		{
			timestamp: Math.round(mediaTime * 1_000_000)
		}
	)
	if (bg_frame_in_flight) {
		if (bg_frame_pending) {
			bg_frame_pending.close()
		}
		bg_frame_pending = frame
		return
	}
	post_bg_video_frame_to_worker(frame)
}
/**
 * @param {VideoFrame} frame
 * @returns {void}
 */
function post_bg_video_frame_to_worker(frame) {
	bg_frame_in_flight = true
	post_bg_worker_message(
		{ fn: "frame", frame },
		[ frame ]
	)
}
/** @returns {void} */
function post_pending_bg_video_frame() {
	const frame = bg_frame_pending
	if (!frame) {
		return
	}
	bg_frame_pending = null
	if (!bg_video_visible || state.bg.type != "default") {
		frame.close()
		return
	}
	post_bg_video_frame_to_worker(frame)
}
/** @returns {void} */
function queue_bg_video_frame() {
	if (!bg_video_el) {
		return
	}
	if (bg_video_frame_callback) {
		return
	}
	bg_video_frame_callback = bg_video_el.requestVideoFrameCallback(on_bg_video_frame)
}
/** @returns {void} */
export function resize_bg() {
	post_bg_worker_message(
		{
			dpr: get_bg_dpr(),
			fn: "resize",
			height: innerHeight,
			width: innerWidth
		}
	)
}
/** @returns {void} */
function restart_bg_video_frames() {
	const video = bg_video_el
	if (!video) {
		return
	}
	if (bg_video_frame_callback) {
		video.cancelVideoFrameCallback(bg_video_frame_callback)
		bg_video_frame_callback = 0
	}
	bg_frame_in_flight = false
	queue_bg_video_frame()
}
/**
 * @param {Blob | null} blob
 * @returns {void}
 */
export function set_bg_upload_video(blob) {
	if (bg_upload_url) {
		URL.revokeObjectURL(bg_upload_url)
		bg_upload_url = ""
	}
	if (blob) {
		bg_upload_url = URL.createObjectURL(blob)
		bg_upload_video_el.src = bg_upload_url
	} else {
		bg_upload_video_el.removeAttribute("src")
		bg_upload_video_el.load()
	}
}
/**
 * @param {boolean} visible
 * @returns {void}
 */
export function set_bg_video_visible(visible) {
	bg_video_visible = visible
	if (!visible && bg_frame_pending) {
		bg_frame_pending.close()
		bg_frame_pending = null
	}
	update_bg_video()
	post_bg_worker_message({ fn: "visible", visible })
	if (visible) {
		bg_last_forward_time = -1
		forward_bg_time()
		restart_bg_video_frames()
	}
}
/** @returns {void} */
function start_bg_video_frames() {
	queue_bg_video_frame()
}
/** @returns {void} */
export function update_bg_video() {
	update_bg_volume()
	const { type } = state.bg
	if (type == "video") {
		bg_upload_video_el.muted = !bg_audio_enabled || !bg_video_visible
		if (bg_video_visible && bg_upload_video_el.hasAttribute("src")) {
			bg_upload_video_el.play()
		} else {
			bg_upload_video_el.pause()
		}
	} else {
		bg_upload_video_el.pause()
	}
	const video = bg_video_el
	if (!video) {
		return
	}
	if (type == "default") {
		video.muted = !bg_audio_enabled || !bg_video_visible
		if (bg_video_visible) {
			video.play()
		} else {
			video.pause()
		}
	} else {
		if (bg_frame_pending) {
			bg_frame_pending.close()
			bg_frame_pending = null
		}
		video.pause()
	}
}
/** @returns {void} */
export function update_bg_volume() {
	const volume = state.audio.bgm_volume / 100
	bg_upload_video_el.volume = volume
	if (bg_video_el) {
		bg_video_el.volume = volume
	}
}