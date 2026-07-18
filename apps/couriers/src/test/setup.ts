import '@testing-library/jest-dom/vitest'

// jsdom does not implement ResizeObserver; Base UI popups (dropdowns,
// dialogs) require it for floating positioning.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver
}

// jsdom does not implement scrollIntoView; menu/list primitives scroll the
// highlighted item into view.
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}
