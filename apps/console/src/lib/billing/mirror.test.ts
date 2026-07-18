import type { AdminPrice, AdminProduct, AdminSubscription } from '@876/admin'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  mirrorCoreProductPrices,
  mirrorCoreSubscription,
  mirrorCoreSubscriptionById,
  withBillingSyncHeader,
} from './mirror'

const mocks = vi.hoisted(() => ({
  orgRetrieve: vi.fn(),
  productRetrieve: vi.fn(),
  subscriptionRetrieve: vi.fn(),
  productEnsure: vi.fn(),
  planEnsure: vi.fn(),
  priceEnsure: vi.fn(),
  customerEnsure: vi.fn(),
  subscriptionEnsure: vi.fn(),
}))

vi.mock('@/lib/876', () => ({
  $876: {
    orgs: { retrieve: mocks.orgRetrieve },
    products: { retrieve: mocks.productRetrieve },
    subscriptions: { retrieve: mocks.subscriptionRetrieve },
  },
}))

vi.mock('@/lib/billing', () => ({
  $billing: {
    products: { ensure: mocks.productEnsure },
    plans: { ensure: mocks.planEnsure },
    prices: { ensure: mocks.priceEnsure },
    customers: { ensure: mocks.customerEnsure },
    subscriptions: { ensure: mocks.subscriptionEnsure },
  },
}))

function success<T>(data: T) {
  return Promise.resolve({ data, error: null })
}

function createPrice(overrides: Partial<AdminPrice> = {}): AdminPrice {
  return {
    object: 'price',
    id: 'prc_core_1',
    product_id: 'prd_core_1',
    unit_amount: 0,
    currency: 'jmd',
    billing_interval: null,
    interval_count: null,
    status: 'active',
    active: true,
    lookup_key: null,
    name: null,
    nickname: 'Internal',
    type: 'recurring',
    billing_scheme: 'per_unit',
    tiers_mode: null,
    tiers: null,
    recurring: null,
    tax_behavior: null,
    transform_quantity: null,
    unit_amount_decimal: null,
    trial_period_days: null,
    metadata: null,
    archived_at: null,
    created_at: 1,
    updated_at: 1,
    ...overrides,
  }
}

function createProduct(overrides: Partial<AdminProduct> = {}): AdminProduct {
  return {
    object: 'product',
    id: 'prd_core_1',
    slug: 'billing-internal',
    name: '876 Billing - Internal',
    description: null,
    app_id: 'rap_billing',
    app_slug: '876-billing',
    app_name: '876 Billing',
    app_logo_url: null,
    app_kind: 'product',
    status: 'active',
    active: true,
    statement_descriptor: null,
    unit_label: null,
    tax_code_id: null,
    lookup_key: null,
    metadata: null,
    archived_at: null,
    prices: [createPrice()],
    module_ids: [],
    created_at: 1,
    updated_at: 1,
    ...overrides,
  }
}

function createSubscription(
  overrides: Partial<AdminSubscription> = {}
): AdminSubscription {
  return {
    object: 'subscription',
    id: 'sub_core_1',
    billing_account_id: null,
    organization_id: 'org_1',
    app_id: 'rap_billing',
    app_slug: '876-billing',
    app_name: '876 Billing',
    app_logo_url: null,
    app_kind: 'product',
    status: 'active',
    provider_status: null,
    status_reason: null,
    finance_lifecycle_version: 0,
    collection_method: 'charge_automatically',
    billing_cycle_anchor: null,
    items: [
      {
        object: 'subscription_item',
        id: 'sbi_1',
        price_id: 'prc_core_1',
        product_id: 'prd_core_1',
        product_slug: 'billing-internal',
        product_name: '876 Billing - Internal',
        quantity: 1,
        billing_thresholds: null,
        metadata: null,
      },
    ],
    current_period_start: null,
    current_period_end: null,
    cancel_at: null,
    cancel_at_period_end: false,
    canceled_at: null,
    ended_at: null,
    pause_collection: null,
    trial_start: null,
    trial_end: null,
    start_date: 100,
    default_payment_method_id: null,
    latest_invoice_id: null,
    pending_update: null,
    schedule_id: null,
    metadata: null,
    created_at: 100,
    updated_at: 100,
    ...overrides,
  }
}

