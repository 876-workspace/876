import { describe, expect, it } from 'vitest'

import {
  buildPricingSetup,
  type PricingSetupPrice,
} from './build-pricing-setup'

function createPrice(
  overrides: Partial<PricingSetupPrice> = {}
): PricingSetupPrice {
  return {
    id: 'price_9fKq2mLt',
    name: 'Starter monthly',
    nickname: null,
    unit_amount: 150000,
    currency: 'JMD',
    billing_interval: 'month',
    interval_count: 1,
    billing_scheme: 'per_unit',
    tiers_mode: null,
    trial_period_days: null,
    tax_behavior: 'exclusive',
    status: 'active',
    ...overrides,
  }
}

const BASE_PARAMS = {
  slug: '876-billing',
  planSlug: 'test-plan',
  productId: 'prod_4tVn8xQb',
}

describe('buildPricingSetup', () => {
  describe('RSC serializability', () => {
    it('returns no function-valued property', () => {
      // Regression: `editHref` was a closure, so the page threw "Functions
      // cannot be passed directly to Client Components" and never rendered.
      const setup = buildPricingSetup({
        ...BASE_PARAMS,
        prices: [createPrice()],
      })

      const functionKeys = Object.entries(setup)
        .filter(([, value]) => typeof value === 'function')
        .map(([key]) => key)

      expect(functionKeys).toEqual([])
    })

    it('survives a structured-clone round trip unchanged', () => {
      const setup = buildPricingSetup({
        ...BASE_PARAMS,
        prices: [createPrice()],
      })

      expect(structuredClone(setup)).toEqual(setup)
    })
  })

  describe('happy path', () => {
    it('builds the full setup from a product and its prices', () => {
      const setup = buildPricingSetup({
        ...BASE_PARAMS,
        prices: [createPrice()],
      })

      expect(setup).toEqual({
        productId: 'prod_4tVn8xQb',
        basePath: '/apps/876-billing/plans/test-plan/pricing',
        newHref: '/apps/876-billing/plans/test-plan/pricing/new',
        prices: [
          {
            id: 'price_9fKq2mLt',
            name: 'Starter monthly',
            nickname: null,
            unit_amount: 150000,
            currency: 'JMD',
            billing_interval: 'month',
            interval_count: 1,
            billing_scheme: 'per_unit',
            tiers_mode: null,
            trial_period_days: null,
            tax_behavior: 'exclusive',
            status: 'active',
          },
        ],
      })
    })

    it('derives an edit href for a row from the base path', () => {
      const setup = buildPricingSetup({
        ...BASE_PARAMS,
        prices: [createPrice({ id: 'price_zz1' })],
      })

      expect(`${setup.basePath}/${setup.prices[0].id}/edit`).toBe(
        '/apps/876-billing/plans/test-plan/pricing/price_zz1/edit'
      )
    })
  })

  describe('edge cases', () => {
    it.each([
      ['null', null],
      ['undefined', undefined],
      ['empty', [] as PricingSetupPrice[]],
    ])('returns an empty price list when prices are %s', (_label, prices) => {
      const setup = buildPricingSetup({ ...BASE_PARAMS, prices })

      expect(setup.prices).toEqual([])
      expect(setup.newHref).toBe(
        '/apps/876-billing/plans/test-plan/pricing/new'
      )
    })

    it('normalises absent optional price fields to null', () => {
      const setup = buildPricingSetup({
        ...BASE_PARAMS,
        prices: [
          {
            id: 'price_min',
            unit_amount: null,
            currency: 'USD',
            billing_scheme: 'tiered',
            status: 'archived',
          },
        ],
      })

      expect(setup.prices[0]).toEqual({
        id: 'price_min',
        name: null,
        nickname: null,
        unit_amount: null,
        currency: 'USD',
        billing_interval: null,
        interval_count: null,
        billing_scheme: 'tiered',
        tiers_mode: null,
        trial_period_days: null,
        tax_behavior: null,
        status: 'archived',
      })
    })

    it('does not mutate the prices it was given', () => {
      const price = createPrice()
      const snapshot = { ...price }

      buildPricingSetup({ ...BASE_PARAMS, prices: [price] })

      expect(price).toEqual(snapshot)
    })
  })
})
