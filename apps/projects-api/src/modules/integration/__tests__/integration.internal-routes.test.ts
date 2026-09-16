import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { service } = vi.hoisted(() => ({
  service: { createClient: vi.fn(), listClients: vi.fn(), revokeClient: vi.fn() },
}))

vi.mock('../integration.service.js', () => service)

const { createIntegrationInternalRouter } = await import(
  '../integration.routes.js'
)

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use('/internal', createIntegrationInternalRouter())
  app.use(errorHandler)
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')
  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-internal-key': 'test-internal-key',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
})

describe('integration internal routes', () => {
  it('returns 401 without the internal key', async () => {
    const response = await requestJson(
      'GET',
      '/internal/integration-clients?organizationId=org_1',
      undefined,
      { 'x-internal-key': 'wrong' }
    )
    expect(response.status).toBe(401)
  })

  it('creates clients', async () => {
    service.createClient.mockResolvedValueOnce({
      data: { client: { id: 'intc_1' }, secret: 's3cret' },
      error: null,
    })
    const response = await requestJson('POST', '/internal/integration-clients', {
      organizationId: 'org_1',
      name: 'Sync',
      scopes: ['projects:read'],
    })
    expect(response.status).toBe(201)
    expect(service.createClient).toHaveBeenCalledWith({
      organizationId: 'org_1',
      name: 'Sync',
      scopes: ['projects:read'],
    })
  })

  it('lists clients', async () => {
    service.listClients.mockResolvedValueOnce({ data: [], error: null })
    const response = await requestJson(
      'GET',
      '/internal/integration-clients?organizationId=org_1'
    )
    expect(response.status).toBe(200)
    expect(service.listClients).toHaveBeenCalledWith('org_1')
  })

  it('revokes clients', async () => {
    service.revokeClient.mockResolvedValueOnce({
      data: { id: 'intc_1' },
      error: null,
    })
    const response = await requestJson(
      'POST',
      '/internal/integration-clients/intc_1/revoke?organizationId=org_1'
    )
    expect(response.status).toBe(200)
    expect(service.revokeClient).toHaveBeenCalledWith('org_1', 'intc_1')
  })
})
