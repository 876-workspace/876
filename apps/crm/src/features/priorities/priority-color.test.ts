import { describe, expect, it } from 'vitest'

import {
  DEFAULT_PRIORITY_COLOR,
  PRIORITY_COLORS,
  PRIORITY_COLOR_VARIANTS,
  isPriorityColor,
  priorityColorVariant,
  toPriorityColor,
} from './priority-color'

describe('isPriorityColor', () => {
  it('accepts every key in the palette', () => {
    expect(PRIORITY_COLORS.every(isPriorityColor)).toBe(true)
  })

  it('rejects a hex value, an unknown name, null and undefined', () => {
    expect(isPriorityColor('#ef4444')).toBe(false)
    expect(isPriorityColor('chartreuse')).toBe(false)
    expect(isPriorityColor('')).toBe(false)
    expect(isPriorityColor(null)).toBe(false)
    expect(isPriorityColor(undefined)).toBe(false)
  })
})

describe('priorityColorVariant', () => {
  it('returns the palette entry for a known colour', () => {
    expect(priorityColorVariant('red')).toEqual(PRIORITY_COLOR_VARIANTS.red)
  })

  it('falls back to slate for legacy hex and unknown values', () => {
    expect(priorityColorVariant('#ef4444')).toEqual(
      PRIORITY_COLOR_VARIANTS.slate
    )
    expect(priorityColorVariant(null)).toEqual(PRIORITY_COLOR_VARIANTS.slate)
    expect(priorityColorVariant(undefined)).toEqual(
      PRIORITY_COLOR_VARIANTS.slate
    )
  })
})

describe('toPriorityColor', () => {
  it('keeps a known colour', () => {
    expect(toPriorityColor('violet')).toBe('violet')
  })

  it('starts an unset or legacy value on the default', () => {
    expect(toPriorityColor(null)).toBe(DEFAULT_PRIORITY_COLOR)
    expect(toPriorityColor('#3b82f6')).toBe(DEFAULT_PRIORITY_COLOR)
  })
})
