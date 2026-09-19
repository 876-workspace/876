import { describe, expect, it } from 'vitest'

import {
  generateWebhookSecret,
  toUiDeliveryStatus,
  toUiImportJob,
  toUiImportJobStatus,
  toUiImportPreview,
  toUiIntegrationClient,
  toUiMetricsSummary,
  toUiUnmappedFields,
  toUiWebhookDelivery,
  toUiWebhookEndpoint,
} from '../integration-mappers'

const apiClient = {
  object: 'projects.integration-client' as const,
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

const apiEndpoint = {
  object: 'projects.webhook-endpoint' as const,
  id: 'whep_1',
  tenantId: 'prjten_1',
  url: 'https://hooks.example.com/x',
  eventTypes: ['*'],
  enabled: true,
  consecutiveFailures: 0,
  createdAt: 1700000000,
  updatedAt: 1700000001,
}

function apiDelivery(overrides: Record<string, unknown> = {}) {
  return {
    object: 'projects.webhook-delivery' as const,
    id: 'whd_1',
    tenantId: 'prjten_1',
    endpointId: 'whep_1',
    eventId: 'evt_1',
    attempt: 1,
    status: 'delivered',
    responseCode: 200,
    errorCode: null,
    nextAttemptAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    ...overrides,
  }
}

const apiJob = {
  object: 'projects.import-job' as const,
  id: 'impj_1',
  tenantId: 'prjten_1',
  source: 'jira-csv',
  projectId: 'prj_1',
  status: 'preview',
  rowCount: 10,
  successCount: 8,
  failureCount: 2,
  contentHash: 'hash',
  unmappedFields: ['Story Points'],
  preview: [{ rowIndex: 0, kind: 'work-item', title: 'Ship', valid: true, errors: [] as string[] }],
  notes: [],
  createdAt: 1700000000,
  updatedAt: 1700000000,
}

const apiSummary = {
  object: 'projects.metrics-summary' as const,
  windowDays: 7,
  generatedAt: 1700000000,
  automationRuns: {
    last24h: { total: 2, failed: 1, failureRate: 0.5 },
    last7d: { total: 4, failed: 0, failureRate: 0 },
  },
  webhookDeliveries: {
    last24h: { total: 0, failed: 0, failureRate: 0 },
    last7d: { total: 1, failed: 1, failureRate: 1 },
  },
  importJobs: {
    last24h: { total: 3, failed: 0, failureRate: 0 },
    last7d: { total: 5, failed: 2, failureRate: 0.4 },
  },
}

describe('toUiIntegrationClient', () => {
  it('maps identity and timestamps', () => {
    const ui = toUiIntegrationClient(apiClient)
    expect(ui).toMatchObject({
      object: 'projects.integration-client',
      id: 'intc_1',
      name: 'CI sync',
      scopes: ['projects:read'],
      createdAt: 1700000000,
    })
  })

  it('never exposes secret-adjacent fields', () => {
    const ui = toUiIntegrationClient(apiClient) as Record<string, unknown>
    for (const key of ['secret', 'secretHash', 'keyPrefix', 'tenantId', 'organizationId']) {
      expect(ui).not.toHaveProperty(key)
    }
  })
})

describe('toUiWebhookEndpoint', () => {
  it('maps url, events, and failures', () => {
    expect(toUiWebhookEndpoint(apiEndpoint)).toMatchObject({
      object: 'projects.webhook-endpoint',
      id: 'whep_1',
      url: 'https://hooks.example.com/x',
      enabled: true,
      consecutiveFailures: 0,
    })
  })

  it('marks every endpoint as signed', () => {
    expect(toUiWebhookEndpoint(apiEndpoint).hasSecret).toBe(true)
  })

  it('never exposes the sealed secret', () => {
    const ui = toUiWebhookEndpoint(apiEndpoint) as Record<string, unknown>
    expect(ui).not.toHaveProperty('secret')
  })
})

describe('toUiDeliveryStatus', () => {
  it('maps delivered to succeeded', () => {
    expect(toUiDeliveryStatus('delivered')).toBe('succeeded')
  })

  it('keeps failed as failed', () => {
    expect(toUiDeliveryStatus('failed')).toBe('failed')
  })

  it('maps scheduled and delivering to pending', () => {
    expect(toUiDeliveryStatus('scheduled')).toBe('pending')
    expect(toUiDeliveryStatus('delivering')).toBe('pending')
    expect(toUiDeliveryStatus('pending')).toBe('pending')
  })
})

describe('toUiWebhookDelivery', () => {
  it('falls back to the event id for the event type', () => {
    expect(toUiWebhookDelivery(apiDelivery()).eventType).toBe('evt_1')
  })

  it('prefers an explicit event type when present', () => {
    expect(
      toUiWebhookDelivery(apiDelivery({ eventType: 'work-item.created' })).eventType
    ).toBe('work-item.created')
  })

  it('maps a delivered status to succeeded', () => {
    expect(toUiWebhookDelivery(apiDelivery()).status).toBe('succeeded')
  })
})

describe('toUiImportJob', () => {
  it('maps preview to previewing with counts', () => {
    expect(toUiImportJob(apiJob)).toMatchObject({
      object: 'projects.import-job',
      source: 'jira-csv',
      status: 'previewing',
      rowCount: 10,
      errorCount: 2,
      importedCount: 8,
    })
  })

  it('maps committed and partial to completed', () => {
    expect(toUiImportJobStatus('committed')).toBe('completed')
    expect(toUiImportJobStatus('partial')).toBe('completed')
    expect(toUiImportJobStatus('committing')).toBe('committing')
  })
})

describe('toUiImportPreview', () => {
  it('numbers rows from one', () => {
    const rows = toUiImportPreview(apiJob.preview)
    expect(rows[0]).toMatchObject({ rowNumber: 1, title: 'Ship', status: 'valid' })
  })

  it('maps an empty title to null and invalid rows', () => {
    const rows = toUiImportPreview([
      { rowIndex: 4, kind: 'work-item', title: '', valid: false, errors: ['Missing title'] },
    ])
    expect(rows[0]).toMatchObject({ rowNumber: 5, title: null, status: 'invalid' })
  })
})

describe('toUiUnmappedFields', () => {
  it('carries the source onto every field', () => {
    expect(toUiUnmappedFields('jira-csv', ['Story Points'])).toEqual([
      { source: 'jira-csv', field: 'Story Points', occurrences: 1 },
    ])
  })
})

describe('toUiMetricsSummary', () => {
  it('maps both windows without failure rates', () => {
    const ui = toUiMetricsSummary(apiSummary)
    expect(ui.windows).toHaveLength(2)
    expect(ui.windows[0]).toMatchObject({
      window: '24h',
      automationRuns: { total: 2, failed: 1 },
    })
    expect(ui.windows[1]?.webhookDeliveries).toEqual({ total: 1, failed: 1 })
  })
})

describe('generateWebhookSecret', () => {
  it('returns 64 hex characters', () => {
    expect(generateWebhookSecret()).toMatch(/^[0-9a-f]{64}$/)
  })

  it('returns a fresh value per call', () => {
    expect(generateWebhookSecret()).not.toBe(generateWebhookSecret())
  })
})
