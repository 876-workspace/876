import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  retrieve: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/integration', () => ({
  integration: {
    retrieveWebhookEndpoint: mocks.retrieve,
    updateWebhookEndpoint: mocks.update,
    removeWebhookEndpoint: mocks.remove,
  },
}))

const { GET, PATCH, DELETE } = await import('./route')

function context(endpointId: string) {
  return { params: Promise.resolve({ endpointId }) }
}

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/webhook-endpoints/whep_1', {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const endpoint = {
  object: 'projects.webhook-endpoint',
  id: 'whep_1',
  tenantId: 'prjten_1',
  url: 'https://hooks.example.com/x',
  eventTypes: ['*'],
  enabled: true,
  consecutiveFailures: 0,
  createdAt: 1700000000,
  updatedAt: 1700000000,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.retrieve.mockResolvedValue({ data: endpoint, error: null })
  mocks.update.mockResolvedValue({ data: { ...endpoint, enabled: false }, error: null })
  mocks.remove.mockResolvedValue({
    data: { object: 'projects.webhook-endpoint', id: 'whep_1', deleted: true },
    error: null,
  })
})

describe('GET /api/webhook-endpoints/[endpointId]', () => {
  it('requires the projects view permission', async () => {
    await GET(request('GET'), context('whep_1'))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('retrieves the decoded endpoint without a secret', async () => {
    const response = await GET(request('GET'), context('whep%201'))
    expect(mocks.retrieve).toHaveBeenCalledWith('whep 1')
    expect(await response.text()).not.toMatch(/"secret"\s*:/)
  })

  it('returns 404 for an unknown endpoint', async () => {
    mocks.retrieve.mockResolvedValue({
      data: null,
      error: { code: 'projects/webhook-endpoint-not-found', message: 'Missing.' },
    })
    expect((await GET(request('GET'), context('whep_1'))).status).toBe(404)
  })
})

describe('PATCH /api/webhook-endpoints/[endpointId]', () => {
  it('requires the projects edit permission', async () => {
    await PATCH(request('PATCH', { enabled: false }), context('whep_1'))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('updates enablement and never returns the rotated secret', async () => {
    const response = await PATCH(
      request('PATCH', { secret: '0123456789abcdef', enabled: false }),
      context('whep_1')
    )
    expect(mocks.update).toHaveBeenCalledWith('whep_1', {
      secret: '0123456789abcdef',
      enabled: false,
    })
    const text = await response.text()
    expect(text).not.toContain('0123456789abcdef')
  })

  it('rejects an empty update with 422', async () => {
    const response = await PATCH(request('PATCH', {}), context('whep_1'))
    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })

  it('rejects a short rotation secret with 422', async () => {
    const response = await PATCH(request('PATCH', { secret: 'short' }), context('whep_1'))
    expect(response.status).toBe(422)
    expect(mocks.update).not.toHaveBeenCalled()
  })
})

describe('DELETE /api/webhook-endpoints/[endpointId]', () => {
  it('requires the projects edit permission', async () => {
    await DELETE(request('DELETE'), context('whep_1'))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('deletes the endpoint', async () => {
    const response = await DELETE(request('DELETE'), context('whep_1'))
    expect(mocks.remove).toHaveBeenCalledWith('whep_1')
    expect(response.status).toBe(200)
  })
})
