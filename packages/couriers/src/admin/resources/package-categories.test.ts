import { describe, expect, it, vi } from 'vitest'

import { createPackageCategoriesResource } from './package-categories'
import { buildAdminRuntime } from '../runtime'

const baseUrl = 'https://couriers.876.local'
const apiKey = '876_app_secret_couriers'
const internalKey = 'couriers_internal_kingston'
const tenantId = 'ten_kingston/876'
const categoryId = 'pcat_electronics/876'
const adminNotConfigured = {
  code: 'couriers/admin-not-configured',
  message: 'Couriers administration is not configured.',
}
const invalidResponse = {
  code: 'couriers/invalid-response',
  message: 'The Couriers service returned an invalid response.',
}

const category = {
  object: 'package_category' as const,
  id: categoryId,
  tenant_id: tenantId,
  provisioning_key: 'electronics',
  name: 'Electronics',
  slug: 'electronics',
  description: 'Consumer electronics and accessories.',
  icon: null,
  sort_order: 40,
  is_active: true,
  created_at: 1_789_400_000,
  updated_at: 1_789_400_000,
  deleted_at: null,
}

const categoryList = {
  object: 'list' as const,
  data: [category],
  has_more: false,
  total_count: 1,
  url: `/v1/tenants/${encodeURIComponent(tenantId)}/package-categories`,
}

const createBody = {
  name: 'Camera Gear',
  slug: 'camera-gear',
  description: 'Cameras and photography accessories.',
  icon: 'camera',
  sort_order: 45,
  is_active: true,
}

const updateBody = {
  name: 'Devices',
  slug: 'devices',
  description: null,
  icon: null,
  sort_order: 50,
  is_active: false,
}

function createResource(fetchMock: typeof fetch, key?: string) {
  return createPackageCategoriesResource(
    buildAdminRuntime({ baseUrl, apiKey, internalKey: key, fetch: fetchMock })
  )
}

function successFetch(data: unknown) {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ data, error: null }))
}

describe('createPackageCategoriesResource', () => {
  it('lists categories with filters and cursors', async () => {
    const fetchMock = successFetch(categoryList)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.list(tenantId, {
      is_active: false,
      limit: 25,
      starting_after: categoryId,
    })

    expect(result).toEqual({ data: categoryList, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/package-categories?is_active=false&limit=25&starting_after=pcat_electronics%2F876`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-876-api-key': apiKey,
          'x-internal-key': internalKey,
        },
      }
    )
  })

  it('retrieves a category with encoded identifiers', async () => {
    const fetchMock = successFetch(category)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.retrieve(tenantId, categoryId)

    expect(result).toEqual({ data: category, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/package-categories/pcat_electronics%2F876`,
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('creates a category with the exact body', async () => {
    const fetchMock = successFetch({
      ...category,
      id: 'pcat_camera',
      provisioning_key: null,
      name: 'Camera Gear',
      slug: 'camera-gear',
    })
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.create(tenantId, createBody)

    expect(result.error).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/package-categories`,
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
  })

  it('updates a category with the exact body', async () => {
    const fetchMock = successFetch({
      ...category,
      name: 'Devices',
      slug: 'devices',
      description: null,
      icon: null,
      sort_order: 50,
      is_active: false,
    })
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.update(tenantId, categoryId, updateBody)

    expect(result.error).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/package-categories/pcat_electronics%2F876`,
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
  })

  it('archives a category through DELETE', async () => {
    const deleted = {
      object: 'package_category' as const,
      id: categoryId,
      deleted: true as const,
    }
    const fetchMock = successFetch(deleted)
    const resource = createResource(fetchMock, internalKey)

    const result = await resource.delete(tenantId, categoryId)

    expect(result).toEqual({ data: deleted, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      `${baseUrl}/v1/tenants/ten_kingston%2F876/package-categories/pcat_electronics%2F876`,
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  const verbs: {
    name: string
    invoke(
      resource: ReturnType<typeof createPackageCategoriesResource>
    ): Promise<unknown>
  }[] = [
    { name: 'list', invoke: (resource) => resource.list(tenantId) },
    {
      name: 'retrieve',
      invoke: (resource) => resource.retrieve(tenantId, categoryId),
    },
    {
      name: 'create',
      invoke: (resource) => resource.create(tenantId, createBody),
    },
    {
      name: 'update',
      invoke: (resource) => resource.update(tenantId, categoryId, updateBody),
    },
    {
      name: 'delete',
      invoke: (resource) => resource.delete(tenantId, categoryId),
    },
  ]

  it.each(verbs)('rejects malformed responses for $name', async ({ invoke }) => {
    const fetchMock = successFetch({ id: categoryId })
    const resource = createResource(fetchMock, internalKey)

    const result = await invoke(resource)

    expect(result).toEqual({ data: null, error: invalidResponse })
  })

  it.each(verbs)(
    'fails closed before fetch when the admin credential is missing for $name',
    async ({ invoke }) => {
      const fetchMock = vi.fn<typeof fetch>()
      const resource = createResource(fetchMock)

      const result = await invoke(resource)

      expect(result).toEqual({ data: null, error: adminNotConfigured })
      expect(fetchMock).not.toHaveBeenCalled()
    }
  )
})
