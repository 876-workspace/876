/**
 * `@876/storage` — typed server-only client for the 876 Storage service.
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
