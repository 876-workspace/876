import { beforeEach, describe, expect, it, vi } from 'vitest'

import { assessLateFees, calculateLateFee } from './late-fee'

const mocks = vi.hoisted(() => ({
  prismaRef: { current: null as unknown as Record<string, unknown> },
  generateId: vi.fn(),
  markOverdue: vi.fn(),
  nextDocumentNumber: vi.fn(),
  recordLedgerEntry: vi.fn(),
  recomputeCustomerAr: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mocks.prismaRef.current
  },
}))
vi.mock('@/lib/id', () => ({ generateId: mocks.generateId }))
vi.mock('../invoices/mark-overdue', () => ({ markOverdue: mocks.markOverdue }))
vi.mock('../documents/numbers', () => ({
  nextDocumentNumber: mocks.nextDocumentNumber,
}))
vi.mock('../ledger', () => ({ recordLedgerEntry: mocks.recordLedgerEntry }))
vi.mock('../customers/ar', () => ({
  recomputeCustomerAr: mocks.recomputeCustomerAr,
}))

const AS_OF = 1_783_771_200

function preference(overrides: Record<string, unknown> = {}) {
  return {
    lateFeesEnabled: true,
    lateFeeCalculationType: 'PERCENTAGE',
    lateFeePercent: { toString: () => '2.5' },
    lateFeeAmount: null,
    lateFeeGraceDays: 5,
    lateFeeGenerateAsDraft: true,
    ...overrides,
  }
}

function overdueInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv_source',
    tenantId: 'ten_123',
    customerId: 'cus_123',
    number: 'INV-0041',
    status: 'OVERDUE',
    billingReason: 'MANUAL',
    currency: 'JMD',
    dueAt: AS_OF - 10 * 86_400,
    amountDue: 10_000n,
    customerName: 'Efesto Technologies',
    customerEmail: 'billing@efesto.example',
    billingAddressSnapshot: null,
    shippingAddressSnapshot: null,
    customer: { lateFeeExempt: false },
    ...overrides,
  }
}

describe('calculateLateFee', () => {
  it.each([
    ['percentage with four-decimal precision', 10_000n, preference(), 250n],
    [
      'percentage with half-up minor-unit rounding',
      101n,
      preference({ lateFeePercent: { toString: () => '1' } }),
      1n,
    ],
    [
      'fixed amount',
      10_000n,
      preference({ lateFeeCalculationType: 'FIXED', lateFeeAmount: 750n }),
      750n,
    ],
  ])('calculates %s', (_name, amountDue, policy, expected) => {
    const result = calculateLateFee(amountDue, policy as never)

    expect(result).toBe(expected)
  })

  it('returns zero for a non-positive balance', () => {
    const result = calculateLateFee(0n, preference() as never)

    expect(result).toBe(0n)
  })
})

