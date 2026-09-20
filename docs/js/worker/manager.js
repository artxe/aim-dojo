import { check_writing_stats } from "../game_mode/writing.js"
import { on_bg_worker_message } from "../render/renderer_bg.js"
const bg_worker = new Worker(
	new URL(
		"./bg_worker.js",
		import.meta.url
	),
	{ type: "module" }
)
const writing_worker = new Worker(
	new URL(
		"./writing_worker.js",
		import.meta.url
	),
	{ type: "module" }
)
/**
 * @param {BgWorkerRequest} message
 * @param {Transferable[]} [transfer]
 * @returns {void}
 */
export function post_bg_worker_message(message, transfer) {
	if (transfer) {
		bg_worker.postMessage(message, transfer)
	} else {
		bg_worker.postMessage(message)
	}
}
/**
 * @param {WritingWorkerRequest} message
 * @param {Transferable[]} transfer
 * @returns {void}
 */
export function post_writing_worker_message(message, transfer) {
	writing_worker.postMessage(message, transfer)
}
{
	/** @param {MessageEvent<BgWorkerReply>} event */
	bg_worker.onmessage = function({ data }) {
		on_bg_worker_message(data)
	}
	/** @param {MessageEvent<WritingWorkerReply>} event */
	writing_worker.onmessage = function({ data }) {
		const fn = data[0]
		if (fn == "check_writing_stats") {
			check_writing_stats(data[1], data[2])
		} else {
			throw Error(fn)
		}
	}
}