import { beforeEach, describe, expect, it, vi } from 'vitest'

const NOW = 150
const mocks = vi.hoisted(() => ({
  prisma: {
    subscription: { findFirst: vi.fn() },
    subscriptionAmendment: { findMany: vi.fn(), updateMany: vi.fn() },
    price: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
  invalidateAdvanceInvoices: vi.fn(),
  createSubscriptionCredit: vi.fn(),
  invoiceUnbilledCharges: vi.fn(),
}))

vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => NOW }))
vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }))
vi.mock('@/lib/id', () => ({
  generateId: (entity: string) => `${entity.toLowerCase()}_1`,
}))
vi.mock('./advance-invoices', () => ({
  AdvanceInvoiceConflict: class AdvanceInvoiceConflict extends Error {},
  invalidateAdvanceInvoices: mocks.invalidateAdvanceInvoices,
}))
vi.mock('./credits', () => ({
  createSubscriptionCredit: mocks.createSubscriptionCredit,
}))
vi.mock('./charges', () => ({
  invoiceUnbilledCharges: mocks.invoiceUnbilledCharges,
}))

import { createAmendment, processDueAmendments } from './amendments'

function price(unitAmount = 20_000n) {
  return {
    id: 'prc_new',
    planId: 'plan_1',
    addonId: null,
    itemId: null,
    nickname: 'Growth monthly',
    currency: 'JMD',
    unitAmount,
    priceType: 'RECURRING',
    intervalUnit: 'MONTH',
    intervalCount: 1,
    isActive: true,
    tiers: [],
    plan: {
      id: 'plan_1',
      name: 'Growth',
      productId: 'product_1',
      addonAssociations: [],
    },
    addon: null,
    item: null,
  }
}

function selectedSubscription(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: 'sub_1',
    status: 'ACTIVE',
    currentPeriodEnd: 300,
    servicePeriodEnd: 200,
    collectionMethod: 'SEND_INVOICE',
    billingTiming: 'IN_ADVANCE',
    paymentTermId: null,
    taxBehavior: 'EXCLUSIVE',
    invoiceModeOverride: null,
    renewalPricingPolicy: 'RETAIN_EXISTING',
    renewalAdjustmentPercent: null,
    billingCycleAnchor: 100,
    remainingCycles: null,
    ...overrides,
  }
}

function params(timing: 'IMMEDIATE' | 'END_OF_TERM') {
  return {
    timing,
    effectiveAt: null,
    items: [{ priceId: 'prc_new', quantity: 1 }],
    prorationBehavior: 'CREATE_PRORATIONS' as const,
    paymentFailureBehavior: 'PREVENT_CHANGE' as const,
  }
}

