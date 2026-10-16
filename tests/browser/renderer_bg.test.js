import { load_page } from "./helpers/dom.js"
import {
	afterAll,
	afterEach,
	beforeAll,
	describe,
	expect,
	it,
	vi
} from "vitest"
const posts = vi.hoisted(() => vi.fn())
vi.mock(
	"../../docs/js/worker/manager.js",
	() => ({
		post_bg_worker_message: posts,
		post_writing_worker_message: vi.fn()
	})
)
/** @type {typeof import("../../docs/js/render/renderer_bg.js")} */
let bg
/** @type {typeof import("../../docs/js/controller/dom.js")} */
let dom
/** @type {[Record<string, any>, unknown[]] | undefined} */
let init_call
/** @type {ReturnType<typeof setInterval> | undefined} */
let painter
/** @type {VideoFrame[]} */
const sent_frames = []
/** @type {typeof import("../../docs/js/state.js").default} */
let state
/**
 * @param {string} fn
 * @returns {Record<string, any>[]}
 */
function messages(fn) {
	return posts.mock.calls.map(([ message ]) => message).filter(message => message.fn == fn)
}
/** @returns {MediaStream} */
function painted_stream() {
	const canvas = document.createElement("canvas")
	canvas.height = 16
	canvas.width = 16
	const context = /** @type {CanvasRenderingContext2D} */(canvas.getContext("2d"))/**/
	let n = 0
	painter = setInterval(
		() => {
			context.fillStyle = `rgb(${n++ % 256},0,0)`
			context.fillRect(0, 0, 16, 16)
		},
		10
	)
	return canvas.captureStream(30)
}
describe(
	"render/renderer_bg.js",
	() => {
		beforeAll(
			async () => {
				localStorage.clear()
				localStorage.setItem("render.scale", "50")
				load_page()
				dom = await import("../../docs/js/controller/dom.js")
				state = (await import("../../docs/js/state.js")).default
				bg = await import("../../docs/js/render/renderer_bg.js")
				init_call = posts.mock.calls.find(
					([ message ]) => message.fn == "init"
				)
			}
		)
		afterEach(
			() => {
				vi.restoreAllMocks()
			}
		)
		afterAll(
			() => {
				clearInterval(painter)
				for (const frame of sent_frames) {
					frame.close()
				}
			}
		)
		it(
			"an unknown worker reply throws with its name",
			() => {
				expect(
					() => bg.on_bg_worker_message(
						/** @type {BgWorkerReply} */(/** @type {unknown} */({ fn: "nope" }))/**/
					)
				).toThrow("nope")
			}
		)
		it(
			"an uploaded video plays on its own element, None pauses it, and dropping it frees its URL",
			() => {
				const pause = vi.spyOn(
					HTMLMediaElement.prototype,
					"pause"
				)
				const play = vi.spyOn(
					HTMLMediaElement.prototype,
					"play"
				).mockResolvedValue(void 0)
				const revoke = vi.spyOn(URL, "revokeObjectURL")
				state.bg.type = "video"
				bg.set_bg_upload_video(
					new Blob(
						[ "clip" ],
						{ type: "video/mp4" }
					)
				)
				bg.update_bg_video()
				const url = dom.bg_upload_video_el.src
				expect(url).toMatch(/^blob:/)
				expect(play.mock.contexts).toContain(dom.bg_upload_video_el)
				state.bg.type = "none"
				bg.update_bg_video()
				expect(pause.mock.contexts).toContain(dom.bg_upload_video_el)
				bg.set_bg_upload_video(null)
				expect(revoke).toHaveBeenCalledWith(url)
				expect(
					dom.bg_upload_video_el.hasAttribute("src")
				).toBe(false)
				state.bg.type = "default"
				bg.update_bg_video()
			}
		)
		it(
			"on load hands the background canvas to the worker at the window size, with the dpr scaled by Render Scale",
			() => {
				const [ init, transfer ] = /** @type {NonNullable<typeof init_call>} */(init_call)/**/
				expect(init.canvas).toBeInstanceOf(OffscreenCanvas)
				expect(transfer).toEqual([ init.canvas ])
				expect(init).toMatchObject(
					{
						dpr: devicePixelRatio * .5,
						height: innerHeight,
						visible: !document.hidden,
						width: innerWidth
					}
				)
			}
		)
		it(
			"resize_bg sends the window size with the dpr of the current Render Scale",
			() => {
				state.render.scale = 150
				bg.resize_bg()
				expect(posts).toHaveBeenLastCalledWith(
					{
						dpr: devicePixelRatio * 1.5,
						fn: "resize",
						height: innerHeight,
						width: innerWidth
					}
				)
				state.render.scale = 100
			}
		)
		it(
			"the worker's media handle becomes a hidden, muted video for the default background: frames go out one at a time, the BGM volume and the first gesture's sound apply, and another background or a hidden page pauses it until it is back",
			async () => {
				state.bg.type = "default"
				const stream = painted_stream()
				bg.on_bg_worker_message(
					{
						fn: "handle",
						handle: /** @type {MediaSourceHandle} */(/** @type {unknown} */(stream))/**/
					}
				)
				const video = /** @type {HTMLVideoElement} */(document.body.lastElementChild)/**/
				expect(video.tagName).toBe("VIDEO")
				expect(video.srcObject).toBe(stream)
				expect(video.muted).toBe(true)
				expect(video.loop).toBe(false)
				expect(messages("time")).toEqual([ { fn: "time", time: 0 } ])
				await vi.waitFor(
					() => expect(messages("frame")).toHaveLength(1),
					{ timeout: 5_000 }
				)
				const [ , transfer ] = /** @type {[unknown, unknown[]]} */(posts.mock.calls.findLast(
					([ message ]) => message.fn == "frame"
				))/**/
				expect(transfer).toEqual([ messages("frame")[0].frame ])
				await new Promise(
					resolve => setTimeout(resolve, 300)
				)
				expect(messages("frame")).toHaveLength(1)
				bg.on_bg_worker_message({ fn: "frame" })
				expect(messages("frame")).toHaveLength(2)
				for (const { frame } of messages("frame")) {
					sent_frames.push(frame)
				}
				state.audio.bgm_volume = 30
				bg.update_bg_video()
				expect(video.volume).toBeCloseTo(.3, 9)
				expect(dom.bg_upload_video_el.volume).toBeCloseTo(.3, 9)
				bg.enable_bg_audio()
				expect(video.muted).toBe(false)
				const pause = vi.spyOn(
					HTMLMediaElement.prototype,
					"pause"
				)
				const play = vi.spyOn(
					HTMLMediaElement.prototype,
					"play"
				)
				bg.set_bg_video_visible(false)
				expect(posts).toHaveBeenLastCalledWith(
					{ fn: "visible", visible: false }
				)
				expect(video.muted).toBe(true)
				expect(pause.mock.contexts).toContain(video)
				bg.set_bg_video_visible(true)
				expect(posts).toHaveBeenLastCalledWith(
					{ fn: "visible", visible: true }
				)
				expect(video.muted).toBe(false)
				expect(play.mock.contexts).toContain(video)
				expect(messages("time")).toHaveLength(2)
				pause.mockClear()
				play.mockClear()
				state.bg.type = "none"
				bg.update_bg_video()
				expect(pause.mock.contexts).toContain(video)
				state.bg.type = "default"
				bg.on_bg_worker_message({ fn: "started" })
				expect(play.mock.contexts).toContain(video)
			}
		)
	}
)