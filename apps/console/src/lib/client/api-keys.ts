import type {
  AdminApiKey,
  AdminApiKeyCreated,
  AdminDeletedApiKey,
} from '@876/admin'

import { request } from './request'

export const create = (
  appId: string,
  params: { name?: string; expires_at?: number } = {}
) =>
  request<AdminApiKeyCreated>(
    `/api/apps/${encodeURIComponent(appId)}/api-keys`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  )

export const update = (
  appId: string,
  keyId: string,
  params: { name?: string | null }
) =>
  request<AdminApiKey>(
    `/api/apps/${encodeURIComponent(appId)}/api-keys/${encodeURIComponent(keyId)}`,
    { method: 'PATCH', body: JSON.stringify(params) }
  )

export const revoke = (appId: string, keyId: string) =>
  request<AdminApiKey>(
    `/api/apps/${encodeURIComponent(appId)}/api-keys/${encodeURIComponent(keyId)}/revoke`,
    { method: 'POST' }
  )

export const del = (appId: string, keyId: string) =>
  request<AdminDeletedApiKey>(
    `/api/apps/${encodeURIComponent(appId)}/api-keys/${encodeURIComponent(keyId)}`,
    { method: 'DELETE' }
  )

export const apiKeys = { create, update, revoke, del, delete: del }
