/**
 * `@876/storage` — typed server-only client for the 876 Storage service.
 *
 * Initialize it once per app as a module-level singleton (`src/lib/storage.ts`)
 * and call it from server components and route handlers.
 *
 * The client authenticates with `STORAGE_INTERNAL_KEY` via the `x-internal-key`
 * header. That credential mints signed upload and read URLs, so the module is
 * marked `server-only` and must never be imported by browser code.
 *
 * Every method returns a `StorageResult<T>` envelope (`{ data, error }`) and
 * never throws on an expected failure. Errors carry a stable `code` and a
 * client-safe `message`, and deliberately no HTTP status.
 *
 * An upload is always three steps, and the middle one does not go through this
 * client: your server opens a session, the browser `PUT`s the bytes straight to
 * R2, then your server completes the session so Storage can verify the stored
 * object itself.
 *
 * @example
 * // src/lib/storage.ts — one singleton per app
 * import 'server-only'
 * import { create876StorageClient } from '@876/storage'
 *
 * export const $storage = create876StorageClient({
 *   internalKey: process.env.STORAGE_INTERNAL_KEY,
 * })
 *
 * @example
 * // Step 1 — your route handler, after authorizing the actor:
 * const { data: session, error } = await $storage.uploads.create({
 *   route_key: 'organization.primaryLogo',
 *   owner_type: 'organization',
 *   owner_id: ctx.orgId,
 *   actor_user_id: ctx.userId,
 *   source_app_id: '876-couriers',
 *   file_name: upload.name,
 *   content_type: upload.type,
 *   size_bytes: upload.size,
 * })
 * if (error) return storageErrorResponse(error)
 *
 * // Step 2 — the browser, with the session you returned to it:
 * // await fetch(session.upload_url, {
 * //   method: session.method,
 * //   headers: session.headers,
 * //   body: upload,
 * // })
 *
 * // Step 3 — your route handler again:
 * const { data: file, error: completeError } =
 *   await $storage.uploads.complete(session.id)
 * if (completeError) return storageErrorResponse(completeError)
 *
 * // file.status === 'ready'; file.url is set only for public files.
 *
 * @module @876/storage
 */
import 'server-only'

export { create876StorageClient } from './client'
export type { StorageClient } from './client'
export {
  appErrorSchema,
  storageClientErrorCodeSchema,
  storageErrorCodeSchema,
  storageErrorResponseSchema,
} from './types/common'
export type {
  AppError,
  StorageClientErrorCode,
  StorageClientOptions,
  StorageErrorCode,
  StorageResult,
} from './types/common'
export {
  deletedFileSchema,
  fileAudienceSchema,
  fileCategorySchema,
  fileOwnerTypeSchema,
  fileReadUrlCreateParamsSchema,
  fileSchema,
  fileStatusSchema,
  readUrlSchema,
} from './types/files'
export type {
  DeletedFile,
  File,
  FileAudience,
  FileCategory,
  FileOwnerType,
  FileReadUrlCreateParams,
  FileStatus,
  ReadUrl,
} from './types/files'
export {
  uploadCreateParamsSchema,
  uploadHeadersSchema,
  uploadSessionSchema,
} from './types/uploads'
export type {
  UploadCreateParams,
  UploadHeaders,
  UploadSession,
} from './types/uploads'
