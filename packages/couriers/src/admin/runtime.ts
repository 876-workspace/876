import { readClientEnv, resolveClientBaseUrl } from '@876/core/client'

import type { AdminClientOptions } from '../types'

const AdminBaseUrlEnvKeys = ['COURIERS_API_URL', 'COURIERS_URL'] as const

function resolveBaseUrl(baseUrl?: string): string {
  const configured = resolveClientBaseUrl(baseUrl, AdminBaseUrlEnvKeys)
  return (configured ?? 'http://localhost:4001').replace(/\/$/, '')
}

export function buildAdminRuntime(options: AdminClientOptions) {
  const env = readClientEnv()

  return {
    baseUrl: resolveBaseUrl(options.baseUrl),
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    internalKey:
      options.internalKey ?? env.COURIERS_INTERNAL_KEY ?? env.API_INTERNAL_KEY,
    requestId: options.requestId,
  }
}

export type AdminRuntime = ReturnType<typeof buildAdminRuntime>
