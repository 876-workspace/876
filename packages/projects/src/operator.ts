import 'server-only'

import { create876ProjectsClient } from './client'
import { buildIntegrationRuntime } from './integration'
import { createIntegrationClientsResource } from './resources/integration-clients'
import { createIntegrationMetricsResource } from './resources/integration-metrics'
import { createImportJobsResource } from './resources/import-jobs'
import { createWebhookEndpointsResource } from './resources/webhook-endpoints'
import type { ClientOptions } from './types'

/**
 * 876 operator access to Projects. Projects currently shares the internal-key
 * route with service callers. The platform administration resources ride the
 * same internal key; an operator never holds an integration token.
 */
export function create876ProjectsOperatorClient(options: ClientOptions = {}) {
  const adminRuntime = buildIntegrationRuntime({
    baseUrl: options.baseUrl,
    internalKey: options.internalKey,
    fetch: options.fetch,
    requestId: options.requestId,
  })

  return {
    ...create876ProjectsClient(options),
    integrationClients: createIntegrationClientsResource(adminRuntime),
    webhookEndpoints: createWebhookEndpointsResource(adminRuntime),
    importJobs: createImportJobsResource(adminRuntime),
    metrics: createIntegrationMetricsResource(adminRuntime),
  }
}

export type ProjectsOperatorClient = ReturnType<
  typeof create876ProjectsOperatorClient
>
export type ProjectsOperatorClientOptions = ClientOptions
