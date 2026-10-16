import {
	create_etag,
	is_fresh,
	parse_range,
	resolve_path
} from "./lib/serve.js"
import { createReadStream, statSync } from "node:fs"
import { createServer } from "node:http"
import { extname, join } from "node:path"
import { fileURLToPath } from "node:url"
const CHUNK_BYTES = 256 * 1_024
const HOST = "0.0.0.0"
const LIMIT_MB_S = 10
const PORT = 3_000
const ROOT = join(
	fileURLToPath(new URL("..", import.meta.url)),
	"docs"
)
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
const BYTES_PER_MS = LIMIT_MB_S * 1_024 * 1_024 / 1_000
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
		"cache-control": "no-cache, no-store, must-revalidate",
		"content-length": content_length,
		"content-type": TYPE_MAP.get(extname(file)) || "application/octet-stream",
		"etag": create_etag(stat),
		"last-modified": stat.mtime.toUTCString()
	}
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
		const file = resolve_path(ROOT, req.url)
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
				`Serving docs at http://localhost:${PORT}/ (${LIMIT_MB_S} MB/s)\n`
			)
		}
	)
}