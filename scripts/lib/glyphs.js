const H1_PATTERN = /<h1[^>]*>([^<]*)<\/h1>/g
/**
 * @param {string} html
 * @param {string} file
 * @returns {{ chars: string, text: string }}
 */
export function read_h1_glyphs(html, file) {
	const hits = [ ...html.matchAll(H1_PATTERN) ]
	const [ hit ] = hits
	if (hits.length != 1 || !hit) {
		throw new Error(
			`Expected exactly 1 <h1> in ${file}, found ${hits.length}`
		)
	}
	const text = /** @type {string} */(hit[1])/**/
	const chars = [ ...new Set(text) ].sort()
		.join("")
	return { chars, text }
}