import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findQuoteConversionSource: vi.fn(),
  lockQuoteConversion: vi.fn(),
  findConvertedSalesOrder: vi.fn(),
  resolveSalesOrderDefaults: vi.fn(),
  hasEnabledCurrency: vi.fn(),
  nextDocumentNumber: vi.fn(),
  createSalesOrderRow: vi.fn(),
  runSalesOrderTransaction: vi.fn(),
}))

vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => 100 }))
vi.mock('@/platform/ids', () => ({
  generateId: (kind: string) => `${kind}_123`,
}))
vi.mock('@/modules/currencies', () => ({
  hasEnabledCurrency: mocks.hasEnabledCurrency,
}))
vi.mock('../document-numbers.repository', () => ({
  nextDocumentNumber: mocks.nextDocumentNumber,
}))
vi.mock('../repositories/quotes/conversion', () => ({
  findQuoteConversionSource: mocks.findQuoteConversionSource,
  lockQuoteConversion: mocks.lockQuoteConversion,
  findConvertedSalesOrder: mocks.findConvertedSalesOrder,
}))
vi.mock('../repositories/sales-orders', () => ({
  resolveSalesOrderDefaults: mocks.resolveSalesOrderDefaults,
  createSalesOrderRow: mocks.createSalesOrderRow,
  runSalesOrderTransaction: mocks.runSalesOrderTransaction,
}))

import { convertQuoteToSalesOrderWorkflow } from './convert-quote-to-sales-order'

const quote = {
  id: 'quo_123',
  customerId: 'cus_123',
  currency: 'USD',
  status: 'ACCEPTED',
  priceListId: 'pl_123',
  priceListName: 'Standard',
  subtotalAmount: 10000n,
  totalAmount: 11000n,
  notes: 'Quote note',
  terms: 'Net 30',
  lines: [
    {
      itemId: 'item_123',
      variantId: 'var_123',
      variantName: 'Large',
      variantSku: 'SKU-1',
      priceId: 'price_123',
      description: 'Consulting',
      quantity: 2,
      unitAmount: 5000n,
      taxAmount: 1000n,
      discountAmount: 0n,
      totalAmount: 11000n,
    },
  ],
}

describe('convertQuoteToSalesOrderWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.findQuoteConversionSource.mockResolvedValue(quote)
    mocks.lockQuoteConversion.mockResolvedValue({ kind: 'created', quote })
    mocks.resolveSalesOrderDefaults.mockResolvedValue({
      customer: { name: 'Ana', email: 'ana@example.test' },
      salesperson: null,
      taxBehavior: 'EXCLUSIVE',
      billingAddressSnapshot: null,
      shippingAddressSnapshot: null,
      notes: null,
      terms: null,
    })
    mocks.hasEnabledCurrency.mockResolvedValue(true)
    mocks.nextDocumentNumber.mockResolvedValue('SO-000001')
    mocks.createSalesOrderRow.mockResolvedValue(undefined)
    mocks.runSalesOrderTransaction.mockImplementation(
      async (work: (tx: object) => Promise<unknown>) =>
        work({ quote: { findFirst: vi.fn().mockResolvedValue(quote) } })
    )
  })

  it('requires an accepted quote before creating a Sales Order', async () => {
    mocks.lockQuoteConversion.mockResolvedValue({
      kind: 'created',
      quote: { ...quote, status: 'SENT' },
    })
    const result = await convertQuoteToSalesOrderWorkflow(
      'tenant_123',
      'quo_123',
      {}
    )
    expect(result).toMatchObject({
      data: null,
      code: 'billing/quote-invalid-state',
      status: 409,
    })
    expect(mocks.createSalesOrderRow).not.toHaveBeenCalled()
  })

  it('returns the existing Sales Order when the quote conversion is replayed', async () => {
    mocks.lockQuoteConversion.mockResolvedValue({
      kind: 'replayed',
      resourceId: 'so_existing',
    })
    const result = await convertQuoteToSalesOrderWorkflow(
      'tenant_123',
      'quo_123',
      {}
    )
    expect(result).toEqual({
      data: { id: 'so_existing', replayed: true },
      error: null,
    })
    expect(mocks.createSalesOrderRow).not.toHaveBeenCalled()
  })

  it('copies accepted quote line snapshots into the new Sales Order', async () => {
    const result = await convertQuoteToSalesOrderWorkflow(
      'tenant_123',
      'quo_123',
      {}
    )
    expect(result).toEqual({ data: { id: 'SalesOrder_123' }, error: null })
    expect(mocks.createSalesOrderRow).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        quoteId: 'quo_123',
        subtotalAmount: 10000n,
        totalAmount: 11000n,
        lines: [
          expect.objectContaining({
            itemId: 'item_123',
            variantId: 'var_123',
            variantName: 'Large',
            variantSku: 'SKU-1',
            priceId: 'price_123',
            description: 'Consulting',
            quantity: 2,
            unitAmount: 5000n,
            taxAmount: 1000n,
            totalAmount: 11000n,
          }),
        ],
      })
    )
  })

  it('does not create a Sales Order when the quote belongs to another tenant', async () => {
    mocks.findQuoteConversionSource.mockResolvedValue(null)
    const result = await convertQuoteToSalesOrderWorkflow(
      'tenant_other',
      'quo_123',
      {}
    )
    expect(result).toEqual({
      data: null,
      error: 'The selected quote was not found.',
      status: 404,
    })
    expect(mocks.lockQuoteConversion).not.toHaveBeenCalled()
    expect(mocks.createSalesOrderRow).not.toHaveBeenCalled()
  })
})
