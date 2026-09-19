import type {
  ImportJob as ApiImportJob,
  ImportJobPreviewRow,
  IntegrationClient as ApiIntegrationClient,
  MetricsSummary as ApiMetricsSummary,
  WebhookDelivery as ApiWebhookDelivery,
  WebhookEndpoint as ApiWebhookEndpoint,
} from '@876/projects/integration'
import type {
  ImportJob as UiImportJob,
  ImportRowPreview as UiImportRowPreview,
  IntegrationClient as UiIntegrationClient,
  MetricsSummary as UiMetricsSummary,
  UnmappedField as UiUnmappedField,
  WebhookDelivery as UiWebhookDelivery,
  WebhookEndpoint as UiWebhookEndpoint,
} from '@876/projects-ui/platform/types'

export const WEBHOOK_EVENT_OPTIONS = [
  '*',
  'work-item.created',
  'work-item.updated',
  'work-item.state-changed',
  'phase.completed',
  'time-entry.submitted',
  'budget.threshold-reached',
] as const

export const IMPORT_SOURCE_VALUES = [
  'csv',
  'jira-csv',
  'jira-json',
  'trello-json',
  'asana-csv',
  'zoho-csv',
] as const

export function toUiIntegrationClient(
  client: ApiIntegrationClient
): UiIntegrationClient {
  return {
    object: 'projects.integration-client',
    id: client.id,
    name: client.name,
    scopes: [...client.scopes],
    lastUsedAt: client.lastUsedAt,
    revokedAt: client.revokedAt,
    createdAt: client.createdAt,
  }
}

export function toUiWebhookEndpoint(
  endpoint: ApiWebhookEndpoint
): UiWebhookEndpoint {
  return {
    object: 'projects.webhook-endpoint',
    id: endpoint.id,
    url: endpoint.url,
    eventTypes: [...endpoint.eventTypes],
    enabled: endpoint.enabled,
    consecutiveFailures: endpoint.consecutiveFailures,
    hasSecret: true,
    updatedAt: endpoint.updatedAt,
  }
}

type DeliveryWithOptionalType = ApiWebhookDelivery & {
  eventType?: string
  event_type?: string
}

export function toUiDeliveryStatus(
  status: string
): UiWebhookDelivery['status'] {
  if (status === 'delivered' || status === 'succeeded') return 'succeeded'
  if (status === 'failed') return 'failed'
  return 'pending'
}

export function toUiWebhookDelivery(
  delivery: ApiWebhookDelivery
): UiWebhookDelivery {
  const withType = delivery as DeliveryWithOptionalType
  const eventType =
    withType.eventType ?? withType.event_type ?? delivery.eventId
  return {
    object: 'projects.webhook-delivery',
    id: delivery.id,
    endpointId: delivery.endpointId,
    eventId: delivery.eventId,
    eventType,
    attempt: delivery.attempt,
    status: toUiDeliveryStatus(delivery.status),
    responseCode: delivery.responseCode,
    nextAttemptAt: delivery.nextAttemptAt,
    createdAt: delivery.createdAt,
  }
}

export function toUiImportJobStatus(status: string): UiImportJob['status'] {
  if (status === 'committing') return 'committing'
  if (status === 'committed' || status === 'partial') return 'completed'
  return 'previewing'
}

export function toUiImportJob(job: ApiImportJob): UiImportJob {
  return {
    object: 'projects.import-job',
    id: job.id,
    source: job.source as UiImportJob['source'],
    status: toUiImportJobStatus(job.status),
    rowCount: job.rowCount,
    errorCount: job.failureCount,
    importedCount: job.successCount,
    createdAt: job.createdAt,
  }
}

export function toUiImportPreview(
  rows: readonly ImportJobPreviewRow[]
): UiImportRowPreview[] {
  return rows.map((row) => ({
    rowNumber: row.rowIndex + 1,
    title: row.title === '' ? null : row.title,
    status: row.valid ? 'valid' : 'invalid',
    errors: [...row.errors],
  }))
}

export function toUiUnmappedFields(
  source: string,
  fields: readonly string[]
): UiUnmappedField[] {
  return fields.map((field) => ({ source, field, occurrences: 1 }))
}

export function toUiMetricsSummary(
  summary: ApiMetricsSummary
): UiMetricsSummary {
  return {
    object: 'projects.metrics-summary',
    windows: [
      {
        window: '24h',
        automationRuns: {
          total: summary.automationRuns.last24h.total,
          failed: summary.automationRuns.last24h.failed,
        },
        webhookDeliveries: {
          total: summary.webhookDeliveries.last24h.total,
          failed: summary.webhookDeliveries.last24h.failed,
        },
        importJobs: {
          total: summary.importJobs.last24h.total,
          failed: summary.importJobs.last24h.failed,
        },
      },
      {
        window: '7d',
        automationRuns: {
          total: summary.automationRuns.last7d.total,
          failed: summary.automationRuns.last7d.failed,
        },
        webhookDeliveries: {
          total: summary.webhookDeliveries.last7d.total,
          failed: summary.webhookDeliveries.last7d.failed,
        },
        importJobs: {
          total: summary.importJobs.last7d.total,
          failed: summary.importJobs.last7d.failed,
        },
      },
    ],
  }
}

export function generateWebhookSecret(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
