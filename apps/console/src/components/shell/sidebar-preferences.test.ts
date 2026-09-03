// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  readServerSidebarExpanded,
  readSidebarExpanded,
  SIDEBAR_EXPANDED_STORAGE_KEY,
  subscribeSidebarExpanded,
  writeSidebarExpanded,
} from '@/components/shell/sidebar-preferences'

describe('sidebar preferences', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses a versioned storage key and is collapsed by default', () => {
    expect(SIDEBAR_EXPANDED_STORAGE_KEY).toBe('876_console_sidebar_expanded:v1')
    expect(readSidebarExpanded()).toBe(false)
    expect(readServerSidebarExpanded()).toBe(false)
  })

  it('persists the explicit expanded state', () => {
    writeSidebarExpanded(true)
    expect(localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY)).toBe('true')
    expect(readSidebarExpanded()).toBe(true)

    writeSidebarExpanded(false)
    expect(localStorage.getItem(SIDEBAR_EXPANDED_STORAGE_KEY)).toBe('false')
    expect(readSidebarExpanded()).toBe(false)
  })

  it('notifies same-document subscribers after a write', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeSidebarExpanded(listener)

    writeSidebarExpanded(true)

    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
  })

  it('fails closed when storage access throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('storage unavailable')
    })

    expect(readSidebarExpanded()).toBe(false)
    expect(() => writeSidebarExpanded(true)).not.toThrow()
  })
})
