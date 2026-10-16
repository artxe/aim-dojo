import { fresh_import } from "./helpers/fresh_import.js"
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest"
vi.mock(
	"../../docs/js/game_mode/writing.js",
	() => ({ check_writing_stats: vi.fn() })
)
vi.mock(
	"../../docs/js/render/renderer_bg.js",
	() => ({ on_bg_worker_message: vi.fn() })
)
/** @type {FakeWorker[]} */
let workers = []
class FakeWorker {
	/** @type {((event: { data: unknown }) => void) | null} */
	onmessage = null
	options
	postMessage = vi.fn()
	url
	/**
	 * @param {URL} url
	 * @param {WorkerOptions} options
	 */
	constructor(url, options) {
		this.options = options
		this.url = url
		workers.push(this)
	}
}
/** @returns {Promise<typeof import("../../docs/js/worker/manager.js")>} */
async function load() {
	return fresh_import(
		"../../../docs/js/worker/manager.js"
	)
}
describe(
	"worker/manager.js",
	() => {
		beforeEach(
			() => {
				vi.clearAllMocks()
				workers = []
				vi.stubGlobal("Worker", FakeWorker)
			}
		)
		afterEach(
			() => {
				vi.unstubAllGlobals()
			}
		)
		it(
			"a bg reply is forwarded raw to renderer_bg.js",
			async () => {
				await load()
				const { on_bg_worker_message } = await import("../../docs/js/render/renderer_bg.js")
				const data = { fn: "frame" }
				workers[0].onmessage?.({ data })
				expect(on_bg_worker_message).toHaveBeenCalledTimes(1)
				expect(
					vi.mocked(on_bg_worker_message).mock.calls[0][0]
				).toBe(data)
			}
		)
		it(
			"a check_writing_stats reply dispatches the hit and shoot counts to writing.js",
			async () => {
				await load()
				const { check_writing_stats } = await import("../../docs/js/game_mode/writing.js")
				workers[1].onmessage?.(
					{
						data: [ "check_writing_stats", 3, 5 ]
					}
				)
				expect(check_writing_stats).toHaveBeenCalledTimes(1)
				expect(check_writing_stats).toHaveBeenCalledWith(3, 5)
			}
		)
		it(
			"an unknown writing reply throws",
			async () => {
				await load()
				const { check_writing_stats } = await import("../../docs/js/game_mode/writing.js")
				expect(
					() => workers[1].onmessage?.({ data: [ "bogus", 1, 2 ] })
				).toThrow("bogus")
				expect(check_writing_stats).not.toHaveBeenCalled()
			}
		)
		it(
			"creates the bg worker first and the writing worker second, both as module workers",
			async () => {
				await load()
				expect(workers).toHaveLength(2)
				expect(workers[0].url.pathname).toMatch(/\/worker\/bg_worker\.js$/)
				expect(workers[1].url.pathname).toMatch(
					/\/worker\/writing_worker\.js$/
				)
				expect(workers[0].options).toEqual({ type: "module" })
				expect(workers[1].options).toEqual({ type: "module" })
			}
		)
		it(
			"post_bg_worker_message forwards the message alone when there is nothing to transfer",
			async () => {
				const { post_bg_worker_message } = await load()
				const message = /** @type {BgWorkerRequest} */({ fn: "visible", visible: true })/**/
				post_bg_worker_message(message)
				expect(workers[0].postMessage).toHaveBeenCalledTimes(1)
				expect(
					workers[0].postMessage.mock.calls[0]
				).toEqual([ message ])
				expect(workers[1].postMessage).not.toHaveBeenCalled()
			}
		)
		it(
			"post_bg_worker_message forwards the transfer list when given",
			async () => {
				const { post_bg_worker_message } = await load()
				const message = /** @type {BgWorkerRequest} */({ fn: "time", time: 1.5 })/**/
				const buffer = new ArrayBuffer(8)
				post_bg_worker_message(message, [ buffer ])
				expect(workers[0].postMessage).toHaveBeenCalledTimes(1)
				expect(
					workers[0].postMessage.mock.calls[0]
				).toEqual([ message, [ buffer ] ])
				expect(
					workers[0].postMessage.mock.calls[0][0]
				).toBe(message)
				expect(
					workers[0].postMessage.mock.calls[0][1][0]
				).toBe(buffer)
			}
		)
		it(
			"post_writing_worker_message forwards the message and the transfer list to the writing worker",
			async () => {
				const { post_writing_worker_message } = await load()
				const segments = new Float64Array(8)
				const message = /** @type {WritingWorkerRequest} */({
					drop_count: 2,
					fn: "check_writing_stats",
					line_width: 4,
					segments
				})/**/
				post_writing_worker_message(message, [ segments.buffer ])
				expect(workers[1].postMessage).toHaveBeenCalledTimes(1)
				expect(
					workers[1].postMessage.mock.calls[0][0]
				).toBe(message)
				expect(
					workers[1].postMessage.mock.calls[0][1][0]
				).toBe(segments.buffer)
				expect(workers[0].postMessage).not.toHaveBeenCalled()
			}
		)
	}
)