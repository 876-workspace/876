import { describe, expect, it, vi } from 'vitest'

import { createPackagesResource } from './packages'
import { buildAdminRuntime } from '../runtime'

const baseUrl = 'https://couriers.876.local'
const apiKey = '876_app_secret_couriers'
const internalKey = 'couriers_internal_kingston'
const tenantId = 'ten_kingston/876'
const packageId = 'pkg_kingston/2026-0816 A'
const categoryId = 'pcat_electronics'
const adminNotConfigured = {
  code: 'couriers/admin-not-configured',
  message: 'Couriers administration is not configured.',
}
const invalidResponse = {
  code: 'couriers/invalid-response',
  message: 'The Couriers service returned an invalid response.',
}

const courierPackage = {
  object: 'package' as const,
  id: packageId,
  tenant_id: tenantId,
  customer_id: 'cpr_kingston_sophia_brown',
  branch_id: 'br_kingston/harbour',
  mailbox_id: 'mbx_kingston_1842',
  category_id: categoryId,
  category: {
    id: categoryId,
    name: 'Electronics',
    slug: 'electronics',
  },
  tracking_num: '1ZJAM876042924',
  status: 'READY_FOR_PICKUP' as const,
  package_type: 'CARTON' as const,
  description: 'Kitchen appliances from Miami consolidation.',
  quantity: 2,
  actual_weight: 8.75,
  collected_at: null,
  created_at: 1_776_048_000,
  updated_at: 1_776_134_400,
}

const packageList = {
  object: 'list' as const,
  data: [courierPackage],
  has_more: false,
  total_count: 1,
  url: `/v1/tenants/${encodeURIComponent(tenantId)}/packages`,
}

const listParams = {
  status: 'READY_FOR_PICKUP' as const,
  customer_id: 'cpr_kingston/sophia brown',
  branch_id: 'br_kingston/harbour',
  category_id: categoryId,
  limit: 25,
}

const createPackageBody = {
  customer_id: 'cpr_montego_bay/isaac grant',
  branch_id: 'br_montego_bay/freeport',
  mailbox_id: 'mbx_montego_bay_728',
  category_id: categoryId,
  tracking_num: 'JAMAICA-2026-8114',
  status: 'PRE_ALERT' as const,
  package_type: 'ENVELOPE' as const,
  description: 'Immigration documents for clearance.',
  quantity: 1,
  actual_weight: 0.35,
}

const updatePackageBody = {
  branch_id: null,
  mailbox_id: null,
  category_id: null,
  tracking_num: null,
  status: 'COLLECTED' as const,
  package_type: 'BAG' as const,
  description: 'Collected at the Kingston Harbour counter.',
  quantity: 3,
  actual_weight: 9.2,
}

function createResource(fetchMock: typeof fetch, key?: string) {
  return createPackagesResource(
    buildAdminRuntime({ baseUrl, apiKey, internalKey: key, fetch: fetchMock })
  )
}

function successFetch(data: unknown) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ data, error: null }))
}

describe('createPackagesResource', () => {
  it('lists packages with every supported query parameter', async () => {
    const fetchMock = successFetch(packageList)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.list(tenantId, listParams)

    expect(result).toEqual({ data: packageList, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/packages?status=READY_FOR_PICKUP&customer_id=cpr_kingston%2Fsophia+brown&branch_id=br_kingston%2Fharbour&category_id=pcat_electronics&limit=25`,
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

  it('sends a starting_after cursor when listing packages', async () => {
    const fetchMock = successFetch(packageList)
    const resource = createResource(fetchMock, internalKey)

    await resource.list(tenantId, { starting_after: packageId })

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/packages?starting_after=pkg_kingston%2F2026-0816+A`,
      expect.anything()
    )
  })

  it('sends an ending_before cursor when listing packages', async () => {
    const fetchMock = successFetch(packageList)
    const resource = createResource(fetchMock, internalKey)

    await resource.list(tenantId, { ending_before: packageId })

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/packages?ending_before=pkg_kingston%2F2026-0816+A`,
      expect.anything()
    )
  })

  it('retrieves a package with encoded identifiers and category data', async () => {
    const fetchMock = successFetch(courierPackage)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.retrieve(tenantId, packageId)

    expect(result).toEqual({ data: courierPackage, error: null })
    expect(result.data?.category).toEqual({
      id: categoryId,
      name: 'Electronics',
      slug: 'electronics',
    })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/packages/pkg_kingston%2F2026-0816%20A`,
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

  it('creates a package with the exact category-aware body', async () => {
    const fetchMock = successFetch(courierPackage)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.create(tenantId, createPackageBody)

    expect(result).toEqual({ data: courierPackage, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/packages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
        body: JSON.stringify(createPackageBody),
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('updates a package with encoded identifiers and the exact body', async () => {
    const fetchMock = successFetch({
      ...courierPackage,
      category_id: null,
      category: null,
    })
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.update(tenantId, packageId, updatePackageBody)

    expect(result.data?.category_id).toBeNull()
    expect(result.data?.category).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/packages/pkg_kingston%2F2026-0816%20A`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
        body: JSON.stringify(updatePackageBody),
      }
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  const packageVerbs: {
    name: string
    invoke(
      resource: ReturnType<typeof createPackagesResource>
    ): Promise<unknown>
  }[] = [
    {
      name: 'list',
      invoke: (resource) => resource.list(tenantId, listParams),
    },
    {
      name: 'retrieve',
      invoke: (resource) => resource.retrieve(tenantId, packageId),
    },
    {
      name: 'create',
      invoke: (resource) => resource.create(tenantId, createPackageBody),
    },
    {
      name: 'update',
      invoke: (resource) =>
        resource.update(tenantId, packageId, updatePackageBody),
    },
  ]

  it.each(packageVerbs)(
    'rejects malformed responses for $name',
    async ({ invoke }) => {
      const fetchMock = successFetch({ object: 'package', id: packageId })
      const resource = createResource(fetchMock, internalKey)

      const result = await invoke(resource)

      expect(result).toEqual({ data: null, error: invalidResponse })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    }
  )

  it.each(packageVerbs)(
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
