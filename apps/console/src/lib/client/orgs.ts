import type {
  AdminDeletedOrganization,
  AdminInviteCreateParams,
  AdminInviteToken,
  AdminSubscription,
  AdminOrganization,
  AdminOrganizationCreateParams,
  AdminOrganizationUpdateParams,
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

export const subscriptions = {
  updateForOrganizationApp: updateSubscription,
}
