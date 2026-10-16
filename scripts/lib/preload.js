import { readFileSync } from "node:fs"
import { dirname, relative, resolve } from "node:path"
const IMPORT_PATTERN = /^\s*import\s+(?:[^"']*?from\s*)?["']([^"']+)["']/gm
const LINK_PATTERN = /^[ \t]*<link href="\.\/js\/[^"]+" rel="modulepreload">\r?\n/gm
/**
 * @param {string} docs
 * @param {string} entry
 * @returns {string[]}
 */
export function collect_modules(docs, entry) {
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
		for (const [ , specifier ] of source.matchAll(IMPORT_PATTERN)) {
			if (specifier?.startsWith(".")) {
				stack.push(
					resolve(dirname(file), specifier)
				)
			}
		}
	}
	return [ ...seen ].map(file => to_href(docs, file))
		.sort()
}
/**
 * @param {string} html
 * @param {string} anchor
 * @param {string[]} hrefs
 * @param {string} file
 * @returns {string}
 */
export function insert_preload_block(html, anchor, hrefs, file) {
	const eol = html.includes("\r\n") ? "\r\n" : "\n"
	const stripped = html.replace(LINK_PATTERN, "")
	const anchor_at = stripped.indexOf(anchor)
	if (anchor_at < 0 || anchor_at != stripped.lastIndexOf(anchor)) {
		throw new Error(
			`Expected exactly 1 ${anchor} in ${file}`
		)
	}
	const line_at = stripped.lastIndexOf("\n", anchor_at) + 1
	const indent = stripped.slice(line_at, anchor_at)
	const block = hrefs
		.map(
			href => `${indent}<link href="${href}" rel="modulepreload">${eol}`
		)
		.join("")
	return stripped.slice(0, line_at) + block + stripped.slice(line_at)
}
/**
 * @param {string} docs
 * @param {string} file
 * @returns {string}
 */
function to_href(docs, file) {
	return `./${relative(docs, file).replace(/\\/g, "/")}`
}