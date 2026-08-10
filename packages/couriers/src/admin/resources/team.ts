import { AdminRequest } from '../request'
import type { AdminRuntime } from '../runtime'
import {
  deletedTeamMemberSchema,
  teamMemberListSchema,
  teamMemberSchema,
  type DeletedTeamMember,
  type ListTeamMembersParams,
  type TeamMember,
  type CreateTeamMemberBody,
  type TeamMemberList,
  type UpdateTeamMemberBody,
} from '../types/team.schema'

export function createTeamResource(runtime: AdminRuntime) {
  const path = (tenantId: string) =>
    `/v1/tenants/${encodeURIComponent(tenantId)}/team`
  return {
    list(tenantId: string, params: ListTeamMembersParams = {}) {
      return AdminRequest<TeamMemberList>(
        runtime,
        { method: 'GET', path: path(tenantId), query: params },
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
    delete(tenantId: string, id: string) {
      return AdminRequest<DeletedTeamMember>(
        runtime,
        {
          method: 'DELETE',
          path: `${path(tenantId)}/${encodeURIComponent(id)}`,
        },
        deletedTeamMemberSchema
      )
    },
  }
}
