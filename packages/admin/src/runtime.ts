/**
 * Admin client runtime — internal-key tier credentials over the shared
 * `@876/core/client` primitives.
 *
 * @module @876/admin/runtime
 */

import { resolve876ApiBaseUrl } from '@876/core/client'

import type { Admin876ClientOptions } from './types'

/** Env var precedence for the admin tier before the shared default fallback. */
const adminBaseUrlEnvKeys = [
  'API_URL',
  'NEXT_PUBLIC_876_API_URL',
  'NEXT_PUBLIC_API_URL',
] as const

function resolveBaseUrl(baseUrl?: string): string {
  const resolved = resolve876ApiBaseUrl(baseUrl, adminBaseUrlEnvKeys)

  return resolved.replace(/\/$/, '')
}

/** Builds the per-client runtime shared by every admin resource factory. */
export function buildAdminRuntime(options: Admin876ClientOptions) {
  return {
    baseUrl: resolveBaseUrl(options.baseUrl),
    internalKey: options.internalKey,
    apiKey: options.apiKey,
    requestId: options.requestId,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
  }
}

/** The bound runtime each admin resource factory closes over. */
export type AdminRuntime = ReturnType<typeof buildAdminRuntime>
