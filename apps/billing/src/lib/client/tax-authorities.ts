import type {
  TaxAuthorityCreated,
  TaxAuthorityCreateInput,
  TaxAuthorityUpdateInput,
  TaxResourceUpdated,
} from '@/types/tax'

import { request } from './request'

export const create = (params: TaxAuthorityCreateInput) =>
  request<TaxAuthorityCreated>('/api/v1/tax-authorities', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (authorityId: string, params: TaxAuthorityUpdateInput) =>
  request<TaxResourceUpdated>(
    `/api/v1/tax-authorities/${encodeURIComponent(authorityId)}`,
    { method: 'PATCH', body: JSON.stringify(params) }
  )

export const taxAuthorities = { create, update }
