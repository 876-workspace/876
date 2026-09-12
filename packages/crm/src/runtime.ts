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

  return 'http://localhost:4010'
}

function baseRuntime(options: {
  baseUrl?: string
  fetch?: typeof fetch
  requestId?: string
}) {
  return {
    baseUrl: resolveBaseUrl(options.baseUrl),
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    requestId: options.requestId,
  }
}

export function buildRuntime(options: ClientOptions) {
  return {
    ...baseRuntime(options),
    internalKey: options.internalKey,
  }
}

export interface ServiceRuntimeOptions {
  baseUrl?: string
  serviceApp: string
  serviceKey?: string
  fetch?: typeof fetch
  requestId?: string
}

export function buildServiceRuntime(options: ServiceRuntimeOptions) {
  return {
    ...baseRuntime(options),
    serviceApp: options.serviceApp,
    serviceKey: options.serviceKey,
  }
}

export type InternalRuntime = ReturnType<typeof buildRuntime>
export type ServiceRuntime = ReturnType<typeof buildServiceRuntime>
export type Runtime = InternalRuntime | ServiceRuntime
