import 'server-only'

import {
  create876ProjectsIntegrationClient,
  type ProjectsIntegrationClient,
} from '@876/projects/integration'
import type {
  CreateImportJobInput,
  CreateIntegrationClientInput,
  CreateWebhookEndpointInput,
  IntegrationRequestOptions,
  ListWebhookDeliveriesQuery,
  ReplayWebhookDeliveryInput,
  UpdateWebhookEndpointInput,
} from '@876/projects/integration'
import type { Result } from '@876/projects'

import type {
  ExportTimeEntriesQuery,
  ExportWorkItemsQuery,
} from '@/lib/integration-inputs'

let integrationClient: ProjectsIntegrationClient | undefined

function baseUrl(): string {
  return (
    process.env.PROJECTS_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_PROJECTS_API_URL?.trim() ||
    'http://localhost:4030'
  ).replace(/\/$/, '')
}

function internalKey(): string {
  const key = process.env.PROJECTS_INTERNAL_KEY?.trim()
  if (!key) throw new Error('PROJECTS_INTERNAL_KEY is required')
  return key
}

function integrationToken(): string | undefined {
  return process.env.PROJECTS_INTEGRATION_TOKEN?.trim() || undefined
}

function getIntegrationClient(): ProjectsIntegrationClient {
  if (integrationClient) return integrationClient
  integrationClient = create876ProjectsIntegrationClient({
    baseUrl: baseUrl(),
    internalKey: internalKey(),
    token: integrationToken(),
  })
  return integrationClient
}

async function exportCsv(
  path: string,
  options: IntegrationRequestOptions = {}
): Promise<Result<string>> {
  const url = `${baseUrl()}${path}`
  let response: Response
  try {
    response = await fetch(url, {
      method: 'GET',
      headers: {
        accept: 'text/csv',
        'x-internal-key': internalKey(),
      },
      signal: options.signal,
    })
  } catch {
    return {
      data: null,
      error: { code: 'projects/unavailable', message: 'The export could not be loaded.' },
    }
  }
  if (response.ok) {
    return { data: await response.text(), error: null }
  }
  const payload = (await response.json().catch(() => null)) as {
    error?: { code?: string; message?: string } | null
  } | null
  return {
    data: null,
    error: {
      code: payload?.error?.code ?? 'projects/export-unavailable',
      message: payload?.error?.message ?? 'The export could not be loaded.',
    },
  }
}

function exportQueryString(query: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) search.set(key, String(value))
  }
  const suffix = search.toString()
  return suffix ? `?${suffix}` : ''
}

export const integration = {
  listClients(organizationId: string, options: IntegrationRequestOptions = {}) {
    return getIntegrationClient().integrationClients.list(organizationId, options)
  },
  createClient(input: CreateIntegrationClientInput, options: IntegrationRequestOptions = {}) {
    return getIntegrationClient().integrationClients.create(input, options)
  },
  revokeClient(
    clientId: string,
    organizationId: string,
    options: IntegrationRequestOptions = {}
  ) {
    return getIntegrationClient().integrationClients.revoke(clientId, organizationId, options)
  },
  listWebhookEndpoints(options: IntegrationRequestOptions = {}) {
    return getIntegrationClient().webhookEndpoints.list(options)
  },
  createWebhookEndpoint(
    input: CreateWebhookEndpointInput,
    options: IntegrationRequestOptions = {}
  ) {
    return getIntegrationClient().webhookEndpoints.create(input, options)
  },
  retrieveWebhookEndpoint(endpointId: string, options: IntegrationRequestOptions = {}) {
    return getIntegrationClient().webhookEndpoints.retrieve(endpointId, options)
  },
  updateWebhookEndpoint(
    endpointId: string,
    input: UpdateWebhookEndpointInput,
    options: IntegrationRequestOptions = {}
  ) {
    return getIntegrationClient().webhookEndpoints.update(endpointId, input, options)
  },
  removeWebhookEndpoint(endpointId: string, options: IntegrationRequestOptions = {}) {
    return getIntegrationClient().webhookEndpoints.remove(endpointId, options)
  },
  listWebhookDeliveries(
    query: ListWebhookDeliveriesQuery & IntegrationRequestOptions = {}
  ) {
    return getIntegrationClient().webhookEndpoints.listDeliveries(query)
  },
  replayWebhookDelivery(
    deliveryId: string,
    input: ReplayWebhookDeliveryInput,
    options: IntegrationRequestOptions = {}
  ) {
    return getIntegrationClient().webhookEndpoints.replay(deliveryId, input, options)
  },
  createImportJob(
    organizationId: string,
    input: CreateImportJobInput,
    options: IntegrationRequestOptions = {}
  ) {
    return getIntegrationClient().importJobs.create(organizationId, input, options)
  },
  listImportJobs(organizationId: string, options: IntegrationRequestOptions = {}) {
    return getIntegrationClient().importJobs.list(organizationId, options)
  },
  retrieveImportJob(
    organizationId: string,
    jobId: string,
    options: IntegrationRequestOptions = {}
  ) {
    return getIntegrationClient().importJobs.retrieve(organizationId, jobId, options)
  },
  listImportJobRows(
    organizationId: string,
    jobId: string,
    options: IntegrationRequestOptions = {}
  ) {
    return getIntegrationClient().importJobs.listRows(organizationId, jobId, options)
  },
  commitImportJob(
    organizationId: string,
    jobId: string,
    options: IntegrationRequestOptions = {}
  ) {
    return getIntegrationClient().importJobs.commit(organizationId, jobId, options)
  },
  getMetricsSummary(options: IntegrationRequestOptions = {}) {
    return getIntegrationClient().metrics.summary(options)
  },
  exportWorkItemsCsv(
    organizationId: string,
    query: ExportWorkItemsQuery,
    options: IntegrationRequestOptions = {}
  ): Promise<Result<string>> {
    const suffix = exportQueryString({ project: query.project })
    return exportCsv(
      `/v1/organizations/${encodeURIComponent(organizationId)}/exports/work-items.csv${suffix}`,
      options
    )
  },
  exportTimeEntriesCsv(
    organizationId: string,
    query: ExportTimeEntriesQuery,
    options: IntegrationRequestOptions = {}
  ): Promise<Result<string>> {
    const suffix = exportQueryString({
      projectId: query.projectId,
      userId: query.userId,
      from: query.from,
      to: query.to,
    })
    return exportCsv(
      `/v1/organizations/${encodeURIComponent(organizationId)}/exports/time-entries.csv${suffix}`,
      options
    )
  },
}

export type IntegrationService = typeof integration
