import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { create } from './create'

// ---------------------------------------------------------------------------
// Hoisted mocks — must be declared before any vi.mock() calls
// ---------------------------------------------------------------------------

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
  hasEnabledCurrency: vi.fn(),
  generateId: vi.fn(),
  nowUnixSeconds: vi.fn(),
  nextDocumentNumber: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mocks.prismaRef.current
  },
}))
vi.mock('@/lib/id', () => ({ generateId: mocks.generateId }))
vi.mock('@876/core/timestamps', () => ({
  nowUnixSeconds: mocks.nowUnixSeconds,
}))
vi.mock('../shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../shared')>()
  return { ...actual, hasEnabledCurrency: mocks.hasEnabledCurrency }
})
vi.mock('../documents/numbers', () => ({
  nextDocumentNumber: mocks.nextDocumentNumber,
}))

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeTx() {
  return {
    customer: {
      findFirst: vi.fn(),
    },
    creditNote: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    payment: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    paymentMode: {
      findFirst: vi.fn(),
    },
    bankAccount: {
      findFirst: vi.fn(),
    },
    refund: {
      create: vi.fn(),
    },
    customer_ar_update: vi.fn(), // sentinel — used via customer.update inside recomputeCustomerAr
    invoice: {
      aggregate: vi.fn().mockResolvedValue({ _sum: { amountDue: 0n } }),
    },
  }
}

function makeActiveCustomer() {
  return { id: 'cus_001' }
}

function makeOpenCreditNote(overrides: Record<string, unknown> = {}) {
  return {
    customerId: 'cus_001',
    currency: 'JMD',
    status: 'OPEN',
    balanceAmount: 10_000n,
    ...overrides,
  }
}

function makePayment(overrides: Record<string, unknown> = {}) {
  return {
    customerId: 'cus_001',
    currency: 'JMD',
    status: 'SUCCEEDED',
    unappliedAmount: 50_000n,
    ...overrides,
  }
}

function makeCreditNoteParams(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    customerId: 'cus_001',
    currency: 'JMD',
    amount: 5_000n,
    creditNoteId: 'cn_001',
    refundedAt: 1_783_771_200,
    ...overrides,
  }
}

