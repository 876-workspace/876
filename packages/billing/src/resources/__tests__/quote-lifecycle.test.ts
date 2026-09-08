import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../../client'

const BASE = 'https://billing.example.test'

function client(fetch: ReturnType<typeof vi.fn>) {
  return create876Client({
    baseUrl: BASE,
    fetch: fetch as unknown as typeof globalThis.fetch,
  })
}

function response(data: unknown) {
  return vi.fn().mockResolvedValue(Response.json({ data, error: null }))
}

describe('quote lifecycle resource', () => {
  it.each(['send', 'accept', 'decline', 'cancel', 'expire'] as const)(
    'posts %s to the quote lifecycle command',
    async (action) => {
      const quote = { object: 'quote' as const, id: 'quo_1' }
      const fetch = response(quote)

      await expect(client(fetch).quotes[action]('quo_1')).resolves.toEqual({
        data: quote,
        error: null,
      })
      expect(fetch).toHaveBeenCalledWith(
        `${BASE}/api/v1/quotes/quo_1/${action}`,
        expect.objectContaining({ method: 'POST', body: '{}' })
      )
    }
  )

  it('converts through the explicit quote command instead of invoice create', async () => {
    const invoice = { object: 'invoice' as const, id: 'inv_1' }
    const fetch = response(invoice)

    await expect(
      client(fetch).quotes.convertToInvoice('quo/one two')
    ).resolves.toEqual({ data: invoice, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/quotes/quo%2Fone%20two/convert-to-invoice`,
      expect.objectContaining({ method: 'POST', body: '{}' })
    )
  })

  it('retrieves quote conversion preferences', async () => {
    const preference = {
      object: 'quote-preference' as const,
      acceptedQuoteConversion: 'manual' as const,
    }
    const fetch = response(preference)

    await expect(client(fetch).quotes.getPreferences()).resolves.toEqual({
      data: preference,
      error: null,
    })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/quote-preferences`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('updates quote conversion preferences', async () => {
    const preference = {
      object: 'quote-preference' as const,
      acceptedQuoteConversion: 'draft-invoice-on-accept' as const,
    }
    const fetch = response(preference)
    const params = {
      acceptedQuoteConversion: 'draft-invoice-on-accept' as const,
    }

    await expect(
      client(fetch).quotes.updatePreferences(params)
    ).resolves.toEqual({ data: preference, error: null })
    expect(fetch).toHaveBeenCalledWith(
      `${BASE}/api/v1/quote-preferences`,
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(params) })
    )
  })
})
