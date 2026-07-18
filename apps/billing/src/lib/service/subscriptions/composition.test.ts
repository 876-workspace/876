import { describe, expect, it } from 'vitest'

import {
  resolveSubscriptionComposition,
  validateSubscriptionCatalogComposition,
} from './composition'

const planPrice = {
  planId: 'blplan_1',
  currency: 'JMD',
  unitAmount: 5_000n,
  priceType: 'RECURRING' as const,
  intervalUnit: 'MONTH' as const,
  intervalCount: 1,
}

describe('resolveSubscriptionComposition', () => {
  it('resolves shared terms for a plan with an item-backed add-on', () => {
    const result = resolveSubscriptionComposition([
      planPrice,
      { ...planPrice, planId: null, unitAmount: 2_500n },
    ])

    expect(result).toEqual({
      data: { intervalUnit: 'MONTH', intervalCount: 1 },
      error: null,
    })
  })

  it('rejects recurring prices without a plan-backed anchor', () => {
    const result = resolveSubscriptionComposition([
      { ...planPrice, planId: null },
    ])

    expect(result).toEqual({
      data: null,
      error: 'A subscription requires exactly one plan price.',
    })
  })

  it('rejects one-time prices', () => {
    const result = resolveSubscriptionComposition([
      { ...planPrice, priceType: 'ONE_TIME' },
    ])

    expect(result).toEqual({
      data: null,
      error: 'Subscriptions require recurring prices.',
    })
  })

  it('allows prices whose amount is resolved by a non-flat pricing model', () => {
    const result = resolveSubscriptionComposition([
      { ...planPrice, unitAmount: null },
    ])

    expect(result).toEqual({
      data: { intervalUnit: 'MONTH', intervalCount: 1 },
      error: null,
    })
  })

  it('rejects prices with mixed currencies or cadences', () => {
    const result = resolveSubscriptionComposition([
      planPrice,
      { ...planPrice, planId: null, currency: 'USD' },
    ])

    expect(result).toEqual({
      data: null,
      error: 'Subscription prices must use one currency and billing cadence.',
    })
  })
})

describe('validateSubscriptionCatalogComposition', () => {
  const catalogPlanPrice = {
    ...planPrice,
    addonId: null,
    plan: {
      id: 'blplan_1',
      productId: 'blprod_1',
      addonAssociations: [],
    },
    addon: null,
  }

  it('rejects an add-on associated with another plan', () => {
    const error = validateSubscriptionCatalogComposition(
      [
        catalogPlanPrice,
        {
          ...planPrice,
          planId: null,
          addonId: 'bladdon_1',
          plan: null,
          addon: {
            productId: 'blprod_1',
            planAssociations: [{ planId: 'blplan_other', isActive: true }],
          },
        },
      ],
      'PLAN_CHANGE'
    )

    expect(error).toBe('One or more add-ons are not available for this plan.')
  })

  it('requires mandatory recurring add-ons for the relevant event', () => {
    const error = validateSubscriptionCatalogComposition(
      [
        {
          ...catalogPlanPrice,
          plan: {
            ...catalogPlanPrice.plan,
            addonAssociations: [
              {
                addonId: 'bladdon_required',
                events: ['PLAN_CHANGE'],
                addon: { name: 'Compliance', priceType: 'RECURRING' },
              },
            ],
          },
        },
      ],
      'PLAN_CHANGE'
    )

    expect(error).toBe('The Compliance add-on is required for this plan.')
  })
})
