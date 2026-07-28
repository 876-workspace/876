import { z } from 'zod'

import { fileOwnerTypeSchema } from './files'

/** Schema validating parameters used to open an upload session. */
export const uploadCreateParamsSchema = z.strictObject({
  /** Server-declared upload route key fixing MIME, size ceiling, category, and audience. */
  route_key: z.string().min(1),
  /** Owner classification for the file (`organization`, `user`, `platform`). */
  owner_type: fileOwnerTypeSchema,
  /** Opaque identifier for the owning record. */
  owner_id: z.string().min(1),
  /** Opaque identifier for the user initiating the upload. */
  actor_user_id: z.string().min(1),
  /** Opaque identifier for the requesting application. */
  source_app_id: z.string().min(1),
  /** Original filename being uploaded. */
  file_name: z.string().min(1),
  /** Declared MIME content type of the file. */
  content_type: z.string().min(1),
  /** Declared byte size of the file. */
  size_bytes: z.int().positive(),
})

/** Schema validating exact signed headers that must be replayed when uploading to R2. */
export const uploadHeadersSchema = z.strictObject({
  /** Exact MIME type header signed into the presigned URL. */
  'Content-Type': z.string().min(1),
  /** Exact byte size header signed into the presigned URL. */
  'Content-Length': z.string().regex(/^[1-9]\d*$/),
})

/** Schema validating an opened Storage upload session. */
export const uploadSessionSchema = z.strictObject({
  /** String representing the object's type. Always `upload_session`. */
  object: z.literal('upload_session'),
  /** Unique identifier for the upload session (`upl_…`). */
  id: z.string().startsWith('upl_'),
  /** Unique identifier for the created pending file (`file_…`). */
  file_id: z.string().startsWith('file_'),
  /** Short-lived presigned URL for direct browser `PUT` to R2 storage. */
  upload_url: z.url(),
  /** HTTP method required for uploading to the presigned URL. Always `PUT`. */
  method: z.literal('PUT'),
  /** Exact headers that must be replayed during the browser `PUT` upload. */
  headers: uploadHeadersSchema,
  /** Time at which the upload session expires, measured in Unix seconds. */
  expires_at: z.int().nonnegative(),
})

/**
 * Parameters passed to `uploads.create()` to open a new upload session.
 *
 * The `route_key` selects a server-side policy fixing allowed MIME types,
 * size ceiling, category, and audience.
 */
export type UploadCreateParams = z.infer<typeof uploadCreateParamsSchema>

/**
 * Exact headers (`Content-Type`, `Content-Length`) that the browser must send
 * when `PUT`ing bytes directly to R2 using `upload_url`.
 */
export type UploadHeaders = z.infer<typeof uploadHeadersSchema>

/**
 * An active upload session resource returned by `uploads.create()`.
 *
 * Contains a short-lived presigned R2 `upload_url` and required `headers`.
 * After the browser uploads file bytes directly to R2, pass `id` to
 * `uploads.complete()` to verify and mark the file `ready`.
 */
export type UploadSession = z.infer<typeof uploadSessionSchema>
