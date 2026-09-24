// Tiny test-only adapter for Obsidian's documented DOM extensions.
if (typeof HTMLElement !== 'undefined') {
  const methods = {
    createEl(this: HTMLElement, tag: string, options?: { text?: string; cls?: string; attr?: Record<string, string> }) {
      const element = this.ownerDocument.createElement(tag);
      if (options?.text) element.textContent = options.text;
      if (options?.cls) element.className = options.cls;
      for (const [key, value] of Object.entries(options?.attr ?? {})) element.setAttribute(key, value);
      this.appendChild(element);
      return element;
    },
    empty(this: HTMLElement) { this.replaceChildren(); },
    setText(this: HTMLElement, text: string) { this.textContent = text; },
    addClass(this: HTMLElement, ...names: string[]) { this.classList.add(...names); },
    toggleClass(this: HTMLElement, name: string, enabled: boolean) { this.classList.toggle(name, enabled); },
  };
  for (const [key, value] of Object.entries(methods)) Object.defineProperty(HTMLElement.prototype, key, { value, configurable: true });
}
