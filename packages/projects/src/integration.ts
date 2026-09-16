import { readClientEnv, resolveClientBaseUrl } from '@876/core/client'

import {
  type IntegrationClientOptions,
  type IntegrationRuntime,
} from './integration-request'
import { createImportJobsResource } from './resources/import-jobs'
import { createIntegrationClientsResource } from './resources/integration-clients'
import { createIntegrationExportsResource } from './resources/integration-exports'
import { createIntegrationMetricsResource } from './resources/integration-metrics'
import { createWebhookEndpointsResource } from './resources/webhook-endpoints'

export type {
  IntegrationClientOptions,
  IntegrationRuntime,
} from './integration-request'
export * from './integration-schemas'

const BaseUrlEnvKeys = [
  'NEXT_PUBLIC_PROJECTS_API_URL',
  'PROJECTS_API_URL',
  'NEXT_PUBLIC_PROJECTS_URL',
  'PROJECTS_URL',
] as const

function resolveBaseUrl(baseUrl?: string): string {
  const configured = resolveClientBaseUrl(baseUrl, BaseUrlEnvKeys)
  if (configured) return configured.replace(/\/$/, '')

  return 'http://localhost:4030'
}

function resolveInternalKey(internalKey?: string): string | undefined {
  if (internalKey) return internalKey
  const env = readClientEnv()
  return env.PROJECTS_INTERNAL_KEY
}

export function buildIntegrationRuntime(
  options: IntegrationClientOptions = {}
): IntegrationRuntime {
  return {
    baseUrl: resolveBaseUrl(options.baseUrl),
    internalKey: resolveInternalKey(options.internalKey),
    token: options.token,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    requestId: options.requestId,
  }
}

/**
 * External integration access to Projects.
 *
 * Two credentials cover two route families: `token` (`<clientId>.<secret>`)
 * authorizes the `/v1/integration` family, while `internalKey` authorizes the
 * service-level import, export, metrics, and client-management routes. Each
 * resource documents the credential it sends.
 */
export function create876ProjectsIntegrationClient(
  options: IntegrationClientOptions = {}
) {
  const runtime = buildIntegrationRuntime(options)
  return {
    integrationClients: createIntegrationClientsResource(runtime),
    webhookEndpoints: createWebhookEndpointsResource(runtime),
    importJobs: createImportJobsResource(runtime),
    exports: createIntegrationExportsResource(runtime),
    metrics: createIntegrationMetricsResource(runtime),
  }
}

export type ProjectsIntegrationClient = ReturnType<
  typeof create876ProjectsIntegrationClient
>
