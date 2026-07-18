import type {
  AdminDeletedFeature,
  AdminDeletedOrgFeature,
  AdminDeletedUserFeature,
  AdminFeature,
  AdminFeatureCreateParams,
  AdminOrgFeature,
  AdminOrgFeatureGrantParams,
  AdminOrgFeatureUpdateParams,
  AdminUserFeature,
  AdminUserFeatureGrantParams,
  AdminUserFeatureUpdateParams,
  AdminFeatureUpdateParams,
} from '@876/admin'

import { request } from './request'

export const create = (params: AdminFeatureCreateParams) =>
  request<AdminFeature>('/api/features', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (featureId: string, params: AdminFeatureUpdateParams) =>
  request<AdminFeature>(`/api/features/${encodeURIComponent(featureId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const del = (featureId: string) =>
  request<AdminDeletedFeature>(
    `/api/features/${encodeURIComponent(featureId)}`,
    {
      method: 'DELETE',
    }
  )

export const grantOrg = (
  organizationId: string,
  params: AdminOrgFeatureGrantParams
) =>
  request<AdminOrgFeature>(
    `/api/features/organizations/${encodeURIComponent(organizationId)}`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  )

export const updateOrg = (
  organizationId: string,
  featureId: string,
  params: AdminOrgFeatureUpdateParams
) =>
  request<AdminOrgFeature>(
    `/api/features/organizations/${encodeURIComponent(organizationId)}/${encodeURIComponent(featureId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(params),
    }
  )

export const revokeOrg = (organizationId: string, featureId: string) =>
  request<AdminDeletedOrgFeature>(
    `/api/features/organizations/${encodeURIComponent(organizationId)}/${encodeURIComponent(featureId)}`,
    {
      method: 'DELETE',
    }
  )

export const grantUser = (
  userId: string,
  params: AdminUserFeatureGrantParams
) =>
  request<AdminUserFeature>(
    `/api/features/users/${encodeURIComponent(userId)}`,
    {
      method: 'POST',
      body: JSON.stringify(params),
    }
  )

export const updateUser = (
  userId: string,
  featureId: string,
  params: AdminUserFeatureUpdateParams
) =>
  request<AdminUserFeature>(
    `/api/features/users/${encodeURIComponent(userId)}/${encodeURIComponent(featureId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(params),
    }
  )

export const revokeUser = (userId: string, featureId: string) =>
  request<AdminDeletedUserFeature>(
    `/api/features/users/${encodeURIComponent(userId)}/${encodeURIComponent(featureId)}`,
    {
      method: 'DELETE',
    }
  )

export const features = {
  create,
  update,
  del,
  delete: del,
  grantOrg,
  updateOrg,
  revokeOrg,
  grantUser,
  updateUser,
  revokeUser,
}
