import { describe, expect, it } from 'vitest'

import { billingPaymentModeImageUploadRequestSchema } from './payment-mode-image'

describe('billingPaymentModeImageUploadRequestSchema', () => {
  it('accepts a raster payment-mode logo request', () => {
    expect(
      billingPaymentModeImageUploadRequestSchema.safeParse({
        action: 'start',
        paymentModeId: 'pmode_1',
        fileName: 'cash.png',
        contentType: 'image/png',
        sizeBytes: 1024,
      }).success
    ).toBe(true)
  })

  it('rejects SVG payment-mode logos', () => {
    const parsed = billingPaymentModeImageUploadRequestSchema.safeParse({
      action: 'start',
      paymentModeId: 'pmode_1',
      fileName: 'cash.svg',
      contentType: 'image/svg+xml',
      sizeBytes: 1024,
    })
    expect(parsed.success).toBe(false)
  })
})
