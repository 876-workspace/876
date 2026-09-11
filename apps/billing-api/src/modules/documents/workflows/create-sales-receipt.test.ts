import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  buildDocumentLines: vi.fn(),
  consume: vi.fn(),
  enqueueBillingEvent: vi.fn(),
  hasEnabledCurrency: vi.fn(),
  recordLedgerEntry: vi.fn(),
  recordSettledPayment: vi.fn(),
  createSalesReceiptRow: vi.fn(),
  findQuoteForSalesReceipt: vi.fn(),
  findSalesReceiptByIdempotency: vi.fn(),
  lockQuoteConversion: vi.fn(),
  nextDocumentNumber: vi.fn(),
  resolveSalesReceiptDefaults: vi.fn(),
  runSalesReceiptTransaction: vi.fn(),
}))

vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => 100 }))
vi.mock('@/modules/currencies', () => ({
  hasEnabledCurrency: mocks.hasEnabledCurrency,
}))
vi.mock('@/modules/inventory', () => ({ consume: mocks.consume }))
vi.mock('@/modules/ledger', () => ({
  recordLedgerEntry: mocks.recordLedgerEntry,
}))
vi.mock('@/modules/outbox', () => ({
  enqueueBillingEvent: mocks.enqueueBillingEvent,
}))
vi.mock('@/modules/payments', () => ({
  recordSettledPayment: mocks.recordSettledPayment,
}))
vi.mock('@/platform/ids', () => ({
  generateId: (type: string) =>
    type === 'SalesReceipt' ? 'sr_1' : `generated_${type}`,
}))
vi.mock('@/platform/prisma-errors', () => ({
  isRetryableTransactionError: () => false,
  isUniqueConstraintError: () => false,
}))
vi.mock('../document-numbers.repository', () => ({
  nextDocumentNumber: mocks.nextDocumentNumber,
}))
vi.mock('../repositories/documents/lines', () => ({
  buildDocumentLines: mocks.buildDocumentLines,
}))
vi.mock('../repositories/quotes/conversion', () => ({
  lockQuoteConversion: mocks.lockQuoteConversion,
}))
vi.mock('../repositories/sales-receipt-workflow', () => ({
  createSalesReceiptRow: mocks.createSalesReceiptRow,
  findQuoteForSalesReceipt: mocks.findQuoteForSalesReceipt,
  findSalesReceiptByIdempotency: mocks.findSalesReceiptByIdempotency,
  resolveSalesReceiptDefaults: mocks.resolveSalesReceiptDefaults,
  runSalesReceiptTransaction: mocks.runSalesReceiptTransaction,
}))

import { createSalesReceiptWorkflow } from './create-sales-receipt'

const tenantId = 'ten_1'
const params = {
  customerId: 'cus_1',
  paymentModeId: 'pmode_1',
  depositAccountId: 'bank_1',
  bankCharges: 25n,
  discountAmount: 0n,
  lines: [{ itemId: 'item_1', quantity: 2 }],
}
const preparedLines = [
  {
    itemId: 'item_1',
    variantId: null,
    variantName: null,
    variantSku: null,
    priceId: 'price_1',
    description: 'Widget',
    unit: null,
    quantity: 2,
    unitAmount: 500n,
    taxAmount: 100n,
    discountAmount: 0n,
    totalAmount: 1_100n,
  },
]

