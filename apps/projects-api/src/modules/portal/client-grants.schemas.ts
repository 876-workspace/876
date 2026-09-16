import { z } from 'zod'

export const projectParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
})

export const grantParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  projectId: z.string().trim().min(1),
  grantId: z.string().trim().min(1),
})

export const visibilityFlagsSchema = z.strictObject({
  allowComments: z.boolean().optional(),
  allowDiscussions: z.boolean().optional(),
  allowFiles: z.boolean().optional(),
  allowTime: z.boolean().optional(),
  allowInvoices: z.boolean().optional(),
  allowWiki: z.boolean().optional(),
})

export const inviteGrantBodySchema = z.strictObject({
  userId: z.string().trim().min(1),
  invitedBy: z.string().trim().min(1).optional(),
  allowComments: z.boolean().optional(),
  allowDiscussions: z.boolean().optional(),
  allowFiles: z.boolean().optional(),
  allowTime: z.boolean().optional(),
  allowInvoices: z.boolean().optional(),
  allowWiki: z.boolean().optional(),
})

export const updateGrantBodySchema = visibilityFlagsSchema.refine(
  (body) => Object.keys(body).length > 0,
  { message: 'At least one flag must be provided' }
)

export type InviteGrantBody = z.infer<typeof inviteGrantBodySchema>
export type UpdateGrantBody = z.infer<typeof updateGrantBodySchema>

export const listGrantsQuerySchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  starting_after: z.string().trim().min(1).optional(),
  include_revoked: z.enum(['true', 'false']).optional(),
})

export type ListGrantsQuery = z.infer<typeof listGrantsQuerySchema>
