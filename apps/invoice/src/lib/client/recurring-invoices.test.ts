import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('./request', () => ({ request: mocks.request }))

import { recurringInvoices } from './recurring-invoices'

describe('recurring invoices client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({ data: null, error: null })
  })

  it('lists through the Invoice proxy with the exact status filter', async () => {
    await recurringInvoices.list({ status: 'active' })

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/recurring-invoices?status=active'
    )
  })

  it('lists without a query string when unfiltered', async () => {
    await recurringInvoices.list({})

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('/api/recurring-invoices')
  })

  it('creates through the Invoice proxy with an idempotency key', async () => {
    const params = { profileName: 'Retainer' }

    await recurringInvoices.create(
      params as Parameters<typeof recurringInvoices.create>[0]
    )

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith('/api/recurring-invoices', {
      method: 'POST',
      headers: expect.objectContaining({
        'Idempotency-Key': expect.any(String),
      }),
      body: JSON.stringify(params),
    })
  })

  it('pauses through the encoded profile route', async () => {
    await recurringInvoices.pause('rinv/1')

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/recurring-invoices/rinv%2F1/pause',
      {
        method: 'POST',
        headers: expect.objectContaining({
          'Idempotency-Key': expect.any(String),
        }),
        body: '{}',
      }
    )
  })

  it('deletes through the encoded profile route', async () => {
    await recurringInvoices.remove('rinv/1')

    expect(mocks.request).toHaveBeenCalledTimes(1)
    expect(mocks.request).toHaveBeenCalledWith(
      '/api/recurring-invoices/rinv%2F1',
      { method: 'DELETE' }
    )
  })
})
