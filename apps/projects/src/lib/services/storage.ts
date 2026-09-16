import 'server-only'

import {
  create876StorageServiceClient,
  type StorageServiceClient,
} from '@876/storage/service'

let serviceClient: StorageServiceClient | undefined

function getServiceClient() {
  if (serviceClient) return serviceClient

  const internalKey = process.env.STORAGE_INTERNAL_KEY?.trim()
  if (!internalKey) throw new Error('STORAGE_INTERNAL_KEY is required')

  const baseUrl = process.env.STORAGE_API_URL?.trim() || 'http://localhost:4005'
  serviceClient = create876StorageServiceClient({ baseUrl, internalKey })

  return serviceClient
}

/**
 * The app's server-only Storage client.
 *
 * Storage owns every file: Projects stores an opaque `fileId` association in
 * Storage's resource links and never a file record of its own. This is the
 * `service` tier, and the same lazy shape as `@/lib/services/projects` because
 * the build imports route modules before runtime secrets exist.
 */
export const storage = {
  get uploads() {
    return getServiceClient().uploads
  },
  get files() {
    return getServiceClient().files
  },
  get resourceLinks() {
    return getServiceClient().resourceLinks
  },
}
