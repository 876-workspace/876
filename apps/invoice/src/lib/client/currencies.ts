'use client'

import type { CurrencyMutation } from '@876/billing'

import { request } from './request'

export const currencies = {
  enable(currency: string) {
    return request<CurrencyMutation>('/api/currencies', {
      method: 'POST',
      body: JSON.stringify({ currency }),
    })
  },
  disable(currency: string) {
    return request<CurrencyMutation>(
      `/api/currencies/${encodeURIComponent(currency)}`,
      {
        method: 'DELETE',
      }
    )
  },
  setDefault(currency: string) {
    return request<CurrencyMutation>('/api/currencies', {
      method: 'PATCH',
      body: JSON.stringify({ currency }),
    })
  },
}
