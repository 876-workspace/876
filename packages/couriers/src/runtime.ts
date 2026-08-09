import { resolveClientBaseUrl } from '@876/core/client'

import type { ClientOptions } from './types'

const BaseUrlEnvKeys = [
  'NEXT_PUBLIC_COURIERS_API_URL',
  'COURIERS_API_URL',
  'NEXT_PUBLIC_COURIERS_URL',
  'COURIERS_URL',
] as const

function resolveBaseUrl(baseUrl?: string): string {
  const configured = resolveClientBaseUrl(baseUrl, BaseUrlEnvKeys)
  if (configured) return configured.replace(/\/$/, '')

  return typeof window === 'undefined' ? 'http://localhost:4001' : '/'
}

export function buildRuntime(options: ClientOptions) {
  return {
    baseUrl: resolveBaseUrl(options.baseUrl),
    apiKey: options.apiKey,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    requestId: options.requestId,
  }
}

export type Runtime = ReturnType<typeof buildRuntime>
