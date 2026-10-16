import { max } from "../math.js"
/**
 * @param {string} raw
 * @returns {{
 *	 clear(): void
 *	 push(sample: number): void
 *	 value: number
 * }}
 */
export function create_record(raw) {
	const record = {
		clear,
		push,
		value: parse_value(raw)
	}
	/** @returns {void} */
	function clear() {
		record.value = 0
	}
	/**
	 * @param {number} sample
	 * @returns {void}
	 */
	function push(sample) {
		record.value = max(record.value, sample)
	}
	return record
}
/**
 * @param {string} raw
 * @returns {number}
 */
function parse_value(raw) {
	let value = 0
	for (const part of raw.split(",")) {
		const n = Number(part)
		if (n > value) {
			value = n
		}
	}
	return value
}