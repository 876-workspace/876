import type { StorageClient } from '@876/storage'

export function createUploadsResource(storage: StorageClient | undefined) {
  if (!storage) return undefined as unknown as StorageClient['uploads']
  return storage.uploads
}
