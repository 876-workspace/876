'use client'

import { request } from './request'

export const customers = {
  /** Deletes a customer by ID. */
  delete(customerId: string) {
    return request<{ id: string; deleted: true }>(
      `/api/v1/customers/${encodeURIComponent(customerId)}`,
      { method: 'DELETE' }
    )
  },
}
