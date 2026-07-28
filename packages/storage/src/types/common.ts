import { z } from 'zod'

/** Stable error codes returned by the Storage service backend. */
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

/** Stable error codes returned by the Storage client, including client-side initialization errors. */
export const storageClientErrorCodeSchema = z.union([
  storageErrorCodeSchema,
  z.literal('storage/not-configured'),
])

/** A machine-readable Storage service error code returned by backend responses. */
export type StorageErrorCode = z.infer<typeof storageErrorCodeSchema>

/** A machine-readable Storage client error code returned by `$storage` methods. */
export type StorageClientErrorCode = z.infer<
  typeof storageClientErrorCodeSchema
>

/** Schema validating a client-safe Storage error. */
export const appErrorSchema = z.strictObject({
  /** Machine-readable error code string. */
  code: storageClientErrorCodeSchema,
  /** Human-readable error message safe for client logging. */
  message: z.string().min(1),
})

const storageServiceErrorSchema = z.strictObject({
  code: storageErrorCodeSchema,
  message: z.string().min(1),
})

/** Schema validating the raw Storage service JSON error payload. */
export const storageErrorResponseSchema = z.strictObject({
  error: storageServiceErrorSchema,
})

/**
 * A client-safe Storage error.
 *
 * Contains a machine-readable `code` and descriptive `message`.
 * HTTP status codes are intentionally omitted from client-facing errors by design.
 */
export type AppError = z.infer<typeof appErrorSchema>

/**
 * Result envelope returned by every Storage client method.
 *
 * Methods **never throw** expected errors; they return either a success payload
 * `{ data: T, error: null }` or a failure payload `{ data: null, error: AppError }`.
 */
export type StorageResult<T> =
  | { data: T; error: null }
  | { data: null; error: AppError }

/** Options used to configure and initialize a server-only Storage client. */
export interface StorageClientOptions {
  /** Storage service origin. Defaults from `STORAGE_API_URL`, then `http://localhost:4005`. */
  baseUrl?: string
  /** Secret internal API key (`STORAGE_INTERNAL_KEY`). Must never be exposed to browser code. */
  internalKey?: string
  /** Optional request ID forwarded in `x-request-id` for cross-service log correlation. */
  requestId?: string
  /** Optional custom `fetch` implementation for testing or non-standard server runtimes. */
  fetch?: typeof fetch
}
