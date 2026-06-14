/**
 * Free-list object pool. `obtain()` reuses a recycled object or lazily makes one;
 * `recycle()` returns an object for reuse; `clear()` drops the free list (release).
 * Used to keep the per-frame hot path (init→dispose) allocation-free without
 * touching `create_queue`. Callers own the obtain/recycle pairing.
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