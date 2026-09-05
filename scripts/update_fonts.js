import {
	readFileSync,
	statSync,
	writeFileSync
} from "node:fs"
import { createRequire } from "node:module"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
const require = createRequire(import.meta.url)
/**
 * @type {(
 *   font: Buffer,
 *   text: string,
 *   options: { targetFormat: string }
 * ) => Promise<Buffer>}
 */
const subset_font = require("subset-font")
const ROOT = join(
	dirname(fileURLToPath(import.meta.url)),
	".."
)
const H1_PATTERN = /<h1[^>]*>([^<]*)<\/h1>/g
const ORBITRON_SOURCE = join(
	ROOT,
	"docs/fonts/Orbitron-VariableFont_wght.ttf"
)
const ORBITRON_TARGET = join(
	ROOT,
	"docs/fonts/Orbitron-subset.woff2"
)
const TARGET_HTML = join(ROOT, "docs/index.html")
/**
 * @param {string} file
 * @returns {string}
 */
function format_kb(file) {
	return `${(statSync(file).size / 1_024).toFixed(2)} KB`
}
{
	const html = readFileSync(TARGET_HTML, "utf8")
	const hits = [ ...html.matchAll(H1_PATTERN) ]
	if (hits.length != 1) {
		throw new Error(
			`Expected exactly 1 <h1> in ${TARGET_HTML}, found ${hits.length}`
		)
	}
	const text = hits[0][1]
	const chars = [ ...new Set(text) ].sort()
		.join("")
	const source = readFileSync(ORBITRON_SOURCE)
	writeFileSync(
		ORBITRON_TARGET,
		await subset_font(
			source,
			chars,
			{ targetFormat: "woff2" }
		)
	)
	process.stdout.write(
		`${ORBITRON_TARGET}  ${format_kb(ORBITRON_SOURCE)} -> ${format_kb(ORBITRON_TARGET)}\n`
	)
	process.stdout.write(
		`kept ${chars.length} glyphs ${JSON.stringify(chars)} from <h1>${text}</h1>\n`
	)
}