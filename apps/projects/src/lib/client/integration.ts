'use client'

import type {
  ImportJob,
  ImportJobList,
  ImportJobRowList,
  IntegrationClient,
  MetricsSummary,
  WebhookDelivery,
  WebhookDeliveryList,
  WebhookEndpoint,
  WebhookEndpointList,
} from '@876/projects/integration'

import { request } from './request'

import type {
  CreatedIntegrationClientDto,
  CreateImportJobParams,
  CreateIntegrationClientParams,
  CreateWebhookEndpointParams,
  ListEndpointDeliveriesParams,
  UpdateWebhookEndpointParams,
} from '@/types/integrations'

export type {
  CreatedIntegrationClientDto,
  CreateImportJobParams,
  CreateIntegrationClientParams,
  CreateWebhookEndpointParams,
  ListEndpointDeliveriesParams,
  UpdateWebhookEndpointParams,
}

function jsonInit(method: 'POST' | 'PATCH', payload?: unknown): RequestInit {
  return {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload ?? {}),
  }
}

export const integrationClientsClient = {
  list() {
    return request<IntegrationClient[]>('/api/integration-clients')
  },
  create(params: CreateIntegrationClientParams) {
    return request<CreatedIntegrationClientDto>(
      '/api/integration-clients',
      jsonInit('POST', params)
    )
  },
  revoke(clientId: string) {
    return request<IntegrationClient>(
      `/api/integration-clients/${encodeURIComponent(clientId)}/revoke`,
      jsonInit('POST')
    )
  },
}

export const webhookEndpointsClient = {
  list() {
    return request<WebhookEndpointList>('/api/webhook-endpoints')
  },
  create(params: CreateWebhookEndpointParams) {
    return request<WebhookEndpoint>(
      '/api/webhook-endpoints',
      jsonInit('POST', params)
    )
  },
  retrieve(endpointId: string) {
    return request<WebhookEndpoint>(
      `/api/webhook-endpoints/${encodeURIComponent(endpointId)}`
    )
  },
  update(endpointId: string, params: UpdateWebhookEndpointParams) {
    return request<WebhookEndpoint>(
      `/api/webhook-endpoints/${encodeURIComponent(endpointId)}`,
      jsonInit('PATCH', params)
    )
  },
  remove(endpointId: string) {
    return request<{ object: string; id: string; deleted: boolean }>(
      `/api/webhook-endpoints/${encodeURIComponent(endpointId)}`,
      { method: 'DELETE' }
    )
  },
  listDeliveries(
    endpointId: string,
    params: ListEndpointDeliveriesParams = {}
  ) {
    const search = new URLSearchParams()
    if (params.status) search.set('status', params.status)
    if (params.limit !== undefined) search.set('limit', String(params.limit))
    const suffix = search.toString()
    return request<WebhookDeliveryList>(
      `/api/webhook-endpoints/${encodeURIComponent(endpointId)}/deliveries${suffix ? `?${suffix}` : ''}`
    )
  },
  replay(deliveryId: string) {
    return request<WebhookDelivery>(
      `/api/webhook-deliveries/${encodeURIComponent(deliveryId)}/replay`,
      jsonInit('POST')
    )
  },
}

export const importJobsClient = {
  list() {
    return request<ImportJobList>('/api/import-jobs')
  },
  create(params: CreateImportJobParams) {
    return request<ImportJob>('/api/import-jobs', jsonInit('POST', params))
  },
  retrieve(jobId: string) {
    return request<ImportJob>(`/api/import-jobs/${encodeURIComponent(jobId)}`)
  },
  listRows(jobId: string) {
    return request<ImportJobRowList>(
      `/api/import-jobs/${encodeURIComponent(jobId)}/rows`
    )
  },
  commit(jobId: string) {
    return request<ImportJob>(
      `/api/import-jobs/${encodeURIComponent(jobId)}/commit`,
      jsonInit('POST')
    )
  },
}

export const metricsClient = {
  summary() {
    return request<MetricsSummary>('/api/metrics/summary')
  },
}
