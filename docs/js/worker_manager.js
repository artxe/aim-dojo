import { update_game_sens } from "./controller/game_sens.js"
import state from "./state.js"
const worker = new Worker(
	new URL("./worker.js", import.meta.url),
	{ type: "module" }
)
/**
 * @param {{ data: * }} ev
 * @returns {void}
 */
worker.onmessage = function({ data }) {
	const { mode } = state.game
	const [ fn, ...result ] = /** @type {[ WorkerFunctionName, ...* ]} */(data)/**/
	if (fn == "check_writing_stats") {
		if (mode == "writing") {
			state.stats.count_hit = result[0],
			state.stats.count_shoot = result[1]
		}
	} else if (fn == "update_game_sens") {
		update_game_sens(
			.../** @type {Tuple<number, 32>} */(result)/**/
		)
	} else {
		throw Error(fn)
	}
}
/**
 * @overload
 * @param {*} data
 * @param {Transferable[]} transfer
 * @returns {void}
 */
/**
 * @overload
 * @param {*} data
 * @param {StructuredSerializeOptions} [options]
 * @returns {void}
 */
/**
 * @param {*} message
 * @param {Transferable[]|StructuredSerializeOptions} [transfer_or_opstions]
 * @returns {void}
 */
export function post_worker_message(message, transfer_or_opstions) {
	if (Array.isArray(transfer_or_opstions)) {
		worker.postMessage(message, transfer_or_opstions)
	} else {
		worker.postMessage(message, transfer_or_opstions)
	}
}