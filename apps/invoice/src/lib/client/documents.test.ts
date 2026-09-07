import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('./request', () => ({ request: mocks.request }))

import { documents } from './documents'

describe('documents.create', () => {
  beforeEach(() => {
    mocks.request.mockResolvedValue({
      data: { object: 'invoice', id: 'inv_123' },
      error: null,
    })
  })

  it('posts an invoice to Invoice’s same-origin API route', async () => {
    const params = { customerId: 'cus_123', lines: [] }

    const result = await documents.create(params)

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('/api/invoices', {
      method: 'POST',
      headers: expect.objectContaining({
        'Idempotency-Key': expect.any(String),
      }),
      body: JSON.stringify(params),
    })
    expect(result).toEqual({
      data: { object: 'invoice', id: 'inv_123' },
      error: null,
    })
  })

  it('serializes minor-unit amounts as integer strings', async () => {
    const params = {
      customerId: 'cus_123',
      discountAmount: '400',
      shippingAmount: '25',
      adjustmentAmount: '-10',
      lines: [
        {
          description: 'Consulting',
          quantity: 2,
          unitAmount: '150007',
          taxAmount: '0',
          discountAmount: '7',
        },
      ],
    }

    await documents.create(params)

    expect(JSON.parse(mocks.request.mock.calls[0]?.[1].body as string)).toEqual(
      params
    )
  })

  it('never targets a Billing service origin', async () => {
    await documents.create({ customerId: 'cus_123', lines: [] })

    expect(mocks.request.mock.calls[0]?.[0]).toBe('/api/invoices')
    expect(mocks.request.mock.calls[0]?.[0]).not.toContain('billing')
  })

  it('posts quote payloads to the quote route when the caller selects it', async () => {
    const params = {
      customerId: 'cus_123',
      issueAt: 1_788_652_800,
      notes: 'Valid for 30 days.',
      terms: null,
      lines: [
        {
          description: 'Consulting',
          quantity: 1,
          unitAmount: '150007',
          discountAmount: '0',
          taxAmount: '0',
        },
      ],
    }

    const result = await documents.create(params, '/api/quotes')

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('/api/quotes', {
      method: 'POST',
      headers: expect.objectContaining({
        'Idempotency-Key': expect.any(String),
      }),
      body: JSON.stringify(params),
    })
    expect(result).toEqual({
      data: { object: 'invoice', id: 'inv_123' },
      error: null,
    })
  })
})

describe('documents.update and delete', () => {
  it('patches an invoice with the exact update payload', async () => {
    const params = {
      dueAt: 1_788_652_800,
      notes: 'Updated note',
      terms: null,
      referenceNumber: 'PO-42',
    }

    await documents.update('inv_123', params)

    expect(mocks.request).toHaveBeenCalledWith('/api/invoices/inv_123', {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
  })

  it('deletes the exact invoice resource', async () => {
    await documents.delete('inv_123')

    expect(mocks.request).toHaveBeenCalledWith('/api/invoices/inv_123', {
      method: 'DELETE',
    })
  })
})
