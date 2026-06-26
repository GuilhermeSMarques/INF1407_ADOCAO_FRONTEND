type ElementOptions = {
  className?: string
  text?: string
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
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

  children.forEach((child) => {
    if (typeof child === 'string') {
      element.append(document.createTextNode(child))
      return
    }

    element.append(child)
  })

  return element
}
