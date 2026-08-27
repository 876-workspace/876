import type { z } from 'zod'

import type {
  createTeamBodySchema,
  deleteTeamBodySchema,
  listTeamsQuerySchema,
  memberBodySchema,
  updateMemberBodySchema,
  updateTeamBodySchema,
} from '../modules/teams/teams.schemas.js'

export type TeamStatus = 'ACTIVE' | 'ARCHIVED'
export type TeamAutoAssign = 'NONE' | 'ROUND_ROBIN' | 'LEAST_BUSY'
export type TeamMemberRole = 'LEAD' | 'MEMBER'
export type CreateTeamInput = z.infer<typeof createTeamBodySchema>
export type UpdateTeamInput = z.infer<typeof updateTeamBodySchema>
export type DeleteTeamInput = z.infer<typeof deleteTeamBodySchema>
export type ListTeamsInput = Omit<
  z.infer<typeof listTeamsQuerySchema>,
  'includeMembers'
> & {
  includeMembers: boolean
}
export type AddTeamMemberInput = z.infer<typeof memberBodySchema>
export type UpdateTeamMemberInput = z.infer<typeof updateMemberBodySchema>
