import { describe, expect, it } from 'vitest'

import { parseMoney, parseTierDrafts } from './catalog-price-draft'

describe('catalog price drafts', () => {
  it('normalizes decimal amounts to integer minor units', () => {
    expect(parseMoney('10.25')).toBe('1025')
    expect(parseMoney('')).toBeNull()
    expect(parseMoney('-1')).toBeNull()
    expect(parseMoney('not-a-number')).toBeNull()
  })

  it('parses complete tiers and rejects invalid ranges', () => {
    expect(
      parseTierDrafts([
        { from: '1', to: '10', unit: '2.50', flat: '' },
        { from: '11', to: '', unit: '2', flat: '5' },
      ])
    ).toEqual([
      { fromUnit: 1, toUnit: 10, unitAmount: '250', flatAmount: null },
      { fromUnit: 11, toUnit: null, unitAmount: '200', flatAmount: '500' },
    ])
    expect(
      parseTierDrafts([{ from: '10', to: '2', unit: '1', flat: '' }])
    ).toBeNull()
  })
})
