import { describe, expect, it } from 'vitest'

import { appColor } from './app-color'

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
