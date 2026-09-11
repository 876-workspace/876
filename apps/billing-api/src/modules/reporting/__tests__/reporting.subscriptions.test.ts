import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  groupBy: vi.fn(),
  count: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    subscription: { groupBy: mocks.groupBy, count: mocks.count },
  },
}))

import {
  activeSubscriptionsAt,
  currentMrrByCurrency,
  subscriptionEventRows,
} from '../reporting.repository'

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

describe('subscription reporting definitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryRaw.mockResolvedValue([])
  })

  it('buckets new subscriptions by start instant with a created fallback', async () => {
    await subscriptionEventRows(
      'ten_1',
      { from: 1_000, to: 2_000 },
      'month',
      'America/Jamaica'
    )

    expect(lastQuery().text).toContain('COALESCE(s.start_at, s.created_at)')
  })

  it('buckets canceled, ended, and paused events by their own timestamps', async () => {
    await subscriptionEventRows(
      'ten_1',
      { from: 1_000, to: 2_000 },
      'month',
      'America/Jamaica'
    )

    const { text } = lastQuery()
    expect(text).toContain('s.canceled_at')
    expect(text).toContain('s.ended_at')
    expect(text).toContain('s.paused_at')
  })

  it('derives active-at-range-start from lifecycle timestamps', async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 4 }])

    const active = await activeSubscriptionsAt('ten_1', 2_000)

    const { text, values } = lastQuery()
    expect(text).toContain('COALESCE(s.start_at, s.created_at) <')
    expect(text).toContain('s.canceled_at IS NULL')
    expect(text).toContain('s.ended_at IS NULL')
    expect(values).toContain(2_000)
    expect(active).toBe(4)
  })

  it('annualises current MRR from recurring prices on live subscriptions', async () => {
    mocks.queryRaw.mockResolvedValue([{ currency: 'JMD', annual: 120_000n }])

    const mrr = await currentMrrByCurrency('ten_1')

    const { text } = lastQuery()
    expect(text).toContain("'ACTIVE'")
    expect(text).toContain("'TRIALING'")
    expect(text).toContain("price_type")
    expect(text).toContain('RECURRING')
    expect(mrr).toEqual([{ currency: 'JMD', mrr: '10000', arr: '120000' }])
  })

  it('applies the customer filter to subscription events and MRR', async () => {
    await subscriptionEventRows(
      'ten_1',
      { from: 1_000, to: 2_000, customerId: 'cus_1' },
      'month',
      'America/Jamaica'
    )
    expect(lastQuery().values).toContain('cus_1')

    await currentMrrByCurrency('ten_1', 'cus_1')
    expect(lastQuery().values).toContain('cus_1')
  })
})
