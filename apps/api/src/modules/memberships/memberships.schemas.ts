import { z } from 'zod'

import { paginationQuerySchema } from '@/http/envelope'

export const membershipSchema = z
  .object({
    object: z
      .literal('membership')
      .meta({ description: "Always 'membership'." }),
    id: z
      .string()
      .meta({ description: 'Unique identifier for the membership.' }),
    organization_id: z
      .string()
      .meta({ description: 'Unique identifier for the organization.' }),
    user_id: z
      .string()
      .meta({ description: 'Unique identifier for the user.' }),
    workos_membership_id: z.string().nullable().meta({
      description: 'Unique identifier for the matching WorkOS membership.',
    }),
    role: z
      .string()
      .meta({ description: "The member's role name within the organization." }),
    role_id: z.string().nullable().meta({
      description: 'ID of the organization role this membership is linked to.',
    }),
    status: z.string().meta({ description: 'The membership status.' }),
    created_at: z.number().int().meta({
      description:
        'Time at which the membership was created. Measured in seconds since the Unix epoch.',
    }),
    updated_at: z.number().int().meta({
      description:
        'Time at which the membership was last updated. Measured in seconds since the Unix epoch.',
    }),
  })
  .meta({ id: 'Membership' })

export const createMembershipBodySchema = z.strictObject({
  user_id: z.string().meta({ description: 'Unique identifier for the user.' }),
  organization_id: z
    .string()
    .meta({ description: 'Unique identifier for the organization.' }),
  role: z
    .string()
    .min(1)
    .max(64)
    .optional()
    .nullable()
    .meta({ description: "The member's role. Defaults to 'member'." }),
  status: z
    .string()
    .optional()
    .nullable()
    .meta({ description: "Initial membership status. Defaults to 'active'." }),
})

export const updateMembershipBodySchema = z.strictObject({
  workos_membership_id: z.string().nullable().optional().meta({
    description:
      'Unique identifier for the matching WorkOS membership. Set to null to clear it.',
  }),
  role: z
    .string()
    .min(1)
    .max(64)
    .optional()
    .nullable()
    .meta({ description: "The member's role within the organization." }),
  status: z
    .string()
    .optional()
    .nullable()
    .meta({ description: 'The membership status.' }),
})

export const membershipIdParamsSchema = z.strictObject({
  membership_id: z.string(),
})

export const listMembershipsQuerySchema = paginationQuerySchema.extend({
  organization_id: z.string().optional(),
  user_id: z.string().optional(),
})

export type Membership = z.infer<typeof membershipSchema>
export type CreateMembershipBody = z.infer<typeof createMembershipBodySchema>
export type UpdateMembershipBody = z.infer<typeof updateMembershipBodySchema>
export type ListMembershipsQuery = z.infer<typeof listMembershipsQuerySchema>
