/**
 * @template T
 * @param {() => T} make
 * @returns {{
 *	 clear(): void
 *	 obtain(): T
 *	 recycle(value: T): void
 * }}
 */
export function create_pool(make) {
	/** @type {T[]} */
	const free = []
	return {
		/** @returns {void} */
		clear() {
			free.length = 0
		},
		/** @returns {T} */
		obtain() {
			return free.length ? /** @type {T} */(free.pop())/**/ : make()
		},
		/**
		 * @param {T} value
		 * @returns {void}
		 */
		recycle(value) {
			free.push(value)
		}
	}
}