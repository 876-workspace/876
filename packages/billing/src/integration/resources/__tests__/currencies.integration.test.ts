import { describe, expect, it, vi } from 'vitest'

import { create876BillingIntegrationClient } from '../../client'

const currency = {
  object: 'currency' as const,
  currencyCode: 'USD',
  isDefault: false,
  isEnabled: true,
  createdAt: 1,
  updatedAt: 1,
  currency: {
    code: 'USD',
    name: 'United States Dollar',
    symbol: '$',
    decimalPlaces: 2,
    isActive: true,
  },
}
const list = {
  object: 'list' as const,
  data: [currency],
  has_more: false,
  total_count: 1,
  url: '/example',
}

function client(response: unknown) {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json({ data: response, error: null }))

  return {
    fetch,
    client: create876BillingIntegrationClient({
      baseUrl: 'https://billing.test',
      apiKey: 'key_1',
      fetch,
    }),
  }
}

describe('Billing integration currencies resource', () => {
  it('lists currencies at the organization integration path', async () => {
    const setup = client(list)

    const result = await setup.client.currencies.list('org_1')

    expect(result).toEqual({ data: list, error: null })
    expect(setup.fetch).toHaveBeenCalledTimes(1)
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/currencies',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('enables a currency with its exact typed payload', async () => {
    const setup = client({ object: 'tenant_currency', id: 'USD' })

    const result = await setup.client.currencies.enable('org_1', {
      currency: 'USD',
    })

    expect(result).toEqual({
      data: { object: 'tenant_currency', id: 'USD' },
      error: null,
    })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/currencies',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ currency: 'USD' }),
      })
    )
  })

  it('updates currency display metadata with an encoded currency code', async () => {
    const setup = client({ object: 'tenant_currency', currency: 'USD' })
    const params = {
      name: 'United States Dollar',
      symbol: '$',
      decimalPlaces: 2,
    }

    const result = await setup.client.currencies.update('org_1', 'US/D', params)

    expect(result).toEqual({
      data: { object: 'tenant_currency', currency: 'USD' },
      error: null,
    })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/currencies/US%2FD',
      expect.objectContaining({ method: 'PATCH', body: JSON.stringify(params) })
    )
  })

  it('sets the default currency with its exact typed payload', async () => {
    const setup = client({ object: 'tenant_currency', currency: 'USD' })

    const result = await setup.client.currencies.setDefault('org_1', {
      currency: 'USD',
    })

    expect(result).toEqual({
      data: { object: 'tenant_currency', currency: 'USD' },
      error: null,
    })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/currencies',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ currency: 'USD' }),
      })
    )
  })

  it('disables a currency with an encoded currency code', async () => {
    const setup = client({ object: 'tenant_currency', currency: 'USD' })

    const result = await setup.client.currencies.disable('org_1', 'US/D')

    expect(result).toEqual({
      data: { object: 'tenant_currency', currency: 'USD' },
      error: null,
    })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/currencies/US%2FD',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
})
