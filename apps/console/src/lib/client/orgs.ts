import type {
  AdminDeletedOrganization,
  AdminInviteCreateParams,
  AdminInviteToken,
  AdminSubscription,
  AdminOrganization,
  AdminOrganizationCreateParams,
  AdminOrganizationUpdateParams,
} from '@876/admin'

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

export const orgs = {
  create,
  update,
  del,
  delete: del,
  purge,
  listInvites,
  createInvite,
  revokeInvite,
  updateSubscription,
}
