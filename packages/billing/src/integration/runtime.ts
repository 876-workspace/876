import { resolveClientBaseUrl } from '@876/core/client'

import type { IntegrationClientOptions } from './types'

const integrationBaseUrlEnvKeys = ['BILLING_API_URL', 'BILLING_URL'] as const

export function buildIntegrationRuntime(options: IntegrationClientOptions) {
  const configured = resolveClientBaseUrl(
    options.baseUrl,
    integrationBaseUrlEnvKeys
  )

  return {
    baseUrl: (configured ?? 'http://localhost:4004').replace(/\/$/, ''),
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    internalKey: options.internalKey,
    apiKey: options.apiKey,
    accessToken: options.accessToken,
    requestId: options.requestId,
  }
}

export type IntegrationRuntime = ReturnType<typeof buildIntegrationRuntime>
