import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"
const ROOT = join(
	dirname(fileURLToPath(import.meta.url)),
	".."
)
const ANCHOR = "<script src=\"./js/main.js\" type=\"module\"></script>"
const DOCS = join(ROOT, "docs")
const ENTRY = join(DOCS, "js/main.js")
const IMPORT_PATTERN = /^\s*import\s+(?:[^"']*?from\s*)?["']([^"']+)["']/gm
const LINK_PATTERN = /^[ \t]*<link href="\.\/js\/[^"]+" rel="modulepreload">\r?\n/gm
const TARGET_HTML = join(DOCS, "index.html")
/**
 * @param {string} entry
 * @returns {string[]}
 */
function collect_modules(entry) {
	/** @type {Set<string>} */
	const seen = new Set()
	/** @type {string[]} */
	const stack = [ entry ]
	while (stack.length) {
		const file = /** @type {string} */(stack.pop())/**/
		if (seen.has(file)) {
			continue
		}
		seen.add(file)
		const source = readFileSync(file, "utf8")
		for (const match of source.matchAll(IMPORT_PATTERN)) {
			if (match[1].startsWith(".")) {
				stack.push(
					resolve(dirname(file), match[1])
				)
			}
		}
	}
	return [ ...seen ].map(to_href)
		.sort()
}
/**
 * @param {string} file
 * @returns {string}
 */
function to_href(file) {
	return `./${relative(DOCS, file).replace(/\\/g, "/")}`
}
{
	const hrefs = collect_modules(ENTRY)
	const html = readFileSync(TARGET_HTML, "utf8")
	const stripped = html.replace(LINK_PATTERN, "")
	const anchor_at = stripped.indexOf(ANCHOR)
	if (anchor_at < 0 || anchor_at != stripped.lastIndexOf(ANCHOR)) {
		throw new Error(
			`Expected exactly 1 ${ANCHOR} in ${TARGET_HTML}`
		)
	}
	const line_at = stripped.lastIndexOf("\n", anchor_at) + 1
	const indent = stripped.slice(line_at, anchor_at)
	const block = hrefs
		.map(
			href => `${indent}<link href="${href}" rel="modulepreload">\n`
		)
		.join("")
	const updated = stripped.slice(0, line_at) + block + stripped.slice(line_at)
	if (updated == html) {
		process.stdout.write("No change.\n")
	} else {
		writeFileSync(TARGET_HTML, updated)
		process.stdout.write(`Updated ${TARGET_HTML}\n`)
	}
	process.stdout.write(`modules=${hrefs.length}\n`)
}