function makePaymentParams(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    customerId: 'cus_001',
    currency: 'JMD',
    amount: 5_000n,
    paymentId: 'pay_001',
    refundedAt: 1_783_771_200,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// Helpers — set up the prismaRef with a transaction mock
// ---------------------------------------------------------------------------

function buildPrismaWithTransaction(
  tx: ReturnType<typeof makeTx>,
  customerUpdate?: ReturnType<typeof vi.fn>
) {
  const customerUpdateFn = customerUpdate ?? vi.fn()
  return {
    $transaction: vi.fn(async (fn: (tx: unknown) => Promise<unknown>) => {
      // recomputeCustomerAr calls tx.invoice.aggregate, tx.payment.aggregate,
      // tx.creditNote.aggregate, and tx.customer.update — wire them up.
      const fullTx = {
        ...tx,
        invoice: {
          ...tx.invoice,
          aggregate: vi.fn().mockResolvedValue({ _sum: { amountDue: 0n } }),
        },
        payment: {
          ...tx.payment,
          aggregate: vi
            .fn()
            .mockResolvedValue({ _sum: { unappliedAmount: 0n } }),
        },
        creditNote: {
          ...tx.creditNote,
          aggregate: vi.fn().mockResolvedValue({ _sum: { balanceAmount: 0n } }),
        },
        customer: {
          ...tx.customer,
          update: customerUpdateFn,
        },
        customerLedgerEntry: {
          upsert: vi.fn().mockResolvedValue({}),
        },
      }
      return fn(fullTx)
    }),
  }
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('refunds.create', () => {
  beforeEach(() => {
    mocks.hasEnabledCurrency.mockResolvedValue(true)
    mocks.generateId.mockReturnValue('ref_001')
    mocks.nowUnixSeconds.mockReturnValue(1_783_771_200)
    mocks.nextDocumentNumber.mockResolvedValue('REF-000001')
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  // -------------------------------------------------------------------------
  // Happy path — credit note source
  // -------------------------------------------------------------------------

  it('records a refund from a credit note and decrements its balance', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.creditNote.findFirst.mockResolvedValue(makeOpenCreditNote())
    tx.creditNote.update.mockResolvedValue({})
    tx.refund.create.mockResolvedValue({})

    const customerUpdate = vi.fn().mockResolvedValue({})
    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx,
      customerUpdate
    ) as unknown as Record<string, unknown>

    const result = await create('ten_001', makeCreditNoteParams() as never)

    expect(result).toEqual({ data: { id: 'ref_001' }, error: null })

    expect(mocks.hasEnabledCurrency).toHaveBeenCalledTimes(1)
    expect(mocks.hasEnabledCurrency).toHaveBeenCalledWith('ten_001', 'JMD')

    expect(mocks.nextDocumentNumber).toHaveBeenCalledTimes(1)
    expect(mocks.nextDocumentNumber).toHaveBeenCalledWith(
      'ten_001',
      'REFUND',
      1_783_771_200
    )

    expect(mocks.generateId).toHaveBeenCalledTimes(2)
    expect(mocks.generateId).toHaveBeenCalledWith('Refund')
    expect(mocks.generateId).toHaveBeenCalledWith('CustomerLedgerEntry')

    expect(tx.creditNote.findFirst).toHaveBeenCalledTimes(1)
    expect(tx.creditNote.findFirst).toHaveBeenCalledWith({
      where: { id: 'cn_001', tenantId: 'ten_001' },
      select: {
        customerId: true,
        currency: true,
        status: true,
        balanceAmount: true,
      },
    })

    // Balance 10_000 - 5_000 = 5_000 → stays OPEN
    expect(tx.creditNote.update).toHaveBeenCalledTimes(1)
    expect(tx.creditNote.update).toHaveBeenCalledWith({
      where: { id: 'cn_001' },
      data: {
        balanceAmount: 5_000n,
        status: 'OPEN',
        updatedAt: 1_783_771_200,
      },
    })

    expect(tx.refund.create).toHaveBeenCalledTimes(1)
    expect(tx.refund.create).toHaveBeenCalledWith({
      data: {
        id: 'ref_001',
        tenantId: 'ten_001',
        customerId: 'cus_001',
        creditNoteId: 'cn_001',
        paymentId: null,
        paymentModeId: null,
        depositAccountId: null,
        number: 'REF-000001',
        amount: 5_000n,
        currency: 'JMD',
        reason: null,
        notes: null,
        refundedAt: 1_783_771_200,
        createdAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
      },
    })

    // recomputeCustomerAr must have called tx.customer.update
    expect(customerUpdate).toHaveBeenCalledTimes(1)

    // Payment path should not have been touched
    expect(tx.payment.findFirst).not.toHaveBeenCalled()
    expect(tx.payment.update).not.toHaveBeenCalled()
  })

  it('closes a credit note when the refund drains its balance to zero', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.creditNote.findFirst.mockResolvedValue(
      makeOpenCreditNote({ balanceAmount: 5_000n })
    )
    tx.creditNote.update.mockResolvedValue({})
    tx.refund.create.mockResolvedValue({})

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create(
      'ten_001',
      makeCreditNoteParams({ amount: 5_000n }) as never
    )

    expect(result.error).toBeNull()
    expect(tx.creditNote.update).toHaveBeenCalledWith({
      where: { id: 'cn_001' },
      data: {
        balanceAmount: 0n,
        status: 'CLOSED',
        updatedAt: 1_783_771_200,
      },
    })
  })

  // -------------------------------------------------------------------------
  // Happy path — payment source
  // -------------------------------------------------------------------------

  it('records a refund from a payment and decrements its unapplied amount', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.payment.findFirst.mockResolvedValue(makePayment())
    tx.payment.update.mockResolvedValue({})
    tx.refund.create.mockResolvedValue({})

    const customerUpdate = vi.fn().mockResolvedValue({})
    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx,
      customerUpdate
    ) as unknown as Record<string, unknown>

    const result = await create('ten_001', makePaymentParams() as never)

    expect(result).toEqual({ data: { id: 'ref_001' }, error: null })

    expect(tx.payment.findFirst).toHaveBeenCalledTimes(1)
    expect(tx.payment.findFirst).toHaveBeenCalledWith({
      where: { id: 'pay_001', tenantId: 'ten_001' },
      select: {
        customerId: true,
        currency: true,
        status: true,
        unappliedAmount: true,
      },
    })

    expect(tx.payment.update).toHaveBeenCalledTimes(1)
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay_001' },
      data: {
        unappliedAmount: { decrement: 5_000n },
        updatedAt: 1_783_771_200,
      },
    })

    expect(tx.refund.create).toHaveBeenCalledTimes(1)
    expect(tx.refund.create).toHaveBeenCalledWith({
      data: {
        id: 'ref_001',
        tenantId: 'ten_001',
        customerId: 'cus_001',
        creditNoteId: null,
        paymentId: 'pay_001',
        paymentModeId: null,
        depositAccountId: null,
        number: 'REF-000001',
        amount: 5_000n,
        currency: 'JMD',
        reason: null,
        notes: null,
        refundedAt: 1_783_771_200,
        createdAt: 1_783_771_200,
        updatedAt: 1_783_771_200,
      },
    })

    expect(customerUpdate).toHaveBeenCalledTimes(1)
    expect(tx.creditNote.findFirst).not.toHaveBeenCalled()
    expect(tx.creditNote.update).not.toHaveBeenCalled()
  })

  it('writes optional paymentModeId and depositAccountId to the refund row', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.payment.findFirst.mockResolvedValue(makePayment())
    tx.payment.update.mockResolvedValue({})
    tx.paymentMode.findFirst.mockResolvedValue({ id: 'pm_001' })
    tx.bankAccount.findFirst.mockResolvedValue({ id: 'ba_001' })
    tx.refund.create.mockResolvedValue({})

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create(
      'ten_001',
      makePaymentParams({
        paymentModeId: 'pm_001',
        depositAccountId: 'ba_001',
      }) as never
    )

    expect(result.error).toBeNull()
    expect(tx.paymentMode.findFirst).toHaveBeenCalledTimes(1)
    expect(tx.paymentMode.findFirst).toHaveBeenCalledWith({
      where: { id: 'pm_001', tenantId: 'ten_001' },
      select: { id: true },
    })
    expect(tx.bankAccount.findFirst).toHaveBeenCalledTimes(1)
    expect(tx.bankAccount.findFirst).toHaveBeenCalledWith({
      where: { id: 'ba_001', tenantId: 'ten_001' },
      select: { id: true },
    })
    expect(tx.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paymentModeId: 'pm_001',
        depositAccountId: 'ba_001',
      }),
    })
  })

  // -------------------------------------------------------------------------
  // Guard — currency not enabled
  // -------------------------------------------------------------------------

  it('rejects when the refund currency is not enabled', async () => {
    mocks.hasEnabledCurrency.mockResolvedValue(false)

    const result = await create('ten_001', makeCreditNoteParams() as never)

    expect(result).toEqual({
      data: null,
      error: 'Enable the refund currency before using it.',
      status: 422,
    })
    expect(mocks.nextDocumentNumber).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Guard — customer not found / inactive
  // -------------------------------------------------------------------------

  it('returns 404 when the customer does not exist or is not active', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(null)

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create('ten_001', makeCreditNoteParams() as never)

    expect(result).toEqual({
      data: null,
      error: 'Active customer not found.',
      status: 404,
    })
    expect(tx.refund.create).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Guard — credit note source errors
  // -------------------------------------------------------------------------

  it('returns 404 when the credit note does not exist', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.creditNote.findFirst.mockResolvedValue(null)

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create('ten_001', makeCreditNoteParams() as never)

    expect(result).toEqual({
      data: null,
      error: 'Credit note not found.',
      status: 404,
    })
    expect(tx.refund.create).not.toHaveBeenCalled()
  })

  it('returns 422 when the credit note belongs to a different customer', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.creditNote.findFirst.mockResolvedValue(
      makeOpenCreditNote({ customerId: 'cus_other' })
    )

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create('ten_001', makeCreditNoteParams() as never)

    expect(result).toEqual({
      data: null,
      error: 'The credit note belongs to a different customer.',
      status: 422,
    })
    expect(tx.refund.create).not.toHaveBeenCalled()
  })

  it('returns 422 when the credit note uses a different currency', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.creditNote.findFirst.mockResolvedValue(
      makeOpenCreditNote({ currency: 'USD' })
    )

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create('ten_001', makeCreditNoteParams() as never)

    expect(result).toEqual({
      data: null,
      error: 'The credit note uses a different currency.',
      status: 422,
    })
    expect(tx.refund.create).not.toHaveBeenCalled()
  })

  it('returns 409 when the credit note is not open', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.creditNote.findFirst.mockResolvedValue(
      makeOpenCreditNote({ status: 'CLOSED' })
    )

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create('ten_001', makeCreditNoteParams() as never)

    expect(result).toEqual({
      data: null,
      error: 'Only an open credit note can be refunded.',
      status: 409,
    })
    expect(tx.refund.create).not.toHaveBeenCalled()
  })

  it('returns 422 when the refund amount exceeds the credit note balance', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.creditNote.findFirst.mockResolvedValue(
      makeOpenCreditNote({ balanceAmount: 1_000n })
    )

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create(
      'ten_001',
      makeCreditNoteParams({ amount: 5_000n }) as never
    )

    expect(result).toEqual({
      data: null,
      error: 'Refund exceeds the credit note balance.',
      status: 422,
    })
    expect(tx.refund.create).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Guard — payment source errors
  // -------------------------------------------------------------------------

  it('returns 404 when the payment does not exist', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.payment.findFirst.mockResolvedValue(null)

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create('ten_001', makePaymentParams() as never)

    expect(result).toEqual({
      data: null,
      error: 'Payment not found.',
      status: 404,
    })
    expect(tx.refund.create).not.toHaveBeenCalled()
  })

  it('returns 422 when the payment belongs to a different customer', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.payment.findFirst.mockResolvedValue(
      makePayment({ customerId: 'cus_other' })
    )

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create('ten_001', makePaymentParams() as never)

    expect(result).toEqual({
      data: null,
      error: 'The payment belongs to a different customer.',
      status: 422,
    })
    expect(tx.refund.create).not.toHaveBeenCalled()
  })

  it('returns 422 when the payment uses a different currency', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.payment.findFirst.mockResolvedValue(makePayment({ currency: 'USD' }))

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create('ten_001', makePaymentParams() as never)

    expect(result).toEqual({
      data: null,
      error: 'The payment uses a different currency.',
      status: 422,
    })
    expect(tx.refund.create).not.toHaveBeenCalled()
  })

  it("returns 422 when the refund amount exceeds the payment's unapplied amount", async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.payment.findFirst.mockResolvedValue(
      makePayment({ unappliedAmount: 1_000n })
    )

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create(
      'ten_001',
      makePaymentParams({ amount: 5_000n }) as never
    )

    expect(result).toEqual({
      data: null,
      error: "Refund exceeds the payment's unapplied amount.",
      status: 422,
    })
    expect(tx.refund.create).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Guard — optional target errors
  // -------------------------------------------------------------------------

  it('returns 404 when the payment mode is not found in the tenant', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.payment.findFirst.mockResolvedValue(makePayment())
    tx.payment.update.mockResolvedValue({})
    tx.paymentMode.findFirst.mockResolvedValue(null)

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create(
      'ten_001',
      makePaymentParams({ paymentModeId: 'pm_missing' }) as never
    )

    expect(result).toEqual({
      data: null,
      error: 'Payment mode not found.',
      status: 404,
    })
    expect(tx.refund.create).not.toHaveBeenCalled()
  })

  it('returns 404 when the deposit account is not found in the tenant', async () => {
    const tx = makeTx()
    tx.customer.findFirst.mockResolvedValue(makeActiveCustomer())
    tx.payment.findFirst.mockResolvedValue(makePayment())
    tx.payment.update.mockResolvedValue({})
    tx.paymentMode.findFirst.mockResolvedValue({ id: 'pm_001' })
    tx.bankAccount.findFirst.mockResolvedValue(null)

    mocks.prismaRef.current = buildPrismaWithTransaction(
      tx
    ) as unknown as Record<string, unknown>

    const result = await create(
      'ten_001',
      makePaymentParams({
        paymentModeId: 'pm_001',
        depositAccountId: 'ba_missing',
      }) as never
    )

    expect(result).toEqual({
      data: null,
      error: 'Deposit account not found.',
      status: 404,
    })
    expect(tx.refund.create).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Error handling — P2034 retry
  // -------------------------------------------------------------------------

  it('returns 409 when the transaction fails with a serialization error (P2034)', async () => {
    mocks.prismaRef.current = {
      $transaction: vi.fn().mockRejectedValue({ code: 'P2034' }),
    } as unknown as Record<string, unknown>

    const result = await create('ten_001', makeCreditNoteParams() as never)

    expect(result).toEqual({
      data: null,
      error: 'Balances changed; retry the refund.',
      status: 409,
    })
    expect(console.error).not.toHaveBeenCalled()
  })

  // -------------------------------------------------------------------------
  // Error handling — unexpected failure
  // -------------------------------------------------------------------------

  it('returns 500 and logs when an unexpected error is thrown', async () => {
    const error = new Error('database connection lost')
    mocks.prismaRef.current = {
      $transaction: vi.fn().mockRejectedValue(error),
    } as unknown as Record<string, unknown>

    const result = await create('ten_001', makeCreditNoteParams() as never)

    expect(result).toEqual({
      data: null,
      error: 'Failed to record the refund.',
      status: 500,
    })
    expect(console.error).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(
      '[billing.service.refunds.create]',
      error
    )
  })
})
