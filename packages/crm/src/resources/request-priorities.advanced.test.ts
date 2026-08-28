import { beforeEach, describe, expect, it, vi } from 'vitest'

const { requestMock } = vi.hoisted(() => ({
  requestMock: vi.fn(
    async (
      _runtime: unknown,
      _req: Record<string, unknown>,
      _schema: unknown
    ) => ({
      data: {
        object: 'request_priority',
        id: 'crm_pri_1',
        tenantId: 'crm_tnt_1',
        provisioningKey: null,
        name: 'Normal',
        slug: 'normal',
        description: null,
        color: null,
        icon: null,
        weight: 20,
        sortOrder: 20,
        isDefault: true,
        isActive: true,
        createdBy: 'usr_1',
        createdAt: 1_700_000_000,
        updatedAt: 1_700_000_000,
      },
      error: null,
    })
  ),
}))

vi.mock('../request', () => ({ request: requestMock }))
vi.mock('../runtime', () => ({
  buildRuntime: vi.fn(() => ({
    baseUrl: 'https://api.example.com',
    headers: {},
  })),
}))

import { createRequestPrioritiesResource } from './request-priorities.js'

function makeResource() {
  const runtime = {
    baseUrl: 'https://api.example.com',
    headers: {},
  } as unknown as Parameters<typeof createRequestPrioritiesResource>[0]
  return createRequestPrioritiesResource(runtime)
}

beforeEach(() => {
  vi.clearAllMocks()
  requestMock.mockResolvedValue({
    data: { object: 'request_priority', id: 'crm_pri_1' },
    error: null,
  } as unknown as Awaited<ReturnType<typeof requestMock>>)
})

describe('request-priorities resource - list', () => {
  it('builds correct path without query when no active filter', async () => {
    const res = makeResource()
    await res.list('org_1')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: '/v1/organizations/org_1/request-priorities',
      }),
      expect.anything()
    )
  })

  it('encodes organizationId', async () => {
    const res = makeResource()
    await res.list('org/1 special')
    const path = (requestMock.mock.calls[0][1] as Record<string, unknown>)
      .path as string
    expect(path).toContain(encodeURIComponent('org/1 special'))
  })

  it('adds active=true query', async () => {
    const res = makeResource()
    await res.list('org_1', { active: true })
    const path = (requestMock.mock.calls[0][1] as Record<string, unknown>)
      .path as string
    expect(path).toBe('/v1/organizations/org_1/request-priorities?active=true')
  })

  it('adds active=false query', async () => {
    const res = makeResource()
    await res.list('org_1', { active: false })
    const path = (requestMock.mock.calls[0][1] as Record<string, unknown>)
      .path as string
    expect(path).toBe('/v1/organizations/org_1/request-priorities?active=false')
  })

  it('forwards signal', async () => {
    const controller = new AbortController()
    const res = makeResource()
    await res.list('org_1', { signal: controller.signal })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ signal: controller.signal }),
      expect.anything()
    )
  })
})

describe('request-priorities resource - retrieve', () => {
  it('builds encoded priority path', async () => {
    const res = makeResource()
    await res.retrieve('org_1', 'crm_pri_42')
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'GET',
        path: '/v1/organizations/org_1/request-priorities/crm_pri_42',
      }),
      expect.anything()
    )
  })

  it('encodes special priorityId', async () => {
    const res = makeResource()
    await res.retrieve('org_1', 'pri/with/slash')
    const path = (requestMock.mock.calls[0][1] as Record<string, unknown>)
      .path as string
    expect(path).toContain(encodeURIComponent('pri/with/slash'))
    expect(path).toContain('/request-priorities/')
  })
})

describe('request-priorities resource - create', () => {
  it('posts to root with body', async () => {
    const res = makeResource()
    await res.create('org_1', {
      name: 'Critical',
      createdBy: 'usr_1',
      weight: 50,
    } as unknown as Parameters<typeof res.create>[1])
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'POST',
        path: '/v1/organizations/org_1/request-priorities',
        body: expect.objectContaining({ name: 'Critical' }),
      }),
      expect.anything()
    )
  })
})

describe('request-priorities resource - update', () => {
  it('patches correct id', async () => {
    const res = makeResource()
    await res.update('org_1', 'crm_pri_1', { name: 'Urgent' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'PATCH',
        path: '/v1/organizations/org_1/request-priorities/crm_pri_1',
        body: expect.objectContaining({ name: 'Urgent' }),
      }),
      expect.anything()
    )
  })
})

describe('request-priorities resource - delete', () => {
  it('deletes with body and correct schema', async () => {
    const res = makeResource()
    await res.delete('org_1', 'crm_pri_1', { deletedBy: 'usr_1' })
    expect(requestMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        method: 'DELETE',
        path: '/v1/organizations/org_1/request-priorities/crm_pri_1',
        body: { deletedBy: 'usr_1' },
      }),
      expect.anything()
    )
  })
})

describe('request-priorities resource - error passthrough', () => {
  it('returns error envelope when request fails', async () => {
    requestMock.mockResolvedValue({
      data: null,
      error: { code: 'crm/priority-not-found', message: 'not found' },
    } as unknown as Awaited<ReturnType<typeof requestMock>>)
    const res = makeResource()
    const result = await res.retrieve('org_1', 'missing')
    expect(result.error).toMatchObject({ code: 'crm/priority-not-found' })
    expect(result.data).toBeNull()
  })
})
