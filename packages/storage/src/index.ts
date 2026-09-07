/**
 * `@876/storage` — typed server-only client for the 876 Storage service.
 *
 * Product applications receive this client through the unified
 * `@876/client/server` composition root and call `$876.storage.*`.
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
  fileCallerAssertionSchema,
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
  FileCallerAssertion,
  FileCategory,
  FileOwnerType,
  FileReadUrlCreateParams,
  FileStatus,
  ReadUrl,
} from './types/files'
export {
  deletedResourceLinkSchema,
  resourceLinkCreateParamsSchema,
  resourceLinkListParamsSchema,
  resourceLinkListSchema,
  resourceLinkSchema,
} from './types/resource-links'
export type {
  DeletedResourceLink,
  ResourceLink,
  ResourceLinkCreateParams,
  ResourceLinkList,
  ResourceLinkListParams,
} from './types/resource-links'
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
