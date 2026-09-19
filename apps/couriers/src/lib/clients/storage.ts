import 'server-only'

import { create876StorageServiceClient } from '@876/storage/service'

/** Server-only first-party Storage access for Couriers-owned file workflows. */
export function createStorageService(requestId?: string) {
  return create876StorageServiceClient({
    internalKey: process.env.STORAGE_INTERNAL_KEY!,
    requestId,
  })
}

export const storage = createStorageService()
