import { describe, expect, it } from 'vitest'

import { applyPercentageAdjustment, calculateCatalogAmount } from './calculate'

describe('catalog pricing', () => {
  it.each([
    ['FLAT', 3, 1_000n],
    ['PER_UNIT', 3, 3_000n],
    ['PACKAGE', 5, 2_000n],
  ] as const)('calculates %s pricing', (pricingModel, quantity, expected) => {
    expect(
      calculateCatalogAmount(
        {
          pricingModel,
          unitAmount: 1_000n,
          packageSize: pricingModel === 'PACKAGE' ? 3 : null,
          tiers: [],
        },
        quantity
      )
    ).toBe(expected)
  })

  it('uses one volume tier for every unit at the resolved quantity', () => {
    expect(
      calculateCatalogAmount(
        {
          pricingModel: 'VOLUME',
          unitAmount: null,
          packageSize: null,
          tiers: [
            { fromUnit: 1, toUnit: 9, unitAmount: 1_000n },
            { fromUnit: 10, toUnit: null, unitAmount: 800n, flatAmount: 500n },
          ],
        },
        12
      )
    ).toBe(10_100n)
  })

  it('calculates graduated tiers without floating-point money', () => {
    expect(
      calculateCatalogAmount(
        {
          pricingModel: 'TIERED',
          unitAmount: null,
          packageSize: null,
          tiers: [
            { fromUnit: 1, toUnit: 5, unitAmount: 1_000n },
            { fromUnit: 6, toUnit: 10, unitAmount: 800n, flatAmount: 200n },
            { fromUnit: 11, toUnit: null, unitAmount: 500n },
          ],
        },
        12
      )
    ).toBe(10_200n)
  })

  it('rejects quantities outside configured tiers', () => {
    expect(() =>
      calculateCatalogAmount(
        {
          pricingModel: 'VOLUME',
          unitAmount: null,
          packageSize: null,
          tiers: [{ fromUnit: 2, toUnit: null, unitAmount: 500n }],
        },
        1
      )
    ).toThrow('No volume tier covers this quantity.')
  })

  it('applies markup and markdown using integer arithmetic and rounding', () => {
    expect(applyPercentageAdjustment(10_001n, 'MARKUP', 12.5)).toBe(11_251n)
    expect(applyPercentageAdjustment(10_001n, 'MARKDOWN', 10, 'DOWN', 0)).toBe(
      9_000n
    )
    expect(applyPercentageAdjustment(10_001n, 'MARKDOWN', 10, 'UP', 0)).toBe(
      9_100n
    )
  })
})
