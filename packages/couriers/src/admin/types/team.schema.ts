import { z } from 'zod'

const memberStatusSchema = z.enum(['active', 'inactive'])

export const teamMemberSchema = z.object({
  object: z.literal('team_member'),
  id: z.string(),
  tenantId: z.string(),
  userId: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  roleSystemKey: z.enum(['admin', 'staff']).nullable(),
  status: memberStatusSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})

export const teamMemberListSchema = z.object({
  object: z.literal('list'),
  data: z.array(teamMemberSchema),
  hasMore: z.boolean(),
  totalCount: z.number().int().nullable(),
  url: z.string(),
})

export type TeamMember = z.infer<typeof teamMemberSchema>
export type TeamMemberList = z.infer<typeof teamMemberListSchema>

export const deletedTeamMemberSchema = z.object({
  object: z.literal('team_member'),
  id: z.string(),
  deleted: z.literal(true),
})

export type DeletedTeamMember = z.infer<typeof deletedTeamMemberSchema>

export type ListTeamMembersParams = {
  status?: z.infer<typeof memberStatusSchema>
}

export const createTeamMemberBodySchema = z.strictObject({
  userId: z.string(),
  roleId: z.string(),
})

export const updateTeamMemberBodySchema = z.strictObject({
  roleId: z.string().optional(),
  status: memberStatusSchema.optional(),
})

export type CreateTeamMemberBody = z.input<typeof createTeamMemberBodySchema>
export type UpdateTeamMemberBody = z.input<typeof updateTeamMemberBodySchema>
