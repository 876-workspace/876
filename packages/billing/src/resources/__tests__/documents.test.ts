import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../../client'

const BASE = 'https://billing.example.test'

const quote = { object: 'quote' as const, id: 'quo_1', status: 'DRAFT' }
const invoice = {
  object: 'invoice' as const,
  id: 'inv_1',
  number: 'INV-1',
  status: 'DRAFT' as const,
  customerId: 'cus_1',
  currency: 'JMD',
  billingReason: 'MANUAL',
  subscriptionId: null,
  salesOrderId: null,
  priceListId: null,
  salespersonId: null,
  customerName: null,
  customerEmail: null,
  billingAddressSnapshot: null,
  taxBehavior: 'EXCLUSIVE' as const,
  subject: null,
  orderNumber: null,
  referenceNumber: null,
  paymentTermName: null,
  salespersonName: null,
  notes: null,
  terms: null,
  issueAt: null,
  dueAt: null,
  servicePeriodStart: null,
  servicePeriodEnd: null,
  subtotalAmount: '0',
  taxAmount: '0',
  discountAmount: '0',
  shippingAmount: '0',
  adjustmentAmount: '0',
  totalAmount: '0',
  amountDue: '0',
  amountPaid: '0',
  amountCredited: '0',
  customer: {
    id: 'cus_1',
    name: 'Ada',
    companyName: null,
    email: null,
    phone: null,
    addresses: [],
  },
  lines: [],
  lateFeeAssessment: null,
  paymentAllocations: [],
  creditNoteAllocations: [],
}
const creditNote = {
  object: 'credit_note' as const,
  id: 'cn_1',
  status: 'OPEN',
}

function client(fetch: ReturnType<typeof vi.fn>) {
  return create876Client({
    baseUrl: BASE,
    fetch: fetch as unknown as typeof globalThis.fetch,
  })
}

function response(data: unknown) {
  return vi.fn().mockResolvedValue(Response.json({ data, error: null }))
}

function list(data: unknown[], url: string) {
  return { object: 'list' as const, data, has_more: false, total_count: 1, url }
}

