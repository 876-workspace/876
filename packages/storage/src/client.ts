import { createFilesResource } from './resources/files'
import { createResourceLinksResource } from './resources/resource-links'
import { createUploadsResource } from './resources/uploads'
import { buildStorageRuntime } from './runtime'
import type { StorageClientOptions } from './types/common'

/**
 * Creates the official server-only 876 Storage client.
 *
 * `@876/client/server` composes this owned transport under `$876.storage`.
 * Product applications initialize that branded root once and import it
 * directly at call sites. Do not wrap it in a lazy `Proxy`.
 *
 * The client authenticates with `STORAGE_INTERNAL_KEY`, a secret service
 * credential. Import it only from server components and route handlers — the
 * module is marked `server-only`, so a browser import fails the build.
 */
export function create876StorageClient(options: StorageClientOptions = {}) {
  const runtime = buildStorageRuntime(options)

  return {
    uploads: createUploadsResource(runtime),
    files: createFilesResource(runtime),
    resourceLinks: createResourceLinksResource(runtime),
  }
}

/** The composed 876 Storage client. */
export type StorageClient = ReturnType<typeof create876StorageClient>
