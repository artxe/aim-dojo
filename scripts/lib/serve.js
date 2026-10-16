import { join, normalize, sep } from "node:path"
/**
 * @param {import("node:fs").Stats} stat
 * @returns {string}
 */
export function create_etag(stat) {
	return `"${stat.size.toString(16)}-${Math.trunc(stat.mtimeMs).toString(16)}"`
}
/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:fs").Stats} stat
 * @returns {boolean}
 */
export function is_fresh(req, stat) {
	const etag = create_etag(stat)
	const if_none_match = req.headers["if-none-match"]
	if (if_none_match) {
		return if_none_match.split(",").map(v => v.trim())
			.includes(etag)
	}
	const if_modified_since = req.headers["if-modified-since"]
	return !!if_modified_since
		&& Date.parse(stat.mtime.toUTCString()) <= Date.parse(if_modified_since)
}
/**
 * @param {import("node:http").IncomingMessage} req
 * @param {import("node:fs").Stats} stat
 * @returns {{ end: number, start: number } | null}
 */
export function parse_range(req, stat) {
	const range = req.headers["range"]
	if (!range) {
		return null
	}
	const match = /^bytes=(\d*)-(\d*)$/.exec(range)
	if (!match || !match[1] && !match[2]) {
		return null
	}
	const last = stat.size - 1
	const start = match[1]
		? Number(match[1])
		: Math.max(0, stat.size - Number(match[2]))
	const end = match[1] && match[2]
		? Math.min(Number(match[2]), last)
		: last
	if (start > end) {
		return null
	}
	return { end, start }
}
/**
 * @param {string} root
 * @param {string | undefined} url
 * @returns {string | null}
 */
export function resolve_path(root, url) {
	/** @type {string} */
	let path
	try {
		path = decodeURIComponent(
			new URL(url || "/", "http://x").pathname
		)
	} catch {
		return null
	}
	const rel = normalize(
		path == "/" ? "/index.html" : path
	).replace(/^[/\\]+/, "")
	const file = join(root, rel)
	return file == root || file.startsWith(`${root}${sep}`) ? file : null
}