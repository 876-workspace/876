import { z } from 'zod'

import { ASSIGNABLE_ROLES } from '@/types/role'

export const teamAffiliationSchema = z.enum(['staff', 'contractor', 'external'])
export type TeamAffiliation = z.infer<typeof teamAffiliationSchema>

export const teamGrantStatusSchema = z.enum(['active', 'suspended'])
export type TeamGrantStatus = z.infer<typeof teamGrantStatusSchema>

const teamGrantRoleNameSchema = z.preprocess((value) => {
  if (typeof value !== 'string') return value

  const trimmed = value.trim()
  return trimmed === 'super_admin' ? 'super-admin' : trimmed
}, z.enum(ASSIGNABLE_ROLES))

export type TeamGrantFields = {
  affiliation: TeamAffiliation
  title: string | null
  expiresAt: bigint | null
  justification: string | null
  invitedBy: string | null
}

export const teamGrantUpdateSchema = z
  .strictObject({
    roleName: teamGrantRoleNameSchema.optional(),
    status: teamGrantStatusSchema.optional(),
    affiliation: teamAffiliationSchema.optional(),
    title: z.string().nullable().optional(),
    expiresAt: z.number().int().nullable().optional(),
    justification: z.string().nullable().optional(),
  })
  .refine((input) => Object.keys(input).length > 0)
export type TeamGrantUpdate = z.infer<typeof teamGrantUpdateSchema>
