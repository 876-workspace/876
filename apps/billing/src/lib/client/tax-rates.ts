import type {
  TaxRateCreated,
  TaxRateCreateInput,
  TaxRateUpdateInput,
  TaxResourceUpdated,
} from '@/types/tax'

import { request } from './request'

export const create = (params: TaxRateCreateInput) =>
  request<TaxRateCreated>('/api/v1/tax-rates', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (rateId: string, params: TaxRateUpdateInput) =>
  request<TaxResourceUpdated>(
    `/api/v1/tax-rates/${encodeURIComponent(rateId)}`,
    { method: 'PATCH', body: JSON.stringify(params) }
  )

export const taxRates = { create, update }
