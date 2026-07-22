'use client'

import type { PlatformInviteToken } from '@876/core/platform'

import type {
  DeletedTeamMember,
  TeamMemberUpdateParams,
  TeamMemberView,
} from '@/types/team'

import { request } from './request'

export const update = (
  orgSlug: string,
  id: string,
  params: TeamMemberUpdateParams
) =>
  request<TeamMemberView>(`/api/manage/team/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ orgSlug, ...params }),
  })

export const del = (orgSlug: string, id: string) =>
  request<DeletedTeamMember>(
    `/api/manage/team/${encodeURIComponent(id)}?orgSlug=${encodeURIComponent(orgSlug)}`,
    { method: 'DELETE' }
  )

const createInvite = (
  orgSlug: string,
  params: { email: string; roleId: string }
) =>
  request<PlatformInviteToken>('/api/manage/team/invites', {
    method: 'POST',
    body: JSON.stringify({ orgSlug, ...params }),
  })

const revokeInvite = (orgSlug: string, inviteId: string) =>
  request<PlatformInviteToken>(
    `/api/manage/team/invites/${encodeURIComponent(inviteId)}?orgSlug=${encodeURIComponent(orgSlug)}`,
    { method: 'DELETE' }
  )

export const team = {
  update,
  del,
  delete: del,
  invites: { create: createInvite, revoke: revokeInvite },
}
