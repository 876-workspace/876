import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: {
    $transaction: vi.fn(),
    subscription: { findFirst: vi.fn() },
    subscriptionBillingRun: {
      create: vi.fn(),
      updateMany: vi.fn(),
    },
  },
  recordLedgerEntry: vi.fn(),
  recomputeCustomerAr: vi.fn(),
  settleWithAvailableCredits: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }))
vi.mock('@/lib/id', () => ({
  generateId: (entity: string) => `${entity.toLowerCase()}_1`,
}))
vi.mock('../documents/numbers', () => ({
  nextDocumentNumber: vi.fn().mockResolvedValue('INV-0001'),
}))
vi.mock('../ledger', () => ({
  recordLedgerEntry: mocks.recordLedgerEntry,
}))
vi.mock('../customers/ar', () => ({
  recomputeCustomerAr: mocks.recomputeCustomerAr,
}))
vi.mock('../invoices/settlement', () => ({
  settleWithAvailableCredits: mocks.settleWithAvailableCredits,
}))

import { billSubscription } from './bill'

const JANUARY_31 = Date.UTC(2024, 0, 31, 12) / 1000
const FEBRUARY_29 = Date.UTC(2024, 1, 29, 12) / 1000
const MARCH_31 = Date.UTC(2024, 2, 31, 12) / 1000

function subscription() {
  return {
    id: 'sub_1',
    tenantId: 'ten_1',
    customerId: 'cus_1',
    status: 'ACTIVE',
    nextBillingAt: JANUARY_31,
    currentPeriodStart: JANUARY_31,
    currentPeriodEnd: FEBRUARY_29,
    servicePeriodStart: JANUARY_31,
    servicePeriodEnd: FEBRUARY_29,
    billingCycleAnchor: JANUARY_31,
    billedCycleCount: 0,
    completedRegularCycles: 0,
    hasInitialStubPeriod: false,
    billingTiming: 'IN_ADVANCE',
    autoApplyCredits: false,
    nextAdvanceInvoiceAt: null,
    taxBehavior: 'EXCLUSIVE',
    invoiceModeOverride: null,
    renewalPricingPolicy: 'RETAIN_EXISTING',
    renewalAdjustmentPercent: null,
    remainingCycles: null,
    advanceBillingEnabled: false,
    advanceBillingDays: null,
    customer: {
      id: 'cus_1',
      paymentTermId: null,
      salespersonId: null,
    },
    paymentTerm: {
      id: 'pterm_1',
      name: 'Due on Receipt',
      rule: 'DUE_ON_RECEIPT',
      dueDays: 0,
    },
    discounts: [],
    charges: [],
    amendments: [],
    items: [
      {
        id: 'si_1',
        priceId: 'prc_1',
        unitAmount: 10_000n,
        currency: 'JMD',
        quantity: 1,
        price: {
          id: 'prc_1',
          itemId: null,
          nickname: 'Monthly service',
          intervalUnit: 'MONTH',
          intervalCount: 1,
          isTaxable: false,
          item: null,
          plan: {
            name: 'Standard',
            isTaxable: false,
            billingCycleCount: null,
            product: { id: 'prod_1' },
          },
        },
      },
    ],
  }
}

