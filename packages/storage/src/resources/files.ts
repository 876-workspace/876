import { storageRequest } from '../request'
import type { StorageRuntime } from '../runtime'
import {
  deletedFileSchema,
  fileSchema,
  readUrlSchema,
  type DeletedFile,
  type File,
  type FileCallerAssertion,
  type FileReadUrlCreateParams,
  type ReadUrl,
} from '../types/files'

/**
 * Serializes the caller assertion into the headers Storage authorizes against.
 *
 * The internal key proves only that some 876 service is calling; it never
 * proves that service may touch a given file. Naming the principal is what lets
 * Storage check it against the file's `owner_type`/`owner_id`/`audience`.
 */
function callerHeaders(caller: FileCallerAssertion): Record<string, string> {
  return {
    'x-876-source-app-id': caller.sourceAppId,
    ...(caller.actorUserId
      ? { 'x-876-actor-user-id': caller.actorUserId }
      : {}),
    ...(caller.actorOrgId ? { 'x-876-actor-org-id': caller.actorOrgId } : {}),
  }
}

/**
 * `$876.storage.files.*` — file metadata and delivery operations.
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
     * @param caller - The app and principal this request is made on behalf of.
     * @returns A Promise resolving to a result containing the `File` metadata.
     *
     * @see /v1/files/{file_id}
     *
     * @example
     * const { data: file, error } = await $876.storage.files.retrieve(fileId, {
     *   sourceAppId: '876-couriers',
     *   actorUserId: session.userId,
     * })
     * if (error) return storageErrorResponse(error)
     *
     * console.log(file.id, file.status, file.url)
     *
     * @example
     * // Errors are values, never thrown. Common codes:
     * //   storage/file-not-found      unknown, deleted, or not disclosable to this caller
     * //   storage/unauthorized        invalid internal authorization key
     * //   storage/not-configured      no internal key on this client
     */
    retrieve(fileId: string, caller: FileCallerAssertion) {
      return storageRequest<File>(
        runtime,
        {
          method: 'GET',
          path: `/v1/files/${encodeURIComponent(fileId)}`,
          headers: callerHeaders(caller),
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
     * @param caller - The app and principal this request is made on behalf of.
     * @param params - Optional `expires_in` (seconds, 1–3600, defaults to 300).
     * @returns A Promise resolving to a result containing a `ReadUrl`.
     *
     * @see /v1/files/{file_id}/read-url
     *
     * @example
     * const { data: readUrl, error } = await $876.storage.files.createReadUrl(
     *   fileId,
     *   { sourceAppId: '876-couriers', actorUserId: session.userId },
     *   { expires_in: 900 }
     * )
     * if (error) return storageErrorResponse(error)
     *
     * console.log(readUrl.url, readUrl.expires_at)
     *
     * @example
     * // Errors are values, never thrown. Common codes:
     * //   storage/file-not-found      unknown, deleted, not ready, or not disclosable
     * //   storage/invalid-request     expires_in outside 1–3600
     * //   storage/not-configured      no internal key on this client
     */
    createReadUrl(
      fileId: string,
      caller: FileCallerAssertion,
      params: FileReadUrlCreateParams = {}
    ) {
      return storageRequest<ReadUrl>(
        runtime,
        {
          method: 'POST',
          path: `/v1/files/${encodeURIComponent(fileId)}/read-url`,
          body: params,
          headers: callerHeaders(caller),
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
     * The caller must be acting as the file's owner, whatever the audience — a
     * `public` logo is world-readable, which is not a licence for another app to
     * remove an organization's branding. A platform-owned file (an app logo)
     * answers to the app that created it.
     *
     * @param fileId - The `file_…` identifier to soft-delete.
     * @param caller - The app and principal this request is made on behalf of.
     * @returns A Promise resolving to a result containing the `DeletedFile` tombstone.
     *
     * @see /v1/files/{file_id}
     *
     * @example
     * const { data: tombstone, error } = await $876.storage.files.delete(fileId, {
     *   sourceAppId: '876-couriers',
     *   actorOrgId: org.id,
     * })
     * if (error) return storageErrorResponse(error)
     *
     * console.log(tombstone.id, tombstone.deleted) // true
     *
     * @example
     * // Errors are values, never thrown. Common codes:
     * //   storage/file-not-found      unknown, already deleted, or not this caller's to delete
     * //   storage/not-configured      no internal key on this client
     */
    delete(fileId: string, caller: FileCallerAssertion) {
      return storageRequest<DeletedFile>(
        runtime,
        {
          method: 'DELETE',
          path: `/v1/files/${encodeURIComponent(fileId)}`,
          headers: callerHeaders(caller),
        },
        deletedFileSchema
      )
    },
  }
}
