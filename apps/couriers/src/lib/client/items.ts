'use client'

import type {
  BillingItemCreateParams,
  BillingItemUpdateParams,
} from '@876/billing/integration'
import { request } from './request'

const base = '/api/manage/items'
export const items = {
  create(
    orgSlug: string,
    params: BillingItemCreateParams,
    idempotencyKey: string
  ) {
    return request<unknown>(base, {
      method: 'POST',
      body: JSON.stringify({ orgSlug, idempotencyKey, ...params }),
    })
  },
  update(orgSlug: string, id: string, params: BillingItemUpdateParams) {
    return request<unknown>(`${base}/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ orgSlug, ...params }),
    })
  },
}
