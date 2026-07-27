import { resolveClientBaseUrl } from '@876/core/client'

import type { StorageClientOptions } from './types/common'

const storageBaseUrlEnvKeys = ['STORAGE_API_URL'] as const

/**
 * Builds the runtime environment shared by every Storage resource factory.
 *
 * Resolves the service base URL from explicit options or environment (`STORAGE_API_URL`),
 * defaulting to `http://localhost:4005`.
 *
 * @param options - Storage client initialization options.
 * @returns The constructed `StorageRuntime` object.
 */
export function buildStorageRuntime(options: StorageClientOptions) {
  const configured = resolveClientBaseUrl(
    options.baseUrl,
    storageBaseUrlEnvKeys
  )

  return {
    baseUrl: (configured ?? 'http://localhost:4005').replace(/\/$/, ''),
    fetch: options.fetch ?? globalThis.fetch.bind(globalThis),
    internalKey: options.internalKey,
    requestId: options.requestId,
  }
}

/** The bound runtime context closed over by Storage resource factories. */
export type StorageRuntime = ReturnType<typeof buildStorageRuntime>
