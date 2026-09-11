import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../../client'

const baseUrl = 'https://billing.example.test'
const profile = { object: 'recurring-invoice' as const, id: 'rinv_1' }
function client(fetch: ReturnType<typeof vi.fn>) {
  return create876Client({
    baseUrl,
    fetch: fetch as unknown as typeof globalThis.fetch,
  })
}
function response(data: unknown) {
  return vi.fn().mockResolvedValue(Response.json({ data, error: null }))
}

describe('recurring invoice resources', () => {
  it('parses a successful recurring invoice response', async () =>
    expect(
      await client(response(profile)).recurringInvoices.retrieve('rinv_1')
    ).toEqual({ data: profile, error: null }))
  it('rejects a malformed recurring invoice response', async () =>
    expect(
      (
        await client(
          response({ object: 'invoice', id: 'inv_1' })
        ).recurringInvoices.retrieve('rinv_1')
      ).error?.code
    ).toBe('billing/invalid-response'))
  it('sends list filters to the recurring invoice collection', async () => {
    const fetch = response({
      object: 'list',
      data: [profile],
      has_more: false,
      total_count: 1,
      url: '/api/v1/recurring-invoices',
    })
    await client(fetch).recurringInvoices.list({
      status: 'active',
      customerId: 'cus_1',
    })
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/recurring-invoices?status=active&customerId=cus_1`,
      expect.objectContaining({ method: 'GET' })
    )
  })
  it('posts a profile to the collection endpoint', async () => {
    const fetch = response(profile)
    const params = {
      profileName: 'Retainer',
      customerId: 'cus_1',
      currency: 'JMD',
      frequency: { intervalUnit: 'month' as const, intervalCount: 1 },
      startAt: 1,
      generationMode: 'draft' as const,
      lines: [{ description: 'Retainer' }],
    }
    await client(fetch).recurringInvoices.create(params)
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/recurring-invoices`,
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })
  it('posts lifecycle commands to their profile path', async () => {
    const fetch = response(profile)
    await client(fetch).recurringInvoices.pause('rinv_1')
    expect(fetch).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/recurring-invoices/rinv_1/pause`,
      expect.objectContaining({ method: 'POST', body: '{}' })
    )
  })
  it('parses recurring invoice origins on invoice responses', async () => {
    const fetch = response({
      object: 'invoice',
      id: 'inv_1',
      recurringInvoiceId: 'rinv_1',
    })
    expect(
      (await client(fetch).invoices.retrieve('inv_1')).data?.recurringInvoiceId
    ).toBe('rinv_1')
  })
})
