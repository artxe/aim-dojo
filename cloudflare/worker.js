const ALLOWED_ORIGINS = [
	"http://localhost:3000",
	"https://artxe.github.io"
]
const KEY = "bg.mp4"
/**
 * @param {Request} request
 * @param {{ BUCKET: { get(key: string): Promise<{ body: ReadableStream, writeHttpMetadata(headers: Headers): void }> } }} env
 * @returns {Promise<Response>}
 */
async function fetch_bg(request, env) {
	if (new URL(request.url).pathname != `/${KEY}`) {
		return new Response(null, { status: 404 })
	}
	const object = await env.BUCKET.get(KEY)
	const headers = new Headers()
	object.writeHttpMetadata(headers)
	headers.set("cache-control", "no-store")
	const origin = request.headers.get("origin")
	if (origin && ALLOWED_ORIGINS.includes(origin)) {
		headers.set(
			"access-control-allow-origin",
			origin
		)
	}
	return new Response(object.body, { headers })
}
export default { fetch: fetch_bg }