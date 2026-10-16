import html from "../../../docs/index.html?raw"
/** @returns {void} */
export function load_page() {
	const doc = new DOMParser().parseFromString(html, "text/html")
	document.body.innerHTML = doc.body.innerHTML
}
/** @returns {void} */
export function run_page_script() {
	const source = [
		...new DOMParser().parseFromString(html, "text/html").head.querySelectorAll(
			"script:not([src]):not([type])"
		)
	].find(
		script => script.textContent.includes("DOMContentLoaded")
	)
	const script = document.createElement("script")
	script.textContent = String(source?.textContent)
	document.head.append(script)
	document.dispatchEvent(new Event("DOMContentLoaded"))
}