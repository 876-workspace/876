'use client'

import type {
  PaymentMode,
  PaymentModeCreateParams,
  PaymentModeDeleted,
  PaymentModeUpdateParams,
} from '@876/billing'

import { request } from './request'

export const paymentModes = {
  create(params: PaymentModeCreateParams) {
    return request<PaymentMode>('/api/payment-modes', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },
  update(id: string, params: PaymentModeUpdateParams) {
    return request<PaymentMode>(
      `/api/payment-modes/${encodeURIComponent(id)}`,
      { method: 'PATCH', body: JSON.stringify(params) }
    )
  },
  delete(id: string) {
    return request<PaymentModeDeleted>(
      `/api/payment-modes/${encodeURIComponent(id)}`,
      { method: 'DELETE' }
    )
  },
  async uploadImage(id: string, file: File) {
    const start = await request<{
      id: string
      upload_url: string
      method: 'PUT'
      headers: Record<string, string>
    }>('/api/payment-mode-images/uploads', {
      method: 'POST',
      body: JSON.stringify({
        action: 'start',
        paymentModeId: id,
        fileName: file.name,
        contentType: file.type,
        sizeBytes: file.size,
      }),
    })
    if (start.error) return { error: start.error }
    try {
      const upload = await fetch(start.data.upload_url, {
        method: start.data.method,
        headers: start.data.headers,
        body: file,
      })
      if (!upload.ok)
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
      '/api/payment-mode-images/uploads',
      {
        method: 'POST',
        body: JSON.stringify({
          action: 'complete',
          paymentModeId: id,
          sessionId: start.data.id,
        }),
      }
    )
    return { error: complete.error }
  },
}
