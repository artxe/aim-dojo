let count = 0
/**
 * @param {string} specifier relative to this file
 * @returns {Promise<any>}
 */
export function fresh_import(specifier) {
	return import(/* @vite-ignore */ `${specifier}?fresh=${++count}`)
}