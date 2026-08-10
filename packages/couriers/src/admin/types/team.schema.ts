import { z } from 'zod'

const memberStatusSchema = z.enum(['active', 'inactive'])

export const teamMemberSchema = z.object({
  object: z.literal('team_member'),
  id: z.string(),
  tenant_id: z.string(),
  user_id: z.string(),
  role_id: z.string(),
  role_name: z.string(),
  role_system_key: z.enum(['admin', 'staff']).nullable(),
  status: memberStatusSchema,
  created_at: z.number().int(),
  updated_at: z.number().int(),
})

export const teamMemberListSchema = z.object({
  object: z.literal('list'),
  data: z.array(teamMemberSchema),
  has_more: z.boolean(),
  total_count: z.number().int().nullable(),
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
  user_id: z.string(),
  role_id: z.string(),
})

export const updateTeamMemberBodySchema = z.strictObject({
  role_id: z.string().optional(),
  status: memberStatusSchema.optional(),
})

export type CreateTeamMemberBody = z.input<typeof createTeamMemberBodySchema>
export type UpdateTeamMemberBody = z.input<typeof updateTeamMemberBodySchema>
