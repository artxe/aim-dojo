import { read_h1_glyphs } from "../../scripts/lib/glyphs.js"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
describe(
	"scripts/lib/glyphs.js",
	() => {
		it(
			"read_h1_glyphs reads the shipped page's heading",
			() => {
				const { chars, text } = read_h1_glyphs(
					readFileSync(
						new URL(
							"../../docs/index.html",
							import.meta.url
						),
						"utf8"
					),
					"docs/index.html"
				)
				expect(text.length).toBeGreaterThan(0)
				expect(chars).toBe(
					[ ...new Set(text) ].sort().join("")
				)
			}
		)
		it(
			"read_h1_glyphs returns the single <h1> text and its sorted unique characters",
			() => {
				expect(
					read_h1_glyphs(
						"<header><h1 class=\"fs=72\">AIM DOJO</h1></header>",
						"index.html"
					)
				).toEqual(
					{
						chars: " ADIJMO",
						text: "AIM DOJO"
					}
				)
				expect(
					read_h1_glyphs("<h1>BANANA</h1>", "index.html").chars
				).toBe("ABN")
			}
		)
		it(
			"read_h1_glyphs throws unless exactly one plain-text <h1> exists",
			() => {
				expect(
					() => read_h1_glyphs(
						"<h2>AIM</h2>",
						"docs/index.html"
					)
				).toThrow(
					"Expected exactly 1 <h1> in docs/index.html, found 0"
				)
				expect(
					() => read_h1_glyphs(
						"<h1>A</h1><h1>B</h1>",
						"docs/index.html"
					)
				).toThrow(
					"Expected exactly 1 <h1> in docs/index.html, found 2"
				)
				expect(
					() => read_h1_glyphs(
						"<h1>AIM <b>DOJO</b></h1>",
						"docs/index.html"
					)
				).toThrow(
					"Expected exactly 1 <h1> in docs/index.html, found 0"
				)
			}
		)
	}
)