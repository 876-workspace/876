import { createFilesResource } from './resources/files'
import { createUploadsResource } from './resources/uploads'
import { buildStorageRuntime } from './runtime'
import type { StorageClientOptions } from './types/common'

/**
 * Creates the official server-only 876 Storage client.
 *
 * Initialize it **once per app** as a module-level singleton named `$storage`
 * (`src/lib/storage.ts`), the same way `$876` is initialized, then import it
 * directly at call sites. Do not wrap it in a factory or lazy `Proxy`.
 *
 * The client authenticates with `STORAGE_INTERNAL_KEY`, a secret service
 * credential. Import it only from server components and route handlers — the
 * module is marked `server-only`, so a browser import fails the build.
 *
 * @param options - Base URL, credential, and transport overrides.
 * @returns A `StorageClient` exposing `uploads.*` and `files.*`.
 *
 * @see /v1/uploads
 * @see /v1/files
 *
 * @example
 * // src/lib/storage.ts
 * import 'server-only'
 * import { create876StorageClient } from '@876/storage'
 *
 * export const $storage = create876StorageClient({
 *   internalKey: process.env.STORAGE_INTERNAL_KEY,
 * })
 *
 * @example
 * // In a route handler, after authorizing the actor:
 * import { $storage } from '@/lib/storage'
 *
 * const { data, error } = await $storage.files.retrieve(fileId)
 * if (error) return Response.json({ error }, { status: 502 })
 */
export function create876StorageClient(options: StorageClientOptions = {}) {
  const runtime = buildStorageRuntime(options)

  return {
    uploads: createUploadsResource(runtime),
    files: createFilesResource(runtime),
  }
}

/**
 * The composed 876 Storage client.
 *
 * Its surface is exactly the resource factories composed above, so a method
 * that does not exist here cannot be reached from an app.
 */
export type StorageClient = ReturnType<typeof create876StorageClient>
