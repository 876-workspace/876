import { resolveClientBaseUrl } from '@876/core/client'

import type { ClientOptions } from './types'

const BaseUrlEnvKeys = ['NEXT_PUBLIC_BILLING_URL', 'BILLING_URL'] as const

function resolveBaseUrl(baseUrl?: string): string {
  const configured = resolveClientBaseUrl(baseUrl, BaseUrlEnvKeys)
  if (configured) return configured.replace(/\/$/, '')

  return typeof window === 'undefined' ? 'http://localhost:3004' : '/'
}

/** Builds the runtime shared by tenant-scoped Billing resources. */
export function buildRuntime(options: ClientOptions) {
  return {
    baseUrl: resolveBaseUrl(options.baseUrl),
    credentials: options.credentials ?? 'include',
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    requestId: options.requestId,
  }
}

export type Runtime = ReturnType<typeof buildRuntime>
