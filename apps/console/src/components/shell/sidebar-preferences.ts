'use client'

export const SIDEBAR_EXPANDED_STORAGE_KEY = '876_console_sidebar_expanded:v1'

const listeners = new Set<() => void>()

function notify() {
  for (const listener of listeners) listener()
}

export function subscribeSidebarExpanded(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('storage', onChange)

  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function readSidebarExpanded(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function readServerSidebarExpanded(): boolean {
  return false
}

export function writeSidebarExpanded(expanded: boolean): void {
  try {
    localStorage.setItem(SIDEBAR_EXPANDED_STORAGE_KEY, String(expanded))
  } catch {
    // The in-memory subscribers still update when site storage is unavailable.
  }

  notify()
}
