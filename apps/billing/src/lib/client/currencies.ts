import type {
  TenantCurrencyCreated,
  TenantCurrencyEnableInput,
  CurrencyCreateInput,
  CurrencyUpdateInput,
} from '@/types/currency'

import { request } from './request'

export const create = (params: CurrencyCreateInput) =>
  request<TenantCurrencyCreated>('/api/v1/currencies', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const enable = (params: TenantCurrencyEnableInput) =>
  request<TenantCurrencyCreated>('/api/v1/currencies', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (code: string, params: CurrencyUpdateInput) =>
  request<TenantCurrencyCreated>(`/api/v1/currencies/${code}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const remove = (code: string) =>
  request<TenantCurrencyCreated>(`/api/v1/currencies/${code}`, {
    method: 'DELETE',
  })

export const setDefault = (params: TenantCurrencyEnableInput) =>
  request<TenantCurrencyCreated>('/api/v1/currencies', {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

export const currencies = { create, enable, update, remove, setDefault }
