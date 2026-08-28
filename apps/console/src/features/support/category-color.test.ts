import { describe, expect, it } from 'vitest'
import { categoryColorClass } from './category-color'

describe('categoryColorClass', () => {
  it('returns appropriate color class for known colors', () => {
    expect(categoryColorClass('blue')).toBe('text-blue-600 dark:text-blue-400')
    expect(categoryColorClass('violet')).toBe(
      'text-violet-600 dark:text-violet-400'
    )
    expect(categoryColorClass('amber')).toBe(
      'text-amber-600 dark:text-amber-400'
    )
  })

  it('falls back to muted foreground for unknown or null colors', () => {
    expect(categoryColorClass(null)).toBe('text-muted-foreground')
    expect(categoryColorClass(undefined)).toBe('text-muted-foreground')
    expect(categoryColorClass('unknown')).toBe('text-muted-foreground')
  })
})
