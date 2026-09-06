import { describe, expect, it, vi } from 'vitest'

import { create876BillingIntegrationClient } from '../../client'

const quote = { object: 'quote' as const, id: 'quo_123' }
const list = {
  object: 'list' as const,
  data: [quote],
  has_more: false,
  total_count: 1,
  url: '/api/v1/integrations/organizations/org_123/quotes',
}

describe('integration quotes resource', () => {
  it('lists quotes at the organization-scoped integration path', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: list, error: null }))
    const client = create876BillingIntegrationClient({
      baseUrl: 'https://billing.example.test',
      apiKey: '876_app_secret_invoice',
      fetch: fetchMock,
    })

    const result = await client.quotes.list('org_123', { status: 'DRAFT' })

    expect(result).toEqual({ data: list, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/integrations/organizations/org_123/quotes?status=DRAFT',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('retrieves a quote at the escaped organization-scoped integration path', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: quote, error: null }))
    const client = create876BillingIntegrationClient({
      baseUrl: 'https://billing.example.test',
      apiKey: '876_app_secret_invoice',
      fetch: fetchMock,
    })

    const result = await client.quotes.retrieve('org/123', 'quo/123')

    expect(result).toEqual({ data: quote, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/integrations/organizations/org%2F123/quotes/quo%2F123',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('creates a quote with an idempotency key and an exact payload', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: quote, error: null }))
    const client = create876BillingIntegrationClient({
      baseUrl: 'https://billing.example.test',
      apiKey: '876_app_secret_invoice',
      fetch: fetchMock,
    })
    const params = {
      customerId: 'cus_123',
      lines: [{ description: 'Consulting', unitAmount: '12500' }],
    }

    const result = await client.quotes.create('org_123', params, {
      idempotencyKey: 'quote_123',
    })

    expect(result).toEqual({ data: quote, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/integrations/organizations/org_123/quotes',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(params),
        headers: expect.objectContaining({ 'Idempotency-Key': 'quote_123' }),
      })
    )
  })
})
