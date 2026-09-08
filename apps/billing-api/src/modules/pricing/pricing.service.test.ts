import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ loadPricingContext: vi.fn() }))
vi.mock('./pricing.repository', () => ({
  loadPricingContext: mocks.loadPricingContext,
}))

import { resolvePrices } from './pricing.service'

function price(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prc_1',
    currency: 'JMD',
    pricingModel: 'PER_UNIT' as const,
    unitAmount: 100n,
    packageSize: null,
    unitName: 'piece',
    item: { id: 'item_1', name: 'Widget', unit: 'piece' },
    plan: null,
    addon: null,
    tiers: [],
    ...overrides,
  }
}

function percentageList(percentage = '12.50') {
  return {
    id: 'plist_1',
    name: 'Retail markup',
    mode: 'PERCENTAGE' as const,
    currency: null,
    direction: 'MARKUP' as const,
    percentage: { toString: () => percentage },
    rounding: 'NONE' as const,
    roundingPrecision: 2,
    entries: [],
  }
}

describe('Pricing resolution', () => {
  beforeEach(() => vi.clearAllMocks())

  it('batches unique Price ids while resolving repeated quantity requests', async () => {
    mocks.loadPricingContext.mockResolvedValue([[price()], null])

    const result = await resolvePrices('ten_1', 'JMD', [
      { priceId: 'prc_1', quantity: 2 },
      { priceId: 'prc_1', quantity: 5 },
    ])

    expect(mocks.loadPricingContext).toHaveBeenCalledWith(
      'ten_1',
      ['prc_1'],
      undefined
    )
    expect(result.error).toBeNull()
    if (result.error !== null) return
    expect(result.data.prices.get('prc_1:2')?.lineAmount).toBe(200n)
    expect(result.data.prices.get('prc_1:5')?.lineAmount).toBe(500n)
  })

  it('applies fractional percentage price lists without floating-point money', async () => {
    mocks.loadPricingContext.mockResolvedValue([
      [price({ unitAmount: 1000n })],
      percentageList('12.50'),
    ])

    const result = await resolvePrices(
      'ten_1',
      'JMD',
      [{ priceId: 'prc_1', quantity: 1 }],
      'plist_1'
    )

    expect(result.error).toBeNull()
    if (result.error !== null) return
    expect(result.data.prices.get('prc_1:1')?.lineAmount).toBe(1125n)
    expect(result.data.priceList).toEqual({
      id: 'plist_1',
      name: 'Retail markup',
    })
  })

  it('uses a matching custom Price List volume tier for the line amount', async () => {
    mocks.loadPricingContext.mockResolvedValue([
      [price()],
      {
        id: 'plist_1',
        name: 'Wholesale',
        mode: 'CUSTOM',
        currency: 'JMD',
        direction: null,
        percentage: null,
        rounding: 'NONE',
        roundingPrecision: 2,
        entries: [
          {
            priceId: 'prc_1',
            unitAmount: 95n,
            tiers: [
              { fromUnit: 10, toUnit: null, unitAmount: 80n },
            ],
          },
        ],
      },
    ])

    const result = await resolvePrices(
      'ten_1',
      'JMD',
      [{ priceId: 'prc_1', quantity: 12 }],
      'plist_1'
    )

    expect(result.error).toBeNull()
    if (result.error !== null) return
    expect(result.data.prices.get('prc_1:12')).toEqual(
      expect.objectContaining({
        currency: 'JMD',
        unitAmount: 95n,
        lineAmount: 960n,
      })
    )
  })

  it('rejects a Price that resolves to another transaction currency', async () => {
    mocks.loadPricingContext.mockResolvedValue([
      [price({ currency: 'USD' })],
      null,
    ])

    await expect(
      resolvePrices('ten_1', 'JMD', [{ priceId: 'prc_1', quantity: 1 }])
    ).resolves.toEqual({
      data: null,
      error: 'Every selected price must use the transaction currency.',
      status: 422,
      code: 'billing/currency-mismatch',
    })
  })

  it('rejects quantities not covered by a tiered Price', async () => {
    mocks.loadPricingContext.mockResolvedValue([
      [
        price({
          pricingModel: 'TIERED',
          unitAmount: null,
          tiers: [{ fromUnit: 1, toUnit: 2, unitAmount: 100n, flatAmount: null }],
        }),
      ],
      null,
    ])

    await expect(
      resolvePrices('ten_1', 'JMD', [{ priceId: 'prc_1', quantity: 3 }])
    ).resolves.toEqual({
      data: null,
      error: 'The selected catalog price does not cover this quantity.',
      status: 422,
      code: 'billing/price-quantity-unavailable',
    })
  })
})
