import 'server-only'

import { create876StorageServiceClient } from '@876/storage/service'

export function createStorageService(requestId?: string) {
  return create876StorageServiceClient({
    baseUrl: process.env.STORAGE_API_URL,
    internalKey: process.env.STORAGE_INTERNAL_KEY!,
    requestId,
  })
}
