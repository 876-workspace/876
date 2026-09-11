import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  transaction: vi.fn(),
  generateDue: vi.fn(),
  recordFailure: vi.fn(),
  markOverdue: vi.fn(),
  lifecycleSchedules: vi.fn(),
  bill: vi.fn(),
  billingFailure: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    $transaction: mocks.transaction,
  },
}))

vi.mock('@/modules/documents', () => ({
  generateDueRecurringInvoice: mocks.generateDue,
  recordRecurringInvoiceFailure: mocks.recordFailure,
  markOverdueAcrossActiveTenants: mocks.markOverdue,
}))

vi.mock('@/modules/subscriptions', () => ({
  billSubscription: mocks.bill,
  recordBillingFailure: mocks.billingFailure,
  processDueLifecycleSchedulesAcrossTenants: mocks.lifecycleSchedules,
}))

import { runBillingSweep } from '../billing-engine.repository'

const AS_OF = Date.UTC(2026, 7, 15, 12) / 1000

function profile(id: string, tenantId: string) {
  return { id, tenantId }
}

function queueClaimRows(batches: Array<Array<ReturnType<typeof profile>>>) {
  const queue = [...batches]
  mocks.queryRaw.mockImplementation(async () => queue.shift() ?? [])
}

describe('runBillingSweep recurring invoices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.transaction.mockImplementation(
      (work: (tx: { $queryRaw: typeof mocks.queryRaw }) => unknown) =>
        work({ $queryRaw: mocks.queryRaw })
    )
    mocks.generateDue.mockResolvedValue({
      status: 'succeeded',
      invoiceId: 'inv_9K2mQ8x',
    })
    mocks.recordFailure.mockResolvedValue(undefined)
    mocks.markOverdue.mockResolvedValue({ count: 0 })
    mocks.lifecycleSchedules.mockResolvedValue({ applied: 0 })
  })

  it('claims a due recurring profile and counts its success', async () => {
    // ARRANGE
    queueClaimRows([[], [profile('rinv_7Hk2Qm4Z', 'ten_kingston_01')]])

    // ACT
    const result = await runBillingSweep({ asOf: AS_OF, limit: 3 })

    // ASSERT
    expect(mocks.generateDue).toHaveBeenCalledTimes(1)
    expect(mocks.generateDue).toHaveBeenCalledWith(
      'ten_kingston_01',
      'rinv_7Hk2Qm4Z',
      AS_OF,
      { transaction: expect.any(Object) }
    )
    expect(result).toMatchObject({
      object: 'billing_engine_run',
      asOf: AS_OF,
      processed: 1,
      succeeded: 1,
      failed: 0,
      skipped: 0,
      hasMore: false,
      invoiceIds: ['inv_9K2mQ8x'],
    })
    expect(result.recurringInvoices).toEqual({
      processed: 1,
      succeeded: 1,
      failed: 0,
      skipped: 0,
    })
    expect(mocks.recordFailure).not.toHaveBeenCalled()
  })

  it('counts a failed profile, excludes it from the next claim, and continues', async () => {
    // ARRANGE
    queueClaimRows([
      [],
      [profile('rinv_7Hk2Qm4Z', 'ten_kingston_01')],
      [profile('rinv_2Tb8Nz1Q', 'ten_kingston_01')],
    ])
    let calls = 0
    mocks.generateDue.mockImplementation(async () => {
      calls += 1
      return calls === 1
        ? {
            status: 'failed',
            code: 'billing/recurring-invoice-currency-disabled',
            message: 'The recurring invoice currency is disabled.',
          }
        : { status: 'succeeded', invoiceId: 'inv_9K2mQ8x' }
    })

    // ACT
    const result = await runBillingSweep({ asOf: AS_OF, limit: 3 })

    // ASSERT
    expect(mocks.generateDue).toHaveBeenCalledTimes(2)
    expect(mocks.generateDue).toHaveBeenNthCalledWith(
      1,
      'ten_kingston_01',
      'rinv_7Hk2Qm4Z',
      AS_OF,
      { transaction: expect.any(Object) }
    )
    expect(mocks.generateDue).toHaveBeenNthCalledWith(
      2,
      'ten_kingston_01',
      'rinv_2Tb8Nz1Q',
      AS_OF,
      { transaction: expect.any(Object) }
    )
    const firstClaim = mocks.queryRaw.mock.calls[1]![0] as { text: string }
    const secondClaim = mocks.queryRaw.mock.calls[2]![0] as { text: string }
    expect(firstClaim.text).toContain('FOR UPDATE OF r SKIP LOCKED')
    expect(firstClaim.text).not.toContain('NOT IN')
    expect(secondClaim.text).toContain('NOT IN')
    expect(result).toMatchObject({
      processed: 2,
      succeeded: 1,
      failed: 1,
      skipped: 0,
    })
    expect(result.recurringInvoices).toEqual({
      processed: 2,
      succeeded: 1,
      failed: 1,
      skipped: 0,
    })
    expect(mocks.recordFailure).not.toHaveBeenCalled()
  })

  it('records a thrown generation error against the claimed profile and continues', async () => {
    // ARRANGE
    queueClaimRows([
      [],
      [profile('rinv_7Hk2Qm4Z', 'ten_kingston_01')],
      [profile('rinv_2Tb8Nz1Q', 'ten_kingston_01')],
    ])
    const failure = new Error('Recurring invoice finalize failed')
    let attempts = 0
    mocks.generateDue.mockImplementation(async () => {
      attempts += 1
      if (attempts === 1) throw failure
      return { status: 'succeeded', invoiceId: 'inv_9K2mQ8x' }
    })

    // ACT
    const result = await runBillingSweep({ asOf: AS_OF, limit: 3 })

    // ASSERT
    expect(mocks.recordFailure).toHaveBeenCalledTimes(1)
    expect(mocks.recordFailure).toHaveBeenCalledWith(
      'ten_kingston_01',
      'rinv_7Hk2Qm4Z',
      AS_OF,
      failure
    )
    expect(mocks.generateDue).toHaveBeenCalledTimes(2)
    expect(result).toMatchObject({
      processed: 2,
      succeeded: 1,
      failed: 1,
      skipped: 0,
    })
    expect(result.recurringInvoices).toEqual({
      processed: 2,
      succeeded: 1,
      failed: 1,
      skipped: 0,
    })
  })

  it('counts a skipped profile without recording a failure', async () => {
    // ARRANGE
    queueClaimRows([[], [profile('rinv_7Hk2Qm4Z', 'ten_kingston_01')]])
    mocks.generateDue.mockResolvedValue({ status: 'skipped' })

    // ACT
    const result = await runBillingSweep({ asOf: AS_OF, limit: 3 })

    // ASSERT
    expect(mocks.generateDue).toHaveBeenCalledTimes(1)
    expect(result).toMatchObject({
      processed: 1,
      succeeded: 0,
      failed: 0,
      skipped: 1,
      invoiceIds: [],
    })
    expect(result.recurringInvoices).toEqual({
      processed: 1,
      succeeded: 0,
      failed: 0,
      skipped: 1,
    })
    expect(mocks.recordFailure).not.toHaveBeenCalled()
  })

  it('reports an empty recurring drain without touching the generator', async () => {
    // ARRANGE
    queueClaimRows([[]])

    // ACT
    const result = await runBillingSweep({ asOf: AS_OF, limit: 3 })

    // ASSERT
    expect(mocks.generateDue).not.toHaveBeenCalled()
    expect(mocks.recordFailure).not.toHaveBeenCalled()
    expect(result).toMatchObject({
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
      hasMore: false,
      invoiceIds: [],
    })
    expect(result.recurringInvoices).toEqual({
      processed: 0,
      succeeded: 0,
      failed: 0,
      skipped: 0,
    })
    expect(mocks.lifecycleSchedules).toHaveBeenCalledTimes(1)
    expect(mocks.lifecycleSchedules).toHaveBeenCalledWith(AS_OF)
    expect(mocks.markOverdue).toHaveBeenCalledTimes(1)
    expect(mocks.markOverdue).toHaveBeenCalledWith(AS_OF)
  })
})
