import {
	afterEach,
	beforeEach,
	describe,
	expect,
	it,
	vi
} from "vitest"
import "../../docs/js/component/select.js"
/** @type {import("../../docs/js/component/select.js").XSelectElement} */
let select
/** @type {HTMLButtonElement} */
let button
/** @type {HTMLUListElement} */
let list
/** @returns {string | undefined} */
function active_value() {
	return list.querySelector("[data-active]")?.getAttribute("data-value") ?? void 0
}
/**
 * @param {string} value
 * @returns {HTMLLIElement}
 */
function option(value) {
	return /** @type {HTMLLIElement} */(list.querySelector(`[data-value='${value}']`))/**/
}
/**
 * @param {EventTarget} target
 * @param {string} key
 * @returns {KeyboardEvent}
 */
function press(target, key) {
	const ev = new KeyboardEvent(
		"keydown",
		{
			bubbles: true,
			cancelable: true,
			key
		}
	)
	target.dispatchEvent(ev)
	return ev
}
describe(
	"component/select.js",
	() => {
		beforeEach(
			() => {
				document.body.innerHTML = `<input id="outside">
<x-select aria-label="Scope">
	<button data-select-button></button>
	<ul data-select-options tabindex="-1">
		<li data-value="a">Alpha</li>
		<li aria-disabled="true" data-value="b">Bravo</li>
		<li data-label="C!" data-value="c"><span>Charlie</span></li>
		<li data-removable data-value="d">Delta<button data-remove tabindex="-1">x</button></li>
		<li data-action="upload">+ Upload</li>
	</ul>
</x-select>`
				select = /** @type {typeof select} */(document.querySelector("x-select"))/**/
				button = /** @type {HTMLButtonElement} */(select.querySelector("button"))/**/
				list = /** @type {HTMLUListElement} */(select.querySelector("ul"))/**/
			}
		)
		afterEach(
			() => {
				document.body.replaceChildren()
			}
		)
		it(
			"Escape closes the list and returns focus to the button, Tab and focus leaving close it",
			() => {
				const outside = /** @type {HTMLInputElement} */(document.getElementById("outside"))/**/
				button.click()
				press(list, "Escape")
				expect(select.hasAttribute("open")).toBe(false)
				expect(document.activeElement).toBe(button)
				button.click()
				press(list, "Tab")
				expect(select.hasAttribute("open")).toBe(false)
				button.click()
				outside.focus()
				expect(select.hasAttribute("open")).toBe(false)
			}
		)
		it(
			"a click on an option selects it, shows its label, fires one change and returns focus to the button",
			() => {
				const change = vi.fn()
				select.addEventListener("change", change)
				const label = /** @type {HTMLElement} */(option("c").firstElementChild)/**/
				button.click()
				label.click()
				expect(select.value).toBe("c")
				expect(button.textContent).toBe("C!")
				expect(
					button.getAttribute("aria-label")
				).toBe("Scope: C!")
				expect(
					option("c").getAttribute("aria-selected")
				).toBe("true")
				expect(
					option("a").getAttribute("aria-selected")
				).toBe("false")
				expect(select.hasAttribute("open")).toBe(false)
				expect(document.activeElement).toBe(button)
				expect(change).toHaveBeenCalledOnce()
				button.click()
				option("c").click()
				expect(change).toHaveBeenCalledOnce()
			}
		)
		it(
			"a click on the button opens the list on the selected option, and a second click closes it",
			() => {
				select.value = "c"
				button.click()
				expect(select.hasAttribute("open")).toBe(true)
				expect(
					button.getAttribute("aria-expanded")
				).toBe("true")
				expect(document.activeElement).toBe(list)
				expect(active_value()).toBe("c")
				expect(
					list.getAttribute("aria-activedescendant")
				).toBe(option("c").id)
				button.click()
				expect(select.hasAttribute("open")).toBe(false)
				expect(
					button.getAttribute("aria-expanded")
				).toBe("false")
			}
		)
		it(
			"a disabled option ignores a click and the arrow keys step over it",
			() => {
				const change = vi.fn()
				select.addEventListener("change", change)
				button.click()
				option("b").click()
				expect(select.value).toBe("a")
				expect(select.hasAttribute("open")).toBe(true)
				expect(change).not.toHaveBeenCalled()
				press(list, "ArrowDown")
				expect(active_value()).toBe("c")
				press(list, "ArrowUp")
				expect(active_value()).toBe("a")
			}
		)
		it(
			"an action option closes the list and fires its action without changing the value",
			() => {
				const change = vi.fn()
				const action = vi.fn(
					/** @param {Event} ev */
					ev => /** @type {CustomEvent<string>} */(ev)/**/.detail
				)
				select.addEventListener("change", change)
				select.addEventListener("selectaction", action)
				const upload = /** @type {HTMLLIElement} */(list.querySelector("[data-action]"))/**/
				button.click()
				upload.click()
				expect(action).toHaveLastReturnedWith("upload")
				expect(select.value).toBe("a")
				expect(button.textContent).toBe("Alpha")
				expect(select.hasAttribute("open")).toBe(false)
				expect(document.activeElement).toBe(button)
				expect(change).not.toHaveBeenCalled()
			}
		)
		it(
			"setting value to a known option shows it without a change event, and to an unknown one keeps the current",
			() => {
				const change = vi.fn()
				select.addEventListener("change", change)
				select.value = "d"
				expect(select.value).toBe("d")
				expect(button.textContent).toBe("Deltax")
				select.value = "zz"
				expect(select.value).toBe("d")
				select.value = "upload"
				expect(select.value).toBe("d")
				expect(change).not.toHaveBeenCalled()
			}
		)
		it(
			"shows the first option's label when no value is set, as a labelled combobox over a listbox",
			() => {
				expect(select.value).toBe("a")
				expect(button.textContent).toBe("Alpha")
				expect(
					button.getAttribute("aria-label")
				).toBe("Scope: Alpha")
				expect(button.getAttribute("role")).toBe("combobox")
				expect(
					button.getAttribute("aria-expanded")
				).toBe("false")
				expect(
					button.getAttribute("aria-controls")
				).toBe(list.id)
				expect(list.getAttribute("role")).toBe("listbox")
				expect(
					option("a").getAttribute("aria-selected")
				).toBe("true")
			}
		)
		it(
			"the keyboard opens the list, moves through it with wrap-around, Home and End, and picks with Enter or Space",
			() => {
				const change = vi.fn()
				select.addEventListener("change", change)
				expect(
					press(button, "ArrowDown").defaultPrevented
				).toBe(true)
				expect(select.hasAttribute("open")).toBe(true)
				expect(active_value()).toBe("a")
				press(list, "ArrowUp")
				expect(
					list.querySelector("[data-active]")?.getAttribute("data-action")
				).toBe("upload")
				press(list, "Home")
				expect(active_value()).toBe("a")
				press(list, "End")
				expect(
					list.querySelector("[data-active]")?.getAttribute("data-action")
				).toBe("upload")
				press(list, "ArrowDown")
				press(list, "ArrowDown")
				expect(active_value()).toBe("c")
				press(list, "Enter")
				expect(select.value).toBe("c")
				expect(select.hasAttribute("open")).toBe(false)
				press(button, "ArrowUp")
				expect(active_value()).toBe("a")
				press(list, " ")
				expect(select.value).toBe("a")
				expect(change).toHaveBeenCalledTimes(2)
			}
		)
		it(
			"the remove button of an option asks for its removal without selecting it or taking focus, and so does Delete on it",
			() => {
				const change = vi.fn()
				const remove = vi.fn(
					/** @param {Event} ev */
					ev => /** @type {CustomEvent<string>} */(ev)/**/.detail
				)
				select.addEventListener("change", change)
				select.addEventListener("selectremove", remove)
				button.click()
				const remove_btn = /** @type {HTMLButtonElement} */(option("d").querySelector("button"))/**/
				const mousedown = new MouseEvent(
					"mousedown",
					{ bubbles: true, cancelable: true }
				)
				remove_btn.dispatchEvent(mousedown)
				expect(mousedown.defaultPrevented).toBe(true)
				remove_btn.click()
				expect(remove).toHaveLastReturnedWith("d")
				expect(select.value).toBe("a")
				press(list, "End")
				press(list, "ArrowUp")
				expect(active_value()).toBe("d")
				press(list, "Delete")
				expect(remove).toHaveBeenCalledTimes(2)
				expect(remove).toHaveLastReturnedWith("d")
				press(list, "Home")
				press(list, "Delete")
				expect(remove).toHaveBeenCalledTimes(2)
				expect(change).not.toHaveBeenCalled()
			}
		)
	}
)