import { z } from 'zod'

/** Supported file owner classifications. */
export const fileOwnerTypeSchema = z.enum(['organization', 'user', 'platform'])

/** Supported file management categories. */
export const fileCategorySchema = z.enum(['library', 'attachment', 'system'])

/** Supported file read audiences. */
export const fileAudienceSchema = z.enum([
  'private',
  'organization',
  'app',
  'public',
])

/** Supported file lifecycle states. */
export const fileStatusSchema = z.enum([
  'pending',
  'uploaded',
  'ready',
  'failed',
  'deleted',
])

/** A file metadata resource. */
export const fileSchema = z
  .strictObject({
    object: z.literal('file'),
    id: z.string().startsWith('file_'),
    owner_type: fileOwnerTypeSchema,
    owner_id: z.string().min(1),
    source_app_id: z.string().min(1),
    purpose: z.string().min(1),
    category: fileCategorySchema,
    audience: fileAudienceSchema,
    status: fileStatusSchema,
    original_name: z.string().min(1),
    content_type: z.string().min(1),
    size_bytes: z.int().positive(),
    version_id: z.string().startsWith('ver_'),
    url: z.url().nullable(),
    created_at: z.int().nonnegative(),
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

/** A short-lived or stable URL used to read a file. */
export const readUrlSchema = z.strictObject({
  object: z.literal('read_url'),
  url: z.url(),
  expires_at: z.int().nonnegative().nullable(),
})

/** Parameters used to create a file read URL. */
export const fileReadUrlCreateParamsSchema = z.strictObject({
  expires_in: z.int().positive().max(3600).optional(),
})

/** A deleted file tombstone. */
export const deletedFileSchema = z.strictObject({
  object: z.literal('file'),
  id: z.string().startsWith('file_'),
  deleted: z.literal(true),
})

/** A file's owner classification. */
export type FileOwnerType = z.infer<typeof fileOwnerTypeSchema>

/** A file's management and browsability category. */
export type FileCategory = z.infer<typeof fileCategorySchema>

/** The audience allowed to read a file's bytes. */
export type FileAudience = z.infer<typeof fileAudienceSchema>

/** A file's lifecycle status. */
export type FileStatus = z.infer<typeof fileStatusSchema>

/** A validated Storage file resource. */
export type File = z.infer<typeof fileSchema>

/** A validated file read URL resource. */
export type ReadUrl = z.infer<typeof readUrlSchema>

/** Parameters accepted by `files.createReadUrl`. */
export type FileReadUrlCreateParams = z.infer<
  typeof fileReadUrlCreateParamsSchema
>

/** A validated deleted file tombstone. */
export type DeletedFile = z.infer<typeof deletedFileSchema>
