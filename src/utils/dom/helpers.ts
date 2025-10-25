/**
 * DOM 辅助工具
 * 提供类型安全的元素查询和操作
 */

/**
 * 安全地获取元素，如果不存在则返回 null
 */
export function getElement<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: Document | HTMLElement = document
): T | null {
  return parent.querySelector<T>(selector);
}

/**
 * 安全地获取元素，如果不存在则抛出错误
 */
export function requireElement<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: Document | HTMLElement = document
): T {
  const element = parent.querySelector<T>(selector);
  if (!element) {
    throw new Error(`Required element not found: ${selector}`);
  }
  return element;
}

/**
 * 安全地获取多个元素
 */
export function getElements<T extends HTMLElement = HTMLElement>(
  selector: string,
  parent: Document | HTMLElement = document
): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

/**
 * 类型保护：检查元素是否为特定类型
 */
export function isHTMLElement(element: Element | null): element is HTMLElement {
  return element instanceof HTMLElement;
}

export function isHTMLInputElement(element: Element | null): element is HTMLInputElement {
  return element instanceof HTMLInputElement;
}

export function isHTMLSelectElement(element: Element | null): element is HTMLSelectElement {
  return element instanceof HTMLSelectElement;
}

export function isHTMLTextAreaElement(element: Element | null): element is HTMLTextAreaElement {
  return element instanceof HTMLTextAreaElement;
}

export function isHTMLCanvasElement(element: Element | null): element is HTMLCanvasElement {
  return element instanceof HTMLCanvasElement;
}

export function isHTMLImageElement(element: Element | null): element is HTMLImageElement {
  return element instanceof HTMLImageElement;
}

/**
 * 安全地设置元素样式
 */
export function setStyle(
  element: HTMLElement | null,
  property: string,
  value: string
): void {
  if (element) {
    element.style.setProperty(property, value);
  }
}

/**
 * 安全地设置元素内容
 */
export function setTextContent(
  element: HTMLElement | null,
  content: string
): void {
  if (element) {
    element.textContent = content;
  }
}

/**
 * 安全地设置元素 HTML
 */
export function setHTML(
  element: HTMLElement | null,
  html: string
): void {
  if (element) {
    element.innerHTML = html;
  }
}

/**
 * 安全地添加类名
 */
export function addClass(
  element: HTMLElement | null,
  ...classNames: string[]
): void {
  if (element) {
    element.classList.add(...classNames);
  }
}

/**
 * 安全地移除类名
 */
export function removeClass(
  element: HTMLElement | null,
  ...classNames: string[]
): void {
  if (element) {
    element.classList.remove(...classNames);
  }
}

/**
 * 安全地切换类名
 */
export function toggleClass(
  element: HTMLElement | null,
  className: string,
  force?: boolean
): void {
  if (element) {
    element.classList.toggle(className, force);
  }
}

/**
 * 安全地设置属性
 */
export function setAttribute(
  element: HTMLElement | null,
  name: string,
  value: string
): void {
  if (element) {
    element.setAttribute(name, value);
  }
}

/**
 * 安全地获取属性
 */
export function getAttribute(
  element: HTMLElement | null,
  name: string
): string | null {
  return element?.getAttribute(name) ?? null;
}

/**
 * 安全地移除属性
 */
export function removeAttribute(
  element: HTMLElement | null,
  name: string
): void {
  if (element) {
    element.removeAttribute(name);
  }
}

/**
 * 安全地添加事件监听器
 */
export function addEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | null,
  type: K,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions
): void {
  if (element) {
    element.addEventListener(type, listener, options);
  }
}

/**
 * 安全地移除事件监听器
 */
export function removeEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | null,
  type: K,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  options?: boolean | EventListenerOptions
): void {
  if (element) {
    element.removeEventListener(type, listener, options);
  }
}

/**
 * 等待 DOM 加载完成
 */
export function onDOMReady(callback: () => void): void {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

/**
 * 安全地获取表单值
 */
export function getFormValue(
  element: HTMLElement | null
): string | null {
  if (isHTMLInputElement(element)) {
    return element.value;
  }
  if (isHTMLSelectElement(element)) {
    return element.value;
  }
  if (isHTMLTextAreaElement(element)) {
    return element.value;
  }
  return null;
}

/**
 * 安全地设置表单值
 */
export function setFormValue(
  element: HTMLElement | null,
  value: string
): void {
  if (isHTMLInputElement(element)) {
    element.value = value;
  } else if (isHTMLSelectElement(element)) {
    element.value = value;
  } else if (isHTMLTextAreaElement(element)) {
    element.value = value;
  }
}

/**
 * 安全地获取 Canvas 2D 上下文
 */
export function getCanvas2DContext(
  canvas: HTMLCanvasElement | null
): CanvasRenderingContext2D | null {
  return canvas?.getContext('2d') ?? null;
}

/**
 * 安全地执行，忽略 null
 */
export function safeExecute<T>(
  element: T | null,
  action: (element: T) => void
): void {
  if (element) {
    action(element);
  }
}
