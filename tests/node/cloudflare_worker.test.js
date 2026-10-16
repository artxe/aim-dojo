import worker from "../../cloudflare/worker.js"
import { describe, expect, it, vi } from "vitest"
/**
 * @param {string} text
 * @returns {{ BUCKET: { get: import("vitest").Mock } }}
 */
function create_env(text) {
	const object = {
		body: new Response(text).body,
		writeHttpMetadata: vi.fn(
			/** @param {Headers} headers */
			headers => {
				headers.set(
					"cache-control",
					"public, max-age=31536000"
				)
				headers.set("content-type", "video/mp4")
				headers.set("etag", "\"r2-etag\"")
			}
		)
	}
	return {
		BUCKET: { get: vi.fn(async () => object) }
	}
}
/**
 * @param {string} path
 * @param {Record<string, string>} [headers]
 * @returns {Request}
 */
function create_request(path, headers = {}) {
	return new Request(
		`https://aim-dojo.artxe.workers.dev${path}`,
		{ headers }
	)
}
describe(
	"cloudflare/worker.js",
	() => {
		it(
			"answers every path but /bg.mp4 with an empty 404 and never reads the bucket",
			async () => {
				for (const path of [
					"/",
					"/bg.webm",
					"/bg.mp4/x",
					"/x/bg.mp4",
					"/BG.mp4"
				]) {
					const env = create_env("video")
					const response = await worker.fetch(create_request(path), env)
					expect(response.status).toBe(404)
					expect(response.body).toBe(null)
					expect(env.BUCKET.get).not.toHaveBeenCalled()
				}
			}
		)
		it(
			"echoes an allowed Origin in access-control-allow-origin",
			async () => {
				for (const origin of [
					"http://localhost:3000",
					"https://artxe.github.io"
				]) {
					const response = await worker.fetch(
						create_request("/bg.mp4", { origin }),
						create_env("video")
					)
					expect(
						response.headers.get("access-control-allow-origin")
					).toBe(origin)
				}
			}
		)
		it(
			"overrides any stored cache-control with no-store",
			async () => {
				const response = await worker.fetch(
					create_request("/bg.mp4"),
					create_env("video")
				)
				expect(
					response.headers.get("cache-control")
				).toBe("no-store")
			}
		)
		it(
			"sends no access-control-allow-origin for another Origin or none",
			async () => {
				for (const headers of [
					{ origin: "https://example.com" },
					{
						origin: "http://localhost:3001"
					},
					{
						origin: "https://artxe.github.io.example.com"
					},
					{}
				]) {
					const response = await worker.fetch(
						create_request("/bg.mp4", headers),
						create_env("video")
					)
					expect(response.status).toBe(200)
					expect(
						response.headers.has("access-control-allow-origin")
					).toBe(false)
				}
			}
		)
		it(
			"serves /bg.mp4 whatever the query string",
			async () => {
				const env = create_env("video")
				const response = await worker.fetch(
					create_request("/bg.mp4?v=1.0.0"),
					env
				)
				expect(response.status).toBe(200)
				expect(await response.text()).toBe("video")
			}
		)
		it(
			"streams the bg.mp4 object body with its HTTP metadata",
			async () => {
				const env = create_env("video bytes")
				const response = await worker.fetch(create_request("/bg.mp4"), env)
				expect(env.BUCKET.get).toHaveBeenCalledExactlyOnceWith("bg.mp4")
				expect(response.status).toBe(200)
				expect(
					response.headers.get("content-type")
				).toBe("video/mp4")
				expect(response.headers.get("etag")).toBe("\"r2-etag\"")
				expect(await response.text()).toBe("video bytes")
			}
		)
	}
)