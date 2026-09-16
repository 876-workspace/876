import { describe, expect, it } from 'vitest'

import type {
  ImportJob as ServiceImportJob,
  IntegrationClient as ServiceIntegrationClient,
  MetricsSummary as ServiceMetricsSummary,
  WebhookDelivery as ServiceWebhookDelivery,
  WebhookEndpoint as ServiceWebhookEndpoint,
} from '@876/projects/integration'

import {
  toUiDeliveryStatus,
  toUiImportJob,
  toUiImportJobStatus,
  toUiImportPreview,
  toUiIntegrationClient,
  toUiMetricsSummary,
  toUiUnmappedFields,
  toUiWebhookDelivery,
  toUiWebhookEndpoint,
} from './projects-integration-mappers'

function makeClient(
  overrides: Partial<ServiceIntegrationClient> = {}
): ServiceIntegrationClient {
  return {
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
    ...overrides,
  }
}

function makeEndpoint(
  overrides: Partial<ServiceWebhookEndpoint> = {}
): ServiceWebhookEndpoint {
  return {
    object: 'projects.webhook-endpoint',
    id: 'whep_1',
    tenantId: 'prjten_1',
    url: 'https://hooks.example.com/projects',
    eventTypes: ['*'],
    enabled: true,
    consecutiveFailures: 0,
    createdAt: 1700000000,
    updatedAt: 1700000001,
    ...overrides,
  }
}

function makeDelivery(
  overrides: Partial<ServiceWebhookDelivery> = {}
): ServiceWebhookDelivery {
  return {
    object: 'projects.webhook-delivery',
    id: 'whdl_1',
    tenantId: 'prjten_1',
    endpointId: 'whep_1',
    eventId: 'evt_1',
    attempt: 1,
    status: 'pending',
    responseCode: null,
    errorCode: null,
    nextAttemptAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

function makeJob(
  overrides: Partial<ServiceImportJob> = {}
): ServiceImportJob {
  return {
    object: 'projects.import-job',
    id: 'impj_1',
    tenantId: 'prjten_1',
    source: 'csv',
    projectId: 'proj_1',
    status: 'preview',
    rowCount: 10,
    successCount: 7,
    failureCount: 3,
    contentHash: 'hash_1',
    unmappedFields: ['custom_1'],
    preview: [
      { rowIndex: 0, kind: 'issue', title: 'First', valid: true, errors: [] },
      { rowIndex: 1, kind: 'issue', title: '', valid: false, errors: ['Missing title'] },
    ],
    notes: [],
    createdAt: 1700000000,
    updatedAt: 1700000001,
    ...overrides,
  }
}

function makeSummary(): ServiceMetricsSummary {
  const section = (total: number, failed: number) => ({
    total,
    failed,
    failureRate: total === 0 ? 0 : failed / total,
  })
  return {
    object: 'projects.metrics-summary',
    windowDays: 7,
    generatedAt: 1700000000,
    automationRuns: { last24h: section(10, 1), last7d: section(70, 7) },
    webhookDeliveries: { last24h: section(20, 2), last7d: section(140, 5) },
    importJobs: { last24h: section(3, 0), last7d: section(9, 1) },
  }
}

describe('projects integration mappers', () => {
  it('maps integration clients without tenant, org, or key material', () => {
    const ui = toUiIntegrationClient(makeClient())

    expect(ui).toEqual({
      object: 'projects.integration-client',
      id: 'intc_1',
      name: 'CI sync',
      scopes: ['projects:read'],
      lastUsedAt: null,
      revokedAt: null,
      createdAt: 1700000000,
    })
    expect(ui).not.toHaveProperty('tenantId')
    expect(ui).not.toHaveProperty('organizationId')
    expect(ui).not.toHaveProperty('keyPrefix')
    expect(JSON.stringify(ui)).not.toContain('abcd1234')
  })

  it('copies scopes so service arrays cannot be mutated through the UI', () => {
    const service = makeClient({ scopes: ['projects:read'] })
    const ui = toUiIntegrationClient(service)
    ui.scopes.push('projects:write')

    expect(service.scopes).toEqual(['projects:read'])
  })

  it('maps webhook endpoints with the secret presence flag and no secret value', () => {
    const ui = toUiWebhookEndpoint(makeEndpoint())

    expect(ui.hasSecret).toBe(true)
    expect(ui.url).toBe('https://hooks.example.com/projects')
    expect(ui).not.toHaveProperty('tenantId')
    expect(JSON.stringify(ui)).not.toContain('secret')
  })

  it('maps delivered and succeeded deliveries to succeeded', () => {
    expect(toUiDeliveryStatus('delivered')).toBe('succeeded')
    expect(toUiDeliveryStatus('succeeded')).toBe('succeeded')
  })

  it('maps failed deliveries to failed and unknown to pending', () => {
    expect(toUiDeliveryStatus('failed')).toBe('failed')
    expect(toUiDeliveryStatus('scheduled')).toBe('pending')
    expect(toUiDeliveryStatus('')).toBe('pending')
  })

  it('falls back to the event id when the delivery carries no event type', () => {
    const ui = toUiWebhookDelivery(makeDelivery({ eventId: 'evt_9' }))

    expect(ui.eventType).toBe('evt_9')
    expect(ui.status).toBe('pending')
    expect(ui.endpointId).toBe('whep_1')
  })

  it('maps import jobs with failure and success counts renamed', () => {
    const ui = toUiImportJob(makeJob())

    expect(ui.errorCount).toBe(3)
    expect(ui.importedCount).toBe(7)
    expect(ui.rowCount).toBe(10)
    expect(ui.source).toBe('csv')
    expect(ui).not.toHaveProperty('contentHash')
  })

  it('maps import statuses across service and UI vocabularies', () => {
    expect(toUiImportJobStatus('committing')).toBe('committing')
    expect(toUiImportJobStatus('committed')).toBe('completed')
    expect(toUiImportJobStatus('partial')).toBe('completed')
    expect(toUiImportJobStatus('ready')).toBe('ready')
    expect(toUiImportJobStatus('failed')).toBe('failed')
    expect(toUiImportJobStatus('preview')).toBe('previewing')
  })

  it('maps preview rows to one-based numbers with empty titles nulled', () => {
    const rows = toUiImportPreview(makeJob().preview)

    expect(rows[0]).toMatchObject({
      rowNumber: 1,
      title: 'First',
      status: 'valid',
    })
    expect(rows[1]).toMatchObject({
      rowNumber: 2,
      title: null,
      status: 'invalid',
    })
  })

  it('maps unmapped fields with the job source attached', () => {
    const fields = toUiUnmappedFields('csv', ['custom_1', 'custom_2'])

    expect(fields).toEqual([
      { source: 'csv', field: 'custom_1', occurrences: 1 },
      { source: 'csv', field: 'custom_2', occurrences: 1 },
    ])
  })

  it('maps the metrics summary into 24h and 7d windows', () => {
    const ui = toUiMetricsSummary(makeSummary())

    expect(ui.windows).toHaveLength(2)
    expect(ui.windows[0]).toMatchObject({
      window: '24h',
      automationRuns: { total: 10, failed: 1 },
      webhookDeliveries: { total: 20, failed: 2 },
    })
    expect(ui.windows[1]).toMatchObject({
      window: '7d',
      importJobs: { total: 9, failed: 1 },
    })
  })

  it('falls back to csv for unknown import sources', () => {
    const ui = toUiImportJob(makeJob({ source: 'unknown-source' }))

    expect(ui.source).toBe('csv')
  })
})
