import { createReadStream, statSync } from "node:fs"
import { createServer } from "node:http"
import { extname, join, normalize, sep } from "node:path"
import { fileURLToPath } from "node:url"
const ROOT = join(
	fileURLToPath(new URL("..", import.meta.url)),
	"docs"
)
const CHUNK_BYTES = 256 * 1024
const HOST = process.env["HOST"] || "127.0.0.1"
const LIMIT_MB_S = Number(
	process.env["LIMIT_MB_S"] || 10
)
const PORT = Number(process.env["PORT"] || 3000)
const TYPE_MAP = new Map(
	[
		[
			".css",
			"text/css; charset=utf-8"
		],
		[
			".html",
			"text/html; charset=utf-8"
		],
		[
			".js",
			"text/javascript; charset=utf-8"
		],
		[
			".json",
			"application/json; charset=utf-8"
		],
		[ ".mp4", "video/mp4" ],
		[ ".png", "image/png" ],
		[ ".ttf", "font/ttf" ]
	]
)
const BYTES_PER_MS = LIMIT_MB_S * 1024 * 1024 / 1_000
/**
 * @param {import("node:fs").Stats} stat
 * @returns {string}
 */
function create_etag(stat) {
	return `"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`
}
/**
 * @param {string} file
 * @param {import("node:fs").Stats} stat
 * @param {number} content_length
 * @returns {Record<string, string | number>}
 */
function create_headers(
	file,
	stat,
	content_length = stat.size
) {
	return {
		"accept-ranges": "bytes",
		// "cache-control": "max-age=600",
		"cache-control": "no-cache, no-store, must-revalidate",
		"content-length": content_length,
		"content-type": TYPE_MAP.get(extname(file)) || "application/octet-stream",
		"etag": create_etag(stat),
		"last-modified": stat.mtime.toUTCString()
	}
}
/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:fs").Stats} stat
 * @returns {boolean}
 */
function is_fresh(req, stat) {
	const etag = create_etag(stat)
	const if_none_match = req.headers["if-none-match"]
	if (if_none_match?.split(",").map(v => v.trim())
		.includes(etag)) {
		return true
	}
	const if_modified_since = req.headers["if-modified-since"]
	return !!if_modified_since && stat.mtime <= new Date(if_modified_since)
}
/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:fs").Stats} stat
 * @returns {{ end: number, start: number } | null}
 */
function parse_range(req, stat) {
	const range = req.headers["range"]
	if (!range) {
		return null
	}
	const match = /^bytes=(\d*)-(\d*)$/.exec(range)
	if (!match) {
		return null
	}
	let end = match[2] ? Number(match[2]) : stat.size - 1
	let start = match[1] ? Number(match[1]) : stat.size - end
	if (match[1] && !match[2]) {
		end = stat.size - 1
	}
	if (!match[1] && match[2]) {
		start = stat.size - end
		end = stat.size - 1
	}
	if (start < 0 || end >= stat.size || start > end) {
		return null
	}
	return { end, start }
}
/**
 * @param {string | undefined} url
 * @returns {string | null}
 */
function resolve_path(url) {
	const path = decodeURIComponent(
		new URL(url || "/", "http://x").pathname
	)
	const rel = normalize(
		path == "/" ? "/index.html" : path
	).replace(/^[/\\]+/, "")
	const file = join(ROOT, rel)
	return file == ROOT || file.startsWith(`${ROOT}${sep}`) ? file : null
}
const server = createServer(
	(req, res) => {
		if (req.method != "GET" && req.method != "HEAD") {
			res.writeHead(
				405,
				{
					"allow": "GET, HEAD",
					"cache-control": "max-age=600",
					"content-length": 18,
					"content-type": "text/plain; charset=utf-8"
				}
			).end("Method Not Allowed")
			return
		}
		const file = resolve_path(req.url)
		if (!file) {
			res.writeHead(
				403,
				{
					"cache-control": "max-age=600",
					"content-length": 9,
					"content-type": "text/plain; charset=utf-8"
				}
			).end("Forbidden")
			return
		}
		let stat
		try {
			stat = statSync(file)
		} catch {
			res.writeHead(
				404,
				{
					"cache-control": "max-age=600",
					"content-length": 9,
					"content-type": "text/plain; charset=utf-8"
				}
			).end("Not found")
			return
		}
		if (!stat.isFile()) {
			res.writeHead(
				404,
				{
					"cache-control": "max-age=600",
					"content-length": 9,
					"content-type": "text/plain; charset=utf-8"
				}
			).end("Not found")
			return
		}
		if (is_fresh(req, stat)) {
			res.writeHead(
				304,
				create_headers(file, stat, 0)
			).end()
			return
		}
		const range = parse_range(req, stat)
		if (req.headers["range"] && !range) {
			res.writeHead(
				416,
				{
					"cache-control": "max-age=600",
					"content-length": 0,
					"content-range": `bytes */${stat.size}`,
					"content-type": TYPE_MAP.get(extname(file)) || "application/octet-stream"
				}
			).end()
			return
		}
		const end = range?.end ?? stat.size - 1
		const start = range?.start ?? 0
		const status = range ? 206 : 200
		const content_length = end - start + 1
		const headers = create_headers(file, stat, content_length)
		if (range) {
			headers["content-range"] = `bytes ${start}-${end}/${stat.size}`
		}
		res.writeHead(status, headers)
		if (req.method == "HEAD") {
			res.end()
			return
		}
		const stream = createReadStream(
			file,
			{
				end,
				highWaterMark: CHUNK_BYTES,
				start
			}
		)
		const start_ms = performance.now()
		let sent_bytes = 0
		stream.on(
			"data",
			chunk => {
				stream.pause()
				sent_bytes += chunk.length
				res.write(
					chunk,
					() => {
						const elapsed_ms = performance.now() - start_ms
						const target_ms = sent_bytes / BYTES_PER_MS
						setTimeout(
							() => stream.resume(),
							Math.max(0, target_ms - elapsed_ms)
						)
					}
				)
			}
		)
		stream.on("end", () => res.end())
		stream.on("error", () => res.destroy())
		res.on("close", () => stream.destroy())
	}
)
{
	server.listen(
		PORT,
		HOST,
		() => {
			process.stdout.write(
				`Serving docs at http://${HOST}:${PORT}/ (${LIMIT_MB_S} MB/s)\n`
			)
		}
	)
}