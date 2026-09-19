import { readClientEnv, resolveClientBaseUrl } from '@876/core/client'

import type { ClientOptions } from './types'

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

export function buildRuntime(options: ClientOptions) {
  return {
    baseUrl: resolveBaseUrl(options.baseUrl),
    internalKey: resolveInternalKey(options.internalKey),
    accessToken: options.accessToken,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    requestId: options.requestId,
  }
}

export type Runtime = ReturnType<typeof buildRuntime>
