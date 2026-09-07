import { z } from 'zod'

import { fileOwnerTypeSchema } from './files'

export const resourceLinkSchema = z.strictObject({
  object: z.literal('resource_link'),
  id: z.string().startsWith('rlink_'),
  file_id: z.string().startsWith('file_'),
  app_id: z.string().min(1),
  resource_type: z.string().min(1),
  resource_id: z.string().min(1),
  relation: z.string().min(1),
  created_by: z.string().min(1),
  created_at: z.int().nonnegative(),
})

export const resourceLinkListSchema = z.strictObject({
  object: z.literal('list'),
  data: z.array(resourceLinkSchema),
})

export const resourceLinkCreateParamsSchema = z.strictObject({
  file_id: z.string().startsWith('file_'),
  app_id: z.string().min(1),
  resource_type: z.string().regex(/^[a-z][a-z0-9-]*$/),
  resource_id: z.string().min(1),
  relation: z.string().regex(/^[a-z][a-z0-9-]*$/),
  owner_type: fileOwnerTypeSchema,
  owner_id: z.string().min(1),
  actor_user_id: z.string().min(1),
})

export const resourceLinkListParamsSchema = z.strictObject({
  app_id: z.string().min(1),
  resource_type: z.string().regex(/^[a-z][a-z0-9-]*$/),
  resource_id: z.string().min(1),
  relation: z.string().regex(/^[a-z][a-z0-9-]*$/).optional(),
})

export const deletedResourceLinkSchema = z.strictObject({
  object: z.literal('resource_link'),
  id: z.string().startsWith('rlink_'),
  deleted: z.literal(true),
})

export type ResourceLink = z.infer<typeof resourceLinkSchema>
export type ResourceLinkList = z.infer<typeof resourceLinkListSchema>
export type ResourceLinkCreateParams = z.infer<
  typeof resourceLinkCreateParamsSchema
>
export type ResourceLinkListParams = z.infer<typeof resourceLinkListParamsSchema>
export type DeletedResourceLink = z.infer<typeof deletedResourceLinkSchema>
