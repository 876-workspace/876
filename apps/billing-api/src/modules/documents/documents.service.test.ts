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
vi.mock('./repositories/quotes/preferences', () => ({
  quotePreferences: {
    retrieve: vi.fn(),
    update: vi.fn(),
  },
}))
vi.mock('./repositories/credit-notes', () => ({ creditNotes: {} }))
vi.mock('./repositories/invoice-preferences', () => ({
  invoicePreferences: {},
}))
vi.mock('./workflows', () => ({
  finalizeInvoiceWorkflow: vi.fn(),
  sendInvoiceWorkflow: vi.fn(),
  transitionQuoteWorkflow: vi.fn(),
  voidInvoiceWorkflow: vi.fn(),
  writeOffInvoiceWorkflow: vi.fn(),
}))

import { documentsService } from './documents.service'
import { integrationPayloadHash } from '@/platform/idempotency'

const convertedInvoice = { quoteId: 'quo_1' }

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
    mocks.quoteRetrieve.mockResolvedValue({
      id: 'quo_1',
      status: 'ACCEPTED',
      convertedInvoice: null,
    })

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

  it('lets a previously accepted quote convert after its proposal expiry time passes', async () => {
    mocks.quoteRetrieve.mockResolvedValue({
      id: 'quo_1',
      status: 'ACCEPTED',
      expiresAt: 1,
      acceptedAt: 1,
      convertedInvoice: null,
    })

    await expect(
      documentsService.convertQuoteToInvoice('ten_1', 'quo_1')
    ).resolves.toMatchObject({
      object: 'invoice',
      id: 'inv_1',
      replayed: false,
    })
  })

  it('attributes the converted invoice to the caller and hashes the quote identity', async () => {
    mocks.quoteRetrieve.mockResolvedValue({
      id: 'quo_1',
      status: 'ACCEPTED',
      convertedInvoice: null,
    })
    const attribution = {
      sourceAppId: 'app_invoice',
      sourceExternalReference: null,
      sourceIdempotencyKey: 'conversion-key',
      sourcePayloadHash: 'empty-command-hash',
    }
    await documentsService.convertQuoteToInvoice('ten_1', 'quo_1', attribution)
    expect(mocks.invoiceCreate).toHaveBeenCalledWith(
      'ten_1',
      { quoteId: 'quo_1' },
      {
        ...attribution,
        sourcePayloadHash: integrationPayloadHash('{"quoteId":"quo_1"}'),
      }
    )
  })

  it('returns the already linked invoice when conversion is replayed', async () => {
    mocks.quoteRetrieve.mockResolvedValue({
      id: 'quo_1',
      status: 'ACCEPTED',
      convertedInvoice: { id: 'inv_existing', number: 'INV-100' },
    })

    await expect(
      documentsService.convertQuoteToInvoice('ten_1', 'quo_1')
    ).resolves.toEqual({
      object: 'invoice',
      id: 'inv_existing',
      replayed: true,
    })
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('turns a concurrent duplicate conversion into a successful replay', async () => {
    mocks.quoteRetrieve
      .mockResolvedValueOnce({
        id: 'quo_1',
        status: 'ACCEPTED',
        convertedInvoice: null,
      })
      .mockResolvedValueOnce({
        id: 'quo_1',
        status: 'ACCEPTED',
        convertedInvoice: { id: 'inv_race', number: 'INV-101' },
      })
    mocks.invoiceCreate.mockResolvedValue({
      data: null,
      error: 'Quote already converted.',
      status: 409,
    })

    await expect(
      documentsService.convertQuoteToInvoice('ten_1', 'quo_1')
    ).resolves.toEqual({ object: 'invoice', id: 'inv_race', replayed: true })
  })
})
