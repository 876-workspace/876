import { z } from 'zod'

export const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'A slug must be lowercase letters, digits, and hyphens.',
  })

export const projectParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
})

export const pageParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  pageRef: z.string().trim().min(1),
})

export const revisionParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  pageRef: z.string().trim().min(1),
  revisionId: z.string().trim().min(1),
})

export const listPagesQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  starting_after: z.string().trim().min(1).optional(),
  parentPageId: z.string().trim().min(1).nullable().optional(),
})

export const createPageBodySchema = z.strictObject({
  title: z.string().trim().min(1).max(300),
  body: z.string().trim().min(1).max(100000),
  slug: slugSchema.optional(),
  parentPageId: z.string().trim().min(1).nullable().optional(),
  authorUserId: z.string().trim().min(1).optional(),
})

export const updatePageBodySchema = z
  .strictObject({
    title: z.string().trim().min(1).max(300).optional(),
    body: z.string().trim().min(1).max(100000).optional(),
    parentPageId: z.string().trim().min(1).nullable().optional(),
    authorUserId: z.string().trim().min(1).optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'At least one field must be provided',
  })

export const restoreRevisionBodySchema = z.strictObject({
  revisionId: z.string().trim().min(1),
  authorUserId: z.string().trim().min(1).optional(),
})

export type ListPagesQuery = z.infer<typeof listPagesQuerySchema>
export type CreatePageBody = z.infer<typeof createPageBodySchema>
export type UpdatePageBody = z.infer<typeof updatePageBodySchema>
export type RestoreRevisionBody = z.infer<typeof restoreRevisionBodySchema>