describe('assessLateFees', () => {
  let invoiceCreate: ReturnType<typeof vi.fn>
  let assessmentCreate: ReturnType<typeof vi.fn>
  let sourceFind: ReturnType<typeof vi.fn>

  beforeEach(() => {
    invoiceCreate = vi.fn().mockResolvedValue({ id: 'inv_late_fee' })
    assessmentCreate = vi.fn().mockResolvedValue({ id: 'lfa_123' })
    sourceFind = vi.fn().mockResolvedValue(overdueInvoice())
    const tx = {
      invoice: {
        findFirst: sourceFind,
        create: invoiceCreate,
      },
      lateFeeAssessment: { create: assessmentCreate },
    }
    mocks.prismaRef.current = {
      invoicePreference: {
        findUnique: vi.fn().mockResolvedValue(preference()),
      },
      invoice: { findMany: vi.fn().mockResolvedValue([overdueInvoice()]) },
      $transaction: vi.fn(async (callback: (value: typeof tx) => unknown) =>
        callback(tx)
      ),
    }
    mocks.generateId.mockImplementation((type: string) =>
      type === 'Invoice'
        ? 'inv_late_fee'
        : type === 'InvoiceLine'
          ? 'invl_1'
          : 'lfa_123'
    )
    mocks.nextDocumentNumber.mockResolvedValue('INV-0042')
    mocks.markOverdue.mockResolvedValue({ count: 1 })
    mocks.recordLedgerEntry.mockResolvedValue(undefined)
    mocks.recomputeCustomerAr.mockResolvedValue(undefined)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.clearAllMocks()
  })

  it('does nothing when workspace late fees are disabled', async () => {
    const prisma = mocks.prismaRef.current as unknown as {
      invoicePreference: { findUnique: ReturnType<typeof vi.fn> }
      invoice: { findMany: ReturnType<typeof vi.fn> }
    }
    prisma.invoicePreference.findUnique.mockResolvedValue(
      preference({ lateFeesEnabled: false })
    )

    const result = await assessLateFees('ten_123', AS_OF)

    expect(result).toEqual({
      data: { created: 0, skipped: 0, hasMore: false },
      error: null,
    })
    expect(mocks.markOverdue).not.toHaveBeenCalled()
    expect(prisma.invoice.findMany).not.toHaveBeenCalled()
  })

  it('creates a draft invoice and immutable assessment snapshot', async () => {
    const result = await assessLateFees('ten_123', AS_OF)

    expect(result).toEqual({
      data: { created: 1, skipped: 0, hasMore: false },
      error: null,
    })
    expect(invoiceCreate).toHaveBeenCalledTimes(1)
    expect(assessmentCreate).toHaveBeenCalledWith({
      data: {
        id: 'lfa_123',
        tenantId: 'ten_123',
        sourceInvoiceId: 'inv_source',
        lateFeeInvoiceId: 'inv_late_fee',
        calculationType: 'PERCENTAGE',
        baseAmount: 10_000n,
        percent: expect.any(Object),
        fixedAmount: null,
        assessedAmount: 250n,
        graceDays: 5,
        assessedAt: AS_OF,
        createdAt: AS_OF,
      },
    })
    expect(mocks.recordLedgerEntry).not.toHaveBeenCalled()
    expect(mocks.recomputeCustomerAr).not.toHaveBeenCalled()
  })

  it('calculates the fee from the balance re-read inside the transaction', async () => {
    sourceFind.mockResolvedValue(overdueInvoice({ amountDue: 5_000n }))

    const result = await assessLateFees('ten_123', AS_OF)

    expect(result.error).toBeNull()
    expect(invoiceCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          subtotalAmount: 125n,
          totalAmount: 125n,
          amountDue: 125n,
        }),
      })
    )
    expect(assessmentCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        baseAmount: 5_000n,
        assessedAmount: 125n,
      }),
    })
  })

  it('posts an open late-fee invoice to the customer ledger', async () => {
    const prisma = mocks.prismaRef.current as unknown as {
      invoicePreference: { findUnique: ReturnType<typeof vi.fn> }
    }
    prisma.invoicePreference.findUnique.mockResolvedValue(
      preference({ lateFeeGenerateAsDraft: false })
    )

    const result = await assessLateFees('ten_123', AS_OF)

    expect(result).toEqual({
      data: { created: 1, skipped: 0, hasMore: false },
      error: null,
    })
    expect(mocks.recordLedgerEntry).toHaveBeenCalledTimes(1)
    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        tenantId: 'ten_123',
        customerId: 'cus_123',
        invoiceId: 'inv_late_fee',
        type: 'INVOICE_FINALIZED',
        direction: 'DEBIT',
        amount: 250n,
        currency: 'JMD',
        idempotencyKey: 'invoice:inv_source:late-fee',
      })
    )
    expect(mocks.recomputeCustomerAr).toHaveBeenCalledTimes(1)
    expect(mocks.recomputeCustomerAr).toHaveBeenCalledWith(
      expect.any(Object),
      'ten_123',
      'cus_123',
      AS_OF
    )
  })
})
