import { describe, expect, it, vi } from 'vitest'

import { createAddressesResource } from './addresses'
import { buildAdminRuntime } from '../runtime'

const baseUrl = 'https://couriers.876.local'
const apiKey = '876_app_secret_couriers'
const internalKey = 'couriers_internal_kingston'
const tenantId = 'ten_kingston/876'
const addressId = 'addr_kingston/harbour 56'
const adminNotConfigured = {
  code: 'couriers/admin-not-configured',
  message: 'Couriers administration is not configured.',
}
const invalidResponse = {
  code: 'couriers/invalid-response',
  message: 'The Couriers service returned an invalid response.',
}

const address = {
  object: 'address' as const,
  id: addressId,
  tenant_id: tenantId,
  name: 'Kingston Harbour Depot',
  line1: '56 Harbour Street',
  line2: 'Ground Floor',
  city: 'Kingston',
  region_code: '13',
  region_name: 'Kingston',
  country_code: 'JM',
  postal_code: null,
  latitude: 17.9712,
  longitude: -76.792,
  is_active: true,
  created_at: 1_776_048_000,
  updated_at: 1_776_134_400,
}

const addressList = {
  object: 'list' as const,
  data: [address],
  has_more: false,
  total_count: 1,
  url: `/v1/tenants/${encodeURIComponent(tenantId)}/addresses`,
}

const deletedAddress = {
  object: 'address' as const,
  id: addressId,
  deleted: true as const,
}

const createBody = {
  name: 'Montego Bay Freeport Warehouse',
  line1: '14 Sunset Boulevard',
  line2: 'Freeport',
  city: 'Montego Bay',
  country_code: 'JM',
  region_code: '08',
  postal_code: 'JMCJS12',
  latitude: 18.4729,
  longitude: -77.9217,
  is_active: true,
}

const updateBody = {
  name: 'Kingston Harbour Depot Updated',
  line2: 'Dispatch Hall',
  postal_code: 'JMKN02',
  is_active: false,
}

const listParams = {
  is_active: true,
  country_code: 'JM',
  limit: 25,
}

function createResource(fetchMock: typeof fetch, key?: string) {
  return createAddressesResource(
    buildAdminRuntime({ baseUrl, apiKey, internalKey: key, fetch: fetchMock })
  )
}

function successFetch(data: unknown) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ data, error: null }))
}

describe('createAddressesResource', () => {
  it('lists addresses with every supported query parameter', async () => {
    const fetchMock = successFetch(addressList)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.list(tenantId, listParams)

    expect(result).toEqual({ data: addressList, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/addresses?is_active=true&country_code=JM&limit=25`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('sends a starting_after cursor when listing addresses', async () => {
    const fetchMock = successFetch(addressList)
    const resource = createResource(fetchMock, internalKey)

    await resource.list(tenantId, { starting_after: addressId })

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/addresses?starting_after=addr_kingston%2Fharbour+56`,
      expect.anything()
    )
  })

  it('sends an ending_before cursor when listing addresses', async () => {
    const fetchMock = successFetch(addressList)
    const resource = createResource(fetchMock, internalKey)

    await resource.list(tenantId, { ending_before: addressId })

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/addresses?ending_before=addr_kingston%2Fharbour+56`,
      expect.anything()
    )
  })

  it('retrieves an address with encoded identifiers', async () => {
    const fetchMock = successFetch(address)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.retrieve(tenantId, addressId)

    expect(result).toEqual({ data: address, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/addresses/addr_kingston%2Fharbour%2056`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('creates an address with the exact body', async () => {
    const fetchMock = successFetch(address)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.create(tenantId, createBody)

    expect(result).toEqual({ data: address, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/addresses`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
        body: JSON.stringify(createBody),
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('updates an address with encoded identifiers and the exact body', async () => {
    const fetchMock = successFetch(address)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.update(tenantId, addressId, updateBody)

    expect(result).toEqual({ data: address, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/addresses/addr_kingston%2Fharbour%2056`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
        body: JSON.stringify(updateBody),
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('deletes an address and returns a tombstone', async () => {
    const fetchMock = successFetch(deletedAddress)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.del(tenantId, addressId)

    expect(result).toEqual({ data: deletedAddress, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/addresses/addr_kingston%2Fharbour%2056`,
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  const addressVerbs: {
    name: string
    invoke(
      resource: ReturnType<typeof createAddressesResource>
    ): Promise<unknown>
  }[] = [
    { name: 'list', invoke: (resource) => resource.list(tenantId, listParams) },
    {
      name: 'retrieve',
      invoke: (resource) => resource.retrieve(tenantId, addressId),
    },
    {
      name: 'create',
      invoke: (resource) => resource.create(tenantId, createBody),
    },
    {
      name: 'update',
      invoke: (resource) => resource.update(tenantId, addressId, updateBody),
    },
    {
      name: 'del',
      invoke: (resource) => resource.del(tenantId, addressId),
    },
  ]

  it.each(addressVerbs)(
    'rejects malformed responses for $name',
    async ({ invoke }) => {
      const fetchMock = successFetch({ object: 'address', id: addressId })
      const resource = createResource(fetchMock, internalKey)

      const result = await invoke(resource)

      expect(result).toEqual({ data: null, error: invalidResponse })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    }
  )

  it.each(addressVerbs)(
    'fails closed before fetch when the admin credential is missing for $name',
    async ({ invoke }) => {
      const fetchMock = vi.fn<typeof fetch>()
      const resource = createResource(fetchMock)

      const result = await invoke(resource)

      expect(result).toEqual({ data: null, error: adminNotConfigured })
      expect(fetchMock).not.toHaveBeenCalled()
      expect(fetchMock).toHaveBeenCalledTimes(0)
    }
  )
})
