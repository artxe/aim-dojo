import { fresh_import } from "./helpers/fresh_import.js"
import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest"
/**
 * @param {string} name
 * @returns {Promise<void>}
 */
function delete_database(name) {
	return new Promise(
		(resolve, reject) => {
			const request = indexedDB.deleteDatabase(name)
			request.onsuccess = () => resolve()
			request.onerror = () => reject(request.error)
		}
	)
}
/**
 * @param {string} name
 * @returns {File}
 */
function file(name) {
	return new File(
		[ "data-" + name ],
		name,
		{ type: "video/mp4" }
	)
}
/** @returns {Promise<typeof import("../../docs/js/bg_store.js")>} */
async function load() {
	return fresh_import("../../../docs/js/bg_store.js")
}
describe(
	"bg_store.js",
	() => {
		/** @type {import("vitest").MockInstance<typeof indexedDB.open>} */
		let open_spy
		beforeEach(
			async () => {
				open_spy = vi.spyOn(indexedDB, "open")
				await delete_database("aim-dojo")
			}
		)
		afterEach(
			async () => {
				vi.restoreAllMocks()
				for (const { value } of open_spy.mock.results) {
					const request = /** @type {IDBOpenDBRequest} */(value)/**/
					if (request.readyState == "done" && request.result) {
						request.result.close()
					}
				}
				await delete_database("aim-dojo")
			}
		)
		it(
			"a failed open rejects and the next call opens again",
			async () => {
				const failure = new Error("open failed")
				open_spy.mockImplementationOnce(
					() => {
						/** @type {{ error: Error, onerror: (() => void) | null }} */
						const request = { error: failure, onerror: null }
						queueMicrotask(() => request.onerror?.())
						return /** @type {IDBOpenDBRequest} */(/** @type {unknown} */(request))/**/
					}
				)
				const { list_bg_videos } = await load()
				await expect(list_bg_videos()).rejects.toBe(failure)
				expect(await list_bg_videos()).toEqual([])
				expect(open_spy).toHaveBeenCalledTimes(2)
			}
		)
		it(
			"a failing read request rejects with the request error",
			async () => {
				const { add_bg_video, get_bg_video_blob } = await load()
				await add_bg_video("a", file("one.mp4"))
				const original = IDBObjectStore.prototype.get
				vi.spyOn(IDBObjectStore.prototype, "get").mockImplementation(
					function(...args) {
						const request = original.apply(this, args)
						queueMicrotask(() => this.transaction.abort())
						return request
					}
				)
				await expect(get_bg_video_blob("a")).rejects.toMatchObject({ name: "AbortError" })
			}
		)
		it(
			"add_bg_video rejects when its transaction fails and aborts",
			async () => {
				const {
					add_bg_video,
					get_bg_video_blob,
					list_bg_videos
				} = await load()
				await add_bg_video("a", file("one.mp4"))
				vi.spyOn(IDBObjectStore.prototype, "put").mockImplementation(
					function(value) {
						return this.add(value)
					}
				)
				await expect(
					add_bg_video("a", file("two.mp4"))
				).rejects.toBeDefined()
				vi.restoreAllMocks()
				expect(await list_bg_videos()).toEqual(
					[ { id: "a", name: "one.mp4" } ]
				)
				expect(
					await (await get_bg_video_blob("a"))?.text()
				).toBe("data-one.mp4")
			}
		)
		it(
			"add_bg_video stores the meta and returns it, and list_bg_videos lists it",
			async () => {
				const { add_bg_video, list_bg_videos } = await load()
				const meta = await add_bg_video("a", file("one.mp4"))
				expect(meta).toEqual({ id: "a", name: "one.mp4" })
				await add_bg_video("b", file("two.mp4"))
				const list = await list_bg_videos()
				expect(list).toEqual(
					[
						{ id: "a", name: "one.mp4" },
						{ id: "b", name: "two.mp4" }
					]
				)
			}
		)
		it(
			"add_bg_video with an existing id replaces the entry",
			async () => {
				const {
					add_bg_video,
					get_bg_video_blob,
					list_bg_videos
				} = await load()
				await add_bg_video("a", file("one.mp4"))
				await add_bg_video("a", file("new.mp4"))
				expect(await list_bg_videos()).toEqual(
					[ { id: "a", name: "new.mp4" } ]
				)
				expect(
					await (await get_bg_video_blob("a"))?.text()
				).toBe("data-new.mp4")
			}
		)
		it(
			"delete_bg_video of a missing id resolves",
			async () => {
				const { delete_bg_video } = await load()
				await expect(delete_bg_video("missing")).resolves.toBeUndefined()
			}
		)
		it(
			"delete_bg_video rejects when its transaction aborts and removes nothing",
			async () => {
				const {
					add_bg_video,
					delete_bg_video,
					list_bg_videos
				} = await load()
				await add_bg_video("a", file("one.mp4"))
				const original = IDBDatabase.prototype.transaction
				vi.spyOn(
					IDBDatabase.prototype,
					"transaction"
				).mockImplementation(
					function(...args) {
						const tx = original.apply(this, args)
						queueMicrotask(() => tx.abort())
						return tx
					}
				)
				await expect(delete_bg_video("a")).rejects.toBeNull()
				vi.restoreAllMocks()
				expect(await list_bg_videos()).toEqual(
					[ { id: "a", name: "one.mp4" } ]
				)
			}
		)
		it(
			"delete_bg_video removes the meta and the blob and leaves others",
			async () => {
				const {
					add_bg_video,
					delete_bg_video,
					get_bg_video_blob,
					list_bg_videos
				} = await load()
				await add_bg_video("a", file("one.mp4"))
				await add_bg_video("b", file("two.mp4"))
				await delete_bg_video("a")
				expect(await list_bg_videos()).toEqual(
					[ { id: "b", name: "two.mp4" } ]
				)
				expect(await get_bg_video_blob("a")).toBeUndefined()
				expect(await get_bg_video_blob("b")).toBeDefined()
			}
		)
		it(
			"get_bg_video_blob resolves undefined for a missing id",
			async () => {
				const { get_bg_video_blob } = await load()
				expect(
					await get_bg_video_blob("missing")
				).toBeUndefined()
			}
		)
		it(
			"get_bg_video_blob returns the stored blob",
			async () => {
				const { add_bg_video, get_bg_video_blob } = await load()
				await add_bg_video("a", file("one.mp4"))
				const blob = await get_bg_video_blob("a")
				expect(await blob?.text()).toBe("data-one.mp4")
			}
		)
		it(
			"list_bg_videos is empty on a fresh database",
			async () => {
				const { list_bg_videos } = await load()
				expect(await list_bg_videos()).toEqual([])
			}
		)
		it(
			"the database is opened once and reused across calls",
			async () => {
				const { add_bg_video, list_bg_videos } = await load()
				await list_bg_videos()
				await add_bg_video("a", file("one.mp4"))
				await list_bg_videos()
				expect(open_spy).toHaveBeenCalledTimes(1)
			}
		)
		it(
			"the upgrade creates the meta and blob stores keyed by id",
			async () => {
				const { list_bg_videos } = await load()
				const create = vi.spyOn(
					IDBDatabase.prototype,
					"createObjectStore"
				)
				await list_bg_videos()
				expect(create.mock.calls).toEqual(
					[
						[ "bg_videos", { keyPath: "id" } ],
						[ "bg_blobs", { keyPath: "id" } ]
					]
				)
			}
		)
	}
)