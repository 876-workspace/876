import type {
  AdminAccount,
  AdminAddress,
  AdminAddressCreateParams,
  AdminAddressUpdateParams,
  AdminConsumerContact,
  AdminConsumerContactCreateParams,
  AdminConsumerContactUpdateParams,
  AdminConsumerProfile,
  AdminConsumerProfileUpdateParams,
  AdminDeletedAddress,
  AdminDeletedConsumerContact,
  AdminDeletedConsumerProfile,
  AdminDeletedUser,
  AdminUser,
  AdminUserCreateParams,
  AdminUserUpdateParams,
  AdminUsernameAvailability,
  SessionRevoke,
  UnlinkedAccount,
} from '@876/admin'
import type { UserIdentity } from '@/types/member'

import { request } from './request'

export const create = (params: AdminUserCreateParams) =>
  request<AdminUser>('/api/users', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const search = (query: string) =>
  request<AdminUser[]>(`/api/users/search?q=${encodeURIComponent(query)}`)

export const setRole = (userId: string, role: string) =>
  request<AdminUser>(`/api/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  })

export const update = (userId: string, params: AdminUserUpdateParams) =>
  request<AdminUser>(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const del = (userId: string) =>
  request<AdminDeletedUser>(`/api/users/${encodeURIComponent(userId)}`, {
    method: 'DELETE',
  })

export const purge = (userId: string) =>
  request<AdminDeletedUser>(`/api/users/${encodeURIComponent(userId)}/purge`, {
    method: 'DELETE',
  })

export const createProfile = (
  userId: string,
  params: AdminConsumerProfileUpdateParams
) =>
  request<AdminConsumerProfile>(
    `/api/users/${encodeURIComponent(userId)}/profile`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  )

export const retrieveProfile = (userId: string) =>
  request<AdminConsumerProfile | null>(
    `/api/users/${encodeURIComponent(userId)}/profile`
  )

export const updateProfile = (
  userId: string,
  params: AdminConsumerProfileUpdateParams
) =>
  request<AdminConsumerProfile>(
    `/api/users/${encodeURIComponent(userId)}/profile`,
    {
      method: 'PATCH',
      body: JSON.stringify(params),
    }
  )

export const deleteProfile = (userId: string) =>
  request<AdminDeletedConsumerProfile>(
    `/api/users/${encodeURIComponent(userId)}/profile`,
    {
      method: 'DELETE',
    }
  )

export const createAddress = (
  userId: string,
  params: AdminAddressCreateParams
) =>
  request<AdminAddress>(`/api/users/${encodeURIComponent(userId)}/addresses`, {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const updateAddress = (
  userId: string,
  addressId: string,
  params: AdminAddressUpdateParams
) =>
  request<AdminAddress>(
    `/api/users/${encodeURIComponent(userId)}/addresses/${encodeURIComponent(addressId)}`,
    { method: 'PATCH', body: JSON.stringify(params) }
  )

export const deleteAddress = (userId: string, addressId: string) =>
  request<AdminDeletedAddress>(
    `/api/users/${encodeURIComponent(userId)}/addresses/${encodeURIComponent(addressId)}`,
    { method: 'DELETE' }
  )

export const createContact = (
  userId: string,
  params: AdminConsumerContactCreateParams
) =>
  request<AdminConsumerContact>(
    `/api/users/${encodeURIComponent(userId)}/contacts`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  )

export const updateContact = (
  userId: string,
  contactId: string,
  params: AdminConsumerContactUpdateParams
) =>
  request<AdminConsumerContact>(
    `/api/users/${encodeURIComponent(userId)}/contacts/${encodeURIComponent(contactId)}`,
    { method: 'PATCH', body: JSON.stringify(params) }
  )

export const deleteContact = (userId: string, contactId: string) =>
  request<AdminDeletedConsumerContact>(
    `/api/users/${encodeURIComponent(userId)}/contacts/${encodeURIComponent(contactId)}`,
    { method: 'DELETE' }
  )

export const listAccounts = (userId: string) =>
  request<AdminAccount[]>(`/api/users/${encodeURIComponent(userId)}/accounts`)

export const listIdentities = (userId: string) =>
  request<UserIdentity[]>(`/api/users/${encodeURIComponent(userId)}/identities`)

export const ban = (userId: string, options?: { reason?: string | null }) =>
  request<AdminUser>(`/api/users/${encodeURIComponent(userId)}/ban`, {
    method: 'POST',
    body: JSON.stringify({ reason: options?.reason ?? null }),
  })

export const unban = (userId: string) =>
  request<AdminUser>(`/api/users/${encodeURIComponent(userId)}/unban`, {
    method: 'POST',
  })

export const checkUsernameAvailability = (
  username: string,
  excludeUserId?: string
) => {
  const params = new URLSearchParams({ username })
  if (excludeUserId) params.set('exclude_user_id', excludeUserId)
  return request<AdminUsernameAvailability>(
    `/api/users/username-availability?${params.toString()}`
  )
}

export const unlinkAccount = (userId: string, accountId: string) =>
  request<UnlinkedAccount>(
    `/api/users/${encodeURIComponent(userId)}/accounts/${encodeURIComponent(accountId)}`,
    { method: 'DELETE' }
  )

export const revokeSessions = (userId: string) =>
  request<SessionRevoke>(`/api/users/${encodeURIComponent(userId)}/sessions`, {
    method: 'DELETE',
  })

export const users = {
  create,
  search,
  setRole,
  update,
  del,
  delete: del,
  purge,
  createProfile,
  retrieveProfile,
  updateProfile,
  deleteProfile,
  createAddress,
  updateAddress,
  deleteAddress,
  createContact,
  updateContact,
  deleteContact,
  listAccounts,
  listIdentities,
  ban,
  unban,
  checkUsernameAvailability,
  unlinkAccount,
  revokeSessions,
}
