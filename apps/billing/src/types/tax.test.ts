import { describe, expect, it } from 'vitest'

import {
  TaxAuthorityCreateSchema,
  TaxRateCreateSchema,
  taxPercentageSchema,
} from './tax'

describe('tax contracts', () => {
  it('normalizes a Jamaican authority and applies safe defaults', () => {
    expect(
      TaxAuthorityCreateSchema.parse({
        name: 'Tax Administration Jamaica',
        countryCode: 'jm',
      })
    ).toEqual({
      name: 'Tax Administration Jamaica',
      countryCode: 'JM',
    })
  })

  it('accepts percentages with up to four decimal places', () => {
    expect(taxPercentageSchema.parse('7.125')).toBe('7.125')
    expect(taxPercentageSchema.parse(15)).toBe('15')
    expect(taxPercentageSchema.parse('100.0000')).toBe('100.0000')
  })

  it.each(['-1', '100.0001', '7.12345', 'NaN'])(
    'rejects invalid rate %s',
    (rate) => {
      expect(taxPercentageSchema.safeParse(rate).success).toBe(false)
    }
  )

  it('defaults rates to exclusive and supports a scheduled start', () => {
    const rate = TaxRateCreateSchema.parse({
      name: 'Standard GCT',
      rate: '15',
      startsAt: 1_782_864_000,
    })

    expect(rate.inclusive).toBe(false)
    expect(rate.startsAt).toBe(1_782_864_000)
  })
})
