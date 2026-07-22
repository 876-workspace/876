import * as z from 'zod'

export const teamMemberStatusValueSchema = z.enum(['active', 'inactive'])
export type TeamMemberStatusValue = z.infer<typeof teamMemberStatusValueSchema>

const defaultRoleKeySchema = z.enum(['admin', 'staff'])

export const teamMemberViewSchema = z.strictObject({
  id: z.string(),
  userId: z.string(),
  roleId: z.string(),
  roleName: z.string(),
  roleSystemKey: defaultRoleKeySchema.nullable(),
  status: teamMemberStatusValueSchema,
  createdAt: z.number().int(),
  updatedAt: z.number().int(),
})
export type TeamMemberView = z.infer<typeof teamMemberViewSchema>

export const teamMemberCreateParamsSchema = z.strictObject({
  userId: z.string(),
  roleId: z.string(),
})
export type TeamMemberCreateParams = z.infer<
  typeof teamMemberCreateParamsSchema
>

export const teamMemberUpdateParamsSchema = z.strictObject({
  roleId: z.string().optional(),
  status: teamMemberStatusValueSchema.optional(),
})
export type TeamMemberUpdateParams = z.infer<
  typeof teamMemberUpdateParamsSchema
>

export const teamMemberEnsureParamsSchema = z.strictObject({
  userId: z.string(),
  systemKey: defaultRoleKeySchema,
})
export type TeamMemberEnsureParams = z.infer<
  typeof teamMemberEnsureParamsSchema
>

export const deletedTeamMemberSchema = z.strictObject({
  id: z.string(),
  deleted: z.literal(true),
})
export type DeletedTeamMember = z.infer<typeof deletedTeamMemberSchema>

export type TeamMemberRow = {
  id: string
  userId: string
  name: string
  email: string | null
  avatar: string | null
  roleId: string
  roleName: string
  roleSystemKey: 'admin' | 'staff' | null
  status: TeamMemberStatusValue
  createdAt: number
}

export type TeamRoleOption = {
  id: string
  name: string
  permissions: string[]
  systemKey: 'admin' | 'staff' | null
}

export type PendingTeamInvite = {
  id: string
  email: string
  role: string | null
  expiresAt: number
}
