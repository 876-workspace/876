import { describe, expect, it } from 'vitest'
import {
  formatDate,
  formatMoney,
  formatPriceCadence,
  formatSubscriptionStatus,
  minorAmountInputStep,
  unixTimestampToDateInput,
  zeroMinorAmountInput,
} from '../format'

describe('billing format extended', () => {
  it('normalizes subscription status casing', () => {
    expect(formatSubscriptionStatus('active')).toBe('active')
    expect(formatSubscriptionStatus('TRIALING')).toBe('trialing')
    expect(formatSubscriptionStatus('canceled')).toBe('canceled')
  })
  it('unixTimestampToDateInput converts seconds to YYYY-MM-DD', () => {
    // 2024-01-01 00:00:00 UTC = 1704067200
    expect(unixTimestampToDateInput(1704067200)).toBe('2024-01-01')
  })
  it('minorAmountInputStep and zeroMinorAmountInput', () => {
    expect(minorAmountInputStep(2)).toBe('0.01')
    expect(minorAmountInputStep(0)).toBe('1')
    expect(zeroMinorAmountInput(2)).toBe('0.00')
    expect(zeroMinorAmountInput(0)).toBe('0')
  })
  it('formatDate handles null and valid timestamp', () => {
    expect(formatDate(null)).toBe('—')
    expect(formatDate(undefined)).toBe('—')
    // valid date should contain year
    const d = formatDate(1704067200)
    expect(d).toContain('2024')
  })
  it('formatPriceCadence for recurring monthly and yearly', () => {
    expect(
      formatPriceCadence({
        priceType: 'RECURRING',
        intervalUnit: 'MONTH',
        intervalCount: 1,
      })
    ).toMatch(/month/i)
    expect(
      formatPriceCadence({
        priceType: 'RECURRING',
        intervalUnit: 'YEAR',
        intervalCount: 1,
      })
    ).toMatch(/year/i)
    expect(
      formatPriceCadence({
        priceType: 'RECURRING',
        intervalUnit: 'MONTH',
        intervalCount: 3,
      })
    ).toMatch(/3/)
  })
  it('formatMoney handles zero and negative', () => {
    expect(formatMoney(0n, 'USD')).toBe('US$0.00')
    expect(formatMoney(-100n, 'JMD')).toContain('-')
  })
})
