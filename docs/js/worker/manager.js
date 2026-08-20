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
 * @overload
 * @param {{ fn: string, [key: string]: * }} data
 * @param {Transferable[]} transfer
 * @returns {void}
 */
/**
 * @overload
 * @param {{ fn: string, [key: string]: * }} data
 * @param {StructuredSerializeOptions} [options]
 * @returns {void}
 */
/**
 * @param {{ fn: string, [key: string]: * }} message
 * @param {Transferable[]|StructuredSerializeOptions} [transfer_or_opstions]
 * @returns {void}
 */
export function post_bg_worker_message(message, transfer_or_opstions) {
	if (Array.isArray(transfer_or_opstions)) {
		bg_worker.postMessage(message, transfer_or_opstions)
	} else {
		bg_worker.postMessage(message, transfer_or_opstions)
	}
}
/**
 * @overload
 * @param {{ fn: string, [key: string]: * }} data
 * @param {Transferable[]} transfer
 * @returns {void}
 */
/**
 * @overload
 * @param {{ fn: string, [key: string]: * }} data
 * @param {StructuredSerializeOptions} [options]
 * @returns {void}
 */
/**
 * @param {{ fn: string, [key: string]: * }} message
 * @param {Transferable[]|StructuredSerializeOptions} [transfer_or_opstions]
 * @returns {void}
 */
export function post_writing_worker_message(message, transfer_or_opstions) {
	if (Array.isArray(transfer_or_opstions)) {
		writing_worker.postMessage(message, transfer_or_opstions)
	} else {
		writing_worker.postMessage(message, transfer_or_opstions)
	}
}
{
	bg_worker.onmessage = function({ data }) {
		on_bg_worker_message(data)
	}
	writing_worker.onmessage = function({ data }) {
		const [ fn, ...result ] = /** @type {[ string, ...* ]} */(data)/**/
		if (fn == "check_writing_stats") {
			check_writing_stats(result[0], result[1])
		} else {
			throw Error(fn)
		}
	}
}