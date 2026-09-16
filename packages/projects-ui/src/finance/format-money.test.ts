import { describe, expect, it } from 'vitest'

import {
  currencyFractionDigits,
  formatDay,
  formatMinutes,
  formatMoney,
  formatMoneyOrUnpriced,
  UNPRICED_LABEL,
} from './format-money'

describe('formatMoney', () => {
  it('formats integer minor units without float arithmetic', () => {
    expect(formatMoney(12345, 'USD', 'en-US')).toBe('$123.45')
  })

  it('formats zero as a zero amount, not as unpriced', () => {
    expect(formatMoney(0, 'USD', 'en-US')).toBe('$0.00')
  })

  it('accepts integer strings without float arithmetic', () => {
    expect(formatMoney('12345', 'USD', 'en-US')).toBe('$123.45')
  })

  it('groups large integer parts', () => {
    expect(formatMoney(123456789, 'USD', 'en-US')).toBe('$1,234,567.89')
  })

  it('pads sub-unit amounts with leading zeros', () => {
    expect(formatMoney(5, 'USD', 'en-US')).toBe('$0.05')
  })

  it('keeps the sign outside the currency symbol', () => {
    expect(formatMoney(-12345, 'USD', 'en-US')).toBe('-$123.45')
  })

  it('returns null for non-integer input', () => {
    expect(formatMoney('12.34', 'USD', 'en-US')).toBeNull()
  })
})

describe('formatMoneyOrUnpriced', () => {
  it('renders null as Unpriced, never 0', () => {
    expect(formatMoneyOrUnpriced(null, 'USD', 'en-US')).toBe(UNPRICED_LABEL)
    expect(formatMoneyOrUnpriced(null, 'USD', 'en-US')).toBe('Unpriced')
  })

  it('renders undefined as Unpriced', () => {
    expect(formatMoneyOrUnpriced(undefined, 'USD', 'en-US')).toBe('Unpriced')
  })

  it('renders zero as a zero amount', () => {
    expect(formatMoneyOrUnpriced(0, 'USD', 'en-US')).toBe('$0.00')
  })
})

describe('currencyFractionDigits', () => {
  it('resolves two fraction digits for USD', () => {
    expect(currencyFractionDigits('USD', 'en-US')).toBe(2)
  })

  it('falls back to two digits for an unknown currency', () => {
    expect(currencyFractionDigits('XXQ', 'en-US')).toBe(2)
  })
})

describe('formatMinutes', () => {
  it('formats sub-hour durations as minutes', () => {
    expect(formatMinutes(45)).toBe('45m')
  })

  it('formats hour durations with integer maths', () => {
    expect(formatMinutes(200)).toBe('3h 20m')
  })
})

describe('formatDay', () => {
  it('formats a unix timestamp in UTC', () => {
    expect(formatDay(1704067200)).toBe('Jan 1, 2024')
  })
})
