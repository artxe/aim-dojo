import {
	collect_modules,
	insert_preload_block
} from "../../scripts/lib/preload.js"
import { existsSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
const ANCHOR = "<script src=\"./js/main.js\" type=\"module\"></script>"
const DOCS = fileURLToPath(
	new URL("../../docs", import.meta.url)
)
const FIXTURE = fileURLToPath(
	new URL(
		"helpers/scripts_preload",
		import.meta.url
	)
)
/**
 * @param {string} href
 * @returns {string}
 */
function link(href) {
	return `<link href="${href}" rel="modulepreload">`
}
describe(
	"scripts/lib/preload.js",
	() => {
		it(
			"collect_modules follows relative static imports through cycles and skips bare, dynamic and worker imports",
			() => {
				expect(
					collect_modules(
						FIXTURE,
						join(FIXTURE, "js/main.js")
					)
				).toEqual(
					[
						"./js/b.js",
						"./js/main.js",
						"./js/side.js",
						"./js/sub/a.js"
					]
				)
			}
		)
		it(
			"collect_modules lists the static closure of docs/js/main.js, sorted and unique, without the workers",
			() => {
				const hrefs = collect_modules(DOCS, join(DOCS, "js/main.js"))
				expect(hrefs).toEqual([ ...new Set(hrefs) ].sort())
				expect(hrefs).toContain("./js/main.js")
				expect(hrefs).toContain("./js/calc/calc_cpi.js")
				expect(hrefs).toContain("./js/worker/manager.js")
				expect(hrefs).not.toContain("./js/worker/bg_worker.js")
				expect(hrefs).not.toContain(
					"./js/worker/writing_worker.js"
				)
				for (const href of hrefs) {
					expect(existsSync(join(DOCS, href))).toBe(true)
				}
			}
		)
		it(
			"insert_preload_block ends the block lines with CRLF when the page uses CRLF",
			() => {
				const html = `<head>\r\n\t${link("./js/old.js")}\r\n\t${ANCHOR}\r\n</head>\r\n`
				expect(
					insert_preload_block(
						html,
						ANCHOR,
						[ "./js/a.js" ],
						"index.html"
					)
				).toBe(
					`<head>\r\n\t${link("./js/a.js")}\r\n\t${ANCHOR}\r\n</head>\r\n`
				)
			}
		)
		it(
			"insert_preload_block keeps links that are not ./js/ modulepreloads",
			() => {
				const kept = [
					"<link href=\"./fonts/a.woff2\" rel=\"preload\">",
					"<link href=\"https://cdn.example/x.js\" rel=\"modulepreload\">",
					"<link href=\"./lib/click.js\" rel=\"modulepreload\">"
				].join("\n")
				const html = `${kept}\n${ANCHOR}\n`
				expect(
					insert_preload_block(
						html,
						ANCHOR,
						[ "./js/a.js" ],
						"index.html"
					)
				).toBe(
					`${kept}\n${link("./js/a.js")}\n${ANCHOR}\n`
				)
			}
		)
		it(
			"insert_preload_block puts the block at the start when the anchor is on the first line",
			() => {
				expect(
					insert_preload_block(
						`${ANCHOR}\n`,
						ANCHOR,
						[ "./js/a.js" ],
						"index.html"
					)
				).toBe(
					`${link("./js/a.js")}\n${ANCHOR}\n`
				)
			}
		)
		it(
			"insert_preload_block strips every stale ./js/ modulepreload line and is idempotent",
			() => {
				const html = `<head>\n\t${link("./js/old.js")}\n\t${ANCHOR}\n</head>\n<body>\n  ${link("./js/stray.js")}\n</body>\n`
				const once = insert_preload_block(
					html,
					ANCHOR,
					[ "./js/new.js" ],
					"index.html"
				)
				expect(once).toBe(
					`<head>\n\t${link("./js/new.js")}\n\t${ANCHOR}\n</head>\n<body>\n</body>\n`
				)
				expect(
					insert_preload_block(
						once,
						ANCHOR,
						[ "./js/new.js" ],
						"index.html"
					)
				).toBe(once)
				expect(
					insert_preload_block(once, ANCHOR, [], "index.html")
				).toBe(
					`<head>\n\t${ANCHOR}\n</head>\n<body>\n</body>\n`
				)
			}
		)
		it(
			"insert_preload_block throws unless the anchor appears exactly once",
			() => {
				expect(
					() => insert_preload_block(
						"<head></head>\n",
						ANCHOR,
						[],
						"docs/index.html"
					)
				).toThrow(
					`Expected exactly 1 ${ANCHOR} in docs/index.html`
				)
				expect(
					() => insert_preload_block(
						`${ANCHOR}\n${ANCHOR}\n`,
						ANCHOR,
						[],
						"docs/index.html"
					)
				).toThrow(
					`Expected exactly 1 ${ANCHOR} in docs/index.html`
				)
			}
		)
		it(
			"insert_preload_block writes one link per href above the anchor at its indentation",
			() => {
				const html = `<head>\n\t\t<title>t</title>\n\t\t${ANCHOR}\n</head>\n`
				expect(
					insert_preload_block(
						html,
						ANCHOR,
						[ "./js/a.js", "./js/b.js" ],
						"index.html"
					)
				).toBe(
					`<head>\n\t\t<title>t</title>\n\t\t${link("./js/a.js")}\n\t\t${link("./js/b.js")}\n\t\t${ANCHOR}\n</head>\n`
				)
			}
		)
	}
)