import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
  subscriptionGroupBy: vi.fn(),
  invoiceGroupBy: vi.fn(),
  customerCount: vi.fn(),
  productCount: vi.fn(),
  quoteCount: vi.fn(),
  retrieveReportPreferences: vi.fn(),
}))

// No `findMany` anywhere: any unbounded row load would throw here.
vi.mock('@/db/client', () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    subscription: { groupBy: mocks.subscriptionGroupBy },
    invoice: { groupBy: mocks.invoiceGroupBy },
    customer: { count: mocks.customerCount },
    product: { count: mocks.productCount },
    quote: { count: mocks.quoteCount },
  },
}))
vi.mock('../report-preferences.repository', () => ({
  retrieveReportPreferences: mocks.retrieveReportPreferences,
}))

import { dashboardOverview } from '../reporting.service'

const PREFS = {
  object: 'report_preferences' as const,
  timezone: 'America/Jamaica',
  fiscalYearStartMonth: 1,
}

describe('dashboard projection rewrite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveReportPreferences.mockResolvedValue(PREFS)
    mocks.customerCount.mockResolvedValue(7)
    mocks.productCount.mockResolvedValue(3)
    mocks.quoteCount.mockResolvedValue(1)
    mocks.subscriptionGroupBy.mockResolvedValue([
      { status: 'ACTIVE', _count: { _all: 2 } },
      { status: 'TRIALING', _count: { _all: 1 } },
      { status: 'PAUSED', _count: { _all: 1 } },
    ])
    mocks.invoiceGroupBy.mockResolvedValue([
      { currency: 'JMD', _sum: { totalAmount: 50_000n, amountDue: 10_000n } },
    ])
    mocks.queryRaw.mockImplementation(async (query: unknown) => {
      if (sqlIncludes(query, "date_trunc('month'")) return [{ start: 1_000 }]
      return []
    })
  })

  it('keeps the legacy dashboard contract unchanged', async () => {
    const result = await dashboardOverview('ten_1')

    expect(result.object).toBe('billing_dashboard')
    expect(result).toMatchObject({
      activeSubscriptions: 2,
      trialingSubscriptions: 1,
      pausedSubscriptions: 1,
      cancelledSubscriptions: 0,
      customerCount: 7,
      productCount: 3,
      draftQuoteCount: 1,
    })
    expect(result.issuedInvoiceTotals).toEqual([
      { currency: 'JMD', totalIssued: '50000', totalOutstanding: '10000' },
    ])
  })

  it('adds month-to-date net sales and overdue receivables per currency', async () => {
    const result = await dashboardOverview('ten_1')

    expect(result.salesThisMonth).toEqual([
      { currency: 'JMD', netSales: '0' },
    ])
    expect(result.receivablesOverdue).toEqual([
      { currency: 'JMD', overdue: '10000' },
    ])
  })

  it('loads no unbounded subscription or invoice rows', async () => {
    await dashboardOverview('ten_1')

    expect(mocks.subscriptionGroupBy).toHaveBeenCalledTimes(1)
    expect(mocks.invoiceGroupBy).toHaveBeenCalledTimes(2)
    expect(mocks.queryRaw).not.toHaveBeenCalledWith(
      expect.stringContaining('findMany'),
      expect.anything()
    )
  })

  it('shares current MRR with the subscription summary', async () => {
    mocks.queryRaw.mockImplementation(async (query: unknown) => {
      if (sqlIncludes(query, 'billing_subscriptions'))
        return [{ currency: 'JMD', annual: 120_000n }]
      if (sqlIncludes(query, "date_trunc('month'")) return [{ start: 1_000 }]
      return []
    })

    const result = await dashboardOverview('ten_1')

    expect(result.recurringRevenue).toEqual([
      { currency: 'JMD', mrr: '10000', arr: '120000' },
    ])
    const mrrQuery = mocks.queryRaw.mock.calls
      .map(([query]) => query)
      .find((query) => sqlIncludes(query, 'billing_subscriptions'))
    expect(mrrQuery).toBeDefined()
  })
})

function sqlIncludes(query: unknown, text: string): boolean {
  return (
    typeof query === 'object' &&
    query !== null &&
    'sql' in query &&
    typeof (query as { sql: unknown }).sql === 'string' &&
    ((query as { sql: string }).sql as string).includes(text)
  )
}
