import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876ProjectsIntegrationClient } from '../integration'

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data, error: null }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function errorResponse(code: string, message: string, status = 404) {
  return new Response(JSON.stringify({ data: null, error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function listEnvelope(data: unknown[], url: string) {
  return {
    object: 'list',
    data,
    has_more: false,
    total_count: data.length,
    url,
  }
}

const sampleClient = {
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

const sampleEndpoint = {
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

const sampleJob = {
  object: 'projects.import-job',
  id: 'impj_1',
  tenantId: 'prjten_1',
  source: 'csv',
  projectId: 'prj_1',
  status: 'preview',
  rowCount: 1,
  successCount: 0,
  failureCount: 0,
  contentHash: 'hash',
  unmappedFields: [],
  preview: [
    { rowIndex: 0, kind: 'work-item', title: 'Ship', valid: true, errors: [] },
  ],
  notes: [],
  createdAt: 1700000000,
  updatedAt: 1700000000,
}

const sampleSummary = {
  object: 'projects.metrics-summary',
  windowDays: 7,
  generatedAt: 1700000000,
  automationRuns: {
    last24h: { total: 1, failed: 0, failureRate: 0 },
    last7d: { total: 1, failed: 0, failureRate: 0 },
  },
  webhookDeliveries: {
    last24h: { total: 1, failed: 0, failureRate: 0 },
    last7d: { total: 1, failed: 0, failureRate: 0 },
  },
  importJobs: {
    last24h: { total: 1, failed: 0, failureRate: 0 },
    last7d: { total: 1, failed: 0, failureRate: 0 },
  },
}

describe('integration client', () => {
  const fetch = vi.fn<typeof globalThis.fetch>()
  const client = create876ProjectsIntegrationClient({
    baseUrl: 'http://projects.test',
    internalKey: 'internal-key',
    token: 'intc_1.secret',
    fetch,
  })

  function lastCall() {
    const call = fetch.mock.calls[fetch.mock.calls.length - 1] as [
      string,
      { method: string; headers: Record<string, string> },
    ]
    return { url: call[0], init: call[1] }
  }

  beforeEach(() => {
    fetch.mockReset()
  })

  it('exposes the five integration namespaces', () => {
    expect(Object.keys(client).sort()).toEqual([
      'exports',
      'importJobs',
      'integrationClients',
      'metrics',
      'webhookEndpoints',
    ])
  })

  it('creates clients over the internal credential', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ client: sampleClient, secret: 's3cret' }, 201)
    )
    const result = await client.integrationClients.create({
      organizationId: 'org_1',
      name: 'CI sync',
      scopes: ['projects:read'],
    })
    expect(result.error).toBeNull()
    expect(result.data?.secret).toBe('s3cret')
    const call = lastCall()
    expect(call.url).toBe('http://projects.test/internal/integration-clients')
    expect(call.init.method).toBe('POST')
    expect(call.init.headers['x-internal-key']).toBe('internal-key')
  })

  it('lists clients with the organization encoded', async () => {
    fetch.mockResolvedValueOnce(jsonResponse([sampleClient]))
    const result = await client.integrationClients.list('org 1')
    expect(result.error).toBeNull()
    expect(lastCall().url).toContain('organizationId=org%201')
  })

  it('revokes clients', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ ...sampleClient, revokedAt: 1700000001 })
    )
    const result = await client.integrationClients.revoke('intc_1', 'org_1')
    expect(result.data?.revokedAt).toBe(1700000001)
    expect(lastCall().url).toContain('/internal/integration-clients/intc_1/revoke')
  })

  it('creates webhook endpoints with the bearer token', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleEndpoint, 201))
    const result = await client.webhookEndpoints.create({
      url: 'https://hooks.example.com/x',
      eventTypes: ['*'],
    })
    expect(result.error).toBeNull()
    const call = lastCall()
    expect(call.url).toBe(
      'http://projects.test/v1/integration/webhook-endpoints'
    )
    expect(call.init.headers.authorization).toBe('Bearer intc_1.secret')
  })

  it('lists webhook endpoints as a list envelope', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(listEnvelope([sampleEndpoint], '/v1/integration/webhook-endpoints'))
    )
    const result = await client.webhookEndpoints.list()
    expect(result.data?.data).toHaveLength(1)
  })

  it('retrieves webhook endpoints by id', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleEndpoint))
    const result = await client.webhookEndpoints.retrieve('whep_1')
    expect(result.data?.id).toBe('whep_1')
    expect(lastCall().url).toContain('/whep_1')
  })

  it('updates webhook endpoints', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ ...sampleEndpoint, enabled: false })
    )
    const result = await client.webhookEndpoints.update('whep_1', {
      enabled: false,
    })
    expect(result.data?.enabled).toBe(false)
    expect(lastCall().init.method).toBe('PATCH')
  })

  it('removes webhook endpoints', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        object: 'projects.webhook-endpoint',
        id: 'whep_1',
        deleted: true,
      })
    )
    const result = await client.webhookEndpoints.remove('whep_1')
    expect(result.error).toBeNull()
    expect(lastCall().init.method).toBe('DELETE')
  })

  it('lists deliveries with filters encoded', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(listEnvelope([], '/v1/integration/webhook-deliveries'))
    )
    const result = await client.webhookEndpoints.listDeliveries({
      endpointId: 'whep_1',
      status: 'failed',
      limit: 10,
    })
    expect(result.error).toBeNull()
    const url = lastCall().url
    expect(url).toContain('endpointId=whep_1')
    expect(url).toContain('status=failed')
    expect(url).toContain('limit=10')
  })

  it('replays deliveries over the internal credential', async () => {
    const delivery = {
      object: 'projects.webhook-delivery',
      id: 'whdl_1',
      tenantId: 'prjten_1',
      endpointId: 'whep_1',
      eventId: 'aev_1',
      attempt: 0,
      status: 'pending',
      responseCode: null,
      errorCode: null,
      nextAttemptAt: 1700000000,
      createdAt: 1700000000,
      updatedAt: 1700000000,
    }
    fetch.mockResolvedValueOnce(jsonResponse(delivery))
    const result = await client.webhookEndpoints.replay('whdl_1', {
      organizationId: 'org_1',
    })
    expect(result.data?.status).toBe('pending')
    const call = lastCall()
    expect(call.url).toContain('/internal/webhook-deliveries/whdl_1/replay')
    expect(call.init.headers['x-internal-key']).toBe('internal-key')
  })

  it('creates import jobs', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleJob, 201))
    const result = await client.importJobs.create('org_1', {
      source: 'csv',
      content: 'title\nShip\n',
    })
    expect(result.data?.unmappedFields).toEqual([])
    expect(lastCall().url).toBe(
      'http://projects.test/v1/organizations/org_1/import-jobs'
    )
  })

  it('lists import jobs as an envelope', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(listEnvelope([sampleJob], '/x'))
    )
    const result = await client.importJobs.list('org_1')
    expect(result.data?.data).toHaveLength(1)
  })

  it('retrieves import jobs', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleJob))
    const result = await client.importJobs.retrieve('org_1', 'impj_1')
    expect(result.data?.id).toBe('impj_1')
  })

  it('lists import job rows as an envelope', async () => {
    const row = {
      object: 'projects.import-job-row',
      id: 'impr_1',
      jobId: 'impj_1',
      rowIndex: 0,
      kind: 'work-item',
      status: 'succeeded',
      externalRef: null,
      createdId: 'iss_1',
      error: null,
      createdAt: 1700000000,
      updatedAt: 1700000000,
    }
    fetch.mockResolvedValueOnce(jsonResponse(listEnvelope([row], '/x')))
    const result = await client.importJobs.listRows('org_1', 'impj_1')
    expect(result.data?.data[0]?.createdId).toBe('iss_1')
  })

  it('commits import jobs', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({ ...sampleJob, status: 'committed' })
    )
    const result = await client.importJobs.commit('org_1', 'impj_1')
    expect(result.data?.status).toBe('committed')
    expect(lastCall().url).toContain('/impj_1/commit')
  })

  it('downloads work items csv as text', async () => {
    fetch.mockResolvedValueOnce(
      new Response('identifier,title\r\nCONSOLE-1,Ship\r\n', { status: 200 })
    )
    const result = await client.exports.workItemsCsv({ project: 'CONSOLE' })
    expect(result.data).toContain('CONSOLE-1')
    const call = lastCall()
    expect(call.url).toContain('/v1/integration/exports/work-items.csv')
    expect(call.init.headers.authorization).toBe('Bearer intc_1.secret')
  })

  it('downloads time entries csv as text', async () => {
    fetch.mockResolvedValueOnce(new Response('id,userId\r\n', { status: 200 }))
    const result = await client.exports.timeEntriesCsv({ userId: 'usr_1' })
    expect(result.error).toBeNull()
    expect(lastCall().url).toContain('userId=usr_1')
  })

  it('surfaces csv error envelopes', async () => {
    fetch.mockResolvedValueOnce(
      errorResponse('projects/forbidden', 'No access.', 403)
    )
    const result = await client.exports.workItemsCsv()
    expect(result.error).toEqual({
      code: 'projects/forbidden',
      message: 'No access.',
    })
  })

  it('fetches the metrics summary', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleSummary))
    const result = await client.metrics.summary()
    expect(result.data?.windowDays).toBe(7)
    expect(lastCall().url).toBe(
      'http://projects.test/internal/metrics/summary'
    )
  })

  it('surfaces api errors as values', async () => {
    fetch.mockResolvedValueOnce(
      errorResponse('projects/webhook-endpoint-not-found', 'Missing.', 404)
    )
    const result = await client.webhookEndpoints.retrieve('whep_missing')
    expect(result).toEqual({
      data: null,
      error: {
        code: 'projects/webhook-endpoint-not-found',
        message: 'Missing.',
      },
    })
  })

  it('requires configuration before sending', async () => {
    const unconfigured = create876ProjectsIntegrationClient({
      baseUrl: 'http://projects.test',
      fetch,
    })
    const result = await unconfigured.webhookEndpoints.list()
    expect(result.error?.code).toBe('projects/not-configured')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('encodes special characters in endpoint ids', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleEndpoint))
    await client.webhookEndpoints.retrieve('whep 1/2')
    expect(lastCall().url).toContain('/whep%201%2F2')
  })

  it('lists deliveries without filters', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse(listEnvelope([], '/v1/integration/webhook-deliveries'))
    )
    const result = await client.webhookEndpoints.listDeliveries()
    expect(result.error).toBeNull()
    expect(lastCall().url).toBe(
      'http://projects.test/v1/integration/webhook-deliveries'
    )
  })

  it('reports network failures as offline', async () => {
    fetch.mockRejectedValueOnce(new Error('boom'))
    const result = await client.metrics.summary()
    expect(result.error?.code).toBe('network/offline')
  })

  it('forwards request ids', async () => {
    const traced = create876ProjectsIntegrationClient({
      baseUrl: 'http://projects.test',
      internalKey: 'internal-key',
      token: 'intc_1.secret',
      fetch,
      requestId: 'req_123',
    })
    fetch.mockResolvedValueOnce(jsonResponse(sampleSummary))
    await traced.metrics.summary()
    expect(lastCall().init.headers['x-request-id']).toBe('req_123')
  })

  it('rejects invalid response shapes', async () => {
    fetch.mockResolvedValueOnce(jsonResponse({ bogus: true }))
    const result = await client.webhookEndpoints.retrieve('whep_1')
    expect(result.error?.code).toBe('projects/invalid-response')
  })
})
