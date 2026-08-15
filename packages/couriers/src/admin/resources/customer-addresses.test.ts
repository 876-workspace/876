import { describe, expect, it, vi } from 'vitest'

import { createCustomersResource } from './customers'
import { buildAdminRuntime } from '../runtime'

const baseUrl = 'https://couriers.876.local'
const apiKey = '876_app_secret_couriers'
const internalKey = 'couriers_internal_kingston'
const tenantId = 'ten_kingston/876'
const customerId = 'cpr_kingston/brown market'
const customerAddressId = 'cad_kingston/addr 42'
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
  tenantId: tenantId,
  name: 'Home',
  line1: '56 Harbour Street',
  line2: 'Ground Floor',
  city: 'Kingston',
  regionCode: '13',
  regionName: 'Kingston',
  countryCode: 'JM',
  postalCode: null,
  latitude: 17.9712,
  longitude: -76.792,
  isActive: true,
  createdAt: 1_776_048_000,
  updatedAt: 1_776_134_400,
}

const customerAddress = {
  object: 'customer_address' as const,
  id: customerAddressId,
  tenantId: tenantId,
  customerId: customerId,
  addressId: addressId,
  type: 'HOME' as const,
  isDefault: true,
  address,
  createdAt: 1_776_048_000,
  updatedAt: 1_776_134_400,
}

const customerAddressList = {
  object: 'list' as const,
  data: [customerAddress],
  hasMore: false,
  totalCount: 1,
  url: `/v1/tenants/${encodeURIComponent(tenantId)}/customers/${encodeURIComponent(customerId)}/addresses`,
}

const deletedCustomerAddress = {
  object: 'customer_address' as const,
  id: customerAddressId,
  deleted: true as const,
}

const createBody = {
  type: 'WORK' as const,
  isDefault: false,
  address: {
    name: 'Work',
    line1: '14 Sunset Boulevard',
    line2: 'Freeport',
    city: 'Montego Bay',
    countryCode: 'JM',
    regionCode: '08',
    postalCode: 'JMCJS12',
    latitude: 18.4729,
    longitude: -77.9217,
    isActive: true,
  },
}

const updateBody = {
  type: 'SHIPPING' as const,
  isDefault: true,
  address: {
    line2: 'Dispatch Hall',
    postalCode: 'JMKN02',
  },
}

const listParams = {
  type: 'HOME' as const,
  limit: 25,
}

function createResource(fetchMock: typeof fetch, key?: string) {
  return createCustomersResource(
    buildAdminRuntime({ baseUrl, apiKey, internalKey: key, fetch: fetchMock })
  )
}

function successFetch(data: unknown) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ data, error: null }))
}

describe('customers.addresses', () => {
  it('lists customer addresses with every supported query parameter', async () => {
    const fetchMock = successFetch(customerAddressList)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.addresses.list(
      tenantId,
      customerId,
      listParams
    )

    expect(result).toEqual({ data: customerAddressList, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers/cpr_kingston%2Fbrown%20market/addresses?type=HOME&limit=25`,
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

  it('sends a starting_after cursor when listing customer addresses', async () => {
    const fetchMock = successFetch(customerAddressList)
    const resource = createResource(fetchMock, internalKey)

    await resource.addresses.list(tenantId, customerId, {
      startingAfter: customerAddressId,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers/cpr_kingston%2Fbrown%20market/addresses?starting_after=cad_kingston%2Faddr+42`,
      expect.anything()
    )
  })

  it('sends an ending_before cursor when listing customer addresses', async () => {
    const fetchMock = successFetch(customerAddressList)
    const resource = createResource(fetchMock, internalKey)

    await resource.addresses.list(tenantId, customerId, {
      endingBefore: customerAddressId,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers/cpr_kingston%2Fbrown%20market/addresses?ending_before=cad_kingston%2Faddr+42`,
      expect.anything()
    )
  })

  it('retrieves a customer address with encoded identifiers', async () => {
    const fetchMock = successFetch(customerAddress)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.addresses.retrieve(
      tenantId,
      customerId,
      customerAddressId
    )

    expect(result).toEqual({ data: customerAddress, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers/cpr_kingston%2Fbrown%20market/addresses/cad_kingston%2Faddr%2042`,
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

  it('creates a customer address with the exact body', async () => {
    const fetchMock = successFetch(customerAddress)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.addresses.create(
      tenantId,
      customerId,
      createBody
    )

    expect(result).toEqual({ data: customerAddress, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers/cpr_kingston%2Fbrown%20market/addresses`,
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

  it('updates a customer address with encoded identifiers and the exact body', async () => {
    const fetchMock = successFetch(customerAddress)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.addresses.update(
      tenantId,
      customerId,
      customerAddressId,
      updateBody
    )

    expect(result).toEqual({ data: customerAddress, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers/cpr_kingston%2Fbrown%20market/addresses/cad_kingston%2Faddr%2042`,
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

  it('deletes a customer address and returns a tombstone', async () => {
    const fetchMock = successFetch(deletedCustomerAddress)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.addresses.delete(
      tenantId,
      customerId,
      customerAddressId
    )

    expect(result).toEqual({ data: deletedCustomerAddress, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/customers/cpr_kingston%2Fbrown%20market/addresses/cad_kingston%2Faddr%2042`,
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

  const customerAddressVerbs: {
    name: string
    invoke(
      resource: ReturnType<typeof createCustomersResource>
    ): Promise<unknown>
  }[] = [
    {
      name: 'addresses.list',
      invoke: (resource) =>
        resource.addresses.list(tenantId, customerId, listParams),
    },
    {
      name: 'addresses.retrieve',
      invoke: (resource) =>
        resource.addresses.retrieve(tenantId, customerId, customerAddressId),
    },
    {
      name: 'addresses.create',
      invoke: (resource) =>
        resource.addresses.create(tenantId, customerId, createBody),
    },
    {
      name: 'addresses.update',
      invoke: (resource) =>
        resource.addresses.update(
          tenantId,
          customerId,
          customerAddressId,
          updateBody
        ),
    },
    {
      name: 'addresses.del',
      invoke: (resource) =>
        resource.addresses.delete(tenantId, customerId, customerAddressId),
    },
  ]

  it.each(customerAddressVerbs)(
    'rejects malformed responses for $name',
    async ({ invoke }) => {
      const fetchMock = successFetch({
        object: 'customer_address',
        id: customerAddressId,
      })
      const resource = createResource(fetchMock, internalKey)

      const result = await invoke(resource)

      expect(result).toEqual({ data: null, error: invalidResponse })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    }
  )

  it.each(customerAddressVerbs)(
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
