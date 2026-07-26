import 'server-only'

import { create876StorageClient } from '@876/storage'

/** Server-only client for Couriers-owned calls to the 876 Storage service. */
export const $storage = create876StorageClient({
  internalKey: process.env.STORAGE_INTERNAL_KEY,
})
