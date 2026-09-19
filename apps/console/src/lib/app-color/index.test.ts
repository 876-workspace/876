import { describe, expect, it } from 'vitest'

import { APP_COLORS, appColor } from '../app-color'

describe('appColor', () => {
  it('returns the same color for the same app across repeated calls', () => {
    expect(appColor('876-couriers')).toBe(appColor('876-couriers'))
    expect(appColor('876-invoice')).toBe(appColor('876-invoice'))
  })

  it('normalizes casing and whitespace so the same app cannot drift', () => {
    expect(appColor('876-billing')).toBe(appColor('  876-BILLING  '))
  })

  it('always returns a supported fallback background class', () => {
    expect(appColor('future-product')).toMatch(
      /^bg-(blue|violet|emerald|amber|rose|cyan)-500$/
    )
  })
})

describe('appColor with no key', () => {
  it.each([null, undefined, '', '   '])(
    'returns a colour rather than throwing for %p',
    (key) => {
      // A subscription may carry neither app_slug nor app_id; the detail panel
      // must still render.
      expect(APP_COLORS).toContain(appColor(key))
    }
  )

  it('gives every unkeyed app the same colour', () => {
    expect(appColor(null)).toBe(appColor(undefined))
    expect(appColor('')).toBe(appColor(null))
  })
})
