import { z } from 'zod'

export const developmentLinkKindSchema = z.enum([
  'branch',
  'pull-request',
  'commit',
  'deploy',
])

export const developmentLinkStateSchema = z.enum([
  'open',
  'merged',
  'closed',
  'succeeded',
  'failed',
])

export const issueDevelopmentLinksParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  issueRef: z.string().trim().min(1),
})

export const developmentLinkIdParamsSchema = z.strictObject({
  organizationId: z.string().trim().min(1),
  id: z.string().trim().min(1),
})

export const createDevelopmentLinkBodySchema = z.strictObject({
  kind: developmentLinkKindSchema,
  url: z.url(),
  label: z.string().trim().min(1).max(200).nullable().optional(),
  externalId: z.string().trim().min(1).max(200).nullable().optional(),
  state: developmentLinkStateSchema.nullable().optional(),
})

export const updateDevelopmentLinkBodySchema = z
  .strictObject({
    label: z.string().trim().min(1).max(200).nullable().optional(),
    state: developmentLinkStateSchema.nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one development link field must be provided.',
  })

export type CreateDevelopmentLinkBody = z.infer<
  typeof createDevelopmentLinkBodySchema
>
export type UpdateDevelopmentLinkBody = z.infer<
  typeof updateDevelopmentLinkBodySchema
>
