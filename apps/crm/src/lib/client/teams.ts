'use client'

import type {
  CrmListTeamsQuery,
  CrmTeam,
  CrmTeamCreateInput,
  CrmTeamList,
  CrmTeamMember,
  CrmTeamMemberAddInput,
  CrmTeamMemberUpdateInput,
  CrmTeamUpdateInput,
} from '@/types/crm'
import { request } from './request'

export type TeamCreateInput = Omit<CrmTeamCreateInput, 'createdBy'>
export type TeamMemberAddInput = Omit<CrmTeamMemberAddInput, 'addedBy'>
function teamPath(teamId: string): string {
  return `/api/teams/${encodeURIComponent(teamId)}`
}

export const teams = {
  list(params: CrmListTeamsQuery = {}) {
    const search = new URLSearchParams()
    if (params.status) search.set('status', params.status)
    if (params.includeMembers) search.set('includeMembers', 'true')
    const query = search.toString()
    return request<CrmTeamList>(`/api/teams${query ? `?${query}` : ''}`)
  },
  create(params: TeamCreateInput) {
    return request<CrmTeam>('/api/teams', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  update(teamId: string, params: CrmTeamUpdateInput) {
    return request<CrmTeam>(teamPath(teamId), {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(params),
    })
  },
  delete(teamId: string, reason?: string) {
    return request<{ object: 'team'; id: string; deleted: true }>(
      teamPath(teamId),
      {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reason }),
      }
    )
  },
  members: {
    add(teamId: string, params: TeamMemberAddInput) {
      return request<CrmTeamMember>(`${teamPath(teamId)}/members`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(params),
      })
    },
    update(teamId: string, userId: string, params: CrmTeamMemberUpdateInput) {
      return request<CrmTeamMember>(
        `${teamPath(teamId)}/members/${encodeURIComponent(userId)}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(params),
        }
      )
    },
    remove(teamId: string, userId: string) {
      return request<{ object: 'team_member'; id: string; deleted: true }>(
        `${teamPath(teamId)}/members/${encodeURIComponent(userId)}`,
        { method: 'DELETE', headers: { 'content-type': 'application/json' } }
      )
    },
  },
}
