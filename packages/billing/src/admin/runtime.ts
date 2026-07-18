import { readClientEnv, resolveClientBaseUrl } from '@876/core/client'

import type { AdminClientOptions } from './types'

const AdminBaseUrlEnvKeys = ['BILLING_URL'] as const

function resolveBaseUrl(baseUrl?: string): string {
  const configured = resolveClientBaseUrl(baseUrl, AdminBaseUrlEnvKeys)

  return (configured ?? 'http://localhost:3004').replace(/\/$/, '')
}

/** Builds the runtime shared by Billing administration resources. */
export function buildAdminRuntime(options: AdminClientOptions) {
  const env = readClientEnv()

  return {
    baseUrl: resolveBaseUrl(options.baseUrl),
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    internalKey: options.internalKey ?? env.BILLING_INTERNAL_KEY,
    requestId: options.requestId,
  }
}

export type AdminRuntime = ReturnType<typeof buildAdminRuntime>
