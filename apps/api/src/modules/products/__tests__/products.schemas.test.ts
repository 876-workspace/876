import { describe, expect, it } from 'vitest'

import {
  createProductBodySchema,
  priceCreateBodySchema,
  updatePriceBodySchema,
} from '../products.schemas'

describe('priceCreateBodySchema', () => {
  it('accepts a minimal recurring per_unit price', () => {
    const result = priceCreateBodySchema.safeParse({
      unit_amount: 150000,
      currency: 'jmd',
    })
    expect(result.success).toBe(true)
  })

  it('defaults currency to jmd and type to recurring', () => {
    const result = priceCreateBodySchema.safeParse({ unit_amount: 1000 })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.currency).toBe('jmd')
      expect(result.data.type).toBe('recurring')
    }
  })

  it('accepts Stripe-shaped recurring with interval', () => {
    const result = priceCreateBodySchema.safeParse({
      unit_amount: 20000,
      type: 'recurring',
      recurring: { interval: 'month', interval_count: 3 },
      lookup_key: 'pro_monthly',
      metadata: { tier: 'pro' },
    })
    expect(result.success).toBe(true)
  })

  it('rejects one_time with recurring', () => {
    const result = priceCreateBodySchema.safeParse({
      unit_amount: 1000,
      type: 'one_time',
      recurring: { interval: 'month' },
    })
    expect(result.success).toBe(false)
  })

  it('rejects one_time with billing_interval', () => {
    expect(
      priceCreateBodySchema.safeParse({
        unit_amount: 1000,
        type: 'one_time',
        billing_interval: 'month',
      }).success
    ).toBe(false)
  })

  it('rejects one_time with trial_period_days', () => {
    expect(
      priceCreateBodySchema.safeParse({
        unit_amount: 1000,
        type: 'one_time',
        trial_period_days: 7,
      }).success
    ).toBe(false)
  })

  it('allows recurring without interval (nullable interval)', () => {
    expect(
      priceCreateBodySchema.safeParse({ unit_amount: 1000, type: 'recurring' })
        .success
    ).toBe(true)
  })

  it('rejects per_unit with tiers', () => {
    expect(
      priceCreateBodySchema.safeParse({
        unit_amount: 1000,
        billing_scheme: 'per_unit',
        tiers: [{ up_to: 10, unit_amount: 1000 }],
        tiers_mode: 'graduated',
      }).success
    ).toBe(false)
  })

  it('rejects tiered without tiers', () => {
    expect(
      priceCreateBodySchema.safeParse({
        billing_scheme: 'tiered',
        tiers_mode: 'graduated',
      }).success
    ).toBe(false)
  })

  it('rejects tiered with no open tier', () => {
    expect(
      priceCreateBodySchema.safeParse({
        billing_scheme: 'tiered',
        tiers_mode: 'graduated',
        tiers: [
          { up_to: 10, unit_amount: 100 },
          { up_to: 20, unit_amount: 80 },
        ],
      }).success
    ).toBe(false)
  })

  it('rejects non-monotonic tier order', () => {
    expect(
      priceCreateBodySchema.safeParse({
        billing_scheme: 'tiered',
        tiers_mode: 'volume',
        tiers: [
          { up_to: 20, unit_amount: 100 },
          { up_to: 10, unit_amount: 80 },
          { up_to: null, unit_amount: 50 },
        ],
      }).success
    ).toBe(false)
  })

  it('rejects metered with transform_quantity', () => {
    expect(
      priceCreateBodySchema.safeParse({
        unit_amount: 1000,
        recurring: { interval: 'month', usage_type: 'metered' },
        transform_quantity: { divide_by: 100, round: 'up' },
      }).success
    ).toBe(false)
  })

  it('rejects both unit_amount and unit_amount_decimal', () => {
    expect(
      priceCreateBodySchema.safeParse({
        unit_amount: 1000,
        unit_amount_decimal: '10.00',
        billing_scheme: 'per_unit',
      }).success
    ).toBe(false)
  })

  it('allows free price with no amount', () => {
    expect(
      priceCreateBodySchema.safeParse({
        currency: 'jmd',
        billing_scheme: 'per_unit',
      }).success
    ).toBe(true)
  })

  it('rejects tiered with unit_amount', () => {
    expect(
      priceCreateBodySchema.safeParse({
        unit_amount: 1000,
        billing_scheme: 'tiered',
        tiers_mode: 'graduated',
        tiers: [{ up_to: null, unit_amount: 100 }],
      }).success
    ).toBe(false)
  })
})

describe('createProductBodySchema', () => {
  it('accepts minimal product with price', () => {
    expect(
      createProductBodySchema.safeParse({
        slug: 'my-product',
        name: 'My Product',
        price: { unit_amount: 1000 },
      }).success
    ).toBe(true)
  })

  it('rejects missing slug', () => {
    expect(
      createProductBodySchema.safeParse({
        name: 'No slug',
        price: { unit_amount: 1000 },
      }).success
    ).toBe(false)
  })

  it('rejects missing price', () => {
    expect(
      createProductBodySchema.safeParse({
        slug: 'my-product',
        name: 'My Product',
      }).success
    ).toBe(false)
  })

  it('rejects unknown field (strict)', () => {
    expect(
      createProductBodySchema.safeParse({
        slug: 'my-product',
        name: 'My Product',
        price: { unit_amount: 1000 },
        unknown: 'x',
      }).success
    ).toBe(false)
  })

  it('defaults module_ids to []', () => {
    const result = createProductBodySchema.safeParse({
      slug: 'my-product',
      name: 'My Product',
      price: { unit_amount: 1000 },
    })
    expect(result.success).toBe(true)
    if (result.success) expect(result.data.module_ids).toEqual([])
  })
})

describe('updatePriceBodySchema', () => {
  it('accepts partial updates', () => {
    expect(
      updatePriceBodySchema.safeParse({ nickname: 'Legacy' }).success
    ).toBe(true)
    expect(updatePriceBodySchema.safeParse({ active: false }).success).toBe(
      true
    )
  })

  it('accepts empty partial (for controller-level no-updates check, not schema)', () => {
    expect(updatePriceBodySchema.safeParse({}).success).toBe(true)
  })
})
