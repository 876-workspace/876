import { describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import { create876CouriersAdminClient } from './admin'
import { create876CouriersIntegrationClient } from './integration'
import { create876CouriersClient } from './index'

const tenant = {
  object: 'tenant' as const,
  id: 'ten_1',
  org_id: 'org_1',
  slug: 'acme',
  name: 'Acme Couriers',
  mailbox_prefix: null,
  status: 'ACTIVE',
  created_at: 1,
  updated_at: 2,
}

function successFetch() {
  return vi
    .fn<typeof fetch>()
    .mockResolvedValue(Response.json({ data: tenant, error: null }))
}

describe('Couriers client credential tiers', () => {
  it('sends only the app API-key credential and encodes path parameters', async () => {
    const fetchMock = successFetch()
    const client = create876CouriersClient({
      baseUrl: 'https://couriers.example.test',
      apiKey: '876_app_secret_couriers',
      fetch: fetchMock,
    })

    const result = await client.tenants.retrieve('ten/with space')

    expect(result).toEqual({ data: tenant, error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://couriers.example.test/v1/tenants/ten%2Fwith%20space',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-876-api-key': '876_app_secret_couriers',
        }),
      })
    )
    const headers = fetchMock.mock.calls[0]?.[1]?.headers
    expect(headers).not.toHaveProperty('x-service-key')
    expect(headers).not.toHaveProperty('x-internal-key')
    expect(headers).not.toHaveProperty('Authorization')
  })

  it('sends the dedicated integration credential and uses its narrow route', async () => {
    const fetchMock = successFetch()
    const client = create876CouriersIntegrationClient({
      baseUrl: 'https://couriers.example.test',
      serviceKey: 'couriers_service_key',
      fetch: fetchMock,
    })

    await expect(client.tenants.retrieve('ten_1')).resolves.toEqual({
      data: tenant,
      error: null,
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://couriers.example.test/v1/integration/tenants/ten_1',
      expect.anything()
    )
    const headers = fetchMock.mock.calls[0]?.[1]?.headers
    expect(headers).toMatchObject({
      'x-couriers-integration-key': 'couriers_service_key',
    })
    expect(headers).not.toHaveProperty('x-876-api-key')
    expect(headers).not.toHaveProperty('x-internal-key')
    expect(headers).not.toHaveProperty('Authorization')
  })

  it('sends both the API key and the internal key from the admin tier', async () => {
    const fetchMock = successFetch()
    const client = create876CouriersAdminClient({
      baseUrl: 'https://couriers.example.test',
      apiKey: '876_app_secret_couriers',
      internalKey: 'internal_key',
      fetch: fetchMock,
    })

    await expect(client.tenants.retrieve('ten_1')).resolves.toEqual({
      data: tenant,
      error: null,
    })

    // An `admin` route runs requireApiKey before requireAdmin, so the internal
    // key alone never reaches the handler.
    const headers = fetchMock.mock.calls[0]?.[1]?.headers
    expect(headers).toMatchObject({
      'x-876-api-key': '876_app_secret_couriers',
      'x-internal-key': 'internal_key',
    })
    expect(headers).not.toHaveProperty('x-service-key')
    expect(headers).not.toHaveProperty('Authorization')
  })

  it('fails closed from the admin tier when only the internal key is present', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    const client = create876CouriersAdminClient({
      baseUrl: 'https://couriers.example.test',
      apiKey: '',
      internalKey: 'internal_key',
      fetch: fetchMock,
    })

    await expect(client.tenants.retrieve('ten_1')).resolves.toEqual({
      data: null,
      error: {
        code: 'couriers/admin-not-configured',
        message: 'Couriers administration is not configured.',
      },
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  const unconfiguredTiers = [
    {
      name: 'app',
      code: 'couriers/not-configured',
      create: (fetch: typeof globalThis.fetch) =>
        create876CouriersClient({
          baseUrl: 'https://couriers.example.test',
          fetch,
        }),
    },
    {
      name: 'integration',
      code: 'couriers/integration-not-configured',
      create: (fetch: typeof globalThis.fetch) =>
        create876CouriersIntegrationClient({
          baseUrl: 'https://couriers.example.test',
          fetch,
        }),
    },
    {
      name: 'admin',
      code: 'couriers/admin-not-configured',
      create: (fetch: typeof globalThis.fetch) =>
        create876CouriersAdminClient({
          baseUrl: 'https://couriers.example.test',
          fetch,
        }),
    },
  ]

  it.each(unconfiguredTiers)(
    'fails $name closed before calling fetch without its credential',
    async ({ create, code }) => {
      // A credential left in the ambient environment would configure the tier
      // this case is asserting is unconfigured.
      for (const key of [
        'COURIERS_API_KEY',
        'API_876_KEY',
        'COURIERS_INTERNAL_KEY',
        'API_INTERNAL_KEY',
      ])
        vi.stubEnv(key, '')

      const fetchMock = vi.fn<typeof fetch>()
      const client = create(fetchMock)
      const result = await client.tenants.retrieve('ten_1')

      expect(result).toEqual({
        data: null,
        error: expect.objectContaining({ code }),
      })
      expect(fetchMock).not.toHaveBeenCalled()
      vi.unstubAllEnvs()
    }
  )

  it('rejects malformed response bodies instead of passing them through', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: { id: 'ten_1' }, error: null }))
    const client = create876CouriersClient({
      baseUrl: 'https://couriers.example.test',
      apiKey: '876_app_secret_couriers',
      fetch: fetchMock,
    })

    await expect(client.tenants.retrieve('ten_1')).resolves.toEqual({
      data: null,
      error: {
        code: 'couriers/invalid-response',
        message: 'The Couriers service returned an invalid response.',
      },
    })
  })
})
