import { resolveClientBaseUrl } from '@876/core/client'

import type { IntegrationClientOptions } from '../types'

const integrationBaseUrlEnvKeys = ['COURIERS_API_URL', 'COURIERS_URL'] as const

export function buildIntegrationRuntime(options: IntegrationClientOptions) {
  const configured = resolveClientBaseUrl(
    options.baseUrl,
    integrationBaseUrlEnvKeys
  )

  return {
    baseUrl: (configured ?? 'http://localhost:4001').replace(/\/$/, ''),
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    serviceKey: options.serviceKey,
    requestId: options.requestId,
  }
}

export type IntegrationRuntime = ReturnType<typeof buildIntegrationRuntime>
