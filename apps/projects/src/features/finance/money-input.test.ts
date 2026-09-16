import { describe, expect, it } from 'vitest'

import {
  formatMinorForInput,
  fractionDigitsForCurrency,
  parseDecimalToMinor,
  parseThresholdPercent,
  parseWholeHours,
} from './money-input'

describe('parseDecimalToMinor', () => {
  it('converts a decimal string to integer minor units', () => {
    expect(parseDecimalToMinor('123.45', 2)).toBe(12345)
  })

  it('pads missing fraction digits with zeros', () => {
    expect(parseDecimalToMinor('123', 2)).toBe(12300)
  })

  it('truncates extra fraction digits without float rounding', () => {
    expect(parseDecimalToMinor('10.999', 2)).toBe(1099)
  })

  it('ignores thousands separators', () => {
    expect(parseDecimalToMinor('1,234.50', 2)).toBe(123450)
  })

  it('returns null for blank input', () => {
    expect(parseDecimalToMinor('   ', 2)).toBeNull()
  })

  it('returns null for non-numeric input', () => {
    expect(parseDecimalToMinor('twelve', 2)).toBeNull()
  })

  it('returns null for negative input', () => {
    expect(parseDecimalToMinor('-5.00', 2)).toBeNull()
  })

  it('supports zero-fraction currencies', () => {
    expect(parseDecimalToMinor('1200', 0)).toBe(1200)
  })
})

describe('formatMinorForInput', () => {
  it('formats minor units back to a decimal string', () => {
    expect(formatMinorForInput(12345, 2)).toBe('123.45')
  })

  it('keeps empty inputs empty for null', () => {
    expect(formatMinorForInput(null, 2)).toBe('')
  })

  it('pads sub-unit amounts', () => {
    expect(formatMinorForInput(5, 2)).toBe('0.05')
  })
})

describe('parseWholeHours', () => {
  it('parses whole hours', () => {
    expect(parseWholeHours('120')).toBe(120)
  })

  it('rejects fractional hours', () => {
    expect(parseWholeHours('1.5')).toBeNull()
  })
})

describe('parseThresholdPercent', () => {
  it('parses a threshold within range', () => {
    expect(parseThresholdPercent('80')).toBe(80)
  })

  it('rejects out-of-range thresholds', () => {
    expect(parseThresholdPercent('0')).toBeNull()
    expect(parseThresholdPercent('101')).toBeNull()
  })
})

describe('fractionDigitsForCurrency', () => {
  it('resolves two digits for USD', () => {
    expect(fractionDigitsForCurrency('USD')).toBe(2)
  })

  it('falls back to two digits for unknown codes', () => {
    expect(fractionDigitsForCurrency('XXQ')).toBe(2)
  })
})
