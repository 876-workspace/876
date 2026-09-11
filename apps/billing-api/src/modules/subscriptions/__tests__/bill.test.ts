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
  applyInvoiceFinalizeEffects: vi
    .fn()
    .mockResolvedValue({ data: null, error: null }),
  projectCollectibleInvoiceStatus: vi.fn(),
  recomputeCustomerAr: vi.fn(),
  settleWithAvailableCredits: vi.fn(),
}))

vi.mock('../repositories/db', () => ({ prisma: mocks.prisma }))
vi.mock('@/platform/ids', () => ({
  generateId: (entity: string) => `${entity.toLowerCase()}_1`,
}))
vi.mock('@/modules/documents', () => ({
  nextDocumentNumber: vi.fn().mockResolvedValue('INV-0001'),
  resolveDueAt: (issueAt: number, term: { dueDays: number }) =>
    issueAt + term.dueDays * 86_400,
  settleWithAvailableCredits: mocks.settleWithAvailableCredits,
  applyInvoiceFinalizeEffects: mocks.applyInvoiceFinalizeEffects,
  projectCollectibleInvoiceStatus: mocks.projectCollectibleInvoiceStatus,
}))
vi.mock('@/modules/ledger', () => ({
  recordLedgerEntry: mocks.recordLedgerEntry,
}))
vi.mock('@/modules/customers', () => ({
  recomputeCustomerAr: mocks.recomputeCustomerAr,
}))
import { billSubscription } from '../repositories/bill'

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
    lifecycleSchedules: [],
    items: [
      {
        id: 'si_1',
        priceId: 'prc_1',
        unitAmount: 10_000n,
        currency: 'JMD',
        quantity: 1,
        price: {
          id: 'prc_1',
          pricingModel: 'FLAT',
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

function createBillingTransaction(
  consolidatedInvoice: {
    id: string
    number: string
    status: 'DRAFT' | 'OPEN' | 'SENT' | 'PARTIALLY_PAID'
    amountDue: bigint
    amountPaid: bigint
    amountCredited: bigint
    servicePeriodStart: number | null
    servicePeriodEnd: number | null
    dueAt: number | null
    sentAt: number | null
    _count: { lines: number }
  } | null
) {
  return {
    $queryRaw: vi.fn().mockResolvedValue([{ id: 'sub_1' }]),
    subscription: {
      findFirst: vi.fn().mockResolvedValue(subscription()),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
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
      findFirst: vi.fn().mockResolvedValue(consolidatedInvoice),
      create: vi
        .fn()
        .mockResolvedValue({ id: 'invoice_1', amountDue: 10_000n }),
      update: vi.fn().mockResolvedValue({ id: 'invoice_1' }),
    },
    invoiceSubscription: { create: vi.fn().mockResolvedValue({}) },
    subscriptionCharge: { updateMany: vi.fn().mockResolvedValue({ count: 0 }) },
    subscriptionDiscount: { update: vi.fn() },
    subscriptionEvent: { create: vi.fn().mockResolvedValue({}) },
    subscriptionLifecycleSchedule: {
      updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
  }
}

function cancelSchedule(effectiveAt: number) {
  return {
    id: 'schedule_1',
    subscriptionId: 'sub_1',
    action: 'CANCEL' as const,
    effectiveAt,
    pauseUnbilledBehavior: null,
    pauseCreditBehavior: null,
    resumeAt: null,
    resumeBillingBehavior: null,
    reason: 'Customer requested cancellation.',
    requestedByUserId: 'usr_1',
  }
}

interface ConsolidatedInvoiceFixture {
  id: string
  number: string
  status: 'DRAFT' | 'OPEN' | 'SENT' | 'PARTIALLY_PAID'
  amountDue: bigint
  amountPaid: bigint
  amountCredited: bigint
  servicePeriodStart: number | null
  servicePeriodEnd: number | null
  dueAt: number | null
  sentAt: number | null
  _count: { lines: number }
}

function finalizedInvoice(overrides: Partial<ConsolidatedInvoiceFixture> = {}) {
  return {
    id: 'invoice_1',
    number: 'INV-0001',
    status: 'OPEN' as const,
    amountDue: 20_000n,
    amountPaid: 0n,
    amountCredited: 0n,
    servicePeriodStart: JANUARY_31,
    servicePeriodEnd: FEBRUARY_29,
    dueAt: FEBRUARY_29,
    sentAt: null,
    _count: { lines: 1 },
    ...overrides,
  }
}

describe('billSubscription', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.projectCollectibleInvoiceStatus.mockImplementation(
      ({ amountDue, amountPaid, amountCredited, dueAt, sentAt, asOf }) => {
        if (amountDue === 0n) return 'PAID'
        if (dueAt !== null && dueAt < asOf) return 'OVERDUE'
        if (amountPaid > 0n || amountCredited > 0n) return 'PARTIALLY_PAID'
        if (sentAt !== null) return 'SENT'
        return 'OPEN'
      }
    )
    mocks.prisma.subscriptionBillingRun.updateMany.mockResolvedValue({
      count: 0,
    })
  })

  it('creates one invoice and preserves a month-end billing anchor', async () => {
    const tx = {
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'sub_1' }]),
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
    expect(mocks.applyInvoiceFinalizeEffects).toHaveBeenCalledWith(
      tx,
      'ten_1',
      expect.objectContaining({
        invoice: expect.objectContaining({ totalAmount: 10_000n }),
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
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'sub_1' }]),
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
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'sub_1' }]),
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
      $queryRaw: vi.fn().mockResolvedValue([{ id: 'sub_1' }]),
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

  it('ledgers an appended finalized amount with the billing run key and recomputes AR', async () => {
    const tx = createBillingTransaction(finalizedInvoice())
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      billSubscription('ten_1', 'sub_1', JANUARY_31, {
        consolidateWithInvoiceId: 'invoice_1',
      })
    ).resolves.toEqual({ status: 'succeeded', invoiceId: 'invoice_1' })

    expect(mocks.recordLedgerEntry).toHaveBeenCalledTimes(1)
    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith(tx, {
      tenantId: 'ten_1',
      customerId: 'cus_1',
      subscriptionId: 'sub_1',
      invoiceId: 'invoice_1',
      type: 'INVOICE_FINALIZED',
      direction: 'DEBIT',
      amount: 10_000n,
      currency: 'JMD',
      description: 'Subscription invoice INV-0001 finalized',
      idempotencyKey:
        'invoice:invoice_1:subscription-run:subscriptionbillingrun_1',
      effectiveAt: JANUARY_31,
      createdAt: JANUARY_31,
    })
    expect(mocks.recomputeCustomerAr).toHaveBeenCalledTimes(1)
    expect(mocks.recomputeCustomerAr).toHaveBeenCalledWith(
      tx,
      'ten_1',
      'cus_1',
      JANUARY_31
    )
  })

  it('does not post a second finalized-consolidation entry when the run already succeeded', async () => {
    const tx = createBillingTransaction(finalizedInvoice())
    tx.subscriptionBillingRun.findUnique.mockResolvedValue({
      id: 'subscriptionbillingrun_1',
      status: 'SUCCEEDED',
      invoiceId: 'invoice_1',
      periodAdvancedAt: JANUARY_31,
    })
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      billSubscription('ten_1', 'sub_1', JANUARY_31, {
        consolidateWithInvoiceId: 'invoice_1',
      })
    ).resolves.toEqual({ status: 'skipped', invoiceId: 'invoice_1' })

    expect(tx.invoice.update).not.toHaveBeenCalled()
    expect(mocks.recordLedgerEntry).not.toHaveBeenCalled()
    expect(mocks.recomputeCustomerAr).not.toHaveBeenCalled()
  })

  it('preserves a partially paid consolidated invoice through the central status projection', async () => {
    const tx = createBillingTransaction(
      finalizedInvoice({ status: 'PARTIALLY_PAID', amountPaid: 5_000n })
    )
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await billSubscription('ten_1', 'sub_1', JANUARY_31, {
      consolidateWithInvoiceId: 'invoice_1',
    })

    expect(mocks.projectCollectibleInvoiceStatus).toHaveBeenCalledTimes(1)
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'invoice_1' },
      data: expect.objectContaining({ status: 'PARTIALLY_PAID' }),
    })
  })

  it('preserves a sent consolidated invoice through the central status projection', async () => {
    const tx = createBillingTransaction(
      finalizedInvoice({ status: 'SENT', sentAt: JANUARY_31 })
    )
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await billSubscription('ten_1', 'sub_1', JANUARY_31, {
      consolidateWithInvoiceId: 'invoice_1',
    })

    expect(mocks.projectCollectibleInvoiceStatus).toHaveBeenCalledTimes(1)
    expect(tx.invoice.update).toHaveBeenCalledWith({
      where: { id: 'invoice_1' },
      data: expect.objectContaining({ status: 'SENT' }),
    })
  })

  it('does not post a ledger entry or recompute AR when the consolidation target is draft', async () => {
    const tx = createBillingTransaction(
      finalizedInvoice({ status: 'DRAFT', sentAt: null })
    )
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      billSubscription('ten_1', 'sub_1', JANUARY_31, {
        consolidateWithInvoiceId: 'invoice_1',
        invoiceModeOverride: 'DRAFT',
      })
    ).resolves.toEqual({ status: 'succeeded', invoiceId: 'invoice_1' })

    expect(mocks.recordLedgerEntry).not.toHaveBeenCalled()
    expect(mocks.recomputeCustomerAr).not.toHaveBeenCalled()
    expect(mocks.applyInvoiceFinalizeEffects).not.toHaveBeenCalled()
  })

  it('cancels an advance subscription at period end without creating its next-period invoice', async () => {
    const periodEndCancel = cancelSchedule(JANUARY_31)
    const tx = createBillingTransaction(null)
    tx.subscription.findFirst
      .mockResolvedValueOnce({
        ...subscription(),
        lifecycleSchedules: [periodEndCancel],
      })
      .mockResolvedValueOnce({
        ...subscription(),
        status: 'CANCELED',
        nextBillingAt: null,
        lifecycleSchedules: [],
      })
    tx.subscription.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      deletedAt: null,
      billingTiming: 'IN_ADVANCE',
      nextBillingAt: JANUARY_31,
    })
    tx.subscription.findUniqueOrThrow.mockResolvedValue({
      servicePeriodStart: JANUARY_31,
    })
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      billSubscription('ten_1', 'sub_1', JANUARY_31)
    ).resolves.toEqual({ status: 'skipped', invoiceId: null })

    expect(tx.invoice.create).not.toHaveBeenCalled()
    expect(tx.subscriptionLifecycleSchedule.updateMany).toHaveBeenCalledTimes(1)
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_1' },
      data: expect.objectContaining({
        status: 'CANCELED',
        nextBillingAt: null,
      }),
    })
  })

  it('bills an advance subscription when its scheduled cancellation is after the next period start', async () => {
    const tx = createBillingTransaction(null)
    tx.subscription.findFirst.mockResolvedValue({
      ...subscription(),
      lifecycleSchedules: [cancelSchedule(FEBRUARY_29)],
    })
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      billSubscription('ten_1', 'sub_1', JANUARY_31)
    ).resolves.toEqual({ status: 'succeeded', invoiceId: 'invoice_1' })

    expect(tx.invoice.create).toHaveBeenCalledTimes(1)
    expect(tx.subscriptionLifecycleSchedule.updateMany).not.toHaveBeenCalled()
  })

  it('invoices an arrears final service period once before applying its period-end cancellation', async () => {
    const periodEndCancel = cancelSchedule(FEBRUARY_29)
    const tx = createBillingTransaction(null)
    tx.subscription.findFirst.mockResolvedValue({
      ...subscription(),
      billingTiming: 'IN_ARREARS',
      nextBillingAt: FEBRUARY_29,
      lifecycleSchedules: [periodEndCancel],
    })
    tx.subscription.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      deletedAt: null,
      billingTiming: 'IN_ARREARS',
      nextBillingAt: FEBRUARY_29,
    })
    tx.subscription.findUniqueOrThrow.mockResolvedValue({
      servicePeriodStart: JANUARY_31,
    })
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      billSubscription('ten_1', 'sub_1', FEBRUARY_29)
    ).resolves.toEqual({ status: 'succeeded', invoiceId: 'invoice_1' })

    expect(tx.invoice.create).toHaveBeenCalledTimes(1)
    expect(tx.subscriptionLifecycleSchedule.updateMany).toHaveBeenCalledTimes(1)
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_1' },
      data: expect.objectContaining({
        status: 'CANCELED',
        nextBillingAt: null,
      }),
    })
  })

  it('applies a due cancellation before the billing boundary without creating an invoice', async () => {
    const beforeBoundaryCancel = cancelSchedule(JANUARY_31)
    const tx = createBillingTransaction(null)
    tx.subscription.findFirst
      .mockResolvedValueOnce({
        ...subscription(),
        billingTiming: 'IN_ARREARS',
        nextBillingAt: FEBRUARY_29,
        lifecycleSchedules: [beforeBoundaryCancel],
      })
      .mockResolvedValueOnce({
        ...subscription(),
        billingTiming: 'IN_ARREARS',
        status: 'CANCELED',
        nextBillingAt: null,
        lifecycleSchedules: [],
      })
    tx.subscription.findUnique.mockResolvedValue({
      status: 'ACTIVE',
      deletedAt: null,
      billingTiming: 'IN_ARREARS',
      nextBillingAt: FEBRUARY_29,
    })
    tx.subscription.findUniqueOrThrow.mockResolvedValue({
      servicePeriodStart: JANUARY_31,
    })
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(
      billSubscription('ten_1', 'sub_1', JANUARY_31)
    ).resolves.toEqual({ status: 'skipped', invoiceId: null })

    expect(tx.invoice.create).not.toHaveBeenCalled()
    expect(tx.subscriptionLifecycleSchedule.updateMany).toHaveBeenCalledTimes(1)
    expect(tx.subscription.update).toHaveBeenCalledWith({
      where: { id: 'sub_1' },
      data: expect.objectContaining({ status: 'CANCELED' }),
    })
  })
})