function setUpMocks() {
  vi.clearAllMocks()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  mocks.orgRetrieve.mockReturnValue(
    success({ id: 'org_1', name: 'Efesto Technologies, Inc' })
  )
  mocks.productRetrieve.mockReturnValue(success(createProduct()))
  mocks.subscriptionRetrieve.mockReturnValue(success(createSubscription()))
  mocks.productEnsure.mockReturnValue(
    success({ object: 'product', id: 'blprod_1' })
  )
  mocks.planEnsure.mockReturnValue(success({ object: 'plan', id: 'blplan_1' }))
  mocks.priceEnsure.mockReturnValue(success({ object: 'price', id: 'blprc_1' }))
  mocks.customerEnsure.mockReturnValue(
    success({ object: 'customer', id: 'blcus_1' })
  )
  mocks.subscriptionEnsure.mockReturnValue(
    success({ object: 'subscription', id: 'blsub_1' })
  )
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('mirrorCoreSubscription', () => {
  beforeEach(() => {
    setUpMocks()
  })

  it('repairs catalog prerequisites before ensuring the subscription', async () => {
    const result = await mirrorCoreSubscription(createSubscription())

    expect(result).toBe(true)
    expect(mocks.productRetrieve).toHaveBeenCalledWith('prd_core_1')
    expect(mocks.productEnsure).toHaveBeenCalledWith(
      expect.objectContaining({ sourceAppId: 'rap_billing' })
    )
    expect(mocks.planEnsure).toHaveBeenCalledWith(
      expect.objectContaining({ entitlementReferenceId: 'prd_core_1' })
    )
    expect(mocks.priceEnsure).toHaveBeenCalledWith(
      expect.objectContaining({
        entitlementReferenceId: 'prc_core_1',
        currency: 'JMD',
      })
    )
    expect(mocks.subscriptionEnsure).toHaveBeenCalledWith({
      externalReference: 'sub_core_1',
      sourceAppId: 'rap_billing',
      customerId: 'blcus_1',
      items: [{ priceEntitlementReferenceId: 'prc_core_1', quantity: 1 }],
      status: 'ACTIVE',
      startAt: 100,
      cancelAtPeriodEnd: false,
    })
  })

  it('does not create a partial subscription when catalog repair fails', async () => {
    mocks.priceEnsure.mockResolvedValue({
      data: null,
      error: { code: 'billing/unavailable', message: 'Unavailable.' },
    })

    const result = await mirrorCoreSubscription(createSubscription())

    expect(result).toBe(false)
    expect(mocks.customerEnsure).not.toHaveBeenCalled()
    expect(mocks.subscriptionEnsure).not.toHaveBeenCalled()
  })
})

describe('withBillingSyncHeader', () => {
  it.each([
    [true, 'succeeded'],
    [false, 'pending-reconciliation'],
  ])('sets the projection outcome for succeeded=%s', (succeeded, expected) => {
    const response = new Response(null, { status: 204 })

    const result = withBillingSyncHeader(response, succeeded)

    expect(result).toBe(response)
    expect(result.headers.get('x-876-billing-sync')).toBe(expected)
  })
})

describe('mirrorCoreProductPrices', () => {
  beforeEach(() => {
    setUpMocks()
  })

  it('rejects a product without a source app before writing', async () => {
    const result = await mirrorCoreProductPrices(
      createProduct({ app_id: null }),
      [createPrice()]
    )

    expect(result).toBe(false)
    expect(mocks.productEnsure).not.toHaveBeenCalled()
    expect(mocks.planEnsure).not.toHaveBeenCalled()
    expect(mocks.priceEnsure).not.toHaveBeenCalled()
  })

  it('stops when the Billing product cannot be ensured', async () => {
    mocks.productEnsure.mockResolvedValue({
      data: null,
      error: { message: 'Product unavailable.' },
    })

    const result = await mirrorCoreProductPrices(createProduct(), [
      createPrice(),
    ])

    expect(result).toBe(false)
    expect(mocks.productEnsure).toHaveBeenCalledTimes(1)
    expect(mocks.planEnsure).not.toHaveBeenCalled()
    expect(mocks.priceEnsure).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(
      '[console.billing.mirror] product ensure failed:',
      'prd_core_1',
      'Product unavailable.'
    )
  })

  it('succeeds after ensuring the product when there are no prices', async () => {
    const result = await mirrorCoreProductPrices(createProduct(), [])

    expect(result).toBe(true)
    expect(mocks.productEnsure).toHaveBeenCalledTimes(1)
    expect(mocks.planEnsure).not.toHaveBeenCalled()
    expect(mocks.priceEnsure).not.toHaveBeenCalled()
  })

  it.each([
    ['day', 'DAY'],
    ['week', 'WEEK'],
    ['month', 'MONTH'],
    ['year', 'YEAR'],
  ] as const)(
    'maps core %s cadence to Billing %s cadence',
    async (billingInterval, intervalUnit) => {
      const price = createPrice({
        billing_interval: billingInterval as never,
        interval_count: 3,
        trial_period_days: 14,
        nickname: null,
        name: 'Team price',
        currency: 'usd',
        unit_amount: 4_900,
      })

      const result = await mirrorCoreProductPrices(createProduct(), [price])

      expect(result).toBe(true)
      expect(mocks.planEnsure).toHaveBeenCalledTimes(1)
      expect(mocks.planEnsure).toHaveBeenCalledWith({
        productId: 'blprod_1',
        entitlementReferenceId: 'prd_core_1',
        code: 'billing-internal',
        name: '876 Billing - Internal',
        description: null,
        intervalUnit,
        intervalCount: 3,
        trialDays: 14,
        active: true,
      })
      expect(mocks.priceEnsure).toHaveBeenCalledTimes(1)
      expect(mocks.priceEnsure).toHaveBeenCalledWith({
        planId: 'blplan_1',
        entitlementReferenceId: 'prc_core_1',
        nickname: 'Team price',
        currency: 'USD',
        unitAmount: 4_900,
        intervalUnit,
        intervalCount: 3,
        active: true,
      })
      expect(console.error).not.toHaveBeenCalled()
    }
  )

  it('uses recurring JSON cadence and defaults a missing interval count', async () => {
    const price = createPrice({
      recurring: { interval: 'week' } as never,
      nickname: null,
      name: null,
    })

    const result = await mirrorCoreProductPrices(createProduct(), [price])

    expect(result).toBe(true)
    expect(mocks.planEnsure).toHaveBeenCalledWith(
      expect.objectContaining({ intervalUnit: 'WEEK', intervalCount: 1 })
    )
    expect(mocks.priceEnsure).toHaveBeenCalledWith(
      expect.objectContaining({ nickname: null })
    )
  })

  it('defaults a legacy recurring price without cadence to monthly', async () => {
    const result = await mirrorCoreProductPrices(createProduct(), [
      createPrice(),
    ])

    expect(result).toBe(true)
    expect(mocks.planEnsure).toHaveBeenCalledWith(
      expect.objectContaining({
        intervalUnit: 'MONTH',
        intervalCount: 1,
        trialDays: 0,
      })
    )
  })

  it.each([
    createPrice({ type: 'one_time', billing_interval: null, recurring: null }),
    createPrice({ billing_interval: 'fortnight' as never }),
  ])('skips a price with unsupported cadence %#', async (price) => {
    const result = await mirrorCoreProductPrices(createProduct(), [price])

    expect(result).toBe(false)
    expect(mocks.planEnsure).not.toHaveBeenCalled()
    expect(mocks.priceEnsure).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(
      '[console.billing.mirror] price cadence unavailable:',
      'prc_core_1'
    )
  })

  it('continues after an unsupported price and mirrors later valid prices', async () => {
    const invalid = createPrice({
      id: 'prc_invalid',
      type: 'one_time',
      billing_interval: null,
    })
    const valid = createPrice({ id: 'prc_valid' })

    const result = await mirrorCoreProductPrices(createProduct(), [
      invalid,
      valid,
    ])

    expect(result).toBe(false)
    expect(mocks.planEnsure).toHaveBeenCalledTimes(1)
    expect(mocks.priceEnsure).toHaveBeenCalledTimes(1)
    expect(mocks.priceEnsure).toHaveBeenCalledWith(
      expect.objectContaining({ entitlementReferenceId: 'prc_valid' })
    )
  })

  it('continues after a plan ensure failure', async () => {
    mocks.planEnsure.mockResolvedValue({
      data: null,
      error: { message: 'Plan unavailable.' },
    })

    const result = await mirrorCoreProductPrices(createProduct(), [
      createPrice(),
    ])

    expect(result).toBe(false)
    expect(mocks.priceEnsure).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(
      '[console.billing.mirror] plan ensure failed:',
      'prd_core_1',
      'Plan unavailable.'
    )
  })

  it('reports a price ensure failure', async () => {
    mocks.priceEnsure.mockResolvedValue({
      data: null,
      error: { message: 'Price unavailable.' },
    })

    const result = await mirrorCoreProductPrices(createProduct(), [
      createPrice(),
    ])

    expect(result).toBe(false)
    expect(console.error).toHaveBeenCalledWith(
      '[console.billing.mirror] price ensure failed:',
      'prc_core_1',
      'Price unavailable.'
    )
  })

  it('falls back through source app identifiers for product identity', async () => {
    const product = createProduct({ app_slug: null, app_name: null })

    const result = await mirrorCoreProductPrices(product, [])

    expect(result).toBe(true)
    expect(mocks.productEnsure).toHaveBeenCalledWith({
      sourceAppId: 'rap_billing',
      slug: 'rap_billing',
      name: 'rap_billing',
      description: null,
      active: true,
    })
  })

  it('uses the app slug when the source app name is missing', async () => {
    const product = createProduct({ app_name: null })

    const result = await mirrorCoreProductPrices(product, [])

    expect(result).toBe(true)
    expect(mocks.productEnsure).toHaveBeenCalledWith(
      expect.objectContaining({ slug: '876-billing', name: '876-billing' })
    )
  })
})

describe('mirrorCoreSubscription edge cases', () => {
  beforeEach(() => {
    setUpMocks()
  })

  it('rejects a subscription without items before reading dependencies', async () => {
    const result = await mirrorCoreSubscription(
      createSubscription({ items: [] })
    )

    expect(result).toBe(false)
    expect(mocks.orgRetrieve).not.toHaveBeenCalled()
    expect(mocks.productRetrieve).not.toHaveBeenCalled()
    expect(mocks.customerEnsure).not.toHaveBeenCalled()
  })

  it('rejects items without product references', async () => {
    const subscription = createSubscription({
      items: [
        {
          ...createSubscription().items[0],
          product_id: null,
        },
      ],
    })

    const result = await mirrorCoreSubscription(subscription)

    expect(result).toBe(false)
    expect(mocks.productRetrieve).not.toHaveBeenCalled()
    expect(mocks.customerEnsure).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(
      '[console.billing.mirror] subscription items have no products:',
      'sub_core_1'
    )
  })

  it.each([
    { data: null, error: { message: 'Product missing.' } },
    { data: null, error: null },
  ])(
    'stops when a referenced product cannot be retrieved %#',
    async (failure) => {
      mocks.productRetrieve.mockResolvedValue(failure)

      const result = await mirrorCoreSubscription(createSubscription())

      expect(result).toBe(false)
      expect(mocks.customerEnsure).not.toHaveBeenCalled()
      expect(mocks.subscriptionEnsure).not.toHaveBeenCalled()
      expect(console.error).toHaveBeenCalledTimes(1)
    }
  )

  it('stops when a product has none of the referenced prices', async () => {
    mocks.productRetrieve.mockResolvedValue(
      success(createProduct({ prices: [createPrice({ id: 'prc_other' })] }))
    )

    const result = await mirrorCoreSubscription(createSubscription())

    expect(result).toBe(false)
    expect(mocks.productEnsure).not.toHaveBeenCalled()
    expect(mocks.customerEnsure).not.toHaveBeenCalled()
  })

  it('deduplicates product retrieval while retaining every subscription item', async () => {
    const firstItem = createSubscription().items[0]
    const subscription = createSubscription({
      items: [firstItem, { ...firstItem, id: 'sbi_2', quantity: 3 }],
    })

    const result = await mirrorCoreSubscription(subscription)

    expect(result).toBe(true)
    expect(mocks.productRetrieve).toHaveBeenCalledTimes(1)
    expect(mocks.productRetrieve).toHaveBeenCalledWith('prd_core_1')
    expect(mocks.subscriptionEnsure).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          { priceEntitlementReferenceId: 'prc_core_1', quantity: 1 },
          { priceEntitlementReferenceId: 'prc_core_1', quantity: 3 },
        ],
      })
    )
  })

  it('falls back to organization ID when organization data is unavailable', async () => {
    mocks.orgRetrieve.mockResolvedValue({ data: null, error: null })

    const result = await mirrorCoreSubscription(createSubscription())

    expect(result).toBe(true)
    expect(mocks.customerEnsure).toHaveBeenCalledWith({
      organizationId: 'org_1',
      name: 'org_1',
    })
  })

  it('stops when the Billing customer cannot be ensured', async () => {
    mocks.customerEnsure.mockResolvedValue({
      data: null,
      error: { message: 'Customer unavailable.' },
    })

    const result = await mirrorCoreSubscription(createSubscription())

    expect(result).toBe(false)
    expect(mocks.subscriptionEnsure).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledWith(
      '[console.billing.mirror] customer ensure failed:',
      'org_1',
      'Customer unavailable.'
    )
  })

  it('reports a subscription ensure failure', async () => {
    mocks.subscriptionEnsure.mockResolvedValue({
      data: null,
      error: { message: 'Subscription unavailable.' },
    })

    const result = await mirrorCoreSubscription(createSubscription())

    expect(result).toBe(false)
    expect(console.error).toHaveBeenCalledWith(
      '[console.billing.mirror] subscription ensure failed:',
      'sub_core_1',
      'Subscription unavailable.'
    )
  })

  it.each([
    ['trialing', 'TRIALING'],
    ['paused', 'PAUSED'],
    ['blocked', 'PAUSED'],
    ['canceled', 'CANCELED'],
    ['incomplete', 'DRAFT'],
    ['incomplete_expired', 'DRAFT'],
    ['active', 'ACTIVE'],
  ] as const)('maps %s status to %s', async (status, expected) => {
    const result = await mirrorCoreSubscription(createSubscription({ status }))

    expect(result).toBe(true)
    expect(mocks.subscriptionEnsure).toHaveBeenCalledWith(
      expect.objectContaining({ status: expected })
    )
  })

  it('falls back to creation time when the start date is absent', async () => {
    const result = await mirrorCoreSubscription(
      createSubscription({ start_date: null, created_at: 321 })
    )

    expect(result).toBe(true)
    expect(mocks.subscriptionEnsure).toHaveBeenCalledWith(
      expect.objectContaining({ startAt: 321 })
    )
  })
})

