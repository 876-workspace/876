import { describe, expect, it } from 'vitest'

import { toDocumentTaxRateOptions } from './document-tax-rate-options'

function rate(
  overrides: Partial<
    Parameters<typeof toDocumentTaxRateOptions>[0][number]
  > = {}
) {
  return {
    id: 'txr_gct',
    name: 'GCT',
    rate: '15.0000',
    inclusive: false,
    isActive: true,
    ...overrides,
  }
}

describe('toDocumentTaxRateOptions', () => {
  it('labels an active exclusive rate with its trimmed percentage', () => {
    expect(toDocumentTaxRateOptions([rate()])).toEqual([
      { id: 'txr_gct', label: 'GCT [15%]', rate: '15.0000' },
    ])
  })

  it('keeps significant decimals in the label', () => {
    expect(
      toDocumentTaxRateOptions([rate({ rate: '16.5000' })])[0]?.label
    ).toBe('GCT [16.5%]')
  })

  it('leaves out inactive and inclusive rates', () => {
    expect(
      toDocumentTaxRateOptions([
        rate({ id: 'a', isActive: false }),
        rate({ id: 'b', inclusive: true }),
        rate({ id: 'c' }),
      ]).map((option) => option.id)
    ).toEqual(['c'])
  })

  it('does not trim a whole-number rate without decimals', () => {
    expect(toDocumentTaxRateOptions([rate({ rate: '10' })])[0]?.label).toBe(
      'GCT [10%]'
    )
  })
})
