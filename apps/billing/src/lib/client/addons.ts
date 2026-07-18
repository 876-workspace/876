import type {
  AddonCreateInput,
  AddonCloneInput,
  AddonCreated,
  AddonDeleted,
  AddonResource,
  AddonUpdateInput,
} from '@/types/addon'

import { request } from './request'

export const addons = {
  create: (params: AddonCreateInput) =>
    request<AddonCreated>('/api/v1/addons', {
      method: 'POST',
      body: JSON.stringify(params),
    }),
  retrieve: (addonId: string) =>
    request<AddonResource>(`/api/v1/addons/${encodeURIComponent(addonId)}`, {
      method: 'GET',
    }),
  update: (addonId: string, params: AddonUpdateInput) =>
    request<AddonCreated>(`/api/v1/addons/${encodeURIComponent(addonId)}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    }),
  delete: (addonId: string) =>
    request<AddonDeleted>(`/api/v1/addons/${encodeURIComponent(addonId)}`, {
      method: 'DELETE',
    }),
  clone: (addonId: string, params: AddonCloneInput) =>
    request<AddonCreated>(
      `/api/v1/addons/${encodeURIComponent(addonId)}/clone`,
      { method: 'POST', body: JSON.stringify(params) }
    ),
  upsertAssociation: (
    addonId: string,
    params: import('@/types/addon').AddonAssociationUpsertParams
  ) =>
    request<{ object: 'plan_addon_association'; id: string }>(
      `/api/v1/addons/${encodeURIComponent(addonId)}/associations`,
      { method: 'PUT', body: JSON.stringify(params) }
    ),
  upsertAssociations: (
    addonId: string,
    associations: import('@/types/addon').AddonAssociationUpsertParams[]
  ) =>
    request<{
      object: 'plan_addon_association_batch'
      id: string
      updated: number
    }>(`/api/v1/addons/${encodeURIComponent(addonId)}/associations`, {
      method: 'PUT',
      body: JSON.stringify({ associations }),
    }),
}
