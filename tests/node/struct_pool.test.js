import { create_pool } from "../../docs/js/struct/pool.js"
import { describe, expect, it } from "vitest"
describe(
	"struct/pool.js",
	() => {
		it(
			"clear forgets the recycled values",
			() => {
				let made = 0
				const pool = create_pool(() => ({ id: ++made }))
				pool.recycle(pool.obtain())
				pool.clear()
				expect(pool.obtain().id).toBe(2)
			}
		)
		it(
			"obtain makes a new value while nothing is recycled",
			() => {
				let made = 0
				const pool = create_pool(() => ({ id: ++made }))
				expect(pool.obtain().id).toBe(1)
				expect(pool.obtain().id).toBe(2)
			}
		)
		it(
			"recycled values come back last in first out without calling make",
			() => {
				let made = 0
				const pool = create_pool(() => ({ id: ++made }))
				const a = pool.obtain()
				const b = pool.obtain()
				pool.recycle(a)
				pool.recycle(b)
				expect(pool.obtain()).toBe(b)
				expect(pool.obtain()).toBe(a)
				expect(made).toBe(2)
				expect(pool.obtain().id).toBe(3)
			}
		)
	}
)