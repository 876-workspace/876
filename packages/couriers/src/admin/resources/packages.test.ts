import { describe, expect, it, vi } from 'vitest'

import { createPackagesResource } from './packages'
import { buildAdminRuntime } from '../runtime'

const baseUrl = 'https://couriers.876.local'
const apiKey = '876_app_secret_couriers'
const internalKey = 'couriers_internal_kingston'
const tenantId = 'ten_kingston/876'
const packageId = 'pkg_kingston/2026-0816 A'
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
  tenantId: tenantId,
  customerId: 'cpr_kingston_sophia_brown',
  branchId: 'br_kingston/harbour',
  mailboxId: 'mbx_kingston_1842',
  trackingNum: '1ZJAM876042924',
  status: 'READY_FOR_PICKUP' as const,
  packageType: 'CARTON' as const,
  description: 'Kitchen appliances from Miami consolidation.',
  quantity: 2,
  actualWeight: 8.75,
  collectedAt: null,
  createdAt: 1_776_048_000,
  updatedAt: 1_776_134_400,
}

const packageList = {
  object: 'list' as const,
  data: [courierPackage],
  hasMore: false,
  totalCount: 1,
  url: `/v1/tenants/${encodeURIComponent(tenantId)}/packages`,
}

const listParams = {
  status: 'READY_FOR_PICKUP' as const,
  customerId: 'cpr_kingston/sophia brown',
  branchId: 'br_kingston/harbour',
  limit: 25,
}

const createPackageBody = {
  customerId: 'cpr_montego_bay/isaac grant',
  branchId: 'br_montego_bay/freeport',
  mailboxId: 'mbx_montego_bay_728',
  trackingNum: 'JAMAICA-2026-8114',
  status: 'PRE_ALERT' as const,
  packageType: 'ENVELOPE' as const,
  description: 'Immigration documents for clearance.',
  quantity: 1,
  actualWeight: 0.35,
}

const updatePackageBody = {
  branchId: null,
  mailboxId: null,
  trackingNum: null,
  status: 'COLLECTED' as const,
  packageType: 'BAG' as const,
  description: 'Collected at the Kingston Harbour counter.',
  quantity: 3,
  actualWeight: 9.2,
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
      `${baseUrl}/v1/tenants/ten_kingston%2F876/packages?status=READY_FOR_PICKUP&customer_id=cpr_kingston%2Fsophia+brown&branch_id=br_kingston%2Fharbour&limit=25`,
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

    await resource.list(tenantId, { startingAfter: packageId })

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/packages?starting_after=pkg_kingston%2F2026-0816+A`,
      expect.anything()
    )
  })

  it('sends an ending_before cursor when listing packages', async () => {
    const fetchMock = successFetch(packageList)
    const resource = createResource(fetchMock, internalKey)

    await resource.list(tenantId, { endingBefore: packageId })

    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/packages?ending_before=pkg_kingston%2F2026-0816+A`,
      expect.anything()
    )
  })

  it('retrieves a package with encoded identifiers', async () => {
    const fetchMock = successFetch(courierPackage)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.retrieve(tenantId, packageId)

    expect(result).toEqual({ data: courierPackage, error: null })
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

  it('creates a package with the exact body', async () => {
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
    const fetchMock = successFetch(courierPackage)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.update(tenantId, packageId, updatePackageBody)

    expect(result).toEqual({ data: courierPackage, error: null })
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
