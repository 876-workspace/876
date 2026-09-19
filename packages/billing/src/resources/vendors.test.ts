import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../client'
import type { List, Vendor, VendorDeleted } from '../types'

const vendor: Vendor = {
  object: 'vendor',
  id: 'ven_1',
  externalReference: 'SUP-001',
  name: 'Caribbean Paper Supplies',
  email: 'accounts@caribbeanpaper.example',
  phone: '+18765550100',
  billingAddress: null,
  metadata: null,
  defaultCurrency: 'JMD',
  status: 'ACTIVE',
  createdAt: 1_788_825_600,
  updatedAt: 1_788_825_600,
}

const list: List<Vendor> = {
  object: 'list',
  data: [vendor],
  has_more: false,
  total_count: 1,
  url: '/api/v1/vendors',
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

describe('vendors resource', () => {
  it('lists vendors with the exact status query and returns the parsed list', async () => {
    const { client, fetch } = clientFor({ data: list, error: null })

    const result = await client.vendors.list({ status: 'ACTIVE' })

    expect(result).toEqual({ data: list, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/vendors?status=ACTIVE',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('returns the parsed vendor row on list', async () => {
    const { client } = clientFor({ data: list, error: null })

    const result = await client.vendors.list()

    expect(result.data?.data[0]).toEqual(vendor)
    expect(result.error).toBeNull()
  })

  it('creates a vendor with the exact body and returns the full resource', async () => {
    const { client, fetch } = clientFor({ data: vendor, error: null })
    const params = {
      name: 'Caribbean Paper Supplies',
      email: 'accounts@caribbeanpaper.example',
    }

    const result = await client.vendors.create(params)

    expect(result).toEqual({ data: vendor, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/vendors',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(params),
      })
    )
  })

  it('retrieves a vendor at the encoded detail path', async () => {
    const { client, fetch } = clientFor({ data: vendor, error: null })

    const result = await client.vendors.retrieve('ven/1')

    expect(result).toEqual({ data: vendor, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/vendors/ven%2F1',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('updates a vendor with the exact body', async () => {
    const { client, fetch } = clientFor({ data: vendor, error: null })
    const params = { status: 'ARCHIVED' as const }

    const result = await client.vendors.update('ven_1', params)

    expect(result).toEqual({ data: vendor, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/vendors/ven_1',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify(params),
      })
    )
  })

  it('deletes a vendor and returns the tombstone', async () => {
    const deleted: VendorDeleted = {
      object: 'vendor',
      id: 'ven_1',
      deleted: true,
    }
    const { client, fetch } = clientFor({ data: deleted, error: null })

    const result = await client.vendors.delete('ven_1')

    expect(result).toEqual({ data: deleted, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/vendors/ven_1',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('surfaces a list failure as a value instead of throwing', async () => {
    const { client } = clientFor({
      data: null,
      error: { code: 'vendor/forbidden', message: 'Not allowed.' },
    })

    const result = await client.vendors.list()

    expect(result).toEqual({
      data: null,
      error: { code: 'vendor/forbidden', message: 'Not allowed.' },
    })
  })
})
