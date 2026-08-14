import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  bill: vi.fn(),
  failure: vi.fn(),
  invoiceUpdateMany: vi.fn(),
  queryRaw: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    $transaction: mocks.transaction,
    invoice: { updateMany: mocks.invoiceUpdateMany },
  },
}))

vi.mock('@/modules/subscriptions', () => ({
  billSubscription: mocks.bill,
  recordBillingFailure: mocks.failure,
}))

import { runBillingSweep } from '../billing-engine.repository'

describe('runBillingSweep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transaction.mockImplementation(
      (work: (tx: { $queryRaw: typeof mocks.queryRaw }) => unknown) =>
        work({ $queryRaw: mocks.queryRaw })
    )
    mocks.invoiceUpdateMany.mockResolvedValue({ count: 0 })
  })

  it('claims due subscriptions with SKIP LOCKED and bills in that transaction', async () => {
    mocks.queryRaw.mockResolvedValueOnce([
      { id: 'sub_1', tenantId: 'ten_1', advance: false },
    ])
    mocks.bill.mockResolvedValue({ status: 'succeeded', invoiceId: 'inv_1' })

    const result = await runBillingSweep({ asOf: 1_700_000_000, limit: 1 })

    const query = mocks.queryRaw.mock.calls[0]![0] as { text: string }
    expect(query.text).toContain('FOR UPDATE OF s SKIP LOCKED')
    expect(mocks.bill).toHaveBeenCalledWith(
      'ten_1',
      'sub_1',
      1_700_000_000,
      expect.objectContaining({
        advance: false,
        transaction: expect.any(Object),
      })
    )
    expect(result).toMatchObject({
      object: 'billing_engine_run',
      processed: 1,
      succeeded: 1,
      failed: 0,
      invoiceIds: ['inv_1'],
    })
  })

  it('records an isolated billing failure and continues the summary', async () => {
    mocks.queryRaw.mockResolvedValueOnce([
      { id: 'sub_2', tenantId: 'ten_1', advance: true },
    ])
    mocks.bill.mockRejectedValue(new Error('calculation failed'))

    const result = await runBillingSweep({ asOf: 1_700_000_000, limit: 1 })

    expect(mocks.failure).toHaveBeenCalledWith(
      'ten_1',
      'sub_2',
      1_700_000_000,
      expect.any(Error)
    )
    expect(result).toMatchObject({ processed: 1, failed: 1, succeeded: 0 })
  })
})
