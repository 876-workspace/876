import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('./request', () => ({ request: mocks.request }))

import { payments } from './payments'

describe('payments received client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({
      data: { object: 'payment', id: 'pay_1' },
      error: null,
    })
  })

  it('posts a customer payment to Invoice same-origin transport with idempotency', async () => {
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

    await payments.create(params)

    expect(mocks.request).toHaveBeenCalledWith('/api/payments', {
      method: 'POST',
      headers: expect.objectContaining({
        'Idempotency-Key': expect.any(String),
      }),
      body: JSON.stringify(params),
    })
  })
})