describe('mirrorCoreSubscriptionById', () => {
  beforeEach(() => {
    setUpMocks()
  })

  it.each([
    { data: null, error: { message: 'Subscription missing.' } },
    { data: null, error: null },
  ])('returns false when subscription retrieval fails %#', async (failure) => {
    mocks.subscriptionRetrieve.mockResolvedValue(failure)

    const result = await mirrorCoreSubscriptionById('sub_missing')

    expect(result).toBe(false)
    expect(mocks.subscriptionRetrieve).toHaveBeenCalledTimes(1)
    expect(mocks.subscriptionRetrieve).toHaveBeenCalledWith('sub_missing')
    expect(mocks.productRetrieve).not.toHaveBeenCalled()
    expect(console.error).toHaveBeenCalledTimes(1)
  })

  it('retrieves and mirrors a subscription', async () => {
    const result = await mirrorCoreSubscriptionById('sub_core_1')

    expect(result).toBe(true)
    expect(mocks.subscriptionRetrieve).toHaveBeenCalledTimes(1)
    expect(mocks.subscriptionRetrieve).toHaveBeenCalledWith('sub_core_1')
    expect(mocks.subscriptionEnsure).toHaveBeenCalledTimes(1)
    expect(mocks.subscriptionEnsure).toHaveBeenCalledWith(
      expect.objectContaining({ externalReference: 'sub_core_1' })
    )
  })
})
