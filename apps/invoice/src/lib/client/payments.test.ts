import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('./request', () => ({ request: mocks.request }))

import { payments } from './payments'

const params = {
  customerId: 'cus_1',
  paymentModeId: 'mode_1',
  depositAccountId: 'acct_1',
  amount: '10000',
  bankCharges: '0',
  currency: 'JMD',
  paymentDate: 1_788_652_800,
  referenceNumber: null,
  notes: null,
  allocations: [{ invoiceId: 'inv_1', amount: '7500' }],
}

describe('payments received client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({
      data: { object: 'payment', id: 'pay_1' },
      error: null,
    })
  })

  it('posts a customer payment to Invoice same-origin transport with idempotency', async () => {
    await payments.create(params)

    expect(mocks.request).toHaveBeenCalledWith('/api/payments', {
      method: 'POST',
      headers: expect.objectContaining({
        'Idempotency-Key': expect.any(String),
      }),
      body: JSON.stringify(params),
    })
  })

  it('updates a payment through the encoded same-origin payment route', async () => {
    await payments.update('pay/1', params)

    expect(mocks.request).toHaveBeenCalledWith('/api/payments/pay%2F1', {
      method: 'PATCH',
      body: JSON.stringify(params),
    })
  })

  it('cancels a payment through the encoded same-origin payment route', async () => {
    mocks.request.mockResolvedValue({
      data: { object: 'payment', id: 'pay/1', deleted: true },
      error: null,
    })

    await payments.delete('pay/1')

    expect(mocks.request).toHaveBeenCalledWith('/api/payments/pay%2F1', {
      method: 'DELETE',
    })
  })
})
