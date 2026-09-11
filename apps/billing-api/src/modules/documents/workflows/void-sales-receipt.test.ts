import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claimCommand: vi.fn(),
  completeCommand: vi.fn(),
  enqueueBillingEvent: vi.fn(),
  findSalesReceiptForVoid: vi.fn(),
  markSalesReceiptVoid: vi.fn(),
  restore: vi.fn(),
  reverseSettledPayment: vi.fn(),
  runSalesReceiptTransaction: vi.fn(),
  SettledPaymentReversalError: class SettledPaymentReversalError extends Error {
    constructor(
      message: string,
      readonly status: number
    ) {
      super(message)
    }
  },
}))

vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => 100 }))
vi.mock('@/modules/command-idempotency', () => ({
  claimCommand: mocks.claimCommand,
  completeCommand: mocks.completeCommand,
}))
vi.mock('@/modules/inventory', () => ({ restore: mocks.restore }))
vi.mock('@/modules/outbox', () => ({
  enqueueBillingEvent: mocks.enqueueBillingEvent,
}))
vi.mock('@/modules/payments', () => ({
  reverseSettledPayment: mocks.reverseSettledPayment,
  SettledPaymentReversalError: mocks.SettledPaymentReversalError,
}))
vi.mock('@/platform/prisma-errors', () => ({
  isRetryableTransactionError: () => false,
}))
vi.mock('../repositories/sales-receipt-workflow', () => ({
  findSalesReceiptForVoid: mocks.findSalesReceiptForVoid,
  markSalesReceiptVoid: mocks.markSalesReceiptVoid,
  runSalesReceiptTransaction: mocks.runSalesReceiptTransaction,
}))

import { voidSalesReceiptWorkflow } from './void-sales-receipt'

function receipt(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sr_1',
    status: 'PAID',
    customerId: 'cus_1',
    paymentId: 'pay_1',
    number: 'SR-000001',
    currency: 'JMD',
    totalAmount: 1_100n,
    lines: [],
    payment: { refunds: [], bankTransaction: { id: 'banktx_1' } },
    creditNotes: [],
    ...overrides,
  }
}

describe('void Sales Receipt workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.runSalesReceiptTransaction.mockImplementation(
      async (work: (tx: object) => Promise<unknown>) => work({ tx: 'void' })
    )
    mocks.findSalesReceiptForVoid.mockResolvedValue(receipt())
    mocks.reverseSettledPayment.mockResolvedValue(undefined)
    mocks.restore.mockResolvedValue({ data: { movementCount: 1 }, error: null })
    mocks.markSalesReceiptVoid.mockResolvedValue(undefined)
    mocks.enqueueBillingEvent.mockResolvedValue({ id: 'evt_1' })
  })

  it('reverses payment evidence, restores stock, and emits the void event', async () => {
    await expect(
      voidSalesReceiptWorkflow('ten_1', 'sr_1', {})
    ).resolves.toEqual({
      data: { id: 'sr_1' },
      error: null,
    })

    expect(mocks.reverseSettledPayment).toHaveBeenCalledWith(
      { tx: 'void' },
      'ten_1',
      'pay_1',
      100
    )
    expect(mocks.restore).toHaveBeenCalledWith({ tx: 'void' }, 'ten_1', {
      reference: { type: 'sales-receipt', id: 'sr_1' },
      reason: 'sale',
      occurredAt: 100,
    })
    expect(mocks.enqueueBillingEvent).toHaveBeenCalledWith(
      { tx: 'void' },
      'ten_1',
      {
        type: 'sales-receipt.voided',
        version: 1,
        resource: { type: 'sales-receipt', id: 'sr_1' },
        payload: {
          salesReceiptId: 'sr_1',
          customerId: 'cus_1',
          paymentId: 'pay_1',
          number: 'SR-000001',
          currency: 'JMD',
          amountReversed: '1100',
          voidedAt: 100,
        },
        occurredAt: 100,
      }
    )
  })

  it('rejects an already void Sales Receipt before payment or stock mutation', async () => {
    mocks.findSalesReceiptForVoid.mockResolvedValue(receipt({ status: 'VOID' }))

    await expect(
      voidSalesReceiptWorkflow('ten_1', 'sr_1', {})
    ).resolves.toEqual({
      data: null,
      error: 'Sales Receipt is already void.',
      status: 409,
    })
    expect(mocks.reverseSettledPayment).toHaveBeenCalledTimes(0)
    expect(mocks.restore).toHaveBeenCalledTimes(0)
  })

  it('rejects a receipt with a Credit Note before payment or stock mutation', async () => {
    mocks.findSalesReceiptForVoid.mockResolvedValue(
      receipt({ creditNotes: [{ id: 'cn_1', refunds: [] }] })
    )

    await expect(
      voidSalesReceiptWorkflow('ten_1', 'sr_1', {})
    ).resolves.toEqual({
      data: null,
      error: 'A Sales Receipt with return or refund evidence cannot be voided.',
      status: 409,
    })
    expect(mocks.reverseSettledPayment).toHaveBeenCalledTimes(0)
    expect(mocks.restore).toHaveBeenCalledTimes(0)
  })

  it('rejects a receipt with a Refund before payment or stock mutation', async () => {
    mocks.findSalesReceiptForVoid.mockResolvedValue(
      receipt({ payment: { refunds: [{ id: 'ref_1' }] } })
    )

    await expect(
      voidSalesReceiptWorkflow('ten_1', 'sr_1', {})
    ).resolves.toEqual({
      data: null,
      error: 'A Sales Receipt with return or refund evidence cannot be voided.',
      status: 409,
    })
    expect(mocks.reverseSettledPayment).toHaveBeenCalledTimes(0)
    expect(mocks.restore).toHaveBeenCalledTimes(0)
  })

  it('replays a command-idempotent void without loading or mutating the receipt', async () => {
    mocks.claimCommand.mockResolvedValue({
      data: { state: 'replayed', claimId: 'cmd_1' },
      error: null,
    })

    await expect(
      voidSalesReceiptWorkflow(
        'ten_1',
        'sr_1',
        {},
        { key: 'key_1', requestHash: 'hash_1' }
      )
    ).resolves.toEqual({ data: { id: 'sr_1' }, error: null })
    expect(mocks.findSalesReceiptForVoid).toHaveBeenCalledTimes(0)
    expect(mocks.reverseSettledPayment).toHaveBeenCalledTimes(0)
    expect(mocks.enqueueBillingEvent).toHaveBeenCalledTimes(0)
  })

  it('returns a settled-payment reversal status as a value', async () => {
    mocks.reverseSettledPayment.mockRejectedValue(
      new mocks.SettledPaymentReversalError('Payment not found.', 404)
    )

    await expect(
      voidSalesReceiptWorkflow('ten_1', 'sr_1', {})
    ).resolves.toEqual({
      data: null,
      error: 'Payment not found.',
      status: 404,
    })
  })
})
