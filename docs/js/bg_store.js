const DB_NAME = "aim-dojo"
const DB_VERSION = 1
const META_STORE = "bg_videos"
const BLOB_STORE = "bg_blobs"
let db_promise = /** @type {Promise<IDBDatabase> | null} */(null)/**/
/**
 * @param {string} id
 * @param {File} file
 * @returns {Promise<BgVideo>}
 */
export async function add_bg_video(id, file) {
	const db = await open_db()
	const meta = { id, name: file.name }
	const tx = db.transaction(
		[ META_STORE, BLOB_STORE ],
		"readwrite"
	)
	tx.objectStore(META_STORE).put(meta)
	tx.objectStore(BLOB_STORE).put({ blob: file, id })
	await await_request(tx)
	return meta
}
/**
 * @param {IDBRequest<T> | IDBTransaction} source
 * @returns {Promise<T>}
 * @template T
 */
function await_request(source) {
	return new Promise(
		(resolve, reject) => {
			if (source instanceof IDBTransaction) {
				source.oncomplete = () => resolve(/** @type {T} */(void 0)/**/)
				source.onabort = () => reject(source.error)
				source.onerror = () => reject(source.error)
			} else {
				source.onsuccess = () => resolve(source.result)
				source.onerror = () => reject(source.error)
			}
		}
	)
}
/**
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function delete_bg_video(id) {
	const db = await open_db()
	const tx = db.transaction(
		[ META_STORE, BLOB_STORE ],
		"readwrite"
	)
	tx.objectStore(META_STORE).delete(id)
	tx.objectStore(BLOB_STORE).delete(id)
	await await_request(tx)
}
/**
 * @param {string} id
 * @returns {Promise<Blob | undefined>}
 */
export async function get_bg_video_blob(id) {
	const db = await open_db()
	const store = db.transaction(BLOB_STORE, "readonly").objectStore(BLOB_STORE)
	const record = await await_request(
		/** @type {IDBRequest<{ blob: Blob, id: string } | undefined>} */(store.get(id))/**/
	)
	return record?.blob
}
/** @returns {Promise<BgVideo[]>} */
export async function list_bg_videos() {
	const db = await open_db()
	const store = db.transaction(META_STORE, "readonly").objectStore(META_STORE)
	return await_request(
		/** @type {IDBRequest<BgVideo[]>} */(store.getAll())/**/
	)
}
/** @returns {Promise<IDBDatabase>} */
function open_db() {
	if (!db_promise) {
		db_promise = new Promise(
			(resolve, reject) => {
				const request = indexedDB.open(DB_NAME, DB_VERSION)
				request.onupgradeneeded = () => {
					const db = request.result
					if (!db.objectStoreNames.contains(META_STORE)) {
						db.createObjectStore(META_STORE, { keyPath: "id" })
					}
					if (!db.objectStoreNames.contains(BLOB_STORE)) {
						db.createObjectStore(BLOB_STORE, { keyPath: "id" })
					}
				}
				request.onsuccess = () => resolve(request.result)
				request.onerror = () => {
					db_promise = null
					reject(request.error)
				}
			}
		)
	}
	return db_promise
}