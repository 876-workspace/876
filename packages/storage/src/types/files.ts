import { z } from 'zod'

/** Supported file owner classifications (`organization`, `user`, `platform`). */
export const fileOwnerTypeSchema = z.enum(['organization', 'user', 'platform'])

/**
 * Supported file management categories (`library`, `attachment`, `system`).
 *
 * `category` determines how the file is managed and whether 876 Drive lists it.
 * Server-assigned from the upload route policy, never client-supplied or end-user editable.
 */
export const fileCategorySchema = z.enum(['library', 'attachment', 'system'])

/**
 * Supported file read audiences (`private`, `organization`, `app`, `public`).
 *
 * `audience` determines who may read file bytes.
 * Server-assigned from the upload route policy, never client-supplied or end-user editable.
 */
export const fileAudienceSchema = z.enum([
  'private',
  'organization',
  'app',
  'public',
])

/** Supported file lifecycle states (`pending`, `uploaded`, `ready`, `failed`, `deleted`). */
export const fileStatusSchema = z.enum([
  'pending',
  'uploaded',
  'ready',
  'failed',
  'deleted',
])

/** Schema validating a Storage file metadata resource. */
export const fileSchema = z
  .strictObject({
    /** String representing the object's type. Always `file`. */
    object: z.literal('file'),
    /** Unique identifier for the file (`file_…`). */
    id: z.string().startsWith('file_'),
    /** Entity classification owning the file (`organization`, `user`, `platform`). */
    owner_type: fileOwnerTypeSchema,
    /** Unique identifier for the owning entity. */
    owner_id: z.string().min(1),
    /** Identifier of the application that created the file upload session. */
    source_app_id: z.string().min(1),
    /** Upload route purpose key driving retention and policy. */
    purpose: z.string().min(1),
    /** Management category dictating Drive browsability (`library`, `attachment`, `system`). */
    category: fileCategorySchema,
    /** Access classification determining who may read bytes (`private`, `organization`, `app`, `public`). */
    audience: fileAudienceSchema,
    /** Lifecycle status of the file (`pending`, `uploaded`, `ready`, `failed`, `deleted`). */
    status: fileStatusSchema,
    /** Original filename provided during upload creation. */
    original_name: z.string().min(1),
    /** Verified MIME content type of the file. */
    content_type: z.string().min(1),
    /** Verified byte size of the stored object. */
    size_bytes: z.int().positive(),
    /** Unique identifier for the current object version (`ver_…`). */
    version_id: z.string().startsWith('ver_'),
    /** Permanent CDN URL for public files. Non-null only when `audience` is `public` and `status` is `ready`. */
    url: z.url().nullable(),
    /** Time at which the file was created, measured in Unix seconds. */
    created_at: z.int().nonnegative(),
    /** Time at which the file was last updated, measured in Unix seconds. */
    updated_at: z.int().nonnegative(),
  })
  .superRefine((file, context) => {
    const hasStablePublicUrl =
      file.audience === 'public' && file.status === 'ready'

    if (hasStablePublicUrl !== (file.url !== null))
      context.addIssue({
        code: 'custom',
        message: 'Only ready public files may carry a stable URL.',
        path: ['url'],
      })
  })

/** Schema validating a read URL payload. */
export const readUrlSchema = z.strictObject({
  /** String representing the object's type. Always `read_url`. */
  object: z.literal('read_url'),
  /** Signed presigned URL or stable CDN URL for reading file bytes. */
  url: z.url(),
  /** Time at which the signed URL expires in Unix seconds, or `null` for stable public URLs. */
  expires_at: z.int().nonnegative().nullable(),
})

/** Schema validating parameters for creating a file read URL. */
export const fileReadUrlCreateParamsSchema = z.strictObject({
  /** Signed URL lifetime in seconds, 1–3600. Defaults to 300 server-side. Ignored for public files. */
  expires_in: z.int().positive().max(3600).optional(),
})

/** Schema validating a deleted file tombstone response. */
export const deletedFileSchema = z.strictObject({
  /** String representing the object's type. Always `file`. */
  object: z.literal('file'),
  /** Unique identifier for the deleted file (`file_…`). */
  id: z.string().startsWith('file_'),
  /** Indicates that the file record has been soft-deleted. Always `true`. */
  deleted: z.literal(true),
})

/** Owner classification of a stored file (`organization`, `user`, or `platform`). */
export type FileOwnerType = z.infer<typeof fileOwnerTypeSchema>

/**
 * Management category determining whether a file is browsable in 876 Drive (`library`),
 * attached to a business record (`attachment`), or platform internal (`system`).
 * Server-assigned from the upload route policy; never client-supplied or end-user editable.
 */
export type FileCategory = z.infer<typeof fileCategorySchema>

/**
 * Read authorization axis determining who may access file bytes (`private`, `organization`,
 * `app`, or `public`). Server-assigned from the upload route policy; never client-supplied or end-user editable.
 */
export type FileAudience = z.infer<typeof fileAudienceSchema>

/** Lifecycle status of a file record (`pending`, `uploaded`, `ready`, `failed`, or `deleted`). */
export type FileStatus = z.infer<typeof fileStatusSchema>

/**
 * A canonical Storage file metadata resource.
 *
 * Only files with `audience: 'public'` and `status: 'ready'` carry a stable CDN `url`.
 * All other files have `url: null` and require calling `files.createReadUrl()`.
 */
export type File = z.infer<typeof fileSchema>

/** A signed or permanent URL resource for reading a file's bytes. */
export type ReadUrl = z.infer<typeof readUrlSchema>

/** Parameters accepted by `files.createReadUrl()`. */
export type FileReadUrlCreateParams = z.infer<
  typeof fileReadUrlCreateParamsSchema
>

/** Soft-deleted file tombstone payload returned by `files.delete()`. */
export type DeletedFile = z.infer<typeof deletedFileSchema>
