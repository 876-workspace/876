import type { StorageClient } from '@876/storage'

export function createUploadsResource(storage?: StorageClient) {
  return storage?.uploads
}
