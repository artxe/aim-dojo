import {
	collect_modules,
	insert_preload_block
} from "./lib/preload.js"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
const ROOT = join(
	dirname(fileURLToPath(import.meta.url)),
	".."
)
const ANCHOR = "<script onerror=\"location.reload()\" src=\"./js/main.js\" type=\"module\"></script>"
const DOCS = join(ROOT, "docs")
const ENTRY = join(DOCS, "js/main.js")
const TARGET_HTML = join(DOCS, "index.html")
{
	const hrefs = collect_modules(DOCS, ENTRY)
	const html = readFileSync(TARGET_HTML, "utf8")
	const updated = insert_preload_block(html, ANCHOR, hrefs, TARGET_HTML)
	if (updated == html) {
		process.stdout.write("No change.\n")
	} else {
		writeFileSync(TARGET_HTML, updated)
		process.stdout.write(`Updated ${TARGET_HTML}\n`)
	}
	process.stdout.write(`modules=${hrefs.length}\n`)
}