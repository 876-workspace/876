import { describe, expect, it } from 'vitest'

import { formatDate, formatMoney } from './format'

describe('formatMoney', () => {
  it('formats minor units using the currency exponent', () => {
    expect(formatMoney('125000', 'JMD')).toMatch(/1,250\.00/)
  })

  it('accepts a bigint amount', () => {
    expect(formatMoney(BigInt(999), 'USD')).toMatch(/9\.99/)
  })

  it('renders a missing amount as an em dash', () => {
    expect(formatMoney(null, 'JMD')).toBe('—')
  })

  it('shows a non-integer amount verbatim instead of rounding it', () => {
    expect(formatMoney('12.505', 'JMD')).toBe('JMD 12.505')
  })
})

describe('formatDate', () => {
  it('formats unix seconds as a UTC calendar date', () => {
    expect(formatDate(1_767_225_600)).toMatch(/2026/)
  })

  it('renders a missing date as an em dash', () => {
    expect(formatDate(null)).toBe('—')
  })
})
