import { resolveClientBaseUrl } from '@876/core/client'

import type { ClientOptions } from './types'

const BaseUrlEnvKeys = [
  'NEXT_PUBLIC_CRM_API_URL',
  'CRM_API_URL',
  'NEXT_PUBLIC_CRM_URL',
  'CRM_URL',
] as const

function resolveBaseUrl(baseUrl?: string): string {
  const configured = resolveClientBaseUrl(baseUrl, BaseUrlEnvKeys)
  if (configured) return configured.replace(/\/$/, '')

  return 'http://localhost:4007'
}

export function buildRuntime(options: ClientOptions) {
  return {
    baseUrl: resolveBaseUrl(options.baseUrl),
    internalKey: options.internalKey,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    requestId: options.requestId,
  }
}

export type Runtime = ReturnType<typeof buildRuntime>
