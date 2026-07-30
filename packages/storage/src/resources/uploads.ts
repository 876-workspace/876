import { storageRequest } from '../request'
import type { StorageRuntime } from '../runtime'
import { fileSchema, type File } from '../types/files'
import {
  uploadSessionSchema,
  type UploadCreateParams,
  type UploadSession,
} from '../types/uploads'

/**
 * `$876.storage.uploads.*` — upload-session operations.
 *
 * An upload is always three steps, and the middle one does not go through this
 * client:
 *
 * 1. `uploads.create()` — your server authorizes the actor, then opens a
 *    session and receives a short-lived signed URL.
 * 2. The **browser** `PUT`s the bytes straight to R2 using that URL, replaying
 *    `headers` exactly. Your server never proxies the file.
 * 3. `uploads.complete()` — Storage verifies the stored object itself and
 *    marks the file `ready`.
 *
 * Skipping step 3 leaves the file `pending` forever and the reclamation sweep
 * eventually deletes the object.
 */
export function createUploadsResource(runtime: StorageRuntime) {
  return {
    /**
     * Opens a signed upload session for a server-declared route.
     *
     * The `route_key` selects a named server-side policy that fixes the
     * allowed MIME types, size ceiling, object key, category, and audience.
     * The caller never chooses those — passing a `route_key` is the entire
     * request, alongside who owns the file and what is being uploaded.
     *
     * Authorize the actor against the target resource **before** calling this;
     * Storage verifies the route policy, not your app's permissions.
     *
     * @param params - Route key, owner, actor, and declared file metadata.
     * @returns A Promise resolving to a result containing an `UploadSession`.
     *
     * @see /v1/uploads
     *
     * @example
     * const { data, error } = await $876.storage.uploads.create({
     *   route_key: 'organization.primaryLogo',
     *   owner_type: 'organization',
     *   owner_id: ctx.orgId,
     *   actor_user_id: ctx.userId,
     *   source_app_id: '876-couriers',
     *   file_name: file.name,
     *   content_type: file.type,
     *   size_bytes: file.size,
     * })
     * if (error) return storageErrorResponse(error)
     *
     * // Hand data.upload_url / data.headers to the browser, which PUTs the
     * // bytes directly, then call uploads.complete(data.id).
     *
     * @example
     * // Errors are values, never thrown. Common codes:
     * //   storage/route-not-found        unknown route_key
     * //   storage/mime-not-allowed       content_type the route forbids
     * //   storage/file-too-large         size_bytes over the route ceiling
     * //   storage/not-configured         no internal key on this client
     */
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

    /**
     * Verifies and completes an upload session idempotently.
     *
     * Storage `HEAD`s the stored object and compares its size and content type
     * against what the session declared — the browser's claim that the upload
     * succeeded is never trusted. A mismatch deletes the object and fails the
     * file; only a verified object becomes `ready`.
     *
     * Calling it again on a completed session returns the same file rather
     * than creating a second one, so a retried request is safe.
     *
     * Check `status === 'ready'` and the owner on the returned file before
     * attaching its `id` to your record — the session id alone does not prove
     * the file belongs to the org you are acting for.
     *
     * @param sessionId - The `upl_…` id from `uploads.create`.
     * @returns A Promise resolving to a result containing the verified `File`.
     *
     * @see /v1/uploads/{session_id}/complete
     *
     * @example
     * const { data: file, error } = await $876.storage.uploads.complete(sessionId)
     * if (error) return storageErrorResponse(error)
     * if (file.owner_id !== ctx.orgId) return forbidden()
     *
     * await platform.organizations.updateProfile(ctx.orgId, {
     *   logo_file_id: file.id,
     *   logo_url: file.url,
     * })
     *
     * @example
     * // Errors are values, never thrown. Common codes:
     * //   storage/upload-not-found              unknown or already-swept session
     * //   storage/upload-expired                session TTL elapsed before the PUT
     * //   storage/upload-incomplete             no object at the signed key
     * //   storage/upload-verification-failed    object did not match the declaration
     */
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
