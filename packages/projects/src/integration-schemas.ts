import { z } from 'zod'

import { createListSchema, deletedSchema } from './types'

export { deletedSchema }

export const INTEGRATION_SCOPES = [
  'projects:read',
  'projects:write',
  'time:read',
  'time:write',
  'webhooks:manage',
] as const

export const integrationScopeSchema = z.enum(INTEGRATION_SCOPES)
export type IntegrationScope = z.infer<typeof integrationScopeSchema>

export const integrationClientSchema = z.object({
  object: z.literal('projects.integration-client'),
  id: z.string(),
  tenantId: z.string(),
  organizationId: z.string(),
  name: z.string(),
  scopes: z.array(z.string()),
  keyPrefix: z.string(),
  lastUsedAt: z.number().nullable(),
  revokedAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type IntegrationClient = z.infer<typeof integrationClientSchema>

export const createdIntegrationClientSchema = z.object({
  client: integrationClientSchema,
  secret: z.string(),
})
export type CreatedIntegrationClient = z.infer<
  typeof createdIntegrationClientSchema
>

export const webhookEndpointSchema = z.object({
  object: z.literal('projects.webhook-endpoint'),
  id: z.string(),
  tenantId: z.string(),
  url: z.string(),
  eventTypes: z.array(z.string()),
  enabled: z.boolean(),
  consecutiveFailures: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type WebhookEndpoint = z.infer<typeof webhookEndpointSchema>

export const webhookEndpointListSchema = createListSchema(webhookEndpointSchema)
export type WebhookEndpointList = z.infer<typeof webhookEndpointListSchema>

export const webhookDeliverySchema = z.object({
  object: z.literal('projects.webhook-delivery'),
  id: z.string(),
  tenantId: z.string(),
  endpointId: z.string(),
  eventId: z.string(),
  attempt: z.number(),
  status: z.string(),
  responseCode: z.number().nullable(),
  errorCode: z.string().nullable(),
  nextAttemptAt: z.number().nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type WebhookDelivery = z.infer<typeof webhookDeliverySchema>

export const webhookDeliveryListSchema = createListSchema(webhookDeliverySchema)
export type WebhookDeliveryList = z.infer<typeof webhookDeliveryListSchema>

export const importJobPreviewRowSchema = z.object({
  rowIndex: z.number(),
  kind: z.string(),
  title: z.string(),
  valid: z.boolean(),
  errors: z.array(z.string()),
})
export type ImportJobPreviewRow = z.infer<typeof importJobPreviewRowSchema>

export const importJobSchema = z.object({
  object: z.literal('projects.import-job'),
  id: z.string(),
  tenantId: z.string(),
  source: z.string(),
  projectId: z.string().nullable(),
  status: z.string(),
  rowCount: z.number(),
  successCount: z.number(),
  failureCount: z.number(),
  contentHash: z.string(),
  unmappedFields: z.array(z.string()),
  preview: z.array(importJobPreviewRowSchema),
  notes: z.array(z.string()),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type ImportJob = z.infer<typeof importJobSchema>

export const importJobListSchema = createListSchema(importJobSchema)
export type ImportJobList = z.infer<typeof importJobListSchema>

export const importJobRowSchema = z.object({
  object: z.literal('projects.import-job-row'),
  id: z.string(),
  jobId: z.string(),
  rowIndex: z.number(),
  kind: z.string(),
  status: z.string(),
  externalRef: z.string().nullable(),
  createdId: z.string().nullable(),
  error: z.object({ code: z.string(), message: z.string() }).nullable(),
  createdAt: z.number(),
  updatedAt: z.number(),
})
export type ImportJobRow = z.infer<typeof importJobRowSchema>

export const importJobRowListSchema = createListSchema(importJobRowSchema)
export type ImportJobRowList = z.infer<typeof importJobRowListSchema>

export const subsystemSummarySchema = z.object({
  total: z.number(),
  failed: z.number(),
  failureRate: z.number(),
})
export type SubsystemSummary = z.infer<typeof subsystemSummarySchema>

export const metricsSummarySchema = z.object({
  object: z.literal('projects.metrics-summary'),
  windowDays: z.number(),
  generatedAt: z.number(),
  automationRuns: z.object({
    last24h: subsystemSummarySchema,
    last7d: subsystemSummarySchema,
  }),
  webhookDeliveries: z.object({
    last24h: subsystemSummarySchema,
    last7d: subsystemSummarySchema,
  }),
  importJobs: z.object({
    last24h: subsystemSummarySchema,
    last7d: subsystemSummarySchema,
  }),
})
export type MetricsSummary = z.infer<typeof metricsSummarySchema>

export const IMPORT_SOURCES = [
  'csv',
  'jira-csv',
  'jira-json',
  'trello-json',
  'asana-csv',
  'zoho-csv',
] as const

export const importSourceSchema = z.enum(IMPORT_SOURCES)
export type ImportSource = z.infer<typeof importSourceSchema>

export interface IntegrationRequestOptions {
  signal?: AbortSignal
}

export interface CreateIntegrationClientInput {
  organizationId: string
  name: string
  scopes: IntegrationScope[]
}

export interface CreateWebhookEndpointInput {
  url: string
  eventTypes: string[]
  secret?: string
  enabled?: boolean
}

export interface UpdateWebhookEndpointInput {
  url?: string
  eventTypes?: string[]
  secret?: string
  enabled?: boolean
}

export interface ListWebhookDeliveriesQuery {
  endpointId?: string
  status?: 'pending' | 'delivered' | 'failed'
  limit?: number
}

export interface CreateImportJobInput {
  source: ImportSource
  projectId?: string | null
  filename?: string | null
  content: string
}

export interface ReplayWebhookDeliveryInput {
  organizationId: string
}
