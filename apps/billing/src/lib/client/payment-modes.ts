import type {
  PaymentModeCreated,
  PaymentModeCreateInput,
  PaymentModeDeleted,
  PaymentModeUpdated,
  PaymentModeUpdateInput,
} from '@/types/payment'

import { request } from './request'

export const create = (params: PaymentModeCreateInput) =>
  request<PaymentModeCreated>('/api/v1/payments/modes', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (modeId: string, params: PaymentModeUpdateInput) =>
  request<PaymentModeUpdated>(
    `/api/v1/payments/modes/${encodeURIComponent(modeId)}`,
    { method: 'PATCH', body: JSON.stringify(params) }
  )

const deleteMode = (modeId: string) =>
  request<PaymentModeDeleted>(
    `/api/v1/payments/modes/${encodeURIComponent(modeId)}`,
    { method: 'DELETE' }
  )

export const paymentModes = { create, update, delete: deleteMode }
