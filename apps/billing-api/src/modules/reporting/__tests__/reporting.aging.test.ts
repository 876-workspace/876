import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  agingRows: vi.fn(),
  topCustomers: vi.fn(),
  retrieveReportPreferences: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: { $queryRaw: mocks.queryRaw },
}))

import {
  receivablesAgingRows,
  receivablesTopCustomers,
} from '../reporting.repository'

function sqlText(argument: unknown): string {
  if (typeof argument === 'string') return argument
  if (argument !== null && typeof argument === 'object') {
    const record = argument as Record<string, unknown>
    if (typeof record.sql === 'string') return record.sql
  }
  return ''
}

function lastText(): string {
  return sqlText(mocks.queryRaw.mock.calls.at(-1)?.[0])
}

describe('receivables aging definitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryRaw.mockResolvedValue([])
  })

  it('keeps invoices without a due date or due today in current', async () => {
    await receivablesAgingRows('ten_1', 2_000)

    const text = lastText()
    expect(text).toContain('due_at IS NULL')
    expect(text).toContain('"daysPast" IS NULL OR aged."daysPast" <= 0')
  })

  it('places day 1 through day 30 in the first bucket', async () => {
    await receivablesAgingRows('ten_1', 2_000)

    expect(lastText()).toContain('BETWEEN 1 AND 30')
  })

  it('places day 31 through day 60 in the second bucket', async () => {
    await receivablesAgingRows('ten_1', 2_000)

    expect(lastText()).toContain('BETWEEN 31 AND 60')
  })

  it('places day 61 through day 90 in the third bucket', async () => {
    await receivablesAgingRows('ten_1', 2_000)

    expect(lastText()).toContain('BETWEEN 61 AND 90')
  })

  it('places day 91 and beyond in the over-90 bucket', async () => {
    await receivablesAgingRows('ten_1', 2_000)

    expect(lastText()).toContain('"daysPast" > 90')
  })

  it('derives whole days past due from the as-of instant', async () => {
    await receivablesAgingRows('ten_1', 2_000)

    expect(lastText()).toContain('FLOOR(')
    expect(lastText()).toContain('/ 86400.0)')
  })

  it('ranks top customers by outstanding with a bounded limit', async () => {
    await receivablesTopCustomers('ten_1', 5)

    const text = lastText()
    expect(text).toContain('ORDER BY "outstanding" DESC')
    expect(text).toContain('LIMIT')
  })

  it('maps aging rows into per-currency money strings', async () => {
    mocks.queryRaw.mockResolvedValue([
      {
        currency: 'jmd',
        current: 1_000n,
        days1To30: 2_000n,
        days31To60: 0n,
        days61To90: 500n,
        over90: 100n,
        totalOutstanding: 3_600n,
      },
    ])

    const rows = await receivablesAgingRows('ten_1', 2_000)

    expect(rows).toEqual([
      {
        currency: 'JMD',
        current: '1000',
        days1To30: '2000',
        days31To60: '0',
        days61To90: '500',
        over90: '100',
        totalOutstanding: '3600',
      },
    ])
  })
})
