import { describe, expect, it, vi } from 'vitest'

import { createWarehousesResource } from './warehouses'
import { buildAdminRuntime } from '../runtime'

const baseUrl = 'https://couriers.876.local'
const apiKey = '876_app_secret_couriers'
const internalKey = 'couriers_internal_kingston'
const tenantId = 'ten_kingston/876'
const warehouseId = 'wh_kingston/harbour depot'
const adminNotConfigured = {
  code: 'couriers/admin-not-configured',
  message: 'Couriers administration is not configured.',
}
const invalidResponse = {
  code: 'couriers/invalid-response',
  message: 'The Couriers service returned an invalid response.',
}

const warehouse = {
  object: 'warehouse' as const,
  id: warehouseId,
  tenant_id: tenantId,
  address_id: 'addr_kingston_harbour_56',
  org_location_id: 'orgloc_kingston_harbour',
  name: 'Kingston Harbour Depot',
  operating_model: 'OWNED' as const,
  agent_name: null,
  code: 'KIN-HARB',
  mailbox_placement: 'RECIPIENT_LINE' as const,
  mailbox_prefix: 'KIN',
  instructions: 'Present photo identification at the dispatch counter.',
  is_active: true,
  is_primary: true,
  address: {
    object: 'address' as const,
    id: 'addr_kingston_harbour_56',
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
  },
  created_at: 1_776_048_000,
  updated_at: 1_776_134_400,
}

const warehouseList = {
  object: 'list' as const,
  data: [warehouse],
  has_more: false,
  total_count: 1,
  url: `/v1/tenants/${encodeURIComponent(tenantId)}/warehouses`,
}

const createBody = {
  name: 'Montego Bay Freeport Warehouse',
  operating_model: 'AGENT' as const,
  agent_name: 'Freeport Logistics Jamaica',
  code: 'MBJ-FREE',
  mailbox_placement: 'ADDRESS_LINE_2' as const,
  mailbox_prefix: 'MBJ',
  instructions: 'Collect packages between 9:00 AM and 4:30 PM.',
  is_active: true,
  is_primary: false,
  address: {
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
  },
}

const updateBody = {
  agent_name: null,
  code: 'KIN-DEPOT',
  mailbox_prefix: 'KHD',
  instructions: null,
  is_primary: false,
  address: {
    line2: 'Dispatch Hall',
    postal_code: 'JMKN02',
  },
}

function createResource(fetchMock: typeof fetch, key?: string) {
  return createWarehousesResource(
    buildAdminRuntime({ baseUrl, apiKey, internalKey: key, fetch: fetchMock })
  )
}

function successFetch(data: unknown) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ data, error: null }))
}

describe('createWarehousesResource', () => {
  it('lists warehouses with the exact tenant path', async () => {
    const fetchMock = successFetch(warehouseList)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.list(tenantId)

    expect(result).toEqual({ data: warehouseList, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/warehouses`,
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

  it('retrieves a warehouse with encoded identifiers', async () => {
    const fetchMock = successFetch(warehouse)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.retrieve(tenantId, warehouseId)

    expect(result).toEqual({ data: warehouse, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/warehouses/wh_kingston%2Fharbour%20depot`,
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

  it('creates a warehouse with the exact body', async () => {
    const fetchMock = successFetch(warehouse)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.create(tenantId, createBody)

    expect(result).toEqual({ data: warehouse, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/warehouses`,
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

  it('updates a warehouse with encoded identifiers and the exact body', async () => {
    const fetchMock = successFetch(warehouse)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.update(tenantId, warehouseId, updateBody)

    expect(result).toEqual({ data: warehouse, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/warehouses/wh_kingston%2Fharbour%20depot`,
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

  const warehouseVerbs: {
    name: string
    invoke(
      resource: ReturnType<typeof createWarehousesResource>
    ): Promise<unknown>
  }[] = [
    { name: 'list', invoke: (resource) => resource.list(tenantId) },
    {
      name: 'retrieve',
      invoke: (resource) => resource.retrieve(tenantId, warehouseId),
    },
    {
      name: 'create',
      invoke: (resource) => resource.create(tenantId, createBody),
    },
    {
      name: 'update',
      invoke: (resource) => resource.update(tenantId, warehouseId, updateBody),
    },
  ]

  it.each(warehouseVerbs)(
    'rejects malformed responses for $name',
    async ({ invoke }) => {
      const fetchMock = successFetch({ object: 'warehouse', id: warehouseId })
      const resource = createResource(fetchMock, internalKey)

      const result = await invoke(resource)

      expect(result).toEqual({ data: null, error: invalidResponse })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    }
  )

  it.each(warehouseVerbs)(
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
