import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  prisma: { $transaction: vi.fn() },
  recordLedgerEntry: vi.fn(),
  recomputeCustomerAr: vi.fn(),
  reversePaymentAllocations: vi.fn(),
}))

vi.mock('@/lib/db', () => ({ prisma: mocks.prisma }))
vi.mock('../ledger', () => ({
  recordLedgerEntry: mocks.recordLedgerEntry,
}))
vi.mock('../customers/ar', () => ({
  recomputeCustomerAr: mocks.recomputeCustomerAr,
}))
vi.mock('./shared', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./shared')>()
  return {
    ...actual,
    reversePaymentAllocations: mocks.reversePaymentAllocations,
  }
})

import { deletePayment } from './delete'

describe('deletePayment', () => {
  beforeEach(() => vi.clearAllMocks())

  it('soft-cancels the payment and retains reversed allocations for audit', async () => {
    const payment = {
      id: 'pay_1',
      customerId: 'cus_1',
      status: 'SUCCEEDED',
      amount: 10_000n,
      currency: 'JMD',
      number: 'PAY-0001',
      revision: 0,
      refunds: [],
      invoiceAllocations: [{ id: 'palloc_1' }],
    }
    const tx = {
      payment: {
        findFirst: vi.fn().mockResolvedValue(payment),
        update: vi.fn().mockResolvedValue({}),
      },
      paymentAllocation: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      bankTransaction: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    }
    mocks.prisma.$transaction.mockImplementation(
      async (callback: (client: typeof tx) => unknown) => callback(tx)
    )

    await expect(deletePayment('ten_1', 'pay_1')).resolves.toEqual({
      data: { id: 'pay_1' },
      error: null,
    })
    expect(tx.paymentAllocation.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_1', paymentId: 'pay_1', reversedAt: null },
      data: expect.objectContaining({ reversedAt: expect.any(Number) }),
    })
    expect(tx.payment.update).toHaveBeenCalledWith({
      where: { id: 'pay_1' },
      data: expect.objectContaining({
        status: 'CANCELED',
        unappliedAmount: 0n,
        revision: { increment: 1 },
      }),
    })
    expect(mocks.recordLedgerEntry).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        type: 'PAYMENT_REVERSED',
        direction: 'DEBIT',
        amount: 10_000n,
      })
    )
  })
})
