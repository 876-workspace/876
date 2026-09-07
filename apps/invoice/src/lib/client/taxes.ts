'use client'

import type {
  TaxAuthority,
  TaxAuthorityCreateParams,
  TaxAuthorityUpdateParams,
  TaxRate,
  TaxRateCreateParams,
  TaxRateUpdateParams,
} from '@876/billing'

import { request } from './request'

export const taxAuthorities = {
  create(params: TaxAuthorityCreateParams) {
    return request<TaxAuthority>('/api/tax-authorities', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
  update(id: string, params: TaxAuthorityUpdateParams) {
    return request<TaxAuthority>(
      `/api/tax-authorities/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    )
  },
}

export const taxRates = {
  create(params: TaxRateCreateParams) {
    return request<TaxRate>('/api/tax-rates', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
  update(id: string, params: TaxRateUpdateParams) {
    return request<TaxRate>(`/api/tax-rates/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
  },
}