describe('billSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.prisma.subscriptionBillingRun.updateMany.mockResolvedValue({
      count: 0,
    })
  })

  it('creates one invoice and preserves a month-end billing anchor', async () => {
    const tx = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue(subscription()),
        update: vi.fn().mockResolvedValue({}),
      },
      subscriptionBillingRun: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      subscriptionPreference: { findUnique: vi.fn().mockResolvedValue(null) },
      taxRate: { findFirst: vi.fn().mockResolvedValue(null) },
      paymentTerm: { findFirst: vi.fn() },
      invoice: {
        create: vi
          .fn()
          .mockResolvedValue({ id: 'invoice_1', amountDue: 10_000n }),
      },
      invoiceSubscription: { create: vi.fn().mockResolvedValue({}) },
      subscriptionCharge: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      subscriptionDiscount: { update: vi.fn() },
      subscriptionEvent: { create: vi.fn().mockResolvedValue({}) },
    }
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      billSubscription('ten_1', 'sub_1', JANUARY_31)
    ).resolves.toEqual({ status: 'succeeded', invoiceId: 'invoice_1' })
    expect(tx.invoice.create).toHaveBeenCalledTimes(1)
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_1' },
      data: expect.objectContaining({
        currentPeriodStart: FEBRUARY_29,
        currentPeriodEnd: MARCH_31,
        servicePeriodStart: JANUARY_31,
        servicePeriodEnd: FEBRUARY_29,
        nextBillingAt: FEBRUARY_29,
        billedCycleCount: 1,
        completedRegularCycles: 1,
        hasInitialStubPeriod: false,
      }),
    })
    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        type: 'INVOICE_FINALIZED',
        direction: 'DEBIT',
        amount: 10_000n,
      })
    )
  })

  it('moves an arrears subscription into the next active service period', async () => {
    const arrearsSubscription = {
      ...subscription(),
      billingTiming: 'IN_ARREARS' as const,
      nextBillingAt: FEBRUARY_29,
    }
    const tx = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue(arrearsSubscription),
        update: vi.fn().mockResolvedValue({}),
      },
      subscriptionBillingRun: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      subscriptionPreference: { findUnique: vi.fn().mockResolvedValue(null) },
      taxRate: { findFirst: vi.fn().mockResolvedValue(null) },
      paymentTerm: { findFirst: vi.fn() },
      invoice: {
        create: vi
          .fn()
          .mockResolvedValue({ id: 'invoice_1', amountDue: 10_000n }),
      },
      invoiceSubscription: { create: vi.fn().mockResolvedValue({}) },
      subscriptionCharge: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      subscriptionDiscount: { update: vi.fn() },
      subscriptionEvent: { create: vi.fn().mockResolvedValue({}) },
    }
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      billSubscription('ten_1', 'sub_1', FEBRUARY_29)
    ).resolves.toEqual({ status: 'succeeded', invoiceId: 'invoice_1' })
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_1' },
      data: expect.objectContaining({
        currentPeriodStart: FEBRUARY_29,
        currentPeriodEnd: MARCH_31,
        servicePeriodStart: FEBRUARY_29,
        servicePeriodEnd: MARCH_31,
        nextBillingAt: MARCH_31,
      }),
    })
  })

  it('ends an arrears subscription on its final delivered service period', async () => {
    const finalSubscription = {
      ...subscription(),
      billingTiming: 'IN_ARREARS' as const,
      nextBillingAt: FEBRUARY_29,
      remainingCycles: 1,
    }
    const tx = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue(finalSubscription),
        update: vi.fn().mockResolvedValue({}),
      },
      subscriptionBillingRun: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      subscriptionPreference: { findUnique: vi.fn().mockResolvedValue(null) },
      taxRate: { findFirst: vi.fn().mockResolvedValue(null) },
      paymentTerm: { findFirst: vi.fn() },
      invoice: {
        create: vi
          .fn()
          .mockResolvedValue({ id: 'invoice_1', amountDue: 10_000n }),
      },
      invoiceSubscription: { create: vi.fn().mockResolvedValue({}) },
      subscriptionCharge: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      subscriptionDiscount: { update: vi.fn() },
      subscriptionEvent: { create: vi.fn().mockResolvedValue({}) },
    }
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      billSubscription('ten_1', 'sub_1', FEBRUARY_29)
    ).resolves.toEqual({ status: 'succeeded', invoiceId: 'invoice_1' })
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_1' },
      data: expect.objectContaining({
        status: 'ENDED',
        currentPeriodStart: JANUARY_31,
        currentPeriodEnd: FEBRUARY_29,
        servicePeriodStart: JANUARY_31,
        servicePeriodEnd: FEBRUARY_29,
        nextBillingAt: null,
        remainingCycles: 0,
      }),
    })
  })

  it('records a failed period without replacing a successful concurrent run', async () => {
    mocks.prisma.$transaction.mockRejectedValue(new Error('Tax lookup failed'))
    mocks.prisma.subscription.findFirst.mockResolvedValue({
      currentPeriodStart: JANUARY_31,
      currentPeriodEnd: FEBRUARY_29,
      nextBillingAt: JANUARY_31,
    })
    mocks.prisma.subscriptionBillingRun.create.mockResolvedValue({})

    await expect(
      billSubscription('ten_1', 'sub_1', JANUARY_31)
    ).rejects.toThrow('Tax lookup failed')
    expect(mocks.prisma.subscriptionBillingRun.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        subscriptionId: 'sub_1',
        status: 'FAILED',
        errorMessage: 'Tax lookup failed',
      }),
    })
  })

  it('generates an advance invoice without moving the service period early', async () => {
    const futureSubscription = {
      ...subscription(),
      currentPeriodStart: FEBRUARY_29,
      currentPeriodEnd: MARCH_31,
      servicePeriodStart: JANUARY_31,
      servicePeriodEnd: FEBRUARY_29,
      nextBillingAt: FEBRUARY_29,
      nextAdvanceInvoiceAt: JANUARY_31,
      billedCycleCount: 1,
      paymentTerm: {
        id: 'pterm_1',
        name: 'Net 5',
        rule: 'NET_DAYS',
        dueDays: 5,
      },
    }
    const tx = {
      subscription: {
        findFirst: vi.fn().mockResolvedValue(futureSubscription),
        update: vi.fn().mockResolvedValue({}),
      },
      subscriptionBillingRun: {
        findUnique: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({}),
        update: vi.fn().mockResolvedValue({}),
      },
      subscriptionPreference: {
        findUnique: vi.fn().mockResolvedValue({
          defaultInvoiceMode: 'AUTO_FINALIZE',
          advanceTermsFromPeriodStart: true,
        }),
      },
      taxRate: { findFirst: vi.fn().mockResolvedValue(null) },
      paymentTerm: { findFirst: vi.fn() },
      invoice: {
        create: vi
          .fn()
          .mockResolvedValue({ id: 'invoice_1', amountDue: 10_000n }),
      },
      invoiceSubscription: { create: vi.fn().mockResolvedValue({}) },
      subscriptionCharge: {
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      },
      subscriptionDiscount: { update: vi.fn() },
      subscriptionEvent: { create: vi.fn().mockResolvedValue({}) },
    }
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      billSubscription('ten_1', 'sub_1', JANUARY_31, { advance: true })
    ).resolves.toEqual({
      status: 'succeeded',
      invoiceId: 'invoice_1',
    })
    expect(tx.invoice.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        issueAt: JANUARY_31,
        dueAt: Date.UTC(2024, 2, 5, 12) / 1000,
        servicePeriodStart: FEBRUARY_29,
        servicePeriodEnd: MARCH_31,
      }),
    })
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_1' },
      data: {
        nextAdvanceInvoiceAt: null,
        lastBilledAt: JANUARY_31,
        updatedAt: JANUARY_31,
      },
    })
    expect(tx.subscriptionBillingRun.update).toHaveBeenLastCalledWith({
      where: { id: 'subscriptionbillingrun_1' },
      data: expect.objectContaining({
        status: 'SUCCEEDED',
        invoiceId: 'invoice_1',
        periodAdvancedAt: null,
      }),
    })
  })
})
