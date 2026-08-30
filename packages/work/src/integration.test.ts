import { describe, expect, it, vi } from 'vitest'

import { create876WorkIntegrationClient } from './integration'
import { createWorkWorkspaceClient } from './workspace'

describe('create876WorkIntegrationClient', () => {
  it('authenticates requests with the calling app API key', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'list',
            data: [],
            has_more: false,
            total_count: null,
            url: '/v1/organizations/org_1/tasks',
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
    const client = create876WorkIntegrationClient({
      baseUrl: 'https://work.example.test',
      apiKey: '876_app_secret_crm',
      fetch,
    })

    const result = await client.tasks.list('org_1')

    expect(result).toEqual({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: null,
        url: '/v1/organizations/org_1/tasks',
      },
      error: null,
    })
    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(
      'https://work.example.test/v1/organizations/org_1/tasks',
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-876-api-key': '876_app_secret_crm',
        }),
      })
    )
  })

  it('serializes workspace provisioning without an app id key when none is given', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'work_tenant',
            id: 'work_tnt_1',
            organizationId: 'org_1',
            status: 'ACTIVE',
            createdAt: 1,
            updatedAt: 1,
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
    const client = createWorkWorkspaceClient({
      baseUrl: 'https://work.example.test',
      credential: { header: 'x-internal-key', value: 'work-internal-key' },
      fetch,
    })

    await client.ensure('org_1')

    expect(fetch).toHaveBeenCalledTimes(1)
    const [, request] = fetch.mock.calls[0]!
    expect(JSON.parse(request.body as string)).toEqual({
      organizationId: 'org_1',
    })
  })

  it('serializes workspace provisioning with the app id', async () => {
    const fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            object: 'work_tenant',
            id: 'work_tnt_1',
            organizationId: 'org_1',
            status: 'ACTIVE',
            createdAt: 1,
            updatedAt: 1,
          },
          error: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    )
    const client = createWorkWorkspaceClient({
      baseUrl: 'https://work.example.test',
      credential: { header: 'x-internal-key', value: 'work-internal-key' },
      fetch,
    })

    const result = await client.ensure('org_1', 'app_crm')

    expect(result.error).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(1)
    const [, request] = fetch.mock.calls[0]!
    expect(JSON.parse(request.body as string)).toEqual({
      organizationId: 'org_1',
      appId: 'app_crm',
    })
    expect(request.headers).toEqual({
      'Content-Type': 'application/json',
      'x-internal-key': 'work-internal-key',
    })
  })
})
