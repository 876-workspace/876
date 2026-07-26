import { storageRequest } from '../request'
import type { StorageRuntime } from '../runtime'
import {
  deletedFileSchema,
  fileSchema,
  readUrlSchema,
  type DeletedFile,
  type File,
  type FileReadUrlCreateParams,
  type ReadUrl,
} from '../types/files'

/** `$storage.files.*` — file metadata and delivery operations. */
export function createFilesResource(runtime: StorageRuntime) {
  return {
    /** Retrieves a non-deleted file resource. */
    retrieve(fileId: string) {
      return storageRequest<File>(
        runtime,
        {
          method: 'GET',
          path: `/v1/files/${encodeURIComponent(fileId)}`,
        },
        fileSchema
      )
    },

    /** Creates a signed or stable read URL for a file. */
    createReadUrl(fileId: string, params: FileReadUrlCreateParams = {}) {
      return storageRequest<ReadUrl>(
        runtime,
        {
          method: 'POST',
          path: `/v1/files/${encodeURIComponent(fileId)}/read-url`,
          body: params,
        },
        readUrlSchema
      )
    },

    /** Soft-deletes a file and returns its tombstone. */
    delete(fileId: string) {
      return storageRequest<DeletedFile>(
        runtime,
        {
          method: 'DELETE',
          path: `/v1/files/${encodeURIComponent(fileId)}`,
        },
        deletedFileSchema
      )
    },
  }
}
