import type { StorageClient } from '@876/storage'

export function createFilesResource(storage?: StorageClient) {
  return storage?.files
}
