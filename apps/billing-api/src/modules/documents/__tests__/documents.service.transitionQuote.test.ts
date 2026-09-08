import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transition: vi.fn(),
  preference: vi.fn(),
  quoteRetrieve: vi.fn(),
  invoiceCreate: vi.fn(),
}))

vi.mock('../workflows', () => ({
  finalizeInvoiceWorkflow: vi.fn(),
  sendInvoiceWorkflow: vi.fn(),
  transitionQuoteWorkflow: mocks.transition,
  voidInvoiceWorkflow: vi.fn(),
  writeOffInvoiceWorkflow: vi.fn(),
}))

vi.mock('../repositories/quotes/preferences', () => ({
  quotePreferences: {
    retrieve: mocks.preference,
    update: vi.fn(),
  },
}))

vi.mock('../repositories/quotes', () => ({
  quotes: {
    retrieve: mocks.quoteRetrieve,
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
}))

vi.mock('../repositories/invoices', () => ({
  invoices: {
    retrieve: vi.fn(),
    create: mocks.invoiceCreate,
    update: vi.fn(),
    delete: vi.fn(),
    list: vi.fn(),
  },
}))

import { documentsService } from '../documents.service'

const TENANT = 'ten_1'
const QUOTE = 'quo_1'

describe('documentsService.transitionQuote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transition.mockResolvedValue({
      data: { id: QUOTE },
      error: null,
    })
    mocks.preference.mockResolvedValue({
      object: 'quote-preference',
      acceptedQuoteConversion: 'manual',
    })
  })

  it.each(['send', 'accept', 'decline', 'cancel', 'expire'] as const)(
    'delegates %s to the canonical lifecycle workflow',
    async (action) => {
      await expect(
        documentsService.transitionQuote(TENANT, QUOTE, action)
      ).resolves.toEqual({ object: 'quote', id: QUOTE })

      expect(mocks.transition).toHaveBeenCalledWith(
        TENANT,
        QUOTE,
        action,
        undefined
      )
    }
  )

  it('forwards command idempotency context to the lifecycle workflow', async () => {
    const idempotency = {
      key: 'idem_1',
      requestHash: 'hash_1',
    }

    await documentsService.transitionQuote(TENANT, QUOTE, 'send', idempotency)

    expect(mocks.transition).toHaveBeenCalledWith(
      TENANT,
      QUOTE,
      'send',
      idempotency
    )
  })

  it('maps lifecycle conflicts to billing/quote-invalid-state', async () => {
    mocks.transition.mockResolvedValue({
      data: null,
      error: 'This quote cannot be changed from its current status.',
      status: 409,
      code: 'billing/quote-invalid-state',
    })

    await expect(
      documentsService.transitionQuote(TENANT, QUOTE, 'accept')
    ).rejects.toMatchObject({
      code: 'billing/quote-invalid-state',
      httpStatus: 409,
    })
  })

  it('does not create an invoice on acceptance when conversion is manual', async () => {
    await documentsService.transitionQuote(TENANT, QUOTE, 'accept')

    expect(mocks.preference).toHaveBeenCalledWith(TENANT)
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('creates one draft invoice after acceptance when the tenant opts in', async () => {
    mocks.preference.mockResolvedValue({
      object: 'quote-preference',
      acceptedQuoteConversion: 'draft-invoice-on-accept',
    })
    mocks.quoteRetrieve.mockResolvedValue({
      id: QUOTE,
      status: 'ACCEPTED',
      convertedInvoice: null,
    })
    mocks.invoiceCreate.mockResolvedValue({
      data: { id: 'inv_1' },
      error: null,
    })

    await documentsService.transitionQuote(TENANT, QUOTE, 'accept')

    expect(mocks.invoiceCreate).toHaveBeenCalledWith(
      TENANT,
      { quoteId: QUOTE },
      undefined
    )
  })

  it('repairs an acceptance retry by reusing the already converted invoice', async () => {
    mocks.preference.mockResolvedValue({
      object: 'quote-preference',
      acceptedQuoteConversion: 'draft-invoice-on-accept',
    })
    mocks.quoteRetrieve.mockResolvedValue({
      id: QUOTE,
      status: 'ACCEPTED',
      convertedInvoice: { id: 'inv_existing', number: 'INV-100' },
    })

    await documentsService.transitionQuote(TENANT, QUOTE, 'accept')

    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('preserves integration ownership for automatic draft conversion', async () => {
    mocks.preference.mockResolvedValue({
      object: 'quote-preference',
      acceptedQuoteConversion: 'draft-invoice-on-accept',
    })
    mocks.quoteRetrieve.mockResolvedValue({
      id: QUOTE,
      status: 'ACCEPTED',
      convertedInvoice: null,
    })
    mocks.invoiceCreate.mockResolvedValue({
      data: { id: 'inv_1' },
      error: null,
    })
    const attribution = {
      sourceAppId: 'app_invoice',
      sourceExternalReference: null,
      sourceIdempotencyKey: 'accept-key',
      sourcePayloadHash: 'hash',
    }
    await documentsService.transitionQuote(
      TENANT,
      QUOTE,
      'accept',
      { key: 'accept-key', requestHash: 'hash' },
      attribution
    )
    expect(mocks.invoiceCreate).toHaveBeenCalledWith(
      TENANT,
      { quoteId: QUOTE },
      expect.objectContaining({
        sourceAppId: 'app_invoice',
        sourceIdempotencyKey: 'accept-key',
      })
    )
  })
})
