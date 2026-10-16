let next_id = 0
export class XSelectElement extends HTMLElement {
	/** @type {number} */
	#active_index = -1
	/** @type {HTMLButtonElement|null} */
	#button = null
	/** @type {HTMLUListElement|null} */
	#list = null
	static get observedAttributes() {
		return [ "aria-label", "open", "value" ]
	}
	/**
	 * @param {string} name
	 * @returns {void}
	 */
	attributeChangedCallback(name) {
		if (!this.#button) {
			return
		}
		if (name == "open") {
			this.#sync_open()
		} else {
			this.#sync_value()
		}
	}
	/** @returns {void} */
	connectedCallback() {
		if (this.#button) {
			this.#sync_open()
			this.#sync_value()
			return
		}
		this.#button = /** @type {HTMLButtonElement} */(this.querySelector(
			":scope > button[data-select-button]"
		))/**/
		this.#list = /** @type {HTMLUListElement} */(this.querySelector(
			":scope > ul[data-select-options]"
		))/**/
		this.#list.classList.add(
			":focus-visible>[data-active]/ol=1px_solid_currentColor;outline-offset=-1px"
		)
		this.#list.id ||= `x-select-${next_id++}-options`
		this.#list.setAttribute("role", "listbox")
		this.#button.setAttribute("aria-controls", this.#list.id)
		this.#button.setAttribute("aria-haspopup", "listbox")
		this.#button.setAttribute("role", "combobox")
		this.#button.type = "button"
		this.#button.addEventListener("click", () => this.#toggle())
		this.#button.addEventListener(
			"keydown",
			ev => this.#on_button_keydown(ev)
		)
		this.#list.addEventListener(
			"click",
			ev => this.#on_list_click(ev)
		)
		this.#list.addEventListener(
			"keydown",
			ev => this.#on_list_keydown(ev)
		)
		this.#list.addEventListener(
			"mousedown",
			ev => this.#on_list_mousedown(ev)
		)
		this.addEventListener(
			"focusout",
			ev => this.#on_focusout(ev)
		)
		this.#sync_open()
		this.#sync_value()
	}
	/** @returns {string} */
	get value() {
		return this.getAttribute("value") || ""
	}
	/** @param {string} value */
	set value(value) {
		const option = this.#get_options().find(
			item => !item.hasAttribute("data-action")
				&& (item.getAttribute("data-value") || "") == String(value)
		)
		if (option) {
			const option_value = option.getAttribute("data-value") || ""
			if (this.value == option_value) {
				this.#sync_value()
			} else {
				this.setAttribute("value", option_value)
			}
		}
	}
	/** @returns {void} */
	close() {
		this.removeAttribute("open")
	}
	/** @returns {void} */
	open() {
		this.setAttribute("open", "")
		this.#sync_value()
		const options = this.#get_options()
		const selected_index = options.findIndex(
			option => (option.getAttribute("data-value") || "") == this.value
		)
		this.#set_active(
			selected_index < 0 ? 0 : selected_index
		)
		this.#list?.focus({ preventScroll: true })
	}
	/**
	 * @returns {HTMLButtonElement}
	 */
	#get_button() {
		return /** @type {HTMLButtonElement} */(this.#button)/**/
	}
	/**
	 * @returns {HTMLUListElement}
	 */
	#get_list() {
		return /** @type {HTMLUListElement} */(this.#list)/**/
	}
	/**
	 * @param {HTMLLIElement} option
	 * @returns {string}
	 */
	#get_label(option) {
		return option.getAttribute("data-label") || option.textContent || ""
	}
	/** @returns {HTMLLIElement[]} */
	#get_options() {
		return /** @type {HTMLLIElement[]} */([ ...this.#get_list().children ])/**/
	}
	/**
	 * @param {KeyboardEvent} ev
	 * @returns {void}
	 */
	#on_button_keydown(ev) {
		if (ev.key == "ArrowDown" || ev.key == "ArrowUp") {
			ev.preventDefault()
			this.open()
			if (ev.key == "ArrowUp") {
				this.#set_active(this.#active_index - 1, -1)
			}
		}
	}
	/**
	 * @param {Event} ev
	 * @returns {void}
	 */
	#on_focusout(ev) {
		const related_target = /** @type {FocusEvent} */(ev)/**/.relatedTarget
		if (!(related_target instanceof Node) || !this.contains(related_target)) {
			this.close()
		}
	}
	/**
	 * @param {MouseEvent} ev
	 * @returns {void}
	 */
	#on_list_click(ev) {
		const target = ev.target
		if (!(target instanceof HTMLElement)) {
			return
		}
		const option = target.closest("li[data-index]")
		if (!(option instanceof HTMLLIElement)) {
			return
		}
		if (target.closest("button[data-remove]")) {
			this.#remove_option(option)
		} else {
			this.#select_option(option)
		}
	}
	/**
	 * @param {KeyboardEvent} ev
	 * @returns {void}
	 */
	#on_list_keydown(ev) {
		const options = this.#get_options()
		if (ev.key == "ArrowDown") {
			ev.preventDefault()
			this.#set_active(this.#active_index + 1)
		} else if (ev.key == "ArrowUp") {
			ev.preventDefault()
			this.#set_active(this.#active_index - 1, -1)
		} else if (ev.key == "Delete") {
			ev.preventDefault()
			const option = options[this.#active_index]
			if (option?.hasAttribute("data-removable")) {
				this.#remove_option(option)
			}
		} else if (ev.key == "End") {
			ev.preventDefault()
			this.#set_active(options.length - 1, -1)
		} else if (ev.key == "Enter" || ev.key == " ") {
			ev.preventDefault()
			this.#select_option(options[this.#active_index])
		} else if (ev.key == "Escape") {
			ev.preventDefault()
			this.close()
			this.#get_button().focus({ preventScroll: true })
		} else if (ev.key == "Home") {
			ev.preventDefault()
			this.#set_active(0)
		} else if (ev.key == "Tab") {
			this.close()
		}
	}
	/**
	 * @param {MouseEvent} ev
	 * @returns {void}
	 */
	#on_list_mousedown(ev) {
		if (
			ev.target instanceof HTMLElement
			&& ev.target.closest("button[data-remove]")
		) {
			ev.preventDefault()
		}
	}
	/**
	 * @param {HTMLLIElement} option
	 * @returns {void}
	 */
	#remove_option(option) {
		this.dispatchEvent(
			new CustomEvent(
				"selectremove",
				{
					bubbles: true,
					detail: option.getAttribute("data-value") || ""
				}
			)
		)
	}
	/**
	 * @param {HTMLLIElement} option
	 * @returns {void}
	 */
	#select_option(option) {
		if (!option || option.getAttribute("aria-disabled") == "true") {
			return
		}
		const action = option.getAttribute("data-action")
		if (action) {
			this.close()
			this.#get_button().focus({ preventScroll: true })
			this.dispatchEvent(
				new CustomEvent(
					"selectaction",
					{ bubbles: true, detail: action }
				)
			)
			return
		}
		const value = option.getAttribute("data-value") || ""
		const value_changed = this.value != value
		this.value = value
		this.close()
		this.#get_button().focus({ preventScroll: true })
		if (value_changed) {
			this.dispatchEvent(
				new Event("change", { bubbles: true })
			)
		}
	}
	/**
	 * @param {number} index
	 * @param {number} [direction = 1]
	 * @returns {void}
	 */
	#set_active(index, direction = 1) {
		const list = this.#get_list()
		const options = this.#get_options()
		const { length } = options
		if (!length) {
			this.#active_index = -1
			list.removeAttribute("aria-activedescendant")
			return
		}
		let i = ((index % length) + length) % length
		for (
			let step = 0;
			step < length && options[i].getAttribute("aria-disabled") == "true";
			step++
		) {
			i = ((i + direction) % length + length) % length
		}
		this.#active_index = i
		for (const option of options) {
			option.removeAttribute("data-active")
		}
		const option = options[this.#active_index]
		option.setAttribute("data-active", "")
		list.setAttribute(
			"aria-activedescendant",
			option.id
		)
	}
	/** @returns {void} */
	#sync_open() {
		const open = this.hasAttribute("open")
		this.#get_button().setAttribute("aria-expanded", String(open))
	}
	/** @returns {void} */
	#sync_value() {
		const button = this.#get_button()
		const list = this.#get_list()
		const options = this.#get_options()
		let selected = options.find(
			option => !option.hasAttribute("data-action")
				&& (option.getAttribute("data-value") || "") == this.value
		)
		if (!selected) {
			selected = options.find(
				option => !option.hasAttribute("data-action")
			)
			if (selected) {
				this.setAttribute(
					"value",
					selected.getAttribute("data-value") || ""
				)
				return
			}
		}
		if (!selected) {
			return
		}
		for (let index = 0; index < options.length; index++) {
			const is_selected = options[index] == selected
			options[index].id = `${list.id}-${index}`
			options[index].setAttribute(
				"aria-selected",
				String(is_selected)
			)
			options[index].setAttribute("data-index", String(index))
			options[index].setAttribute("role", "option")
		}
		const label = this.#get_label(selected)
		button.textContent = label
		const aria_label = this.getAttribute("aria-label")
		if (aria_label) {
			button.setAttribute(
				"aria-label",
				`${aria_label}: ${label}`
			)
		} else {
			button.removeAttribute("aria-label")
		}
	}
	/** @returns {void} */
	#toggle() {
		if (this.hasAttribute("open")) {
			this.close()
		} else {
			this.open()
		}
	}
}
customElements.define("x-select", XSelectElement)