import { SessionRequest } from '../session-request'
import type { Runtime } from '../runtime'
import {
  deletedTeamMemberSchema,
  teamMemberListSchema,
  teamMemberSchema,
  type CreateTeamMemberBody,
  type DeletedTeamMember,
  type TeamMember,
  type TeamMemberList,
  type UpdateTeamMemberBody,
} from '../admin/types/team.schema'

export function createMembershipsResource(runtime: Runtime) {
  const path = '/v1/me/team'
  return {
    list(params: Record<string, unknown> = {}) {
      return SessionRequest<TeamMemberList>(runtime, { method: 'GET', path, query: params as never }, teamMemberListSchema)
    },
    create(body: CreateTeamMemberBody) {
      return SessionRequest<TeamMember>(runtime, { method: 'POST', path, body }, teamMemberSchema)
    },
    update(id: string, body: UpdateTeamMemberBody) {
      return SessionRequest<TeamMember>(runtime, { method: 'PATCH', path: `${path}/${encodeURIComponent(id)}`, body }, teamMemberSchema)
    },
    delete(id: string) {
      return SessionRequest<DeletedTeamMember>(runtime, { method: 'DELETE', path: `${path}/${encodeURIComponent(id)}` }, deletedTeamMemberSchema)
    },
  }
}
