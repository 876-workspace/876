import { describe, expect, it } from 'vitest'

import { formatMoney } from './money'

describe('formatMoney', () => {
  describe('grouping', () => {
    it('formats a plain amount with its currency', () => {
      expect(formatMoney({ amount: '184200.00', currency: 'JMD' })).toBe(
        'JMD 184,200.00'
      )
    })

    it('leaves a three-digit amount ungrouped', () => {
      expect(formatMoney({ amount: '999.00', currency: 'JMD' })).toBe(
        'JMD 999.00'
      )
    })

    it('groups at the first thousand', () => {
      expect(formatMoney({ amount: '1000.00', currency: 'USD' })).toBe(
        'USD 1,000.00'
      )
    })

    it('groups every three digits on a large amount', () => {
      expect(formatMoney({ amount: '12345678.90', currency: 'JMD' })).toBe(
        'JMD 12,345,678.90'
      )
    })

    it('formats zero rather than rendering an empty amount', () => {
      expect(formatMoney({ amount: '0.00', currency: 'JMD' })).toBe('JMD 0.00')
    })
  })

  describe('fractions', () => {
    it('pads a missing fraction to two places', () => {
      expect(formatMoney({ amount: '1500', currency: 'JMD' })).toBe(
        'JMD 1,500.00'
      )
    })

    it('pads a one-place fraction to two', () => {
      expect(formatMoney({ amount: '1500.5', currency: 'JMD' })).toBe(
        'JMD 1,500.50'
      )
    })

    // Precision is why the amount is a string: a float round-trip is exactly
    // what loses the trailing digits on a customer's balance.
    it('truncates beyond two places without rounding through a float', () => {
      expect(formatMoney({ amount: '1500.559', currency: 'JMD' })).toBe(
        'JMD 1,500.55'
      )
    })

    it('preserves a long integer part exactly, past float precision', () => {
      expect(
        formatMoney({ amount: '9007199254740993.00', currency: 'JMD' })
      ).toBe('JMD 9,007,199,254,740,993.00')
    })
  })

  describe('sign', () => {
    it('keeps a negative amount negative and still groups it', () => {
      expect(formatMoney({ amount: '-4200.00', currency: 'USD' })).toBe(
        'USD -4,200.00'
      )
    })

    it('does not treat a negative sign as part of the first group', () => {
      expect(formatMoney({ amount: '-1234567.89', currency: 'USD' })).toBe(
        'USD -1,234,567.89'
      )
    })
  })

  describe('currency', () => {
    it.each(['JMD', 'USD', 'GBP'])('renders the %s code verbatim', (code) => {
      expect(formatMoney({ amount: '10.00', currency: code })).toBe(
        `${code} 10.00`
      )
    })
  })
})
