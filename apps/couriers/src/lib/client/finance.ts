'use client'

import type {
  CurrencyEnableParams,
  CurrencyUpdateParams,
  PaymentModeCreateParams,
  PaymentModeUpdateParams,
  TaxRateCreateParams,
  TaxRateUpdateParams,
} from '@876/billing'

import { request } from './request'

const base = '/api/manage/finance'

/** Couriers finance-settings mutations for the shared Billing panels. */
export const financeTaxes = {
  create(orgSlug: string, params: TaxRateCreateParams) {
    return request<unknown>(`${base}/taxes`, {
      method: 'POST',
      body: JSON.stringify({ orgSlug, ...params }),
    })
  },
  update(orgSlug: string, id: string, params: TaxRateUpdateParams) {
    return request<unknown>(`${base}/taxes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ orgSlug, ...params }),
    })
  },
}

export const financePaymentModes = {
  create(orgSlug: string, params: PaymentModeCreateParams) {
    return request<unknown>(`${base}/payment-modes`, {
      method: 'POST',
      body: JSON.stringify({ orgSlug, ...params }),
    })
  },
  update(orgSlug: string, id: string, params: PaymentModeUpdateParams) {
    return request<unknown>(`${base}/payment-modes/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ orgSlug, ...params }),
    })
  },
  remove(orgSlug: string, id: string) {
    return request<unknown>(`${base}/payment-modes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      body: JSON.stringify({ orgSlug }),
    })
  },
}

export const financeCurrencies = {
  enable(orgSlug: string, params: CurrencyEnableParams) {
    return request<unknown>(`${base}/currencies`, {
      method: 'POST',
      body: JSON.stringify({ orgSlug, ...params }),
    })
  },
  update(orgSlug: string, code: string, params: CurrencyUpdateParams) {
    return request<unknown>(`${base}/currencies/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      body: JSON.stringify({ orgSlug, ...params }),
    })
  },
  setDefault(orgSlug: string, currency: string) {
    return request<unknown>(`${base}/currencies`, {
      method: 'PATCH',
      body: JSON.stringify({ orgSlug, currency }),
    })
  },
  disable(orgSlug: string, code: string) {
    return request<unknown>(`${base}/currencies/${encodeURIComponent(code)}`, {
      method: 'DELETE',
      body: JSON.stringify({ orgSlug }),
    })
  },
}

export const finance = {
  taxes: financeTaxes,
  paymentModes: financePaymentModes,
  currencies: financeCurrencies,
}
