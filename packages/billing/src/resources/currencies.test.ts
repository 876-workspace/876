import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../client'
import type { Currency, CurrencyMutation, List } from '../types'

const currency: Currency = {
  object: 'currency',
  currencyCode: 'JMD',
  isDefault: true,
  isEnabled: true,
  createdAt: 1_788_825_600,
  updatedAt: 1_788_825_600,
  currency: {
    code: 'JMD',
    name: 'Jamaican Dollar',
    symbol: '$',
    decimalPlaces: 2,
    isActive: true,
  },
}

const list: List<Currency> = {
  object: 'list',
  data: [currency],
  has_more: false,
  total_count: 1,
  url: '/api/v1/currencies',
}

const mutation: CurrencyMutation = {
  object: 'tenant_currency',
  currency: 'USD',
}

function clientFor(payload: unknown) {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json(payload))
  return {
    client: create876Client({ baseUrl: 'https://billing.example.test', fetch }),
    fetch,
  }
}

describe('currencies resource', () => {
  it('lists currencies at the tenant currencies path', async () => {
    const { client, fetch } = clientFor({ data: list, error: null })

    const result = await client.currencies.list()

    expect(result).toEqual({ data: list, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/currencies',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('parses a valid currency list schema', async () => {
    const { client } = clientFor({ data: list, error: null })

    const result = await client.currencies.list()

    expect(result.data?.data[0]).toEqual(currency)
    expect(result.error).toBeNull()
  })

  it('returns a client error from list without data', async () => {
    const { client } = clientFor({
      data: null,
      error: { code: 'currency/forbidden', message: 'Not allowed.' },
    })

    const result = await client.currencies.list()

    expect(result).toEqual({
      data: null,
      error: { code: 'currency/forbidden', message: 'Not allowed.' },
    })
  })

  it('enables a currency with the exact body', async () => {
    const created = { object: 'tenant_currency' as const, id: 'USD' }
    const { client, fetch } = clientFor({ data: created, error: null })

    const result = await client.currencies.enable({ currency: 'USD' })

    expect(result).toEqual({ data: created, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/currencies',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ currency: 'USD' }),
      })
    )
  })

  it('returns an enable error without data', async () => {
    const { client } = clientFor({
      data: null,
      error: { code: 'currency/not-found', message: 'Currency not found.' },
    })

    const result = await client.currencies.enable({ currency: 'USD' })

    expect(result).toEqual({
      data: null,
      error: { code: 'currency/not-found', message: 'Currency not found.' },
    })
  })

  it('disables an encoded currency code', async () => {
    const { client, fetch } = clientFor({ data: mutation, error: null })

    const result = await client.currencies.disable('US/D')

    expect(result).toEqual({ data: mutation, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/currencies/US%2FD',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('returns a disable error without data', async () => {
    const { client } = clientFor({
      data: null,
      error: {
        code: 'currency/default-cannot-delete',
        message: 'Cannot delete the default base currency.',
      },
    })

    const result = await client.currencies.disable('JMD')

    expect(result).toEqual({
      data: null,
      error: {
        code: 'currency/default-cannot-delete',
        message: 'Cannot delete the default base currency.',
      },
    })
  })

  it('sets the default currency with the exact PATCH body', async () => {
    const { client, fetch } = clientFor({ data: mutation, error: null })

    const result = await client.currencies.setDefault({ currency: 'USD' })

    expect(result).toEqual({ data: mutation, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/currencies',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ currency: 'USD' }),
      })
    )
  })
})
