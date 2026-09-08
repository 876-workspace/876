import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('./request', () => ({ request: mocks.request }))

import { refunds } from './refunds'

describe('refunds client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({
      data: { object: 'refund', id: 'ref_1' },
      error: null,
    })
  })

  it('posts a payment refund through Invoice same-origin transport', async () => {
    const params = {
      customerId: 'cus_1',
      currency: 'JMD',
      amount: '2500',
      paymentModeId: 'mode_1',
      depositAccountId: 'acct_1',
      reason: 'Duplicate payment',
      notes: null,
      refundedAt: 1_788_652_800,
      paymentId: 'pay_1',
    }

    await refunds.create(params)

    expect(mocks.request).toHaveBeenCalledWith('/api/refunds', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  })

  it('posts a credit-note refund through the same canonical resource', async () => {
    const params = {
      customerId: 'cus_1',
      currency: 'USD',
      amount: '1000',
      paymentModeId: 'mode_2',
      depositAccountId: 'acct_2',
      reason: null,
      notes: 'Return remaining credit.',
      refundedAt: 1_788_652_800,
      creditNoteId: 'cn_1',
    }

    await refunds.create(params)

    expect(mocks.request).toHaveBeenCalledWith('/api/refunds', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  })
})
