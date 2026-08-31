import 'server-only'

import { create876StorageOperatorClient } from '@876/storage/operator'

function options(requestId?: string) {
  return {
    baseUrl: process.env.STORAGE_API_URL,
    internalKey: process.env.STORAGE_INTERNAL_KEY!,
    requestId,
  }
}

export function createStorage(requestId?: string) {
  return create876StorageOperatorClient(options(requestId))
}

export const storage = createStorage()
