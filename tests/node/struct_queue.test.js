import { create_queue } from "../../docs/js/struct/queue.js"
import { describe, expect, it } from "vitest"
describe(
	"struct/queue.js",
	() => {
		it(
			"array is the raw backing buffer and keeps dropped entries",
			() => {
				const q = create_queue()
				q.push(1)
				q.push(2)
				q.drop()
				expect(q.array).toEqual([ 1, 2 ])
				expect(q.array).toBe(q.array)
			}
		)
		it(
			"at reads from the front by a non-negative index and from the back by a negative one",
			() => {
				const q = create_queue()
				q.push("a")
				q.push("b")
				q.push("c")
				q.drop()
				expect(q.at(0)).toBe("b")
				expect(q.at(1)).toBe("c")
				expect(q.at(-1)).toBe("c")
				expect(q.at(-2)).toBe("b")
			}
		)
		it(
			"at returns undefined outside the live entries",
			() => {
				const q = create_queue()
				q.push("a")
				q.push("b")
				q.drop()
				expect(q.at(1)).toBe(void 0)
				expect(q.at(-2)).toBe(void 0)
				expect(create_queue().at()).toBe(void 0)
			}
		)
		it(
			"clear empties the queue and the backing buffer",
			() => {
				const q = create_queue()
				q.push(1)
				q.push(2)
				q.drop()
				q.clear()
				expect(q.length).toBe(0)
				expect(q.array).toEqual([])
				q.push(9)
				expect(q.at()).toBe(9)
			}
		)
		it(
			"compacts the buffer once more than 2048 entries are dropped and over half the buffer is dead",
			() => {
				const q = create_queue()
				for (let i = 0; i < 2_050; i++) {
					q.push(i)
				}
				for (let i = 0; i < 2_048; i++) {
					q.drop()
				}
				expect(q.array.length).toBe(2_050)
				q.drop()
				expect(q.array).toEqual([ 2_049 ])
				expect(q.length).toBe(1)
				expect(q.at()).toBe(2_049)
			}
		)
		it(
			"drop on an empty queue does nothing",
			() => {
				const q = create_queue()
				q.drop()
				q.push(1)
				expect(q.length).toBe(1)
				expect(q.at()).toBe(1)
			}
		)
		it(
			"is first in first out with a live length",
			() => {
				const q = create_queue()
				q.push(1)
				q.push(2)
				q.push(3)
				expect(q.length).toBe(3)
				expect(q.at()).toBe(1)
				q.drop()
				expect(q.length).toBe(2)
				expect(q.at()).toBe(2)
			}
		)
		it(
			"keeps the dead prefix while it is not over half the buffer",
			() => {
				const q = create_queue()
				for (let i = 0; i < 5_000; i++) {
					q.push(i)
				}
				for (let i = 0; i < 2_049; i++) {
					q.drop()
				}
				expect(q.array.length).toBe(5_000)
				expect(q.length).toBe(2_951)
				expect(q.at()).toBe(2_049)
			}
		)
	}
)