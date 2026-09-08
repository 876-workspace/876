import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  quoteRetrieve: vi.fn(),
  invoiceCreate: vi.fn(),
}))

vi.mock('./repositories/quotes', () => ({
  quotes: {
    retrieve: mocks.quoteRetrieve,
  },
}))
vi.mock('./repositories/invoices', () => ({
  invoices: {
    create: mocks.invoiceCreate,
  },
}))
vi.mock('./repositories/credit-notes', () => ({ creditNotes: {} }))
vi.mock('./repositories/invoice-preferences', () => ({ invoicePreferences: {} }))
vi.mock('./workflows', () => ({
  finalizeInvoiceWorkflow: vi.fn(),
  sendInvoiceWorkflow: vi.fn(),
  voidInvoiceWorkflow: vi.fn(),
  writeOffInvoiceWorkflow: vi.fn(),
}))

import { documentsService } from './documents.service'

const convertedInvoice = {
  customerId: 'cus_1',
  quoteId: 'quo_1',
  lines: undefined,
}

describe('documentsService quote conversion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.invoiceCreate.mockResolvedValue({
      data: { id: 'inv_1', replayed: false },
      error: null,
    })
  })

  it('rejects invoice conversion before the quote is accepted', async () => {
    mocks.quoteRetrieve.mockResolvedValue({ id: 'quo_1', status: 'SENT' })

    await expect(
      documentsService.createInvoice('ten_1', convertedInvoice)
    ).rejects.toMatchObject({
      code: 'invoice/invalid-state',
      message: 'Accept the quote before converting it to an invoice.',
      httpStatus: 409,
    })
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('creates one draft invoice from an accepted quote through the existing invoice create path', async () => {
    mocks.quoteRetrieve.mockResolvedValue({ id: 'quo_1', status: 'ACCEPTED' })

    await expect(
      documentsService.createInvoice('ten_1', convertedInvoice)
    ).resolves.toEqual({
      resource: { object: 'invoice', id: 'inv_1' },
      replayed: false,
    })
    expect(mocks.invoiceCreate).toHaveBeenCalledWith(
      'ten_1',
      convertedInvoice,
      undefined
    )
  })
})
