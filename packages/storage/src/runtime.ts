import { resolveClientBaseUrl } from '@876/core/client'

import type { StorageClientOptions } from './types/common'

const storageBaseUrlEnvKeys = ['STORAGE_API_URL'] as const

/** Builds the runtime shared by every Storage resource factory. */
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

/** The bound runtime each Storage resource factory closes over. */
export type StorageRuntime = ReturnType<typeof buildStorageRuntime>
