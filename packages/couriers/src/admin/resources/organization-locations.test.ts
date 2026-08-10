import { describe, expect, it, vi } from 'vitest'

import { createOrganizationLocationsResource } from './organization-locations'
import { buildAdminRuntime } from '../runtime'

const baseUrl = 'https://couriers.876.local'
const apiKey = '876_app_secret_couriers'
const internalKey = 'couriers_internal_kingston'
const tenantId = 'ten_kingston/876'
const reconciliation = {
  object: 'organization_location_reconciliation' as const,
  tenant_id: tenantId,
  attempted: 1,
  succeeded: 1,
  failed: 0,
}
const adminNotConfigured = {
  code: 'couriers/admin-not-configured',
  message: 'Couriers administration is not configured.',
}
const invalidResponse = {
  code: 'couriers/invalid-response',
  message: 'The Couriers service returned an invalid response.',
}

function createResource(fetchMock: typeof fetch, key?: string) {
  return createOrganizationLocationsResource(
    buildAdminRuntime({ baseUrl, apiKey, internalKey: key, fetch: fetchMock })
  )
}

function successFetch(data: unknown) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ data, error: null }))
}

describe('createOrganizationLocationsResource', () => {
  it('reconciles a bounded unlinked-site batch at the exact tenant path', async () => {
    const fetchMock = successFetch(reconciliation)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.reconcile(tenantId)

    expect(result).toEqual({ data: reconciliation, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/organization-locations/reconcile`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
      }
    )
  })

  it('synchronizes an individual site with the exact body', async () => {
    const fetchMock = successFetch(reconciliation)
    const resource = createResource(fetchMock, internalKey)
    const body = { kind: 'warehouse' as const, site_id: 'wh_kingston/1' }

    const result = await resource.sync(tenantId, body)

    expect(result).toEqual({ data: reconciliation, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/organization-locations/sync`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
        body: JSON.stringify(body),
      }
    )
  })

  it.each([
    {
      name: 'reconcile',
      invoke: (
        resource: ReturnType<typeof createOrganizationLocationsResource>
      ) => resource.reconcile(tenantId),
    },
    {
      name: 'sync',
      invoke: (
        resource: ReturnType<typeof createOrganizationLocationsResource>
      ) => resource.sync(tenantId, { kind: 'branch', site_id: 'br_kingston' }),
    },
  ])('rejects malformed responses for $name', async ({ invoke }) => {
    const fetchMock = successFetch({ object: reconciliation.object })
    const resource = createResource(fetchMock, internalKey)

    await expect(invoke(resource)).resolves.toEqual({
      data: null,
      error: invalidResponse,
    })
  })

  it('fails closed before fetch without the admin credential', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    const resource = createResource(fetchMock)

    await expect(resource.reconcile(tenantId)).resolves.toEqual({
      data: null,
      error: adminNotConfigured,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
