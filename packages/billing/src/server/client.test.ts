import { describe, expect, it, vi } from 'vitest'

import { create876BillingServerClient } from './client'

describe('create876BillingServerClient', () => {
  it('sends exactly the delegated OAuth credential and tenant context', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: [], error: null }))
    const client = create876BillingServerClient({
      accessToken: 'oauth-token',
      organizationId: 'org_1',
      requestId: 'req_1',
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    const result = await client.request({
      path: '/api/v1/customers',
      query: { status: 'ACTIVE' },
    })

    expect(result).toEqual({ data: [], error: null })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/customers?status=ACTIVE',
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer oauth-token',
          'x-billing-organization-id': 'org_1',
          'x-request-id': 'req_1',
        }),
      })
    )
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty(
      'x-internal-key'
    )
  })

  it('sends exactly the internal credential for projection requests', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ data: [], error: null }))
    const client = create876BillingServerClient({
      internalKey: 'internal-secret',
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    await client.request({
      method: 'POST',
      path: '/internal/projections/tenants',
      body: { organizationIds: ['org_1'] },
    })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/internal/projections/tenants',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ organizationIds: ['org_1'] }),
        headers: expect.objectContaining({
          'x-internal-key': 'internal-secret',
        }),
      })
    )
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty(
      'authorization'
    )
  })

  it('supports public readiness without adding credentials', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        data: { object: 'readiness', status: 'ready' },
        error: null,
      })
    )
    const client = create876BillingServerClient({
      public: true,
      baseUrl: 'https://billing.example.test',
      fetch: fetchMock,
    })

    await client.request({ path: '/ready' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://billing.example.test/ready',
      expect.objectContaining({ method: 'GET' })
    )
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty(
      'authorization'
    )
    expect(fetchMock.mock.calls[0]?.[1]?.headers).not.toHaveProperty(
      'x-internal-key'
    )
  })
})
