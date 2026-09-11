import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))

vi.mock('./request', () => ({ request: mocks.request }))

import { salesReceipts } from './sales-receipts'

const createParams = {
  customerId: 'cus_1',
  currency: 'JMD',
  receiptAt: 1_788_652_800,
  lines: [
    {
      itemId: 'item_1',
      description: 'Counter sale',
      quantity: 1,
      unitAmount: '10000',
      taxAmount: '0',
      discountAmount: '0',
    },
  ],
  paymentModeId: 'mode_1',
  depositAccountId: 'acct_1',
  paymentDate: 1_788_652_800,
  bankCharges: '0',
}

describe('sales receipts client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.request.mockResolvedValue({
      data: {
        object: 'sales_receipt',
        id: 'sr_1',
        number: 'SR-000001',
        status: 'PAID',
        currency: 'JMD',
        totalAmount: '10000',
        receiptAt: 1_788_652_800,
      },
      error: null,
    })
  })

  it('creates through the Invoice proxy with an integration idempotency key', async () => {
    await salesReceipts.create(createParams)

    expect(mocks.request).toHaveBeenCalledWith('/api/sales-receipts', {
      method: 'POST',
      headers: expect.objectContaining({
        'Idempotency-Key': expect.any(String),
      }),
      body: JSON.stringify(createParams),
    })
  })

  it('refunds through the encoded Sales Receipt route', async () => {
    const params = { amount: '2500', reason: 'Returned item' }
    await salesReceipts.refund('sr/1', params)

    expect(mocks.request).toHaveBeenCalledWith(
      '/api/sales-receipts/sr%2F1/refund',
      {
        method: 'POST',
        body: JSON.stringify(params),
      }
    )
  })

  it('voids through the encoded Sales Receipt route', async () => {
    const params = { reason: 'Entered in error' }
    await salesReceipts.void('sr/1', params)

    expect(mocks.request).toHaveBeenCalledWith('/api/sales-receipts/sr%2F1/void', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  })
})
