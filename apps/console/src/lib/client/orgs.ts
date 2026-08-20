import type {
  AdminAppAssignment,
  AdminDeletedOrgMember,
  AdminDeletedOrganization,
  AdminInviteCreateParams,
  AdminInviteToken,
  AdminMembership,
  AdminOrgMember,
  AdminSubscription,
  AdminOrganization,
  AdminOrganizationCreateParams,
  AdminOrganizationUpdateParams,
  AdminUser,
} from '@876/admin'
import type {
  DeletedImageFile,
  ImageFile,
  ImageUploadComplete,
  ImageUploadSession,
  ImageUploadStart,
} from '@/types/storage'

import { request } from './request'

export const create = (params: AdminOrganizationCreateParams) =>
  request<AdminOrganization>('/api/organizations', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (orgId: string, params: AdminOrganizationUpdateParams) =>
  request<AdminOrganization>(
    `/api/organizations/${encodeURIComponent(orgId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(params),
    }
  )

export const del = (orgId: string) =>
  request<AdminDeletedOrganization>(
    `/api/organizations/${encodeURIComponent(orgId)}`,
    {
      method: 'DELETE',
    }
  )

export const restore = (orgId: string) =>
  request<AdminOrganization>(
    `/api/organizations/${encodeURIComponent(orgId)}/restore`,
    { method: 'POST' }
  )

export const purge = (orgId: string) =>
  request<AdminDeletedOrganization>(
    `/api/organizations/${encodeURIComponent(orgId)}/purge`,
    {
      method: 'DELETE',
    }
  )

export const listInvites = (orgId: string) =>
  request<AdminInviteToken[]>(
    `/api/organizations/${encodeURIComponent(orgId)}/invites`
  )

export const createInvite = (orgId: string, params: AdminInviteCreateParams) =>
  request<AdminInviteToken>(
    `/api/organizations/${encodeURIComponent(orgId)}/invites`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  )

export const revokeInvite = (orgId: string, inviteId: string) =>
  request<{ deleted: boolean }>(
    `/api/organizations/${encodeURIComponent(orgId)}/invites/${encodeURIComponent(inviteId)}`,
    { method: 'DELETE' }
  )

export const createMember = (
  orgId: string,
  params: { userId: string; role: string }
) =>
  request<AdminMembership>(
    `/api/organizations/${encodeURIComponent(orgId)}/members`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  )

export const searchMembers = (orgId: string, query: string) =>
  request<AdminUser[]>(
    `/api/organizations/${encodeURIComponent(orgId)}/members/search?q=${encodeURIComponent(query)}`
  )

export const updateMember = (
  orgId: string,
  membershipId: string,
  params: { role: string }
) =>
  request<AdminOrgMember>(
    `/api/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(membershipId)}`,
    { method: 'PATCH', body: JSON.stringify(params) }
  )

export const deleteMember = (orgId: string, membershipId: string) =>
  request<AdminDeletedOrgMember>(
    `/api/organizations/${encodeURIComponent(orgId)}/members/${encodeURIComponent(membershipId)}`,
    { method: 'DELETE' }
  )

export const listAppAssignments = (
  orgId: string,
  params?: { userId?: string; appId?: string; includeRevoked?: boolean }
) => {
  const query = new URLSearchParams()
  if (params?.userId) query.set('user_id', params.userId)
  if (params?.appId) query.set('app_id', params.appId)
  if (params?.includeRevoked) query.set('include_revoked', 'true')
  const qs = query.toString()
  return request<AdminAppAssignment[]>(
    `/api/organizations/${encodeURIComponent(orgId)}/app-assignments${qs ? `?${qs}` : ''}`
  )
}

export const createAppAssignment = (
  orgId: string,
  params: { userId: string; appId?: string; appSlug?: string }
) =>
  request<AdminAppAssignment>(
    `/api/organizations/${encodeURIComponent(orgId)}/app-assignments`,
    { method: 'POST', body: JSON.stringify(params) }
  )

export const revokeAppAssignment = (orgId: string, assignmentId: string) =>
  request<AdminAppAssignment>(
    `/api/organizations/${encodeURIComponent(orgId)}/app-assignments/${encodeURIComponent(assignmentId)}`,
    { method: 'DELETE' }
  )

export const updateSubscription = (
  orgId: string,
  appId: string,
  body: {
    status?: 'active' | 'blocked'
    price_id?: string
    cancel_at_period_end?: boolean
  }
) =>
  request<AdminSubscription>(
    `/api/organizations/${encodeURIComponent(orgId)}/apps/${encodeURIComponent(appId)}`,
    { method: 'PATCH', body: JSON.stringify(body) }
  )

export const search = (query: string) =>
  request<AdminOrganization[]>(
    `/api/organizations/search?q=${encodeURIComponent(query)}`
  )

export const startImageUpload = (orgId: string, params: ImageUploadStart) =>
  request<ImageUploadSession>(
    `/api/storage/organizations/${encodeURIComponent(orgId)}/image`,
    { method: 'POST', body: JSON.stringify(params) }
  )

export const completeImageUpload = (
  orgId: string,
  params: ImageUploadComplete
) =>
  request<ImageFile>(
    `/api/storage/organizations/${encodeURIComponent(orgId)}/image/complete`,
    { method: 'POST', body: JSON.stringify(params) }
  )

export const removeImage = (orgId: string) =>
  request<DeletedImageFile>(
    `/api/storage/organizations/${encodeURIComponent(orgId)}/image/remove`,
    { method: 'DELETE' }
  )

export const organizations = {
  create,
  update,
  del,
  delete: del,
  restore,
  purge,
  search,
  startImageUpload,
  completeImageUpload,
  removeImage,
}

export const invites = {
  list: listInvites,
  create: createInvite,
  revoke: revokeInvite,
}

export const members = {
  create: createMember,
  search: searchMembers,
  update: updateMember,
  delete: deleteMember,
}

export const appAssignments = {
  list: listAppAssignments,
  create: createAppAssignment,
  revoke: revokeAppAssignment,
}

export const subscriptions = {
  updateForOrganizationApp: updateSubscription,
}
