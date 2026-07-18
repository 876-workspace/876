import { describe, expect, it } from 'vitest'

import { AddonCreateSchema } from './addon'
import { CouponCreateSchema } from './discount'
import { PriceListCreateSchema } from './price-list'

describe('catalog contracts', () => {
  it('requires package size and tier definitions for matching add-on models', () => {
    const base = {
      productId: 'prod_123',
      code: 'storage',
      name: 'Storage',
      priceType: 'ONE_TIME',
      price: { currency: 'JMD' },
    }

    expect(
      AddonCreateSchema.safeParse({
        ...base,
        price: { ...base.price, unitAmount: '500', pricingModel: 'PACKAGE' },
      }).success
    ).toBe(false)
    expect(
      AddonCreateSchema.safeParse({
        ...base,
        price: { ...base.price, pricingModel: 'TIERED' },
      }).success
    ).toBe(false)
  })

  it('prevents invalid markdown percentages and overlapping custom tiers', () => {
    expect(
      PriceListCreateSchema.safeParse({
        name: 'Invalid markdown',
        mode: 'PERCENTAGE',
        direction: 'MARKDOWN',
        percentage: 101,
      }).success
    ).toBe(false)

    expect(
      PriceListCreateSchema.safeParse({
        name: 'Overlapping volume list',
        mode: 'CUSTOM',
        currency: 'USD',
        entries: [
          {
            priceId: 'price_123',
            tiers: [
              { fromUnit: 1, toUnit: 10, unitAmount: '100' },
              { fromUnit: 10, toUnit: null, unitAmount: '80' },
            ],
          },
        ],
      }).success
    ).toBe(false)
  })

  it('requires targeted coupons to name customers and currencies once', () => {
    expect(
      CouponCreateSchema.safeParse({
        name: 'Targeted',
        percentOff: 10,
        duration: 'ONCE',
        eligibleForAllCustomers: false,
      }).success
    ).toBe(false)

    expect(
      CouponCreateSchema.safeParse({
        name: 'Duplicate currency',
        duration: 'ONCE',
        currencyAmounts: [
          { currency: 'JMD', amountOff: '100' },
          { currency: 'JMD', amountOff: '200' },
        ],
      }).success
    ).toBe(false)
  })
})
