import { readClientEnv, resolveClientBaseUrl } from '@876/core/client'

import type { ClientOptions } from './types'

const BASE_URL_ENV_KEYS = ['COMMUNICATIONS_API_URL'] as const

function resolveBaseUrl(baseUrl?: string): string | undefined {
  const configured = resolveClientBaseUrl(baseUrl, BASE_URL_ENV_KEYS)
  return configured?.replace(/\/$/, '')
}

function resolveInternalKey(internalKey?: string): string | undefined {
  if (internalKey) return internalKey
  return readClientEnv().COMMUNICATIONS_INTERNAL_KEY
}

export function buildRuntime(options: ClientOptions) {
  return {
    baseUrl: resolveBaseUrl(options.baseUrl),
    internalKey: resolveInternalKey(options.internalKey),
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    requestId: options.requestId,
    actorId: options.actorId,
  }
}

export type Runtime = ReturnType<typeof buildRuntime>
