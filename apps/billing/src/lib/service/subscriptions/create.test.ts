import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from './create'

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

function createParams(
  items: Array<{ priceId: string; quantity: number }> = [
    { priceId: 'blprc_plan', quantity: 1 },
  ]
) {
  return {
    customerId: 'blcus_1',
    items,
    status: 'ACTIVE' as const,
    startAt: 1_752_000_000,
    collectionMethod: 'SEND_INVOICE' as const,
    billingTiming: 'IN_ADVANCE' as const,
    prorationBehavior: 'CREATE_PRORATIONS' as const,
    autoApplyCredits: true,
  }
}

describe('create (subscription)', () => {
  let txSubscriptionCreate: ReturnType<typeof vi.fn>

  beforeEach(() => {
    txSubscriptionCreate = vi.fn().mockResolvedValue({ id: 'blsub_new' })
    mockPrismaRef.current = {
      customer: { findFirst: vi.fn().mockResolvedValue({ id: 'blcus_1' }) },
      paymentTerm: { findFirst: vi.fn().mockResolvedValue(null) },
      subscriptionPreference: { findUnique: vi.fn().mockResolvedValue(null) },
      promotionCode: { findFirst: vi.fn().mockResolvedValue(null) },
      price: { findMany: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({ subscription: { create: txSubscriptionCreate } })
      ),
    } as unknown as Record<string, unknown>

    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('rejects an item-only recurring subscription', async () => {
    const prisma = mockPrismaRef.current as {
      price: { findMany: ReturnType<typeof vi.fn> }
      $transaction: ReturnType<typeof vi.fn>
    }
    prisma.price.findMany.mockResolvedValue([
      {
        id: 'blprc_item',
        planId: null,
        currency: 'JMD',
        unitAmount: 2_500n,
        priceType: 'RECURRING',
        intervalUnit: 'MONTH',
        intervalCount: 1,
        plan: null,
      },
    ])

    const result = await create(
      'blten_1',
      createParams([{ priceId: 'blprc_item', quantity: 1 }])
    )

    expect(result.data).toBeNull()
    expect(result.error).toBe('A subscription requires exactly one plan price.')
    expect((result as { status?: number }).status).toBe(422)
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('allows item-backed recurring prices as add-ons to a plan price', async () => {
    const prisma = mockPrismaRef.current as {
      price: { findMany: ReturnType<typeof vi.fn> }
    }
    prisma.price.findMany.mockResolvedValue([
      {
        id: 'blprc_plan',
        planId: 'blplan_1',
        currency: 'JMD',
        unitAmount: 5_000n,
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
      {
        id: 'blprc_item',
        planId: null,
        currency: 'JMD',
        unitAmount: 2_500n,
        priceType: 'RECURRING',
        intervalUnit: 'MONTH',
        intervalCount: 1,
        plan: null,
        addon: null,
      },
    ])

    const result = await create(
      'blten_1',
      createParams([
        { priceId: 'blprc_plan', quantity: 1 },
        { priceId: 'blprc_item', quantity: 2 },
      ])
    )

    expect(result.data).toEqual({ id: 'blsub_new' })
    expect(result.error).toBeNull()
    expect(txSubscriptionCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        items: {
          create: [
            expect.objectContaining({
              priceId: 'blprc_plan',
              quantity: 1,
            }),
            expect.objectContaining({
              priceId: 'blprc_item',
              quantity: 2,
            }),
          ],
        },
      }),
    })
  })

  it('rechecks redemption counters after locking coupon rows', async () => {
    const prisma = mockPrismaRef.current as {
      price: { findMany: ReturnType<typeof vi.fn> }
      promotionCode: { findFirst: ReturnType<typeof vi.fn> }
      $transaction: ReturnType<typeof vi.fn>
    }
    prisma.price.findMany.mockResolvedValue([
      {
        id: 'blprc_plan',
        planId: 'blplan_1',
        addonId: null,
        currency: 'JMD',
        unitAmount: 5_000n,
        priceType: 'RECURRING',
        intervalUnit: 'MONTH',
        intervalCount: 1,
        plan: {
          id: 'blplan_1',
          name: 'Pro',
          productId: 'blprod_1',
          trialDays: 0,
          billingCycleCount: null,
          addonAssociations: [],
        },
        addon: null,
        item: null,
      },
    ])
    prisma.promotionCode.findFirst.mockResolvedValue({
      id: 'blpromo_1',
      code: 'SAVE10',
      customerId: null,
      expiresAt: null,
      maxRedemptions: 1,
      timesRedeemed: 0,
      isActive: true,
      coupon: {
        id: 'blcoupon_1',
        productId: null,
        discountType: 'PERCENTAGE',
        percentOff: 10,
        amountOff: null,
        currency: null,
        duration: 'ONCE',
        durationInCycles: null,
        isActive: true,
        redeemBy: null,
        maxRedemptions: 1,
        timesRedeemed: 0,
        maxRedemptionsPerCustomer: null,
        eligibleForAllCustomers: true,
        appliesToAllPlans: true,
        appliesToAllRecurringAddons: true,
        currencyAmounts: [],
        planApplicabilities: [],
        addonApplicabilities: [],
        customerEligibilities: [],
      },
    })
    prisma.$transaction.mockImplementation(
      async (fn: (tx: unknown) => Promise<unknown>) =>
        fn({
          coupon: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            findUnique: vi.fn().mockResolvedValue({
              timesRedeemed: 2,
              maxRedemptions: 1,
              maxRedemptionsPerCustomer: null,
              redeemBy: null,
            }),
          },
          promotionCode: {
            updateMany: vi.fn().mockResolvedValue({ count: 1 }),
            findUnique: vi.fn().mockResolvedValue({
              timesRedeemed: 1,
              maxRedemptions: 1,
              expiresAt: null,
            }),
          },
          couponRedemption: { count: vi.fn().mockResolvedValue(0) },
          subscription: { create: txSubscriptionCreate },
        })
    )

    const result = await create('blten_1', {
      ...createParams(),
      promotionCode: 'SAVE10',
    })

    expect(result).toEqual({
      data: null,
      error:
        'The promotion code reached a redemption limit or is no longer active.',
      status: 422,
    })
    expect(txSubscriptionCreate).not.toHaveBeenCalled()
  })
})
