import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  teamMemberListSchema,
  teamMemberSchema,
  type TeamMember,
  type CreateTeamMemberBody,
  type TeamMemberList,
  type UpdateTeamMemberBody,
} from '../types/team.schema'

export function createTeamResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/team`
  return {
    list(tenantId: string) {
      return AdminRequest<TeamMemberList>(
        runtime,
        { method: 'GET', path: path(tenantId) },
        teamMemberListSchema
      )
    },
    create(tenantId: string, body: CreateTeamMemberBody) {
      return AdminRequest<TeamMember>(
        runtime,
        { method: 'POST', path: path(tenantId), body },
        teamMemberSchema
      )
    },
    update(tenantId: string, id: string, body: UpdateTeamMemberBody) {
      return AdminRequest<TeamMember>(
        runtime,
        {
          method: 'PATCH',
          path: `${path(tenantId)}/${encodeURIComponent(id)}`,
          body,
        },
        teamMemberSchema
      )
    },
  }
}