describe('subscription amendments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prisma.price.findMany.mockResolvedValue([price()])
    mocks.invalidateAdvanceInvoices.mockResolvedValue(undefined)
    mocks.createSubscriptionCredit.mockResolvedValue('credit_1')
  })

  it('schedules end-of-term changes at the actual service-period end', async () => {
    mocks.prisma.subscription.findFirst.mockResolvedValue(
      selectedSubscription()
    )
    const tx = {
      subscriptionAmendment: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({}),
      },
      subscriptionEvent: { create: vi.fn().mockResolvedValue({}) },
    }
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      createAmendment('ten_1', 'sub_1', params('END_OF_TERM'))
    ).resolves.toEqual({
      data: { id: 'subscriptionamendment_1', applied: false },
      error: null,
    })
    expect(tx.subscriptionAmendment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ effectiveAt: 200, status: 'PENDING' }),
    })
  })

  it('credits the elapsed price difference for an arrears change', async () => {
    mocks.prisma.subscription.findFirst.mockResolvedValue(
      selectedSubscription({
        currentPeriodEnd: 200,
        billingTiming: 'IN_ARREARS',
      })
    )
    const amendment = {
      id: 'subscriptionamendment_1',
      tenantId: 'ten_1',
      subscriptionId: 'sub_1',
      prorationBehavior: 'CREATE_PRORATIONS',
      paymentFailureBehavior: 'PREVENT_CHANGE',
      collectionMethod: 'SEND_INVOICE',
      billingTiming: 'IN_ARREARS',
      paymentTermId: null,
      taxBehavior: 'EXCLUSIVE',
      invoiceModeOverride: null,
      renewalPricingPolicy: 'RETAIN_EXISTING',
      renewalAdjustmentPercent: null,
      billingCycleAnchor: 100,
      remainingCycles: null,
      requestedByUserId: null,
      reason: null,
      items: [
        {
          id: 'amendment_item_1',
          priceId: 'prc_new',
          position: 0,
          quantity: 1,
          unitAmount: 20_000n,
          currency: 'JMD',
          description: 'Growth',
          price: price(),
        },
      ],
      subscription: {
        id: 'sub_1',
        tenantId: 'ten_1',
        customerId: 'cus_1',
        status: 'ACTIVE',
        deletedAt: null,
        billingTiming: 'IN_ARREARS',
        currentPeriodStart: 100,
        currentPeriodEnd: 200,
        servicePeriodStart: 100,
        servicePeriodEnd: 200,
        taxBehavior: 'EXCLUSIVE',
        items: [
          {
            id: 'item_old',
            quantity: 1,
            unitAmount: 10_000n,
            currency: 'JMD',
          },
        ],
      },
    }
    const tx = {
      subscriptionAmendment: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({}),
        findUniqueOrThrow: vi.fn().mockResolvedValue(amendment),
        update: vi.fn().mockResolvedValue({}),
      },
      subscriptionItem: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      subscription: { update: vi.fn().mockResolvedValue({}) },
      subscriptionCharge: { create: vi.fn().mockResolvedValue({}) },
      subscriptionEvent: { create: vi.fn().mockResolvedValue({}) },
    }
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      createAmendment('ten_1', 'sub_1', params('IMMEDIATE'))
    ).resolves.toEqual({
      data: { id: 'subscriptionamendment_1', applied: true },
      error: null,
    })
    expect(mocks.createSubscriptionCredit).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({ amount: 5_000n, source: 'PRORATION' })
    )
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_1' },
      data: expect.objectContaining({
        currentPeriodStart: 100,
        currentPeriodEnd: 200,
        nextBillingAt: 200,
      }),
    })
    expect(tx.subscriptionCharge.create).not.toHaveBeenCalled()
  })

  it('prorates scheduled changes at their effective time when processing is delayed', async () => {
    mocks.prisma.subscriptionAmendment.findMany.mockResolvedValue([
      { id: 'amendment_1', effectiveAt: 125 },
    ])
    const amendment = {
      id: 'amendment_1',
      tenantId: 'ten_1',
      subscriptionId: 'sub_1',
      prorationBehavior: 'CREATE_PRORATIONS',
      paymentFailureBehavior: 'APPLY_CHANGE',
      collectionMethod: 'SEND_INVOICE',
      billingTiming: 'IN_ADVANCE',
      paymentTermId: null,
      taxBehavior: 'EXCLUSIVE',
      invoiceModeOverride: null,
      renewalPricingPolicy: 'RETAIN_EXISTING',
      renewalAdjustmentPercent: null,
      billingCycleAnchor: 100,
      remainingCycles: null,
      requestedByUserId: null,
      reason: null,
      items: [
        {
          id: 'amendment_item_1',
          priceId: 'prc_new',
          position: 0,
          quantity: 1,
          unitAmount: 20_000n,
          currency: 'JMD',
          description: 'Growth',
          price: price(),
        },
      ],
      subscription: {
        id: 'sub_1',
        tenantId: 'ten_1',
        customerId: 'cus_1',
        status: 'ACTIVE',
        deletedAt: null,
        billingTiming: 'IN_ADVANCE',
        currentPeriodStart: 200,
        currentPeriodEnd: 300,
        servicePeriodStart: 100,
        servicePeriodEnd: 200,
        taxBehavior: 'EXCLUSIVE',
        items: [
          {
            id: 'item_old',
            quantity: 1,
            unitAmount: 10_000n,
            currency: 'JMD',
          },
        ],
      },
    }
    const tx = {
      subscriptionAmendment: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: vi.fn().mockResolvedValue(amendment),
        update: vi.fn().mockResolvedValue({}),
      },
      subscriptionItem: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      subscription: { update: vi.fn().mockResolvedValue({}) },
      subscriptionCharge: { create: vi.fn().mockResolvedValue({}) },
      subscriptionEvent: { create: vi.fn().mockResolvedValue({}) },
    }
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(processDueAmendments('ten_1', 175)).resolves.toEqual({
      object: 'subscription_amendment_run',
      applied: 1,
    })
    expect(tx.subscriptionCharge.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        unitAmount: 7_500n,
        serviceAt: 125,
        createdAt: 175,
      }),
    })
    expect(tx.subscriptionItem.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ startsAt: 125, createdAt: 175 })],
    })
  })
})
