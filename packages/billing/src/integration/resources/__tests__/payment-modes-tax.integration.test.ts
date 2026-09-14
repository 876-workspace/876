import { describe, expect, it, vi } from 'vitest'

import { create876BillingIntegrationClient } from '../../client'

const mode = {
  object: 'payment_mode' as const,
  id: 'pm_1',
  name: 'Bank transfer',
  isDefault: false,
  isActive: true,
  isSystem: false,
  imageFileId: null,
  imageUrl: null,
  createdAt: 1,
  updatedAt: 1,
}
const authority = {
  object: 'tax_authority' as const,
  id: 'taxauth_1',
  name: 'Tax Administration Jamaica',
  description: null,
  countryCode: 'JM',
  subdivisionCode: null,
  isDefault: true,
  isActive: true,
  createdAt: 1,
  updatedAt: 1,
}
const rate = {
  object: 'tax_rate' as const,
  id: 'taxrate_1',
  name: 'Standard GCT',
  description: null,
  taxType: 'gct',
  rate: '15',
  inclusive: false,
  startsAt: null,
  isDefault: true,
  isActive: true,
  taxAuthority: authority,
  createdAt: 1,
  updatedAt: 1,
}
const list = <T>(data: T[]) => ({
  object: 'list' as const,
  data,
  has_more: false,
  total_count: data.length,
  url: '/example',
})

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

describe('Billing integration payment modes and tax resources', () => {
  it('lists payment modes at the organization integration path', async () => {
    const setup = client(list([mode]))
    const result = await setup.client.paymentModes.list('org_1')
    expect(result).toEqual({ data: list([mode]), error: null })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/payment-modes',
      expect.objectContaining({ method: 'GET' })
    )
  })
  it('creates a payment mode with the typed payload', async () => {
    const setup = client(mode)
    const result = await setup.client.paymentModes.create('org_1', {
      name: 'Cheque',
    })
    expect(result).toEqual({ data: mode, error: null })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/payment-modes',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Cheque' }),
      })
    )
  })
  it('retrieves a payment mode with an encoded identifier', async () => {
    const setup = client(mode)
    const result = await setup.client.paymentModes.retrieve('org_1', 'pm/a')
    expect(result).toEqual({ data: mode, error: null })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/payment-modes/pm%2Fa',
      expect.objectContaining({ method: 'GET' })
    )
  })
  it('updates a payment mode with the typed payload', async () => {
    const setup = client(mode)
    const result = await setup.client.paymentModes.update('org_1', 'pm_1', {
      isActive: false,
    })
    expect(result).toEqual({ data: mode, error: null })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/payment-modes/pm_1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      })
    )
  })
  it('deletes a payment mode with the resource schema', async () => {
    const setup = client({ object: 'payment_mode', id: 'pm_1', deleted: true })
    const result = await setup.client.paymentModes.delete('org_1', 'pm_1')
    expect(result).toEqual({
      data: { object: 'payment_mode', id: 'pm_1', deleted: true },
      error: null,
    })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/payment-modes/pm_1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })
  it('lists tax authorities at the organization integration path', async () => {
    const setup = client(list([authority]))
    const result = await setup.client.taxAuthorities.list('org_1')
    expect(result).toEqual({ data: list([authority]), error: null })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/tax-authorities',
      expect.objectContaining({ method: 'GET' })
    )
  })
  it('creates a tax authority with its typed payload', async () => {
    const setup = client(authority)
    const params = { name: 'Jamaica Tax', countryCode: 'JM' }
    const result = await setup.client.taxAuthorities.create('org_1', params)
    expect(result).toEqual({ data: authority, error: null })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/tax-authorities',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })
  it('updates a tax authority with an encoded identifier', async () => {
    const setup = client(authority)
    const result = await setup.client.taxAuthorities.update('org_1', 'tax/a', {
      isActive: false,
    })
    expect(result).toEqual({ data: authority, error: null })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/tax-authorities/tax%2Fa',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ isActive: false }),
      })
    )
  })
  it('lists tax rates at the organization integration path', async () => {
    const setup = client(list([rate]))
    const result = await setup.client.taxRates.list('org_1')
    expect(result).toEqual({ data: list([rate]), error: null })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/tax-rates',
      expect.objectContaining({ method: 'GET' })
    )
  })
  it('creates a tax rate with immutable detail fields', async () => {
    const setup = client(rate)
    const params = {
      name: 'Standard GCT',
      rate: '15',
      taxAuthorityId: 'taxauth_1',
      inclusive: false,
    }
    const result = await setup.client.taxRates.create('org_1', params)
    expect(result).toEqual({ data: rate, error: null })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/tax-rates',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(params) })
    )
  })
  it('updates only tax-rate lifecycle fields', async () => {
    const setup = client(rate)
    const result = await setup.client.taxRates.update('org_1', 'taxrate_1', {
      isDefault: true,
    })
    expect(result).toEqual({ data: rate, error: null })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/tax-rates/taxrate_1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ isDefault: true }),
      })
    )
  })
  it('returns a result error when a response violates the tax-rate schema', async () => {
    const setup = client({ object: 'tax_rate', id: 'taxrate_1' })
    const result = await setup.client.taxRates.list('org_1')
    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'billing/invalid-response',
      message: 'The Billing service returned an invalid response.',
    })
    expect(setup.fetch).toHaveBeenCalledWith(
      'https://billing.test/api/v1/integrations/organizations/org_1/tax-rates',
      expect.objectContaining({ method: 'GET' })
    )
  })
})
