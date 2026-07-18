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
} from './format'

describe('formatMoney', () => {
  it.each([null, undefined])('formats %s as custom pricing', (amount) => {
    expect(formatMoney(amount, 'JMD')).toBe('Custom pricing')
  })

  it.each([
    [0n, '$0.00'],
    [1n, '$0.01'],
    [12_345n, '$123.45'],
    [-250n, '-$2.50'],
    ['4900', '$49.00'],
  ])('formats minor amount %s', (amount, expected) => {
    expect(formatMoney(amount, 'JMD')).toBe(expected)
  })

  it.each([
    [9_007_199_254_740_992n, 'JMD 9007199254740992 minor units'],
    ['not-a-number', 'JMD not-a-number minor units'],
  ])(
    'preserves unsafe amount %s without precision loss',
    (amount, expected) => {
      expect(formatMoney(amount, 'JMD')).toBe(expected)
    }
  )

  it("uses each currency's standard minor-unit precision", () => {
    expect(formatMoney(123n, 'JPY')).toBe('JP¥123')
    expect(formatMoney(1234n, 'KWD')).toBe('KWD\u00a01.234')
    expect(formatMoney(1234n, 'JMD', 3)).toBe('$1.234')
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
