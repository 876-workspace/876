import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  quoteFindFirst: vi.fn(),
  salespersonFindFirst: vi.fn(),
  invoiceFindFirst: vi.fn(),
  invoiceCreate: vi.fn(),
  transaction: vi.fn(),
  defaults: vi.fn(),
  nextDocumentNumber: vi.fn(),
}))

vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => 1_700_000_000 }))
vi.mock('@/db/client', () => ({
  prisma: {
    quote: { findFirst: mocks.quoteFindFirst },
    salesperson: { findFirst: mocks.salespersonFindFirst },
    invoice: { findFirst: mocks.invoiceFindFirst },
    $transaction: mocks.transaction,
  },
}))
vi.mock('./defaults', () => ({ resolveInvoiceDefaults: mocks.defaults }))
vi.mock('../../document-numbers.repository', () => ({
  nextDocumentNumber: mocks.nextDocumentNumber,
}))

import { create } from './create'

const tenantId = 'ten_123'
const quoteId = 'quo_123'

function quote() {
  return {
    id: quoteId,
    customerId: 'cus_123',
    priceListId: null,
    priceListName: null,
    currency: 'JMD',
    subtotalAmount: 12_500n,
    taxAmount: 0n,
    totalAmount: 12_500n,
    notes: null,
    terms: null,
    lines: [],
    convertedInvoice: null,
  }
}

function invoiceDefaults() {
  return {
    customer: { id: 'cus_123', name: 'Kingston Studio', email: null },
    taxBehavior: 'EXCLUSIVE',
    notes: null,
    terms: null,
    billingAddressSnapshot: null,
    shippingAddressSnapshot: null,
  }
}

describe('invoice creation from a quote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.quoteFindFirst.mockResolvedValue(quote())
    mocks.salespersonFindFirst.mockResolvedValue(null)
    mocks.defaults.mockResolvedValue(invoiceDefaults())
    mocks.nextDocumentNumber.mockResolvedValue('INV-000001')
    mocks.transaction.mockImplementation(
      async (
        callback: (tx: {
          invoice: { create: typeof mocks.invoiceCreate }
        }) => unknown
      ) => callback({ invoice: { create: mocks.invoiceCreate } })
    )
  })

  it('replays the invoice written by a concurrent quote conversion after P2002', async () => {
    mocks.invoiceCreate.mockRejectedValue({ code: 'P2002' })
    mocks.invoiceFindFirst.mockResolvedValue({ id: 'inv_existing' })

    const result = await create(tenantId, { quoteId })

    expect(result).toEqual({
      data: { id: 'inv_existing', replayed: true },
      error: null,
    })
    expect(mocks.invoiceCreate).toHaveBeenCalledTimes(1)
    expect(mocks.invoiceFindFirst).toHaveBeenCalledTimes(1)
    expect(mocks.invoiceFindFirst).toHaveBeenCalledWith({
      where: { tenantId, quoteId },
      select: { id: true },
    })
  })

  it('does not convert a non-unique persistence failure into a quote replay', async () => {
    const error = new Error('database unavailable')
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.invoiceCreate.mockRejectedValue(error)

    const result = await create(tenantId, { quoteId })

    expect(result).toEqual({
      data: null,
      error: 'Failed to create the invoice.',
      status: 500,
    })
    expect(mocks.invoiceFindFirst).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith(
      '[billing.service.invoices.create]',
      error
    )
    consoleError.mockRestore()
  })
})
