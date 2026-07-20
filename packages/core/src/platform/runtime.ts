/**
 * Platform client runtime — internal-key tier credentials over the shared
 * `@876/core/client` primitives. Mirrors `@876/admin`'s `runtime.ts` so the
 * two internal-key-tier packages stay structurally consistent.
 *
 * @module @876/core/platform/runtime
 */
import { resolve876ApiBaseUrl } from '../client'

import type { Platform876ClientOptions } from './types'

/** Env var precedence for the platform tier before the shared default fallback. */
const platformBaseUrlEnvKeys = [
  'API_URL',
  'NEXT_PUBLIC_876_API_URL',
  'NEXT_PUBLIC_API_URL',
] as const

function resolveBaseUrl(baseUrl?: string): string {
  const resolved = resolve876ApiBaseUrl(baseUrl, platformBaseUrlEnvKeys)

  return resolved.replace(/\/$/, '')
}

/** Builds the per-client runtime shared by every platform resource factory. */
export function buildPlatformRuntime(options: Platform876ClientOptions) {
  return {
    baseUrl: resolveBaseUrl(options.baseUrl),
    internalKey: options.internalKey ?? process.env.API_INTERNAL_KEY,
    apiKey: options.apiKey ?? process.env.API_876_KEY,
    requestId: options.requestId,
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
  }
}

/** The bound runtime each platform resource factory closes over. */
export type PlatformRuntime = ReturnType<typeof buildPlatformRuntime>
