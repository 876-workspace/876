import { z } from 'zod'

export const imageUploadRouteKeySchema = z.enum([
  'app.logo',
  'organization.primaryLogo',
  'user.avatar',
])

export const imageUploadStartSchema = z.strictObject({
  route_key: imageUploadRouteKeySchema,
  file_name: z.string().min(1),
  content_type: z.string().min(1),
  size_bytes: z.int().positive(),
})

export const imageUploadCompleteSchema = z.strictObject({
  id: z.string().startsWith('upl_'),
})

export const imageUploadSessionSchema = z.strictObject({
  object: z.literal('upload_session'),
  id: z.string().startsWith('upl_'),
  file_id: z.string().startsWith('file_'),
  upload_url: z.url(),
  method: z.literal('PUT'),
  headers: z.strictObject({
    'Content-Type': z.string().min(1),
    'Content-Length': z.string().regex(/^[1-9]\d*$/),
  }),
  expires_at: z.int().nonnegative(),
})

export const imageFileSchema = z.object({
  object: z.literal('file'),
  id: z.string().startsWith('file_'),
  owner_type: z.enum(['organization', 'user', 'platform']),
  owner_id: z.string().min(1),
  status: z.literal('ready'),
  url: z.url(),
})

export const deletedImageFileSchema = z.strictObject({
  object: z.literal('file'),
  id: z.string().startsWith('file_'),
  deleted: z.literal(true),
})

export type ImageUploadRouteKey = z.infer<typeof imageUploadRouteKeySchema>
export type ImageUploadStart = z.infer<typeof imageUploadStartSchema>
export type ImageUploadComplete = z.infer<typeof imageUploadCompleteSchema>
export type ImageUploadSession = z.infer<typeof imageUploadSessionSchema>
export type ImageFile = z.infer<typeof imageFileSchema>
export type DeletedImageFile = z.infer<typeof deletedImageFileSchema>
