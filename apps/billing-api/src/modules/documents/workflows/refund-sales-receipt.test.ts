import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claimCommand: vi.fn(),
  completeCommand: vi.fn(),
  computeTotals: vi.fn(),
  createCreditNoteRefund: vi.fn(),
  enqueueBillingEvent: vi.fn(),
  nextDocumentNumber: vi.fn(),
  recordCreditNote: vi.fn(),
  returnStock: vi.fn(),
  runSalesReceiptTransaction: vi.fn(),
}))

vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => 100 }))
vi.mock('@/modules/command-idempotency', () => ({
  claimCommand: mocks.claimCommand,
  completeCommand: mocks.completeCommand,
}))
vi.mock('@/modules/inventory', () => ({ returnStock: mocks.returnStock }))
vi.mock('@/modules/outbox', () => ({
  enqueueBillingEvent: mocks.enqueueBillingEvent,
}))
vi.mock('@/modules/payments', () => ({
  createCreditNoteRefund: mocks.createCreditNoteRefund,
  RefundMutationError: class RefundMutationError extends Error {},
}))
vi.mock('@/platform/ids', () => ({
  generateId: (type: string) => (type === 'CreditNote' ? 'cn_1' : 'ref_1'),
}))
vi.mock('@/platform/prisma-errors', () => ({
  isRetryableTransactionError: () => false,
}))
vi.mock('../document-numbers.repository', () => ({
  nextDocumentNumber: mocks.nextDocumentNumber,
}))
vi.mock('../repositories/credit-notes/record', () => ({
  recordCreditNote: mocks.recordCreditNote,
}))
vi.mock('../repositories/credit-notes/shared', () => ({
  computeTotals: mocks.computeTotals,
}))
vi.mock('../repositories/sales-receipt-workflow', () => ({
  runSalesReceiptTransaction: mocks.runSalesReceiptTransaction,
}))

import { refundSalesReceiptWorkflow } from './refund-sales-receipt'

function receipt(overrides: Record<string, unknown> = {}) {
  return {
    id: 'sr_1',
    status: 'PAID',
    customerId: 'cus_1',
    number: 'SR-000001',
    totalAmount: 1_100n,
    taxAmount: 100n,
    currency: 'JMD',
    lines: [{ id: 'srl_1', itemId: 'item_1', variantId: null, quantity: 2 }],
    payment: { paymentModeId: 'pmode_1', depositAccountId: 'bank_1' },
    creditNotes: [],
    ...overrides,
  }
}

