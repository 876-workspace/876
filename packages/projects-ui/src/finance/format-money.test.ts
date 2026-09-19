import { describe, expect, it } from 'vitest'

import {
  formatDay,
  formatMinutes,
  formatMoneyOrUnpriced,
  UNPRICED_LABEL,
} from './format-money'

describe('formatMoneyOrUnpriced', () => {
  it('renders null as Unpriced, never 0', () => {
    expect(formatMoneyOrUnpriced(null, 'USD')).toBe(UNPRICED_LABEL)
    expect(formatMoneyOrUnpriced(null, 'USD')).toBe('Unpriced')
  })

  it('renders undefined as Unpriced', () => {
    expect(formatMoneyOrUnpriced(undefined, 'USD')).toBe(UNPRICED_LABEL)
  })

  it('renders zero as a zero amount, not as unpriced', () => {
    expect(formatMoneyOrUnpriced(0, 'JMD')).toBe('$0.00')
  })

  it('renders minor-unit numbers and strings through the core owner', () => {
    expect(formatMoneyOrUnpriced(12345, 'JMD')).toBe('$123.45')
    expect(formatMoneyOrUnpriced('12345', 'JMD')).toBe('$123.45')
  })

  it('renders a negative amount with the sign outside the symbol', () => {
    expect(formatMoneyOrUnpriced(-12345, 'JMD')).toBe('-$123.45')
  })

  it('renders USD in the platform locale so it cannot be read as JMD', () => {
    expect(formatMoneyOrUnpriced(1234, 'USD')).toBe('US$12.34')
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
