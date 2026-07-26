import { storageRequest } from '../request'
import type { StorageRuntime } from '../runtime'
import { fileSchema, type File } from '../types/files'
import {
  uploadSessionSchema,
  type UploadCreateParams,
  type UploadSession,
} from '../types/uploads'

/** `$storage.uploads.*` — upload-session operations. */
export function createUploadsResource(runtime: StorageRuntime) {
  return {
    /** Opens a signed upload session for a server-declared route. */
    create(params: UploadCreateParams) {
      return storageRequest<UploadSession>(
        runtime,
        {
          method: 'POST',
          path: '/v1/uploads',
          body: params,
        },
        uploadSessionSchema
      )
    },

    /** Verifies and completes an upload session idempotently. */
    complete(sessionId: string) {
      return storageRequest<File>(
        runtime,
        {
          method: 'POST',
          path: `/v1/uploads/${encodeURIComponent(sessionId)}/complete`,
          body: {},
        },
        fileSchema
      )
    },
  }
}
