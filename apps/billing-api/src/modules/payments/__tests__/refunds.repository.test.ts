import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { RefundCreateParams } from '../schemas/refund'

const mocks = vi.hoisted(() => ({
  mockPrismaRef: { current: null as MockPrisma | null },
  hasEnabledCurrency: vi.fn(),
  nextDocumentNumber: vi.fn(),
  recordLedgerEntry: vi.fn(),
  recomputeCustomerAr: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  get prisma() {
    return mocks.mockPrismaRef.current
  },
}))

vi.mock('@876/core/timestamps', () => ({
  nowUnixSeconds: () => 1_788_883_200,
}))

vi.mock('@/platform/ids', () => ({
  generateId: () => 'ref_1',
}))

vi.mock('@/modules/currencies', () => ({
  hasEnabledCurrency: mocks.hasEnabledCurrency,
}))

vi.mock('@/modules/documents', () => ({
  nextDocumentNumber: mocks.nextDocumentNumber,
}))

vi.mock('@/modules/ledger', () => ({
  recordLedgerEntry: mocks.recordLedgerEntry,
}))

vi.mock('@/modules/customers', () => ({
  recomputeCustomerAr: mocks.recomputeCustomerAr,
}))

type MockPrisma = {
  customer: {
    findFirst: ReturnType<typeof vi.fn>
  }
  creditNote: {
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  payment: {
    findFirst: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  paymentMode: {
    findFirst: ReturnType<typeof vi.fn>
  }
  bankAccount: {
    findFirst: ReturnType<typeof vi.fn>
  }
  refund: {
    create: ReturnType<typeof vi.fn>
  }
  $transaction: ReturnType<typeof vi.fn>
}

const TENANT = 'ten_1'
const CUSTOMER = 'cus_1'
const PAYMENT = 'pay_1'
const CREDIT_NOTE = 'cn_1'
const NOW = 1_788_883_200

function paymentParams(amount = 2_000n): RefundCreateParams {
  return {
    customerId: CUSTOMER,
    currency: 'JMD',
    amount,
    paymentId: PAYMENT,
    paymentModeId: null,
    depositAccountId: null,
    refundedAt: NOW,
  }
}

function manualPaymentParams(amount = 2_000n): RefundCreateParams {
  return {
    ...paymentParams(amount),
    paymentModeId: 'mode_1',
    depositAccountId: 'bank_1',
  }
}

function creditNoteParams(amount = 2_000n): RefundCreateParams {
  return {
    customerId: CUSTOMER,
    currency: 'JMD',
    amount,
    creditNoteId: CREDIT_NOTE,
    paymentModeId: null,
    depositAccountId: null,
    refundedAt: NOW,
  }
}

function buildPrisma(): MockPrisma {
  const prisma: MockPrisma = {
    customer: {
      findFirst: vi.fn().mockResolvedValue({ id: CUSTOMER }),
    },
    creditNote: {
      findFirst: vi.fn().mockResolvedValue({
        customerId: CUSTOMER,
        currency: 'JMD',
        status: 'OPEN',
        balanceAmount: 5_000n,
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    payment: {
      findFirst: vi.fn().mockResolvedValue({
        customerId: CUSTOMER,
        currency: 'JMD',
        status: 'SUCCEEDED',
        amount: 10_000n,
        amountRefunded: 0n,
        unappliedAmount: 5_000n,
      }),
      update: vi.fn().mockResolvedValue({}),
    },
    paymentMode: {
      findFirst: vi.fn().mockResolvedValue({ id: 'mode_1' }),
    },
    bankAccount: {
      findFirst: vi.fn().mockResolvedValue({ id: 'bank_1', currency: 'JMD' }),
    },
    refund: {
      create: vi.fn().mockResolvedValue({ id: 'ref_1' }),
    },
    $transaction: vi.fn(),
  }

  prisma.$transaction.mockImplementation((fn: (tx: MockPrisma) => unknown) =>
    fn(prisma)
  )

  return prisma
}

async function createRefund(params: RefundCreateParams) {
  const { create } = await import('../repositories/refunds/create')
  return create(TENANT, params)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  mocks.mockPrismaRef.current = buildPrisma()
  mocks.hasEnabledCurrency.mockResolvedValue(true)
  mocks.nextDocumentNumber.mockResolvedValue('REF-0001')
  mocks.recordLedgerEntry.mockResolvedValue(undefined)
  mocks.recomputeCustomerAr.mockResolvedValue(undefined)
})

describe('refunds repository', () => {
  it('tracks a payment refund in available, refunded, and status projections', async () => {
    const result = await createRefund(paymentParams())

    expect(result).toEqual({ data: { id: 'ref_1' }, error: null })
    expect(mocks.mockPrismaRef.current!.payment.update).toHaveBeenCalledTimes(1)
    expect(mocks.mockPrismaRef.current!.payment.update).toHaveBeenCalledWith({
      where: { id: PAYMENT },
      data: {
        unappliedAmount: { decrement: 2_000n },
        amountRefunded: { increment: 2_000n },
        status: 'PARTIALLY_REFUNDED',
        updatedAt: NOW,
      },
    })
    expect(mocks.mockPrismaRef.current!.refund.create).toHaveBeenCalledTimes(1)
    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith(
      mocks.mockPrismaRef.current,
      expect.objectContaining({
        tenantId: TENANT,
        customerId: CUSTOMER,
        paymentId: PAYMENT,
        creditNoteId: null,
        refundId: 'ref_1',
        type: 'REFUND_ISSUED',
        direction: 'DEBIT',
        amount: 2_000n,
        currency: 'JMD',
      })
    )
    expect(mocks.recomputeCustomerAr).toHaveBeenCalledWith(
      mocks.mockPrismaRef.current,
      TENANT,
      CUSTOMER,
      NOW
    )
  })

  it('allows another refund from a partially refunded payment', async () => {
    mocks.mockPrismaRef.current!.payment.findFirst.mockResolvedValue({
      customerId: CUSTOMER,
      currency: 'JMD',
      status: 'PARTIALLY_REFUNDED',
      amount: 10_000n,
      amountRefunded: 2_000n,
      unappliedAmount: 3_000n,
    })

    const result = await createRefund(paymentParams(1_000n))

    expect(result).toEqual({ data: { id: 'ref_1' }, error: null })
    expect(mocks.mockPrismaRef.current!.payment.update).toHaveBeenCalledWith({
      where: { id: PAYMENT },
      data: {
        unappliedAmount: { decrement: 1_000n },
        amountRefunded: { increment: 1_000n },
        status: 'PARTIALLY_REFUNDED',
        updatedAt: NOW,
      },
    })
  })

  it('keeps a payment partially refunded when all available credit is returned but an allocation remains', async () => {
    const result = await createRefund(paymentParams(5_000n))

    expect(result).toEqual({ data: { id: 'ref_1' }, error: null })
    expect(mocks.mockPrismaRef.current!.payment.update).toHaveBeenCalledWith({
      where: { id: PAYMENT },
      data: {
        unappliedAmount: { decrement: 5_000n },
        amountRefunded: { increment: 5_000n },
        status: 'PARTIALLY_REFUNDED',
        updatedAt: NOW,
      },
    })
  })

  it('marks a payment refunded when its full amount has been returned', async () => {
    mocks.mockPrismaRef.current!.payment.findFirst.mockResolvedValue({
      customerId: CUSTOMER,
      currency: 'JMD',
      status: 'SUCCEEDED',
      amount: 5_000n,
      amountRefunded: 0n,
      unappliedAmount: 5_000n,
    })

    const result = await createRefund(paymentParams(5_000n))

    expect(result).toEqual({ data: { id: 'ref_1' }, error: null })
    expect(mocks.mockPrismaRef.current!.payment.update).toHaveBeenCalledWith({
      where: { id: PAYMENT },
      data: {
        unappliedAmount: { decrement: 5_000n },
        amountRefunded: { increment: 5_000n },
        status: 'REFUNDED',
        updatedAt: NOW,
      },
    })
  })

  it('validates active refund method and same-currency funding account', async () => {
    const result = await createRefund(manualPaymentParams(1_000n))

    expect(result).toEqual({ data: { id: 'ref_1' }, error: null })
    expect(
      mocks.mockPrismaRef.current!.paymentMode.findFirst
    ).toHaveBeenCalledWith({
      where: { id: 'mode_1', tenantId: TENANT, isActive: true },
      select: { id: true },
    })
    expect(
      mocks.mockPrismaRef.current!.bankAccount.findFirst
    ).toHaveBeenCalledWith({
      where: { id: 'bank_1', tenantId: TENANT, isActive: true },
      select: { id: true, currency: true },
    })
  })

  it('rejects an inactive refund method before changing source balances', async () => {
    mocks.mockPrismaRef.current!.paymentMode.findFirst.mockResolvedValue(null)

    const result = await createRefund(manualPaymentParams(1_000n))

    expect(result).toEqual({
      data: null,
      error: 'Active payment mode not found.',
      status: 404,
    })
    expect(
      mocks.mockPrismaRef.current!.payment.findFirst
    ).not.toHaveBeenCalled()
    expect(mocks.mockPrismaRef.current!.payment.update).not.toHaveBeenCalled()
    expect(mocks.mockPrismaRef.current!.refund.create).not.toHaveBeenCalled()
  })

  it('rejects a funding account in a different currency before changing source balances', async () => {
    mocks.mockPrismaRef.current!.bankAccount.findFirst.mockResolvedValue({
      id: 'bank_1',
      currency: 'USD',
    })

    const result = await createRefund(manualPaymentParams(1_000n))

    expect(result).toEqual({
      data: null,
      error: 'The refund account uses a different currency.',
      status: 422,
    })
    expect(
      mocks.mockPrismaRef.current!.payment.findFirst
    ).not.toHaveBeenCalled()
    expect(mocks.mockPrismaRef.current!.payment.update).not.toHaveBeenCalled()
    expect(mocks.mockPrismaRef.current!.refund.create).not.toHaveBeenCalled()
  })

  it('rejects a payment refund above the unapplied balance without side effects', async () => {
    const result = await createRefund(paymentParams(5_001n))

    expect(result).toEqual({
      data: null,
      error: "Refund exceeds the payment's unapplied amount.",
      status: 422,
    })
    expect(mocks.mockPrismaRef.current!.payment.update).not.toHaveBeenCalled()
    expect(mocks.mockPrismaRef.current!.refund.create).not.toHaveBeenCalled()
    expect(mocks.recordLedgerEntry).not.toHaveBeenCalled()
    expect(mocks.recomputeCustomerAr).not.toHaveBeenCalled()
  })

  it('rejects a payment that belongs to a different customer', async () => {
    mocks.mockPrismaRef.current!.payment.findFirst.mockResolvedValue({
      customerId: 'cus_other',
      currency: 'JMD',
      status: 'SUCCEEDED',
      amount: 10_000n,
      amountRefunded: 0n,
      unappliedAmount: 5_000n,
    })

    const result = await createRefund(paymentParams())

    expect(result).toEqual({
      data: null,
      error: 'The payment belongs to a different customer.',
      status: 422,
    })
    expect(mocks.mockPrismaRef.current!.payment.update).not.toHaveBeenCalled()
    expect(mocks.mockPrismaRef.current!.refund.create).not.toHaveBeenCalled()
  })

  it('rejects a payment whose currency differs from the refund', async () => {
    mocks.mockPrismaRef.current!.payment.findFirst.mockResolvedValue({
      customerId: CUSTOMER,
      currency: 'USD',
      status: 'SUCCEEDED',
      amount: 10_000n,
      amountRefunded: 0n,
      unappliedAmount: 5_000n,
    })

    const result = await createRefund(paymentParams())

    expect(result).toEqual({
      data: null,
      error: 'The payment uses a different currency.',
      status: 422,
    })
    expect(mocks.mockPrismaRef.current!.payment.update).not.toHaveBeenCalled()
    expect(mocks.mockPrismaRef.current!.refund.create).not.toHaveBeenCalled()
  })

  it('keeps a partially refunded credit note open with its reduced balance', async () => {
    const result = await createRefund(creditNoteParams())

    expect(result).toEqual({ data: { id: 'ref_1' }, error: null })
    expect(mocks.mockPrismaRef.current!.creditNote.update).toHaveBeenCalledWith(
      {
        where: { id: CREDIT_NOTE },
        data: {
          balanceAmount: 3_000n,
          status: 'OPEN',
          updatedAt: NOW,
        },
      }
    )
    expect(mocks.mockPrismaRef.current!.payment.update).not.toHaveBeenCalled()
  })

  it('closes a credit note when its entire remaining balance is refunded', async () => {
    const result = await createRefund(creditNoteParams(5_000n))

    expect(result).toEqual({ data: { id: 'ref_1' }, error: null })
    expect(mocks.mockPrismaRef.current!.creditNote.update).toHaveBeenCalledWith(
      {
        where: { id: CREDIT_NOTE },
        data: {
          balanceAmount: 0n,
          status: 'CLOSED',
          updatedAt: NOW,
        },
      }
    )
  })

  it('rejects refunds when the customer is not active', async () => {
    mocks.mockPrismaRef.current!.customer.findFirst.mockResolvedValue(null)

    const result = await createRefund(paymentParams())

    expect(result).toEqual({
      data: null,
      error: 'Active customer not found.',
      status: 404,
    })
    expect(
      mocks.mockPrismaRef.current!.payment.findFirst
    ).not.toHaveBeenCalled()
    expect(mocks.mockPrismaRef.current!.refund.create).not.toHaveBeenCalled()
  })
})
