import { createHash } from 'node:crypto'
import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { repository, projects, issues, workStructure, time, webhooks, exportsService } =
  vi.hoisted(() => ({
    repository: { retrieveClient: vi.fn(), markClientUsed: vi.fn() },
    projects: { list: vi.fn(), create: vi.fn(), retrieve: vi.fn(), update: vi.fn() },
    issues: { list: vi.fn(), create: vi.fn(), retrieve: vi.fn(), update: vi.fn() },
    workStructure: {
      listMilestones: vi.fn(),
      createMilestone: vi.fn(),
      retrieveMilestone: vi.fn(),
      updateMilestone: vi.fn(),
    },
    time: { listTimeEntries: vi.fn(), createTimeEntry: vi.fn() },
    webhooks: {
      listEndpoints: vi.fn(),
      createEndpoint: vi.fn(),
      retrieveEndpoint: vi.fn(),
      updateEndpoint: vi.fn(),
      removeEndpoint: vi.fn(),
    },
    exportsService: { buildWorkItemsCsv: vi.fn(), buildTimeEntriesCsv: vi.fn() },
  }))

vi.mock('../integration.repository.js', () => repository)
vi.mock('../../projects/index.js', () => projects)
vi.mock('../../issues/index.js', () => issues)
vi.mock('../../work-structure/index.js', () => workStructure)
vi.mock('../../time/index.js', () => time)
vi.mock('../../webhooks/index.js', () => webhooks)
vi.mock('../../exports/index.js', () => exportsService)

const guard = await import('../integration.guard.js')
const { createIntegrationRouter } = await import('../integration.routes.js')

const SECRET = 'route-test-secret'

function clientRow(scopes: string[], overrides = {}) {
  return {
    id: 'intc_routes',
    tenantId: 'prjten_1',
    organizationId: 'org_1',
    name: 'Routes',
    scopes,
    secretHash: createHash('sha256').update(SECRET, 'utf8').digest('hex'),
    keyPrefix: 'route-te',
    lastUsedAt: null,
    revokedAt: null,
    createdAt: 1000n,
    updatedAt: 1000n,
    ...overrides,
  }
}

const BEARER = `Bearer intc_routes.${SECRET}`

async function requestJson(
  method: string,
  path: string,
  scopes: string[],
  body?: unknown,
  clientOverrides = {}
) {
  repository.retrieveClient.mockResolvedValue(clientRow(scopes, clientOverrides))
  const app = express()
  app.use(express.json())
  app.use('/v1/integration', createIntegrationRouter())
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
        authorization: BEARER,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    const text = await response.text()
    let parsed: unknown = null
    try {
      parsed = JSON.parse(text) as unknown
    } catch {
      parsed = null
    }
    return { status: response.status, body: parsed, text }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  guard.resetIntegrationRateLimits()
})

describe('integration routes', () => {
  it('serves the openapi document to authenticated clients', async () => {
    const response = await requestJson('GET', '/v1/integration/openapi.json', [
      'projects:read',
    ])
    expect(response.status).toBe(200)
    expect(
      (response.body as { data: { openapi: string } }).data.openapi
    ).toBe('3.1.0')
  })

  it('lists projects with projects:read', async () => {
    projects.list.mockResolvedValueOnce({
      data: { items: [], hasMore: false, totalCount: 0 },
      error: null,
    })
    const response = await requestJson('GET', '/v1/integration/projects', [
      'projects:read',
    ])
    expect(response.status).toBe(200)
    expect(projects.list).toHaveBeenCalledWith('org_1', expect.anything())
  })

  it('rejects project reads with only time scope', async () => {
    const response = await requestJson('GET', '/v1/integration/projects', [
      'time:read',
    ])
    expect(response.status).toBe(403)
  })

  it('creates projects with projects:write', async () => {
    projects.create.mockResolvedValueOnce({
      data: { id: 'prj_1' },
      error: null,
    })
    const response = await requestJson(
      'POST',
      '/v1/integration/projects',
      ['projects:write'],
      { name: 'Website' }
    )
    expect(response.status).toBe(201)
  })

  it('rejects project writes with read scope', async () => {
    const response = await requestJson(
      'POST',
      '/v1/integration/projects',
      ['projects:read'],
      { name: 'Website' }
    )
    expect(response.status).toBe(403)
    expect(projects.create).not.toHaveBeenCalled()
  })

  it('retrieves and updates work items under projects scope', async () => {
    issues.retrieve.mockResolvedValueOnce({ data: { id: 'iss_1' }, error: null })
    const retrieved = await requestJson(
      'GET',
      '/v1/integration/work-items/iss_1',
      ['projects:read']
    )
    expect(retrieved.status).toBe(200)
    issues.update.mockResolvedValueOnce({ data: { id: 'iss_1' }, error: null })
    const updated = await requestJson(
      'PATCH',
      '/v1/integration/work-items/iss_1',
      ['projects:write'],
      { title: 'New title' }
    )
    expect(updated.status).toBe(200)
  })

  it('requires a project for phase listing', async () => {
    const response = await requestJson('GET', '/v1/integration/phases', [
      'projects:read',
    ])
    expect(response.status).toBe(400)
    expect(workStructure.listMilestones).not.toHaveBeenCalled()
  })

  it('isolates time entries behind time:read', async () => {
    const denied = await requestJson('GET', '/v1/integration/time-entries', [
      'projects:read',
    ])
    expect(denied.status).toBe(403)
    time.listTimeEntries.mockResolvedValueOnce({ data: [], error: null })
    const allowed = await requestJson('GET', '/v1/integration/time-entries', [
      'time:read',
    ])
    expect(allowed.status).toBe(200)
  })

  it('isolates webhook endpoints behind webhooks:manage', async () => {
    const denied = await requestJson(
      'POST',
      '/v1/integration/webhook-endpoints',
      ['projects:write'],
      { url: 'https://93.184.216.34/hook', eventTypes: ['*'] }
    )
    expect(denied.status).toBe(403)
    webhooks.createEndpoint.mockResolvedValueOnce({
      data: { id: 'whep_1' },
      error: null,
    })
    const allowed = await requestJson(
      'POST',
      '/v1/integration/webhook-endpoints',
      ['webhooks:manage'],
      { url: 'https://93.184.216.34/hook', eventTypes: ['*'] }
    )
    expect(allowed.status).toBe(201)
  })

  it('serves csv exports with the matching read scope', async () => {
    exportsService.buildWorkItemsCsv.mockResolvedValueOnce({
      csv: 'identifier,title\r\nCONSOLE-1,Ship\r\n',
      count: 1,
    })
    const response = await requestJson(
      'GET',
      '/v1/integration/exports/work-items.csv',
      ['projects:read']
    )
    expect(response.status).toBe(200)
    expect(response.text).toContain('CONSOLE-1')
  })

  it('rejects revoked clients on every route', async () => {
    const response = await requestJson(
      'GET',
      '/v1/integration/projects',
      ['projects:read'],
      undefined,
      { revokedAt: 1000n }
    )
    expect(response.status).toBe(401)
    expect(projects.list).not.toHaveBeenCalled()
  })
})