describe('create Sales Receipt workflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveSalesReceiptDefaults.mockResolvedValue({
      customer: {
        id: 'cus_1',
        name: 'Kingston Studio',
        email: 'hello@example.com',
        defaultCurrency: 'JMD',
        priceListId: null,
      },
      tenant: { defaultCurrency: 'JMD' },
      salesperson: null,
      taxBehavior: 'EXCLUSIVE',
      notes: null,
      terms: null,
      billingAddressSnapshot: null,
      shippingAddressSnapshot: null,
    })
    mocks.hasEnabledCurrency.mockResolvedValue(true)
    mocks.buildDocumentLines.mockResolvedValue({
      data: {
        priceList: null,
        lines: preparedLines,
        lineAmounts: [
          { subtotalAmount: 1_000n, taxAmount: 100n, discountAmount: 0n },
        ],
        subtotalAmount: 1_000n,
        taxAmount: 100n,
      },
      error: null,
    })
    mocks.runSalesReceiptTransaction.mockImplementation(
      async (work: (tx: object) => Promise<unknown>) => work({ tx: 'receipt' })
    )
    mocks.nextDocumentNumber
      .mockResolvedValueOnce('SR-000001')
      .mockResolvedValueOnce('PAY-000001')
    mocks.recordSettledPayment.mockResolvedValue({ id: 'pay_1' })
    mocks.createSalesReceiptRow.mockResolvedValue({ id: 'sr_1' })
    mocks.consume.mockResolvedValue({ data: { movementCount: 1 }, error: null })
    mocks.enqueueBillingEvent.mockResolvedValue({ id: 'evt_1' })
  })

  it('creates one Sales Receipt and one fully applied settled Payment without a ledger credit', async () => {
    await expect(createSalesReceiptWorkflow(tenantId, params)).resolves.toEqual(
      {
        data: { id: 'sr_1' },
        error: null,
      }
    )

    expect(mocks.recordSettledPayment).toHaveBeenCalledTimes(1)
    expect(mocks.recordSettledPayment).toHaveBeenCalledWith(
      { tx: 'receipt' },
      tenantId,
      expect.objectContaining({ amount: 1_100n, bankCharges: 25n }),
      100,
      undefined
    )
    expect(mocks.createSalesReceiptRow).toHaveBeenCalledTimes(1)
    expect(mocks.createSalesReceiptRow).toHaveBeenCalledWith(
      { tx: 'receipt' },
      expect.objectContaining({
        id: 'sr_1',
        paymentId: 'pay_1',
        totalAmount: 1_100n,
      })
    )
    expect(mocks.recordLedgerEntry).toHaveBeenCalledTimes(0)
  })

  it('consumes stock once with the Sales Receipt resource reference', async () => {
    await createSalesReceiptWorkflow(tenantId, params)

    expect(mocks.consume).toHaveBeenCalledTimes(1)
    expect(mocks.consume).toHaveBeenCalledWith({ tx: 'receipt' }, tenantId, {
      reference: { type: 'sales-receipt', id: 'sr_1' },
      reason: 'sale',
      lines: [{ target: { type: 'item', id: 'item_1' }, quantity: 2 }],
      occurredAt: 100,
    })
  })

  it('writes one created event after the receipt is persisted', async () => {
    await createSalesReceiptWorkflow(tenantId, params)

    expect(mocks.enqueueBillingEvent).toHaveBeenCalledTimes(1)
    expect(mocks.enqueueBillingEvent).toHaveBeenCalledWith(
      { tx: 'receipt' },
      tenantId,
      {
        type: 'sales-receipt.created',
        version: 1,
        resource: { type: 'sales-receipt', id: 'sr_1' },
        payload: {
          salesReceiptId: 'sr_1',
          customerId: 'cus_1',
          paymentId: 'pay_1',
          number: 'SR-000001',
          currency: 'JMD',
          totalAmount: '1100',
          receiptAt: 100,
        },
        occurredAt: 100,
      }
    )
  })

  it('returns the stock error without writing an event', async () => {
    mocks.consume.mockResolvedValue({
      data: null,
      error: 'Only 1 units of Widget are currently in stock.',
      status: 409,
    })

    await expect(createSalesReceiptWorkflow(tenantId, params)).resolves.toEqual(
      {
        data: null,
        error: 'Only 1 units of Widget are currently in stock.',
        status: 409,
      }
    )

    expect(mocks.enqueueBillingEvent).toHaveBeenCalledTimes(0)
  })

  it('rejects a zero total before starting a transaction', async () => {
    mocks.buildDocumentLines.mockResolvedValue({
      data: {
        priceList: null,
        lines: [],
        lineAmounts: [],
        subtotalAmount: 0n,
        taxAmount: 0n,
      },
      error: null,
    })

    await expect(createSalesReceiptWorkflow(tenantId, params)).resolves.toEqual(
      {
        data: null,
        error: 'A Sales Receipt total must be greater than zero.',
        status: 422,
      }
    )

    expect(mocks.runSalesReceiptTransaction).toHaveBeenCalledTimes(0)
  })

  it('rejects bank charges equal to the Sales Receipt total', async () => {
    await expect(
      createSalesReceiptWorkflow(tenantId, { ...params, bankCharges: 1_100n })
    ).resolves.toEqual({
      data: null,
      error: 'Bank charges must be less than the Sales Receipt total.',
      status: 422,
    })

    expect(mocks.runSalesReceiptTransaction).toHaveBeenCalledTimes(0)
  })

  it('replays an integration request without writing a receipt or payment', async () => {
    mocks.findSalesReceiptByIdempotency.mockResolvedValue({
      id: 'sr_existing',
      sourcePayloadHash: 'hash_1',
    })
    const attribution = {
      sourceAppId: 'app_1',
      sourceExternalReference: null,
      sourceIdempotencyKey: 'key_1',
      sourcePayloadHash: 'hash_1',
    }

    await expect(
      createSalesReceiptWorkflow(tenantId, params, attribution)
    ).resolves.toEqual({
      data: { id: 'sr_existing', replayed: true },
      error: null,
    })

    expect(mocks.runSalesReceiptTransaction).toHaveBeenCalledTimes(0)
    expect(mocks.recordSettledPayment).toHaveBeenCalledTimes(0)
    expect(mocks.createSalesReceiptRow).toHaveBeenCalledTimes(0)
  })

  it('returns the same-kind quote conversion as a replay from the transaction client', async () => {
    mocks.findQuoteForSalesReceipt.mockResolvedValue({
      id: 'quo_1',
      status: 'ACCEPTED',
      customerId: 'cus_1',
      priceListId: null,
      priceListName: null,
      currency: 'JMD',
      subtotalAmount: 1_000n,
      taxAmount: 100n,
      totalAmount: 1_100n,
      notes: null,
      terms: null,
      lines: [],
    })
    mocks.lockQuoteConversion.mockResolvedValue({
      kind: 'replayed',
      resourceId: 'sr_existing',
    })

    await expect(
      createSalesReceiptWorkflow(tenantId, {
        paymentModeId: 'pmode_1',
        depositAccountId: 'bank_1',
        bankCharges: 0n,
        discountAmount: 0n,
        quoteId: 'quo_1',
      })
    ).resolves.toEqual({
      data: { id: 'sr_existing', replayed: true },
      error: null,
    })

    expect(mocks.lockQuoteConversion).toHaveBeenCalledTimes(1)
    expect(mocks.lockQuoteConversion).toHaveBeenCalledWith(
      { tx: 'receipt' },
      tenantId,
      'quo_1',
      'sales-receipt'
    )
    expect(mocks.recordSettledPayment).toHaveBeenCalledTimes(0)
  })
})
