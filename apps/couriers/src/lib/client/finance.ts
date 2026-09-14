'use client'

import type {
  CurrencyEnableParams,
  CurrencyUpdateParams,
  PaymentMode,
  PaymentModeCreateParams,
  PaymentModeUpdateParams,
  TaxRateCreateParams,
  TaxRateUpdateParams,
} from '@876/billing'

import { request } from './request'
import { putDirectToStorage } from './upload'

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
    return request<PaymentMode>(`${base}/payment-modes`, {
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
  async uploadImage(orgSlug: string, paymentModeId: string, file: File) {
    const start = await request<{
      id: string
      upload_url: string
      method: 'PUT'
      headers: Record<string, string>
    }>(`${base}/payment-mode-images/uploads`, {
      method: 'POST',
      body: JSON.stringify({
        action: 'start',
        orgSlug,
        paymentModeId,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      }),
    })
    if (start.error) return { error: start.error }
    try {
      const uploaded = await putDirectToStorage({
        url: start.data.upload_url,
        method: start.data.method,
        headers: start.data.headers,
        file,
      })
      if (!uploaded.ok)
        return {
          error: {
            message: 'The image could not be uploaded. Please try again.',
          },
        }
    } catch {
      return {
        error: {
          message: 'The image could not be uploaded. Please try again.',
        },
      }
    }
    const complete = await request<unknown>(
      `${base}/payment-mode-images/uploads`,
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'complete',
          orgSlug,
          paymentModeId,
          sessionId: start.data.id,
        }),
      }
    )
    return { error: complete.error }
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
