import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

import { ensure } from './ensure'

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

function createParams(overrides = {}) {
  return {
    externalReference: 'sub_core1',
    sourceAppId: 'rap_1',
    customerId: 'blcus_1',
    items: [{ priceEntitlementReferenceId: 'prc_core1', quantity: 1 }],
    status: 'ACTIVE' as const,
    startAt: 1752000000,
    cancelAtPeriodEnd: false,
    ...overrides,
  }
}

describe('ensure (subscription)', () => {
  let txSubscriptionCreate: ReturnType<typeof vi.fn>
  let txSubscriptionUpdate: ReturnType<typeof vi.fn>
  let txSubscriptionItemDeleteMany: ReturnType<typeof vi.fn>
  let txSubscriptionItemCreateMany: ReturnType<typeof vi.fn>
  let txSubscriptionEventCreate: ReturnType<typeof vi.fn>
  let tx: Record<string, unknown>

  beforeEach(() => {
    txSubscriptionCreate = vi.fn().mockResolvedValue({ id: 'blsub_new' })
    txSubscriptionUpdate = vi.fn().mockResolvedValue({ id: 'blsub_existing' })
    txSubscriptionItemDeleteMany = vi.fn().mockResolvedValue({ count: 1 })
    txSubscriptionItemCreateMany = vi.fn().mockResolvedValue({ count: 1 })
    txSubscriptionEventCreate = vi.fn().mockResolvedValue({ id: 'blevt_1' })
    tx = {
      subscription: {
        create: txSubscriptionCreate,
        update: txSubscriptionUpdate,
      },
      subscriptionItem: {
        deleteMany: txSubscriptionItemDeleteMany,
        createMany: txSubscriptionItemCreateMany,
      },
      subscriptionEvent: {
        create: txSubscriptionEventCreate,
      },
    }

    mockPrismaRef.current = {
      subscription: { findFirst: vi.fn() },
      price: { findMany: vi.fn() },
      customer: { findFirst: vi.fn() },
      paymentTerm: { findFirst: vi.fn().mockResolvedValue(null) },
      subscriptionPreference: { findUnique: vi.fn().mockResolvedValue(null) },
      promotionCode: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn(tx)
      ),
    } as unknown as Record<string, unknown>

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns an already synchronized subscription without writing', async () => {
    const prisma = mockPrismaRef.current as {
      subscription: { findFirst: ReturnType<typeof vi.fn> }
      price: { findMany: ReturnType<typeof vi.fn> }
      $transaction: ReturnType<typeof vi.fn>
    }
    prisma.subscription.findFirst.mockResolvedValue({
      id: 'blsub_existing',
      customerId: 'blcus_1',
      sourceAppId: 'rap_1',
      status: 'ACTIVE',
      startAt: 1752000000,
      cancelAtPeriodEnd: false,
      items: [
        {
          quantity: 1,
          price: { entitlementReferenceId: 'prc_core1' },
        },
      ],
    })
    prisma.price.findMany.mockResolvedValue([
      {
        id: 'blprc_1',
        planId: 'blplan_1',
        entitlementReferenceId: 'prc_core1',
        unitAmount: 4900n,
        currency: 'USD',
        priceType: 'RECURRING',
        intervalUnit: 'MONTH',
        intervalCount: 1,
      },
    ])

    const params = createParams()
    const result = await ensure('blten_1', params)

    expect(result.data).toEqual({ id: 'blsub_existing' })
    expect(result.error).toBeNull()
    expect(prisma.price.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('atomically reconciles fields and line items on an existing subscription', async () => {
    const prisma = mockPrismaRef.current as {
      subscription: { findFirst: ReturnType<typeof vi.fn> }
      price: { findMany: ReturnType<typeof vi.fn> }
      $transaction: ReturnType<typeof vi.fn>
    }
    prisma.subscription.findFirst.mockResolvedValue({
      id: 'blsub_existing',
      customerId: 'blcus_old',
      sourceAppId: 'rap_old',
      status: 'PAUSED',
      startAt: 1,
      cancelAtPeriodEnd: true,
      items: [
        {
          quantity: 1,
          price: { entitlementReferenceId: 'prc_old' },
        },
      ],
    })
    prisma.price.findMany.mockResolvedValue([
      {
        id: 'blprc_1',
        planId: 'blplan_1',
        entitlementReferenceId: 'prc_core1',
        unitAmount: 4900n,
        currency: 'USD',
        priceType: 'RECURRING',
        intervalUnit: 'MONTH',
        intervalCount: 1,
      },
    ])

    const result = await ensure('blten_1', createParams())

    expect(result.data).toEqual({ id: 'blsub_existing' })
    expect(txSubscriptionUpdate).toHaveBeenCalledTimes(1)
    expect(txSubscriptionItemDeleteMany).toHaveBeenCalledTimes(1)
    expect(txSubscriptionItemCreateMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          subscriptionId: 'blsub_existing',
          priceId: 'blprc_1',
          unitAmount: 4900n,
        }),
      ],
    })
    expect(txSubscriptionEventCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ type: 'ENTITLEMENT_SYNCED' }),
    })
  })

  it('returns 422 error when price refs are not yet mirrored to Billing', async () => {
    const prisma = mockPrismaRef.current as {
      subscription: { findFirst: ReturnType<typeof vi.fn> }
      price: { findMany: ReturnType<typeof vi.fn> }
      $transaction: ReturnType<typeof vi.fn>
    }
    prisma.subscription.findFirst.mockResolvedValue(null)
    // ensure's own findMany returns empty — price not mirrored
    prisma.price.findMany.mockResolvedValue([])

    const params = createParams()
    const result = await ensure('blten_1', params)

    expect(result.data).toBeNull()
    expect(result.error).toBe(
      'One or more prices have not been mirrored to Billing yet.'
    )
    expect((result as { status?: number }).status).toBe(422)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('rejects an item-only recurring subscription', async () => {
    const prisma = mockPrismaRef.current as {
      subscription: { findFirst: ReturnType<typeof vi.fn> }
      price: { findMany: ReturnType<typeof vi.fn> }
      customer: { findFirst: ReturnType<typeof vi.fn> }
      $transaction: ReturnType<typeof vi.fn>
    }
    prisma.subscription.findFirst.mockResolvedValue(null)
    prisma.price.findMany.mockResolvedValue([
      {
        id: 'blprc_item',
        planId: null,
        entitlementReferenceId: 'prc_core1',
        unitAmount: 4900n,
        currency: 'USD',
        priceType: 'RECURRING',
        intervalUnit: 'MONTH',
        intervalCount: 1,
      },
    ])

    const result = await ensure('blten_1', createParams())

    expect(result.data).toBeNull()
    expect(result.error).toBe('A subscription requires exactly one plan price.')
    expect((result as { status?: number }).status).toBe(422)
    expect(prisma.customer.findFirst).not.toHaveBeenCalled()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('creates subscription successfully on happy path', async () => {
    const prisma = mockPrismaRef.current as {
      subscription: { findFirst: ReturnType<typeof vi.fn> }
      price: { findMany: ReturnType<typeof vi.fn> }
      customer: { findFirst: ReturnType<typeof vi.fn> }
      $transaction: ReturnType<typeof vi.fn>
    }
    prisma.subscription.findFirst.mockResolvedValue(null)

    // ensure's ref-resolution findMany (first call)
    prisma.price.findMany
      .mockResolvedValueOnce([
        {
          id: 'blprc_1',
          planId: 'blplan_1',
          entitlementReferenceId: 'prc_core1',
          unitAmount: 4900n,
          currency: 'USD',
          priceType: 'RECURRING',
          intervalUnit: 'MONTH',
          intervalCount: 1,
        },
      ])
      // create's price load findMany (second call)
      .mockResolvedValueOnce([
        {
          id: 'blprc_1',
          planId: 'blplan_1',
          currency: 'USD',
          unitAmount: 4900n,
          priceType: 'RECURRING',
          intervalUnit: 'MONTH',
          intervalCount: 1,
          plan: {
            id: 'blplan_1',
            productId: 'blprod_1',
            trialDays: 0,
            addonAssociations: [],
          },
          addon: null,
        },
      ])

    prisma.customer.findFirst.mockResolvedValue({ id: 'blcus_1' })
    txSubscriptionCreate.mockResolvedValue({ id: 'blsub_new' })

    const params = createParams()
    const result = await ensure('blten_1', params)

    expect(result.data).toEqual({ id: 'blsub_new' })
    expect(result.error).toBeNull()
    expect(txSubscriptionCreate).toHaveBeenCalledTimes(1)
    const createData = txSubscriptionCreate.mock.calls[0][0].data
    expect(createData).toEqual(
      expect.objectContaining({
        externalReference: 'sub_core1',
        sourceAppId: 'rap_1',
        status: 'ACTIVE',
      })
    )
  })

  it('handles P2002 race from $transaction by returning the race winner', async () => {
    const prisma = mockPrismaRef.current as {
      subscription: { findFirst: ReturnType<typeof vi.fn> }
      price: { findMany: ReturnType<typeof vi.fn> }
      customer: { findFirst: ReturnType<typeof vi.fn> }
      $transaction: ReturnType<typeof vi.fn>
    }
    // ensure's initial findFirst → null
    // ensure's re-lookup findFirst (after catch) → race winner
    prisma.subscription.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'blsub_won' })

    prisma.price.findMany
      .mockResolvedValueOnce([
        {
          id: 'blprc_1',
          planId: 'blplan_1',
          entitlementReferenceId: 'prc_core1',
          unitAmount: 4900n,
          currency: 'USD',
          priceType: 'RECURRING',
          intervalUnit: 'MONTH',
          intervalCount: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'blprc_1',
          planId: 'blplan_1',
          currency: 'USD',
          unitAmount: 4900n,
          priceType: 'RECURRING',
          intervalUnit: 'MONTH',
          intervalCount: 1,
          plan: {
            id: 'blplan_1',
            productId: 'blprod_1',
            trialDays: 0,
            addonAssociations: [],
          },
          addon: null,
        },
      ])

    prisma.customer.findFirst.mockResolvedValue({ id: 'blcus_1' })
    // $transaction rejects with P2002
    prisma.$transaction.mockRejectedValue({ code: 'P2002' })

    const params = createParams()
    const result = await ensure('blten_1', params)

    expect(result.data).toEqual({ id: 'blsub_won' })
    expect(result.error).toBeNull()
  })

  it('returns 500 error on non-P2002 throw from $transaction and logs the error', async () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => {})

    const prisma = mockPrismaRef.current as {
      subscription: { findFirst: ReturnType<typeof vi.fn> }
      price: { findMany: ReturnType<typeof vi.fn> }
      customer: { findFirst: ReturnType<typeof vi.fn> }
      $transaction: ReturnType<typeof vi.fn>
    }
    prisma.subscription.findFirst.mockResolvedValue(null)

    prisma.price.findMany
      .mockResolvedValueOnce([
        {
          id: 'blprc_1',
          planId: 'blplan_1',
          entitlementReferenceId: 'prc_core1',
          unitAmount: 4900n,
          currency: 'USD',
          priceType: 'RECURRING',
          intervalUnit: 'MONTH',
          intervalCount: 1,
        },
      ])
      .mockResolvedValueOnce([
        {
          id: 'blprc_1',
          planId: 'blplan_1',
          currency: 'USD',
          unitAmount: 4900n,
          priceType: 'RECURRING',
          intervalUnit: 'MONTH',
          intervalCount: 1,
          plan: {
            id: 'blplan_1',
            productId: 'blprod_1',
            trialDays: 0,
            addonAssociations: [],
          },
          addon: null,
        },
      ])

    prisma.customer.findFirst.mockResolvedValue({ id: 'blcus_1' })
    prisma.$transaction.mockRejectedValue(new Error('boom'))

    const params = createParams()
    const result = await ensure('blten_1', params)

    expect(result.data).toBeNull()
    expect(result.error).toBe('Failed to create the subscription.')
    expect((result as { status?: number }).status).toBe(500)
    expect(consoleErrorSpy).toHaveBeenCalledTimes(1)
  })
})