describe('refund Sales Receipt workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.runSalesReceiptTransaction.mockImplementation(
      async (work: (tx: object) => Promise<unknown>) =>
        work({
          salesReceipt: { findFirst: vi.fn().mockResolvedValue(receipt()) },
        })
    )
    mocks.returnStock.mockResolvedValue({
      data: { movementCount: 1 },
      error: null,
    })
    mocks.nextDocumentNumber
      .mockResolvedValueOnce('CN-000001')
      .mockResolvedValueOnce('REF-000001')
    mocks.computeTotals.mockReturnValue({
      subtotalAmount: 500n,
      taxAmount: 50n,
      totalAmount: 550n,
    })
    mocks.recordCreditNote.mockResolvedValue(undefined)
    mocks.createCreditNoteRefund.mockResolvedValue(undefined)
    mocks.enqueueBillingEvent.mockResolvedValue({ id: 'evt_1' })
  })

  function withReceipt(row: Record<string, unknown>) {
    mocks.runSalesReceiptTransaction.mockImplementation(
      async (work: (tx: object) => Promise<unknown>) =>
        work({ salesReceipt: { findFirst: vi.fn().mockResolvedValue(row) } })
    )
  }

  it('rejects a refund above total minus credited value', async () => {
    withReceipt(receipt({ creditNotes: [{ totalAmount: 200n }] }))

    await expect(
      refundSalesReceiptWorkflow('ten_1', 'sr_1', {
        amount: 901n,
        returnLines: [],
      })
    ).resolves.toEqual({
      data: null,
      error: 'Refund exceeds the uncredited Sales Receipt amount.',
      status: 422,
    })
    expect(mocks.recordCreditNote).toHaveBeenCalledTimes(0)
    expect(mocks.createCreditNoteRefund).toHaveBeenCalledTimes(0)
  })

  it('pins the proportional tax split with exact bigint values', async () => {
    await refundSalesReceiptWorkflow('ten_1', 'sr_1', {
      amount: 550n,
      returnLines: [],
    })

    expect(mocks.computeTotals).toHaveBeenCalledWith([
      {
        description: 'Return/refund for Sales Receipt SR-000001',
        quantity: 1,
        unitAmount: 500n,
        taxAmount: 50n,
        discountAmount: 0n,
      },
    ])
  })

  it('returns 404 when a requested return line is not on the receipt', async () => {
    await expect(
      refundSalesReceiptWorkflow('ten_1', 'sr_1', {
        amount: 100n,
        returnLines: [{ salesReceiptLineId: 'srl_missing', quantity: 1 }],
      })
    ).resolves.toEqual({
      data: null,
      error: 'One or more Sales Receipt return lines were not found.',
      status: 404,
    })
    expect(mocks.returnStock).toHaveBeenCalledTimes(0)
  })

  it('returns 422 when a requested quantity exceeds the sold quantity', async () => {
    await expect(
      refundSalesReceiptWorkflow('ten_1', 'sr_1', {
        amount: 100n,
        returnLines: [{ salesReceiptLineId: 'srl_1', quantity: 3 }],
      })
    ).resolves.toEqual({
      data: null,
      error:
        'A return quantity cannot exceed the quantity sold on its Sales Receipt line.',
      status: 422,
    })
    expect(mocks.returnStock).toHaveBeenCalledTimes(0)
  })

  it('returns 422 when a return line has no item or variant stock target', async () => {
    withReceipt(
      receipt({
        lines: [{ id: 'srl_1', itemId: null, variantId: null, quantity: 1 }],
      })
    )

    await expect(
      refundSalesReceiptWorkflow('ten_1', 'sr_1', {
        amount: 100n,
        returnLines: [{ salesReceiptLineId: 'srl_1', quantity: 1 }],
      })
    ).resolves.toEqual({
      data: null,
      error:
        'Only Sales Receipt lines backed by tracked catalog items can restore stock.',
      status: 422,
    })
  })

  it('returns 409 when the receipt is no longer paid', async () => {
    withReceipt(receipt({ status: 'VOID' }))

    await expect(
      refundSalesReceiptWorkflow('ten_1', 'sr_1', {
        amount: 100n,
        returnLines: [],
      })
    ).resolves.toEqual({
      data: null,
      error: 'Only a paid Sales Receipt can be refunded.',
      status: 409,
    })
    expect(mocks.recordCreditNote).toHaveBeenCalledTimes(0)
  })

  it('creates linked Credit Note and Refund, then emits one event', async () => {
    await expect(
      refundSalesReceiptWorkflow('ten_1', 'sr_1', {
        amount: 550n,
        returnLines: [],
      })
    ).resolves.toEqual({
      data: { id: 'sr_1' },
      error: null,
    })
    expect(mocks.recordCreditNote).toHaveBeenCalledWith(
      expect.anything(),
      'ten_1',
      expect.objectContaining({
        id: 'cn_1',
        salesReceiptId: 'sr_1',
        number: 'CN-000001',
      })
    )
    expect(mocks.createCreditNoteRefund).toHaveBeenCalledWith(
      expect.anything(),
      'ten_1',
      expect.objectContaining({
        refundId: 'ref_1',
        creditNoteId: 'cn_1',
        number: 'REF-000001',
        amount: 550n,
      })
    )
    expect(mocks.enqueueBillingEvent).toHaveBeenCalledWith(
      expect.anything(),
      'ten_1',
      expect.objectContaining({
        type: 'sales-receipt.refunded',
        resource: { type: 'sales-receipt', id: 'sr_1' },
      })
    )
  })
})
