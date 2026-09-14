import type { PaymentMode } from '@876/billing'

import type {
  PaymentModeCreateInput,
  PaymentModeDeleted,
  PaymentModeUpdateInput,
} from '@/types/payment'

import { request } from './request'

export const create = (params: PaymentModeCreateInput) =>
  request<PaymentMode>('/api/v1/payments/modes', {
    method: 'POST',
    body: JSON.stringify(params),
  })

export const update = (modeId: string, params: PaymentModeUpdateInput) =>
  request<PaymentMode>(`/api/v1/payments/modes/${encodeURIComponent(modeId)}`, {
    method: 'PATCH',
    body: JSON.stringify(params),
  })

const deleteMode = (modeId: string) =>
  request<PaymentModeDeleted>(
    `/api/v1/payments/modes/${encodeURIComponent(modeId)}`,
    { method: 'DELETE' }
  )

const uploadImage = async (modeId: string, file: File) => {
  const start = await request<{
    id: string
    upload_url: string
    method: 'PUT'
    headers: Record<string, string>
  }>('/api/payment-mode-images/uploads', {
    method: 'POST',
    body: JSON.stringify({
      action: 'start',
      paymentModeId: modeId,
      fileName: file.name,
      contentType: file.type,
      sizeBytes: file.size,
    }),
  })
  if (start.error) return { error: start.error }
  try {
    const uploaded = await fetch(start.data.upload_url, {
      method: start.data.method,
      headers: start.data.headers,
      body: file,
    })
    if (!uploaded.ok)
      return {
        error: {
          message: 'The image could not be uploaded. Please try again.',
        },
      }
  } catch {
    return {
      error: { message: 'The image could not be uploaded. Please try again.' },
    }
  }
  const complete = await request<unknown>('/api/payment-mode-images/uploads', {
    method: 'POST',
    body: JSON.stringify({
      action: 'complete',
      paymentModeId: modeId,
      sessionId: start.data.id,
    }),
  })
  return { error: complete.error }
}

export const paymentModes = { create, update, delete: deleteMode, uploadImage }
