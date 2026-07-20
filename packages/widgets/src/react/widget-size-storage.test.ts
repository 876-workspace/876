// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import {
  readStoredWidgetSize,
  resolveInitialWidgetSize,
  widgetSizeStorageKey,
  writeStoredWidgetSize,
} from './widget-size-storage'
import type { WidgetSizePolicy } from '../types/widget-size'

const multiPolicy = {
  default: 'md',
  allowed: ['sm', 'md', 'lg', 'xl', 'fill'],
  remember: true,
} as const satisfies WidgetSizePolicy

describe('widget size storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    window.localStorage.clear()
  })

  it('builds a stable storage key', () => {
    expect(widgetSizeStorageKey('console', 'notepad')).toBe(
      '876:widgets:size:v1:console:notepad'
    )
  })

  it('writes and reads allowed sizes', () => {
    writeStoredWidgetSize('console', 'notepad', 'lg', multiPolicy)
    expect(readStoredWidgetSize('console', 'notepad', multiPolicy)).toBe('lg')
  })

  it('ignores disallowed stored values', () => {
    window.localStorage.setItem(
      widgetSizeStorageKey('console', 'notepad'),
      'mega'
    )
    expect(readStoredWidgetSize('console', 'notepad', multiPolicy)).toBeNull()
  })

  it('resolves initial size from storage then default', () => {
    expect(resolveInitialWidgetSize('console', 'notepad', multiPolicy)).toBe(
      'md'
    )
    writeStoredWidgetSize('console', 'notepad', 'xl', multiPolicy)
    expect(resolveInitialWidgetSize('console', 'notepad', multiPolicy)).toBe(
      'xl'
    )
  })

  it('does not persist locked policies', () => {
    const locked = {
      default: 'xl' as const,
      allowed: ['xl'] as const,
    }
    writeStoredWidgetSize('console', 'logs', 'xl', locked)
    expect(
      window.localStorage.getItem(widgetSizeStorageKey('console', 'logs'))
    ).toBeNull()
  })
})
