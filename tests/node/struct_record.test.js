import { create_record } from "../../docs/js/struct/record.js"
import { describe, expect, it } from "vitest"
describe(
	"struct/record.js",
	() => {
		it(
			"clear resets the record to zero",
			() => {
				const record = create_record("4")
				record.clear()
				expect(record.value).toBe(0)
				record.push(1)
				expect(record.value).toBe(1)
			}
		)
		it(
			"parses a legacy comma-joined ring as its max",
			() => {
				expect(create_record("3,7.5,5").value).toBe(7.5)
				expect(create_record("3,x,5").value).toBe(5)
			}
		)
		it(
			"push keeps the highest sample seen",
			() => {
				const record = create_record("4")
				record.push(2)
				expect(record.value).toBe(4)
				record.push(9)
				expect(record.value).toBe(9)
				record.push(5)
				expect(record.value).toBe(9)
			}
		)
		it(
			"starts at the stored all-time max",
			() => {
				expect(create_record("12.5").value).toBe(12.5)
			}
		)
		it(
			"starts at zero for an empty or unparsable value",
			() => {
				expect(create_record("").value).toBe(0)
				expect(create_record("abc").value).toBe(0)
			}
		)
	}
)