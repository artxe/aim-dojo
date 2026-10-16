import { create_etag, is_fresh, parse_range } from "../../scripts/lib/serve.js"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
const MTIME_MS = 1_700_000_000_500
/**
 * @param {Record<string, string>} headers
 * @returns {{ headers: Record<string, string> }}
 */
function create_req(headers) {
	return { headers }
}
/**
 * @param {number} size
 * @param {number} [mtime_ms]
 * @returns {{ mtime: Date, mtimeMs: number, size: number }}
 */
function create_stat(size, mtime_ms = MTIME_MS) {
	return {
		mtime: new Date(mtime_ms),
		mtimeMs: mtime_ms,
		size
	}
}
/**
 * @param {typeof path.posix} platform
 * @returns {Promise<{ resolve_path(root: string, url: string | undefined): string | null }>}
 */
async function load_serve(platform) {
	vi.resetModules()
	vi.doMock(
		"node:path",
		() => ({ ...platform, default: platform })
	)
	return import("../../scripts/lib/serve.js")
}
describe(
	"scripts/lib/serve.js",
	() => {
		afterEach(
			() => {
				vi.doUnmock("node:path")
			}
		)
		it(
			"create_etag quotes the hex size and the hex whole-ms mtime",
			() => {
				expect(
					create_etag(create_stat(255, 4_096.9))
				).toBe("\"ff-1000\"")
			}
		)
		it(
			"is_fresh accepts the Last-Modified it sent back as If-Modified-Since despite a sub-second mtime",
			() => {
				const stat = create_stat(255)
				expect(stat.mtime.toUTCString()).toBe(
					"Tue, 14 Nov 2023 22:13:20 GMT"
				)
				expect(
					is_fresh(
						create_req(
							{
								"if-modified-since": "Tue, 14 Nov 2023 22:13:20 GMT"
							}
						),
						stat
					)
				).toBe(true)
				expect(
					is_fresh(
						create_req(
							{
								"if-modified-since": "Wed, 15 Nov 2023 00:00:00 GMT"
							}
						),
						stat
					)
				).toBe(true)
			}
		)
		it(
			"is_fresh ignores If-Modified-Since when If-None-Match is present",
			() => {
				expect(
					is_fresh(
						create_req(
							{
								"if-modified-since": "Wed, 15 Nov 2023 00:00:00 GMT",
								"if-none-match": "\"stale\""
							}
						),
						create_stat(255)
					)
				).toBe(false)
			}
		)
		it(
			"is_fresh is false for an older or invalid If-Modified-Since or no condition",
			() => {
				const stat = create_stat(255)
				expect(
					is_fresh(
						create_req(
							{
								"if-modified-since": "Tue, 14 Nov 2023 22:13:19 GMT"
							}
						),
						stat
					)
				).toBe(false)
				expect(
					is_fresh(
						create_req(
							{
								"if-modified-since": "yesterday"
							}
						),
						stat
					)
				).toBe(false)
				expect(is_fresh(create_req({}), stat)).toBe(false)
			}
		)
		it(
			"is_fresh matches If-None-Match against the etag, alone or in a list",
			() => {
				const stat = create_stat(255)
				const etag = create_etag(stat)
				expect(
					is_fresh(
						create_req({ "if-none-match": etag }),
						stat
					)
				).toBe(true)
				expect(
					is_fresh(
						create_req(
							{
								"if-none-match": `"x",  ${etag} `
							}
						),
						stat
					)
				).toBe(true)
				expect(
					is_fresh(
						create_req({ "if-none-match": "\"x\"" }),
						stat
					)
				).toBe(false)
			}
		)
		it(
			"parse_range clamps a last byte past the end and a suffix longer than the file",
			() => {
				const stat = create_stat(100)
				expect(
					parse_range(
						create_req({ range: "bytes=50-1000" }),
						stat
					)
				).toEqual({ end: 99, start: 50 })
				expect(
					parse_range(
						create_req({ range: "bytes=-1000" }),
						stat
					)
				).toEqual({ end: 99, start: 0 })
			}
		)
		it(
			"parse_range reads first-last, open-ended and suffix byte ranges",
			() => {
				const stat = create_stat(100)
				expect(
					parse_range(
						create_req({ range: "bytes=0-" }),
						stat
					)
				).toEqual({ end: 99, start: 0 })
				expect(
					parse_range(
						create_req({ range: "bytes=10-19" }),
						stat
					)
				).toEqual({ end: 19, start: 10 })
				expect(
					parse_range(
						create_req({ range: "bytes=0-0" }),
						stat
					)
				).toEqual({ end: 0, start: 0 })
				expect(
					parse_range(
						create_req({ range: "bytes=99-99" }),
						stat
					)
				).toEqual({ end: 99, start: 99 })
				expect(
					parse_range(
						create_req({ range: "bytes=90-" }),
						stat
					)
				).toEqual({ end: 99, start: 90 })
				expect(
					parse_range(
						create_req({ range: "bytes=-10" }),
						stat
					)
				).toEqual({ end: 99, start: 90 })
			}
		)
		it(
			"parse_range returns null for unsatisfiable or malformed ranges",
			() => {
				const stat = create_stat(100)
				for (const range of [
					"bytes=-",
					"bytes=-0",
					"bytes=100-",
					"bytes=100-200",
					"bytes=20-10",
					"bytes=0-1,5-6",
					"bytes=a-b",
					"items=0-1"
				]) {
					expect(
						parse_range(create_req({ range }), stat)
					).toBe(null)
				}
				expect(
					parse_range(
						create_req({ range: "bytes=0-" }),
						create_stat(0)
					)
				).toBe(null)
				expect(
					parse_range(
						create_req({ range: "bytes=-5" }),
						create_stat(0)
					)
				).toBe(null)
			}
		)
		it(
			"parse_range returns null without a Range header",
			() => {
				expect(
					parse_range(create_req({}), create_stat(100))
				).toBe(null)
			}
		)
		it(
			"resolve_path keeps every traversal attempt under root (posix)",
			async () => {
				const { resolve_path } = await load_serve(path.posix)
				const root = "/srv/docs"
				for (const url of [
					"/../x",
					"/%2e%2e/x",
					"/..%2f..%2fx",
					"/js/../../x"
				]) {
					expect(resolve_path(root, url)).toBe("/srv/docs/x")
				}
				expect(
					resolve_path(root, "/%5c..%5c..%5cx")
				).toBe("/srv/docs/..\\..\\x")
			}
		)
		it(
			"resolve_path maps urls under root, index.html for the root url (posix)",
			async () => {
				const { resolve_path } = await load_serve(path.posix)
				const root = "/srv/docs"
				expect(resolve_path(root, void 0)).toBe("/srv/docs/index.html")
				expect(resolve_path(root, "/")).toBe("/srv/docs/index.html")
				expect(resolve_path(root, "/?v=1")).toBe("/srv/docs/index.html")
				expect(
					resolve_path(root, "/js/main.js?v=1#top")
				).toBe("/srv/docs/js/main.js")
				expect(
					resolve_path(root, "/a%20b.txt")
				).toBe("/srv/docs/a b.txt")
				expect(resolve_path(root, "/%2f")).toBe(root)
			}
		)
		it(
			"resolve_path refuses a backslash traversal that escapes root (win32)",
			async () => {
				const { resolve_path } = await load_serve(path.win32)
				const root = "D:\\srv\\docs"
				expect(resolve_path(root, "/")).toBe("D:\\srv\\docs\\index.html")
				expect(
					resolve_path(root, "/js/main.js")
				).toBe("D:\\srv\\docs\\js\\main.js")
				expect(
					resolve_path(root, "/..%2f..%2fx")
				).toBe("D:\\srv\\docs\\x")
				expect(
					resolve_path(root, "/C:%5c..%5cx")
				).toBe("D:\\srv\\docs\\x")
				expect(
					resolve_path(
						root,
						"/%5c%5cserver%5cshare%5c..%5c..%5cx"
					)
				).toBe("D:\\srv\\docs\\x")
				expect(
					resolve_path(root, "/%5c..%5c..%5cx")
				).toBe(null)
			}
		)
		it(
			"resolve_path refuses a malformed escape or url instead of throwing",
			async () => {
				const { resolve_path } = await load_serve(path.posix)
				expect(
					resolve_path("/srv/docs", "/%E0%A4%A")
				).toBe(null)
				expect(
					resolve_path("/srv/docs", "//[")
				).toBe(null)
			}
		)
	}
)