import { describe, expect, it } from 'vitest'

import {
  formatDate,
  formatMinorAmountInput,
  formatMoney,
  formatPriceCadence,
  formatSubscriptionStatus,
  minorAmountInputStep,
  parseMinorAmountInput,
  parseSignedMinorAmountInput,
  zeroMinorAmountInput,
} from '../format'

describe('formatMoney', () => {
  // Re-exported from @876/core/money. These pin Billing's boundary — that its
  // callers get the shared formatter — not the formatter itself, which is
  // tested where it lives.
  it.each([null, undefined])('renders %s as an em dash', (amount) => {
    expect(formatMoney(amount, 'JMD')).toBe('—')
  })

  it('renders JMD minor units with its standard two decimal places', () => {
    expect(formatMoney(12_345n, 'JMD')).toBe('$123.45')
  })

  it('renders an unsafe amount as the code and the raw minor units', () => {
    expect(formatMoney(9_007_199_254_740_992n, 'JMD')).toBe(
      'JMD 9007199254740992'
    )
  })
})

describe('money input formatting', () => {
  it('converts decimal values without floating-point arithmetic', () => {
    expect(parseMinorAmountInput('12.345', 3)).toBe('12345')
    expect(parseMinorAmountInput('123', 0)).toBe('123')
    expect(parseMinorAmountInput('12.3456', 3)).toBeNull()
  })

  it('handles zero only when explicitly allowed', () => {
    expect(parseMinorAmountInput('0.00', 2)).toBeNull()
    expect(parseMinorAmountInput('0.00', 2, true)).toBe('0')
  })

  it.each([
    ['12.50', '1250'],
    ['+12.50', '1250'],
    ['-12.50', '-1250'],
    ['0.00', '0'],
  ])('parses signed adjustment %s', (value, expected) => {
    expect(parseSignedMinorAmountInput(value, 2)).toBe(expected)
  })

  it('formats minor units and input metadata for currency precision', () => {
    expect(formatMinorAmountInput('12345', 3)).toBe('12.345')
    expect(formatMinorAmountInput('-12345', 3)).toBe('-12.345')
    expect(minorAmountInputStep(3)).toBe('0.001')
    expect(zeroMinorAmountInput(3)).toBe('0.000')
  })
})

describe('formatPriceCadence', () => {
  it('formats one-time prices independently of interval fields', () => {
    expect(
      formatPriceCadence({
        priceType: 'ONE_TIME',
        intervalUnit: 'MONTH',
        intervalCount: 2,
      })
    ).toBe('one-time')
  })

  it.each([
    [null, 1],
    ['MONTH', null],
    ['MONTH', 0],
  ] as const)(
    'formats incomplete cadence %s/%s as recurring',
    (unit, count) => {
      expect(
        formatPriceCadence({
          priceType: 'RECURRING',
          intervalUnit: unit,
          intervalCount: count,
        })
      ).toBe('recurring')
    }
  )

  it.each([
    ['DAY', 'per day'],
    ['WEEK', 'per week'],
    ['MONTH', 'per month'],
    ['YEAR', 'per year'],
  ] as const)('formats singular %s cadence', (intervalUnit, expected) => {
    expect(
      formatPriceCadence({
        priceType: 'RECURRING',
        intervalUnit,
        intervalCount: 1,
      })
    ).toBe(expected)
  })

  it('pluralizes a multi-unit cadence', () => {
    expect(
      formatPriceCadence({
        priceType: 'RECURRING',
        intervalUnit: 'MONTH',
        intervalCount: 3,
      })
    ).toBe('every 3 months')
  })
})

describe('other Billing formatters', () => {
  it.each([
    ['TRIALING', 'trialing'],
    ['PAST_DUE', 'past due'],
    ['', ''],
  ])('formats subscription status %j', (status, expected) => {
    expect(formatSubscriptionStatus(status)).toBe(expected)
  })

  it.each([null, undefined, 0])(
    'formats absent date %s as an em dash',
    (value) => {
      expect(formatDate(value)).toBe('—')
    }
  )

  it('formats Unix seconds as a Jamaican-locale date', () => {
    expect(formatDate(1_783_771_200)).toBe('11 Jul 2026')
  })
})
