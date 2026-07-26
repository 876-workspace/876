import { z } from 'zod'

/** Stable error codes returned by the Storage service. */
export const storageErrorCodeSchema = z.enum([
  'storage/file-not-found',
  'storage/file-too-large',
  'storage/forbidden',
  'storage/invalid-owner',
  'storage/invalid-request',
  'storage/mime-not-allowed',
  'storage/provider-error',
  'storage/route-not-found',
  'storage/unauthorized',
  'storage/upload-expired',
  'storage/upload-incomplete',
  'storage/upload-not-found',
  'storage/upload-verification-failed',
])

/** Stable error codes returned by the Storage client. */
export const storageClientErrorCodeSchema = z.union([
  storageErrorCodeSchema,
  z.literal('storage/not-configured'),
])

/** A machine-readable Storage service error code. */
export type StorageErrorCode = z.infer<typeof storageErrorCodeSchema>

/** A machine-readable Storage client error code. */
export type StorageClientErrorCode = z.infer<
  typeof storageClientErrorCodeSchema
>

/** A client-safe Storage error. */
export const appErrorSchema = z.strictObject({
  code: storageClientErrorCodeSchema,
  message: z.string().min(1),
})

const storageServiceErrorSchema = z.strictObject({
  code: storageErrorCodeSchema,
  message: z.string().min(1),
})

/** The Storage service's error response body. */
export const storageErrorResponseSchema = z.strictObject({
  error: storageServiceErrorSchema,
})

/** A client-safe Storage error with no HTTP status metadata. */
export type AppError = z.infer<typeof appErrorSchema>

/** Result envelope returned by every Storage client method. */
export type StorageResult<T> =
  | { data: T; error: null }
  | { data: null; error: AppError }

/** Options used to create a server-only Storage client. */
export interface StorageClientOptions {
  /** Storage service origin. Defaults from `STORAGE_API_URL`, then port 4005. */
  baseUrl?: string
  /** Storage service credential. Never expose this value to browser code. */
  internalKey?: string
  /** Optional request ID forwarded for cross-service log correlation. */
  requestId?: string
  /** Optional fetch implementation for tests or custom server runtimes. */
  fetch?: typeof fetch
}
