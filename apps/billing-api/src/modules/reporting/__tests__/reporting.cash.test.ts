import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: { $queryRaw: mocks.queryRaw },
}))

import { paymentCashRows, refundRows } from '../reporting.repository'

function sqlText(argument: unknown): string {
  if (typeof argument === 'string') return argument
  if (argument !== null && typeof argument === 'object') {
    const record = argument as Record<string, unknown>
    if (typeof record.sql === 'string') return record.sql
  }
  return ''
}

function sqlValues(argument: unknown): unknown[] {
  if (argument !== null && typeof argument === 'object') {
    const record = argument as Record<string, unknown>
    if (Array.isArray(record.values)) return record.values as unknown[]
  }
  return []
}

function lastQuery(): { text: string; values: unknown[] } {
  const argument = mocks.queryRaw.mock.calls.at(-1)?.[0]
  return { text: sqlText(argument), values: sqlValues(argument) }
}

const FILTER = { from: 1_000, to: 2_000 }

describe('cash summary definitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryRaw.mockResolvedValue([])
  })

  it('counts succeeded, partially-refunded, and refunded payments', async () => {
    await paymentCashRows('ten_1', FILTER, 'day', 'America/Jamaica')

    const { text } = lastQuery()
    for (const status of ['SUCCEEDED', 'PARTIALLY_REFUNDED', 'REFUNDED'])
      expect(text).toContain(`'${status}'`)
  })

  it('excludes reversed, failed, and pending payments', async () => {
    await paymentCashRows('ten_1', FILTER, 'day', 'America/Jamaica')

    const { text } = lastQuery()
    for (const status of ['FAILED', 'PENDING', 'CANCELED', 'DISPUTED'])
      expect(text).not.toContain(`'${status}'`)
  })

  it('splits immediate-sale cash through the sales-receipt payment link', async () => {
    await paymentCashRows('ten_1', FILTER, 'day', 'America/Jamaica')

    const { text } = lastQuery()
    expect(text).toContain('billing_sales_receipts')
    expect(text).toContain('payment_id')
  })

  it('scopes cash and refunds to the tenant and payment instant', async () => {
    await paymentCashRows('ten_1', FILTER, 'day', 'America/Jamaica')
    expect(lastQuery().values).toEqual(
      expect.arrayContaining(['ten_1', 1_000, 2_000, 'America/Jamaica'])
    )
    expect(lastQuery().text).toContain('payment_date')

    await refundRows('ten_1', FILTER, 'month', 'America/Jamaica')
    expect(lastQuery().values).toEqual(
      expect.arrayContaining(['ten_1', 1_000, 2_000])
    )
    expect(lastQuery().text).toContain('refunded_at')
  })

  it('returns the sales-receipt split as a boolean per row', async () => {
    mocks.queryRaw.mockResolvedValue([
      {
        bucketStart: 1_000,
        currency: 'JMD',
        isSalesReceiptCash: true,
        count: 1,
        amount: 5_000n,
      },
      {
        bucketStart: 1_000,
        currency: 'JMD',
        isSalesReceiptCash: false,
        count: 2,
        amount: 20_000n,
      },
    ])

    const rows = await paymentCashRows('ten_1', FILTER, 'day', 'America/Jamaica')

    expect(rows).toEqual([
      {
        bucketStart: 1_000,
        currency: 'JMD',
        isSalesReceiptCash: true,
        count: 1,
        amount: '5000',
      },
      {
        bucketStart: 1_000,
        currency: 'JMD',
        isSalesReceiptCash: false,
        count: 2,
        amount: '20000',
      },
    ])
  })

  it('aggregates every refund in range without a status filter', async () => {
    await refundRows('ten_1', FILTER, 'day', 'America/Jamaica')

    const { text } = lastQuery()
    expect(text).toContain('billing_refunds')
    expect(text).toContain('SUM(r.amount)')
  })
})
