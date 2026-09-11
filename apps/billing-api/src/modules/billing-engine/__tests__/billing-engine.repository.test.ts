import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  bill: vi.fn(),
  failure: vi.fn(),
  markOverdue: vi.fn(),
  lifecycleSchedules: vi.fn(),
  queryRaw: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}))

vi.mock('@/modules/documents', () => ({
  markOverdueAcrossActiveTenants: mocks.markOverdue,
}))

vi.mock('@/modules/subscriptions', () => ({
  billSubscription: mocks.bill,
  recordBillingFailure: mocks.failure,
  processDueLifecycleSchedulesAcrossTenants: mocks.lifecycleSchedules,
}))

import { runBillingSweep } from '../billing-engine.repository'

describe('runBillingSweep', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transaction.mockImplementation(
      (work: (tx: { $queryRaw: typeof mocks.queryRaw }) => unknown) =>
        work({ $queryRaw: mocks.queryRaw })
    )
    mocks.markOverdue.mockResolvedValue({ count: 0 })
    mocks.lifecycleSchedules.mockResolvedValue({ applied: 0 })
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

  it('drains successive due subscriptions until its row limit', async () => {
    mocks.queryRaw
      .mockResolvedValueOnce([
        { id: 'sub_1', tenantId: 'ten_1', advance: false },
      ])
      .mockResolvedValueOnce([
        { id: 'sub_2', tenantId: 'ten_2', advance: true },
      ])
    mocks.bill
      .mockResolvedValueOnce({ status: 'succeeded', invoiceId: 'inv_1' })
      .mockResolvedValueOnce({ status: 'succeeded', invoiceId: 'inv_2' })

    await expect(
      runBillingSweep({ asOf: 1_700_000_000, limit: 2 })
    ).resolves.toMatchObject({
      processed: 2,
      succeeded: 2,
      invoiceIds: ['inv_1', 'inv_2'],
      hasMore: true,
    })
    expect(mocks.bill).toHaveBeenCalledTimes(2)
  })

  it('reports no further work after a claim query returns empty', async () => {
    mocks.queryRaw.mockResolvedValue([])

    await expect(
      runBillingSweep({ asOf: 1_700_000_000, limit: 2 })
    ).resolves.toMatchObject({
      processed: 0,
      succeeded: 0,
      hasMore: false,
      invoiceIds: [],
    })
    expect(mocks.bill).not.toHaveBeenCalled()
  })

  it('drains due lifecycle schedules after subscription claims finish', async () => {
    mocks.queryRaw.mockResolvedValue([])
    mocks.lifecycleSchedules.mockResolvedValue({ applied: 1 })

    await expect(
      runBillingSweep({ asOf: 1_700_000_000, limit: 2 })
    ).resolves.toMatchObject({
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      invoiceIds: [],
      hasMore: false,
    })

    expect(mocks.lifecycleSchedules).toHaveBeenCalledTimes(1)
    expect(mocks.lifecycleSchedules).toHaveBeenCalledWith(1_700_000_000)
    expect(mocks.markOverdue).toHaveBeenCalledTimes(1)
    expect(mocks.markOverdue).toHaveBeenCalledWith(1_700_000_000)
  })
})
