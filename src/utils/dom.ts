type ElementOptions = {
  className?: string
  text?: string
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
  htmlFor?: string
  id?: string
  name?: string
  placeholder?: string
  value?: string
  required?: boolean
}

export function createText(text: string) {
  return document.createTextNode(text)
}

export function createElement<K extends keyof HTMLElementTagNameMap>(
  tagName: K,
  options: ElementOptions = {},
  ...children: Array<Node | string>
) {
  const element = document.createElement(tagName)

  if (options.className) {
    element.className = options.className
  }

  if (options.text) {
    element.textContent = options.text
  }

  if (options.type && element instanceof HTMLButtonElement) {
    element.type = options.type
  }

  if (options.ariaLabel) {
    element.setAttribute('aria-label', options.ariaLabel)
  }

  if (options.id) {
    element.id = options.id
  }

  if (options.htmlFor && element instanceof HTMLLabelElement) {
    element.htmlFor = options.htmlFor
  }

  if (options.name && element instanceof HTMLInputElement) {
    element.name = options.name
  }

  if (options.placeholder && element instanceof HTMLInputElement) {
    element.placeholder = options.placeholder
  }

  if (options.value && element instanceof HTMLInputElement) {
    element.value = options.value
  }

  if (options.required && element instanceof HTMLInputElement) {
    element.required = true
  }

  children.forEach((child) => {
    if (typeof child === 'string') {
      element.append(document.createTextNode(child))
      return
    }

    element.append(child)
  })

  return element
}