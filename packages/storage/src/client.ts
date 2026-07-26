import { createFilesResource } from './resources/files'
import { createUploadsResource } from './resources/uploads'
import { buildStorageRuntime } from './runtime'
import type { StorageClientOptions } from './types/common'

/** Creates the official server-only 876 Storage client. */
export function create876StorageClient(options: StorageClientOptions = {}) {
  const runtime = buildStorageRuntime(options)

  return {
    uploads: createUploadsResource(runtime),
    files: createFilesResource(runtime),
  }
}

/** The composed 876 Storage client. */
export type StorageClient = ReturnType<typeof create876StorageClient>
