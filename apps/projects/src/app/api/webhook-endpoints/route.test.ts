import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/services/integration', () => ({
  integration: {
    listWebhookEndpoints: mocks.list,
    createWebhookEndpoint: mocks.create,
  },
}))

const { GET, POST } = await import('./route')

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/webhook-endpoints', {
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

function listEnvelope(data: unknown[]) {
  return {
    object: 'list',
    data,
    has_more: false,
    total_count: data.length,
    url: '/v1/integration/webhook-endpoints',
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.list.mockResolvedValue({ data: listEnvelope([endpoint]), error: null })
  mocks.create.mockResolvedValue({ data: endpoint, error: null })
})

describe('GET /api/webhook-endpoints', () => {
  it('requires the projects view permission', async () => {
    await GET()
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('lists endpoints without secrets', async () => {
    const response = await GET()
    expect(response.status).toBe(200)
    expect(await response.text()).not.toMatch(/"secret"\s*:/)
  })

  it('returns 400 when the service fails', async () => {
    mocks.list.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    expect((await GET()).status).toBe(400)
  })
})

describe('POST /api/webhook-endpoints', () => {
  const input = { url: 'https://hooks.example.com/x', eventTypes: ['*'] }

  it('requires the projects edit permission', async () => {
    await POST(request('POST', input))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('creates the endpoint and answers 201', async () => {
    const response = await POST(request('POST', input))
    expect(mocks.create).toHaveBeenCalledWith({
      url: 'https://hooks.example.com/x',
      eventTypes: ['*'],
    })
    expect(response.status).toBe(201)
  })

  it('rejects a plain http url with 422', async () => {
    const response = await POST(
      request('POST', { url: 'http://hooks.example.com/x', eventTypes: ['*'] })
    )
    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('rejects zero event types with 422', async () => {
    const response = await POST(
      request('POST', { url: 'https://hooks.example.com/x', eventTypes: [] })
    )
    expect(response.status).toBe(422)
    expect(mocks.create).not.toHaveBeenCalled()
  })

  it('returns 400 when the service rejects the endpoint', async () => {
    mocks.create.mockResolvedValue({
      data: null,
      error: { code: 'projects/webhook-url-blocked', message: 'Blocked.' },
    })
    expect((await POST(request('POST', input))).status).toBe(400)
  })
})