describe('document resources', () => {
  it('creates a quote with its exact body and returns the resource', async () => {
    const fetch = response(quote)
    const params = {
      customerId: 'cus_1',
      currency: 'JMD',
      lines: [{ description: 'Design', unitAmount: '15000' }],
    }
    const result = await client(fetch).quotes.create(params)

    expect(result).toEqual({ data: quote, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/quotes`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })

  it('lists quotes with the exact status query and returns the list envelope', async () => {
    const data = list([quote], '/api/v1/quotes')
    const fetch = response(data)
    const result = await client(fetch).quotes.list({ status: 'SENT' })

    expect(result).toEqual({ data, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/quotes?status=SENT`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('retrieves a quote and returns the resource', async () => {
    const fetch = response(quote)
    const result = await client(fetch).quotes.retrieve('quo_1')

    expect(result).toEqual({ data: quote, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/quotes/quo_1`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('updates a quote with its exact body and returns the resource', async () => {
    const fetch = response({ ...quote, notes: 'Revised scope' })
    const params = { notes: 'Revised scope' }
    const result = await client(fetch).quotes.update('quo_1', params)

    expect(result).toEqual({
      data: { ...quote, notes: 'Revised scope' },
      error: null,
    })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/quotes/quo_1`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(params) })
    )
  })

  it('deletes a quote and returns its tombstone', async () => {
    const data = {
      object: 'quote' as const,
      id: 'quo_1',
      deleted: true as const,
    }
    const fetch = response(data)
    const result = await client(fetch).quotes.delete('quo_1')

    expect(result).toEqual({ data, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/quotes/quo_1`,
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it.each(['send', 'accept', 'decline', 'cancel'] as const)(
    'posts quote %s with an empty body and returns the resource',
    async (action) => {
      const fetch = response({ ...quote, status: action })
      const result = await client(fetch).quotes[action]('quo_1')

      expect(result).toEqual({
        data: { ...quote, status: action },
        error: null,
      })
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/quotes/quo_1/${action}`,
        expect.objectContaining({ method: 'POST', body: '{}' })
      )
    }
  )

  it('lists invoices with the exact status query and returns the list envelope', async () => {
    const data = list([invoice], '/api/v1/invoices')
    const fetch = response(data)
    const result = await client(fetch).invoices.list({ status: 'OPEN' })

    expect(result).toEqual({ data, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/invoices?status=OPEN`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('creates an invoice with its exact body and returns the resource', async () => {
    const data = { object: 'invoice' as const, id: 'inv_1' }
    const fetch = response(data)
    const params = {
      customerId: 'cus_1',
      currency: 'JMD',
      lines: [{ description: 'Hosting', unitAmount: '2000' }],
    }
    const result = await client(fetch).invoices.create(params)

    expect(result).toEqual({ data, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/invoices`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })

  it('retrieves an invoice and returns the resource', async () => {
    const fetch = response(invoice)
    const result = await client(fetch).invoices.retrieve('inv_1')

    expect(result).toEqual({ data: invoice, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/invoices/inv_1`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('updates an invoice with its exact body and returns the resource', async () => {
    const fetch = response({ ...invoice, subject: 'September services' })
    const params = { subject: 'September services' }
    const result = await client(fetch).invoices.update('inv_1', params)

    expect(result).toEqual({
      data: { ...invoice, subject: 'September services' },
      error: null,
    })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/invoices/inv_1`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(params) })
    )
  })

  it('deletes an invoice and returns its tombstone', async () => {
    const data = {
      object: 'invoice' as const,
      id: 'inv_1',
      deleted: true as const,
    }
    const fetch = response(data)
    const result = await client(fetch).invoices.delete('inv_1')

    expect(result).toEqual({ data, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/invoices/inv_1`,
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('finalizes an invoice with its exact body and returns the resource', async () => {
    const data = { object: 'invoice' as const, id: 'inv_1' }
    const fetch = response(data)
    const params = { autoApplyCredits: true }
    const result = await client(fetch).invoices.finalize('inv_1', params)

    expect(result).toEqual({ data, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/invoices/inv_1/finalize`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })

  it('records an invoice send with an empty body and returns the resource', async () => {
    const data = { object: 'invoice' as const, id: 'inv_1' }
    const fetch = response(data)
    const result = await client(fetch).invoices.send('inv_1')

    expect(result).toEqual({ data, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/invoices/inv_1/send`,
      expect.objectContaining({ method: 'POST', body: '{}' })
    )
  })

  it('voids an invoice with its exact body and returns the resource', async () => {
    const data = { object: 'invoice' as const, id: 'inv_1' }
    const fetch = response(data)
    const params = { reason: 'Duplicate' }
    const result = await client(fetch).invoices.void('inv_1', params)

    expect(result).toEqual({ data, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/invoices/inv_1/void`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })

  it('writes off an invoice with its exact body and returns the resource', async () => {
    const data = { object: 'invoice' as const, id: 'inv_1' }
    const fetch = response(data)
    const params = { reason: 'Collection exhausted' }
    const result = await client(fetch).invoices.writeOff('inv_1', params)

    expect(result).toEqual({ data, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/invoices/inv_1/write-off`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })

  it('lists credit notes with the exact status query and returns the list envelope', async () => {
    const data = list([creditNote], '/api/v1/credit-notes')
    const fetch = response(data)
    const result = await client(fetch).creditNotes.list({ status: 'OPEN' })

    expect(result).toEqual({ data, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/credit-notes?status=OPEN`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('creates a credit note with its exact body and returns the resource', async () => {
    const fetch = response(creditNote)
    const params = {
      customerId: 'cus_1',
      currency: 'JMD',
      lines: [{ description: 'Refund', unitAmount: '3000' }],
    }
    const result = await client(fetch).creditNotes.create(params)

    expect(result).toEqual({ data: creditNote, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/credit-notes`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })

  it('applies a credit note with its exact body and returns the resource', async () => {
    const fetch = response({ ...creditNote, status: 'CLOSED' })
    const params = { allocations: [{ invoiceId: 'inv_1', amount: '3000' }] }
    const result = await client(fetch).creditNotes.apply('cn_1', params)

    expect(result).toEqual({
      data: { ...creditNote, status: 'CLOSED' },
      error: null,
    })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/credit-notes/cn_1/apply`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })

  it('voids a credit note with an empty body and returns the resource', async () => {
    const fetch = response({ ...creditNote, status: 'VOID' })
    const result = await client(fetch).creditNotes.void('cn_1')

    expect(result).toEqual({
      data: { ...creditNote, status: 'VOID' },
      error: null,
    })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/credit-notes/cn_1/void`,
      expect.objectContaining({ method: 'POST', body: '{}' })
    )
  })

  it('preserves a quote application error without throwing', async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json(
        {
          data: null,
          error: {
            code: 'billing/quote-not-found',
            message: 'Quote not found.',
          },
        },
        { status: 404 }
      )
    )
    const result = await client(fetch).quotes.retrieve('missing')

    expect(result).toEqual({
      data: null,
      error: { code: 'billing/quote-not-found', message: 'Quote not found.' },
    })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/quotes/missing`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('preserves a credit-note application error without throwing', async () => {
    const fetch = vi.fn().mockResolvedValue(
      Response.json(
        {
          data: null,
          error: {
            code: 'billing/credit-note-invalid-state',
            message: 'Credit note cannot be voided.',
          },
        },
        { status: 422 }
      )
    )
    const result = await client(fetch).creditNotes.void('cn_1')

    expect(result).toEqual({
      data: null,
      error: {
        code: 'billing/credit-note-invalid-state',
        message: 'Credit note cannot be voided.',
      },
    })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/credit-notes/cn_1/void`,
      expect.objectContaining({ method: 'POST', body: '{}' })
    )
  })

  it('encodes a quote ID in its retrieve path', async () => {
    const fetch = response(quote)
    await client(fetch).quotes.retrieve('quo/one two')

    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/quotes/quo%2Fone%20two`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('encodes a credit-note ID in its apply path', async () => {
    const fetch = response(creditNote)
    const params = { allocations: [{ invoiceId: 'inv_1', amount: '3000' }] }
    await client(fetch).creditNotes.apply('cn/one two', params)

    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/credit-notes/cn%2Fone%20two/apply`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })
})
