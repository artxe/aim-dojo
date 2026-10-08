/**
 * @template T
 * @returns {{
 *	 readonly array: T[]
 *	 at(index?: number): T
 *	 clear(): void
 *	 drop(): void
 *	 readonly length: number
 *	 push(v: T): void
 * }}
 */
export function create_queue() {
	/**	@type {T[]} */
	const q = []
	let head = 0
	const THRESH = 2_048
	return {
		/** @returns {T[]} */
		get array() {
			return q
		},
		/**
		 * @param {number} [index = 0]
		 * @returns {T}
		 */
		at(index = 0) {
			if (index < 0) {
				const i = q.length + index
				return /** @type {T} */(i >= head ? q[i] : void 0)/**/
			}
			return /** @type {T} */(head + index < q.length ? q[head + index] : void 0)/**/
		},
		/** @returns {void} */
		clear() {
			q.length = 0
			head = 0
		},
		/** @returns {void} */
		drop() {
			if (head >= q.length) {
				return
			}
			if (++head > THRESH && head > (q.length >>> 1)) {
				q.copyWithin(0, head)
				q.length -= head
				head = 0
			}
		},
		/** @returns {number} */
		get length() {
			return q.length - head
		},
		/**
		 * @param {T} v
		 * @returns {void}
		 */
		push(v) {
			q.push(v)
		}
	}
}