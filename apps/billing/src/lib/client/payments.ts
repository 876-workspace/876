import type {
  PaymentCreated,
  PaymentCreateInput,
  PaymentDeleted,
  PaymentUpdated,
  PaymentUpdateInput,
} from '@/types/payment'

import { request } from './request'

export const create = (params: PaymentCreateInput) =>
  request<PaymentCreated>('/api/v1/payments', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (paymentId: string, params: PaymentUpdateInput) =>
  request<PaymentUpdated>(`/api/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

const deletePayment = (paymentId: string) =>
  request<PaymentDeleted>(`/api/v1/payments/${encodeURIComponent(paymentId)}`, {
    method: 'DELETE',
  })

export const payments = { create, update, delete: deletePayment }
