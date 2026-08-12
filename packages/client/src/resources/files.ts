import type { StorageClient } from '@876/storage'

export function createFilesResource(storage: StorageClient | undefined) {
  if (!storage) return undefined as unknown as StorageClient['files']
  return storage.files
}
