import { describe, expect, it } from 'vitest'

import {
  DEFAULT_USER_VIEW_VARIANT,
  USER_VIEW_VARIANTS,
  USER_VIEW_VARIANT_OPTIONS,
  isUserViewVariant,
  resolveUserViewVariant,
} from './variant'

describe('isUserViewVariant', () => {
  it.each(USER_VIEW_VARIANTS)('accepts the %s variant', (variant) => {
    expect(isUserViewVariant(variant)).toBe(true)
  })

  it.each([
    ['an unknown string', 'timeline'],
    ['an empty string', ''],
    ['undefined', undefined],
    ['null', null],
    ['a number', 1],
    ['an object', {}],
    ['an array', []],
  ])('rejects %s', (_label, value) => {
    expect(isUserViewVariant(value)).toBe(false)
  })

  it('rejects a variant name in the wrong case', () => {
    expect(isUserViewVariant('Desk')).toBe(false)
  })
})

describe('resolveUserViewVariant', () => {
  it.each(USER_VIEW_VARIANTS)('resolves %s to itself', (variant) => {
    expect(resolveUserViewVariant(variant)).toBe(variant)
  })

  // A hand-typed URL must land on a real layout, never a blank page.
  it.each([undefined, null, '', 'timeline', 42])(
    'falls back to the default for %s',
    (value) => {
      expect(resolveUserViewVariant(value)).toBe(DEFAULT_USER_VIEW_VARIANT)
    }
  )
})

describe('USER_VIEW_VARIANT_OPTIONS', () => {
  it('offers exactly one option per variant, in declaration order', () => {
    expect(USER_VIEW_VARIANT_OPTIONS.map((option) => option.value)).toEqual([
      ...USER_VIEW_VARIANTS,
    ])
  })

  it('gives every option a label and a hint', () => {
    for (const option of USER_VIEW_VARIANT_OPTIONS) {
      expect(option.label.length).toBeGreaterThan(0)
      expect(option.hint.length).toBeGreaterThan(0)
    }
  })

  // The options cross the RSC boundary, so they must stay plain data.
  it('carries no functions or components across the RSC boundary', () => {
    for (const option of USER_VIEW_VARIANT_OPTIONS) {
      for (const value of Object.values(option)) {
        expect(typeof value).toBe('string')
      }
    }
  })
})

describe('DEFAULT_USER_VIEW_VARIANT', () => {
  it('is one of the declared variants', () => {
    expect(USER_VIEW_VARIANTS).toContain(DEFAULT_USER_VIEW_VARIANT)
  })
})
