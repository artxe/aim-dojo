import { update_game_sens } from "../controller/game_sens.js"
import { check_writing_stats } from "../game_mode/writing.js"
import { on_bg_worker_message } from "../render/renderer_bg.js"
const bg_worker = new Worker(
	new URL(
		"./bg_worker.js",
		import.meta.url
	),
	{ type: "module" }
)
const calc_worker = new Worker(
	new URL(
		"./calc_worker.js",
		import.meta.url
	),
	{ type: "module" }
)
{
	bg_worker.onmessage = function({ data }) {
		on_bg_worker_message(data)
	}
	calc_worker.onmessage = function({ data }) {
		const [ fn, ...result ] = /** @type {[ string, ...* ]} */(data)/**/
		if (fn == "check_writing_stats") {
			check_writing_stats(result[0], result[1])
		} else if (fn == "update_game_sens") {
			update_game_sens(
				.../** @type {Tuple<number, 44>} */(result)/**/
			)
		} else {
			throw Error(fn)
		}
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
export function post_calc_worker_message(message, transfer_or_opstions) {
	if (Array.isArray(transfer_or_opstions)) {
		calc_worker.postMessage(message, transfer_or_opstions)
	} else {
		calc_worker.postMessage(message, transfer_or_opstions)
	}
}