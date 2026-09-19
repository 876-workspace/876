import { NextRequest } from 'next/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  requireAccess: vi.fn(),
  listClients: vi.fn(),
  createClient: vi.fn(),
}))

vi.mock('@/lib/auth/api-permission', () => ({
  requireApiAccess: mocks.requireAccess,
}))
vi.mock('@/lib/clients/integration', () => ({
  integration: {
    listClients: mocks.listClients,
    createClient: mocks.createClient,
  },
}))

const { GET, POST } = await import('./route')

function request(method: string, body?: unknown) {
  return new NextRequest('http://localhost/api/integration-clients', {
    method,
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}

const client = {
  object: 'projects.integration-client',
  id: 'intc_1',
  tenantId: 'prjten_1',
  organizationId: 'org_1',
  name: 'CI sync',
  scopes: ['projects:read'],
  keyPrefix: 'abcd1234',
  lastUsedAt: null,
  revokedAt: null,
  createdAt: 1700000000,
  updatedAt: 1700000000,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.requireAccess.mockResolvedValue({ response: null, orgId: 'org_1', userId: 'user_1' })
  mocks.listClients.mockResolvedValue({ data: [client], error: null })
  mocks.createClient.mockResolvedValue({
    data: { client, secret: 'one-time-secret' },
    error: null,
  })
})

describe('GET /api/integration-clients', () => {
  it('requires the projects view permission', async () => {
    await GET()
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.view',
    })
  })

  it('lists clients for the organization', async () => {
    const response = await GET()
    expect(mocks.listClients).toHaveBeenCalledWith('org_1')
    expect(response.status).toBe(200)
  })

  it('never includes a secret in the list response', async () => {
    const response = await GET()
    const text = await response.text()
    expect(text).not.toContain('one-time-secret')
    expect(text).not.toMatch(/"secret"\s*:/)
  })

  it('returns 400 when the service fails', async () => {
    mocks.listClients.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Down.' },
    })
    expect((await GET()).status).toBe(400)
  })
})

describe('POST /api/integration-clients', () => {
  const input = { name: 'CI sync', scopes: ['projects:read'] }

  it('requires the projects edit permission', async () => {
    await POST(request('POST', input))
    expect(mocks.requireAccess).toHaveBeenCalledWith({
      module: 'projects',
      permission: 'projects.edit',
    })
  })

  it('creates the client and answers 201 with the one-time secret', async () => {
    const response = await POST(request('POST', input))
    expect(mocks.createClient).toHaveBeenCalledWith({
      organizationId: 'org_1',
      name: 'CI sync',
      scopes: ['projects:read'],
    })
    expect(response.status).toBe(201)
    const payload = (await response.json()) as {
      data: { client: { id: string }; secret: string }
    }
    expect(payload.data.client.id).toBe('intc_1')
    expect(payload.data.secret).toBe('one-time-secret')
  })

  it('answers JSON without a redirect so the secret never lands in a URL', async () => {
    const response = await POST(request('POST', input))
    expect(response.status).toBe(201)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('rejects an empty name with 422', async () => {
    const response = await POST(request('POST', { name: '  ', scopes: ['projects:read'] }))
    expect(response.status).toBe(422)
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('rejects zero scopes with 422', async () => {
    const response = await POST(request('POST', { name: 'CI', scopes: [] }))
    expect(response.status).toBe(422)
    expect(mocks.createClient).not.toHaveBeenCalled()
  })

  it('returns 400 when the service rejects the client', async () => {
    mocks.createClient.mockResolvedValue({
      data: null,
      error: { code: 'projects/invalid-request', message: 'Bad.' },
    })
    expect((await POST(request('POST', input))).status).toBe(400)
  })
})
