import { z } from 'zod'

export const issueRelationTypeSchema = z.enum([
  'relates-to',
  'duplicates',
  'blocks',
])
export type IssueRelationType = z.infer<typeof issueRelationTypeSchema>

export const issueDependencyTypeSchema = z.enum([
  'finish-to-start',
  'start-to-start',
  'finish-to-finish',
  'start-to-finish',
])
export type IssueDependencyType = z.infer<typeof issueDependencyTypeSchema>

export const issueLinkParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  issueRef: z.string().trim().min(1),
})

export const issueLinkIdParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  issueRef: z.string().trim().min(1),
  id: z.string().trim().min(1),
})

export const createIssueRelationBodySchema = z.strictObject({
  targetIssueId: z.string().trim().min(1),
  type: issueRelationTypeSchema,
  actorUserId: z.string().trim().min(1).nullable().optional(),
})

export const createIssueDependencyBodySchema = z.strictObject({
  predecessorIssueId: z.string().trim().min(1),
  successorIssueId: z.string().trim().min(1),
  type: issueDependencyTypeSchema.optional(),
  lagMinutes: z.number().int().optional(),
  actorUserId: z.string().trim().min(1).nullable().optional(),
})

export const updateIssueDependencyBodySchema = z
  .strictObject({
    type: issueDependencyTypeSchema.optional(),
    lagMinutes: z.number().int().optional(),
  })
  .refine((data) => data.type !== undefined || data.lagMinutes !== undefined, {
    message: 'At least one dependency field must be provided.',
  })

export const scheduleSuggestionBodySchema = z.strictObject({})

export type CreateIssueRelationBody = z.infer<
  typeof createIssueRelationBodySchema
>
export type CreateIssueDependencyBody = z.infer<
  typeof createIssueDependencyBodySchema
>
export type UpdateIssueDependencyBody = z.infer<
  typeof updateIssueDependencyBodySchema
>
