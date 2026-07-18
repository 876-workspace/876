import { describe, expect, it } from 'vitest'

import { adjustRenewalAmount } from './renewal-pricing'

describe('adjustRenewalAmount', () => {
  it('retains the subscribed price or uses the supplied catalog price', () => {
    expect(adjustRenewalAmount(10_000n, 'RETAIN_EXISTING', null)).toBe(10_000n)
    expect(adjustRenewalAmount(12_500n, 'USE_LATEST', null)).toBe(12_500n)
  })

  it('applies precise markup and markdown percentages in minor units', () => {
    expect(adjustRenewalAmount(10_000n, 'MARKUP', '12.5')).toBe(11_250n)
    expect(adjustRenewalAmount(10_000n, 'MARKDOWN', '12.5')).toBe(8_750n)
  })

  it('never produces a negative renewal amount', () => {
    expect(adjustRenewalAmount(100n, 'MARKDOWN', '150')).toBe(0n)
  })
})
