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

/**
 * `$storage.files.*` — file metadata and delivery operations.
 *
 * Files are canonical metadata records created by completing an upload session.
 * Every file carries server-assigned classifications (`category` and `audience`)
 * fixed at creation time:
 *
 * - `category`: Dictates management and 876 Drive browsability (`library`,
 *   `attachment`, or `system`).
 * - `audience`: Dictates byte access permissions (`private`, `organization`,
 *   `app`, or `public`).
 *
 * Only files with `audience: 'public'` and `status: 'ready'` carry a permanent CDN
 * `url`. For all other files, call `createReadUrl()` to issue a short-lived
 * signed access URL.
 */
export function createFilesResource(runtime: StorageRuntime) {
  return {
    /**
     * Retrieves a file metadata resource by ID.
     *
     * Only non-deleted files can be retrieved. If the file is `public` and
     * `ready`, its metadata includes a stable public `url`. For private or
     * restricted files, `url` is `null` and callers must request a signed URL
     * via `files.createReadUrl()`.
     *
     * @param fileId - The `file_…` identifier.
     * @returns A Promise resolving to a result containing the `File` metadata.
     *
     * @see /v1/files/{file_id}
     *
     * @example
     * const { data: file, error } = await $storage.files.retrieve(fileId)
     * if (error) return storageErrorResponse(error)
     *
     * console.log(file.id, file.status, file.url)
     *
     * @example
     * // Errors are values, never thrown. Common codes:
     * //   storage/file-not-found      file does not exist or has been deleted
     * //   storage/unauthorized        invalid internal authorization key
     * //   storage/not-configured      no internal key on this client
     */
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

    /**
     * Creates a signed or stable read URL for accessing a file's bytes.
     *
     * Non-public files (`private`, `organization`, `app`) do not carry a
     * permanent CDN URL on the file record. This method issues a short-lived
     * presigned URL suitable for rendering media or downloading bytes.
     *
     * A `public` file instead returns its stable CDN URL with
     * `expires_at: null`, so a caller can use one code path for both and only
     * needs to re-mint when `expires_at` is non-null.
     *
     * Only a `ready` file has bytes to read. A `pending`, `uploaded`, or
     * `failed` file returns `storage/file-not-found`, the same as an unknown
     * id — completing the upload session is what makes a file readable.
     *
     * @param fileId - The `file_…` identifier.
     * @param params - Optional `expires_in` (seconds, 1–3600, defaults to 300).
     * @returns A Promise resolving to a result containing a `ReadUrl`.
     *
     * @see /v1/files/{file_id}/read-url
     *
     * @example
     * const { data: readUrl, error } = await $storage.files.createReadUrl(fileId, {
     *   expires_in: 900,
     * })
     * if (error) return storageErrorResponse(error)
     *
     * console.log(readUrl.url, readUrl.expires_at)
     *
     * @example
     * // Errors are values, never thrown. Common codes:
     * //   storage/file-not-found      unknown, deleted, or not-yet-ready file
     * //   storage/invalid-request     expires_in outside 1–3600
     * //   storage/not-configured      no internal key on this client
     */
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

    /**
     * Soft-deletes a file resource and returns its tombstone.
     *
     * Per deletion policy, production files are soft-deleted and return a
     * tombstone object (`{ object: 'file', id, deleted: true }`). Once soft-deleted,
     * subsequent `retrieve` calls return a `storage/file-not-found` error.
     *
     * @param fileId - The `file_…` identifier to soft-delete.
     * @returns A Promise resolving to a result containing the `DeletedFile` tombstone.
     *
     * @see /v1/files/{file_id}
     *
     * @example
     * const { data: tombstone, error } = await $storage.files.delete(fileId)
     * if (error) return storageErrorResponse(error)
     *
     * console.log(tombstone.id, tombstone.deleted) // true
     *
     * @example
     * // Errors are values, never thrown. Common codes:
     * //   storage/file-not-found      file does not exist or is already deleted
     * //   storage/not-configured      no internal key on this client
     */
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
