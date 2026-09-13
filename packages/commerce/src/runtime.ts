import { readClientEnv, resolveClientBaseUrl } from '@876/core/client'
import type { ClientOptions } from './types'

const baseUrlEnvKeys = [
  'NEXT_PUBLIC_COMMERCE_API_URL',
  'COMMERCE_API_URL',
] as const

export function buildRuntime(options: ClientOptions) {
  const configured = resolveClientBaseUrl(options.baseUrl, baseUrlEnvKeys)
  const env = readClientEnv()
  return {
    baseUrl: (configured ?? 'http://localhost:4010').replace(/\/$/, ''),
    internalKey: options.internalKey ?? env.COMMERCE_INTERNAL_KEY,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    requestId: options.requestId,
  }
}
export type Runtime = ReturnType<typeof buildRuntime>
