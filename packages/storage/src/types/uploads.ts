import { z } from 'zod'

import { fileOwnerTypeSchema } from './files'

/** Parameters used to open an upload session. */
export const uploadCreateParamsSchema = z.strictObject({
  route_key: z.string().min(1),
  owner_type: fileOwnerTypeSchema,
  owner_id: z.string().min(1),
  actor_user_id: z.string().min(1),
  source_app_id: z.string().min(1),
  file_name: z.string().min(1),
  content_type: z.string().min(1),
  size_bytes: z.int().positive(),
})

/** Exact signed headers that must be replayed when uploading to R2. */
export const uploadHeadersSchema = z.strictObject({
  'Content-Type': z.string().min(1),
  'Content-Length': z.string().regex(/^[1-9]\d*$/),
})

/** A Storage upload session. */
export const uploadSessionSchema = z.strictObject({
  object: z.literal('upload_session'),
  id: z.string().startsWith('upl_'),
  file_id: z.string().startsWith('file_'),
  upload_url: z.url(),
  method: z.literal('PUT'),
  headers: uploadHeadersSchema,
  expires_at: z.int().nonnegative(),
})

/** Parameters accepted by `uploads.create`. */
export type UploadCreateParams = z.infer<typeof uploadCreateParamsSchema>

/** Exact headers required by a signed upload URL. */
export type UploadHeaders = z.infer<typeof uploadHeadersSchema>

/** A validated upload session resource. */
export type UploadSession = z.infer<typeof uploadSessionSchema>
