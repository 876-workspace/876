import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  bucketSpine: vi.fn(),
  invoiceSalesRows: vi.fn(),
  salesReceiptRows: vi.fn(),
  creditNoteRows: vi.fn(),
  subscriptionEventRows: vi.fn(),
  activeSubscriptionsAt: vi.fn(),
  currentMrrByCurrency: vi.fn(),
  subscriptionStatusCounts: vi.fn(),
  dashboardCounts: vi.fn(),
  invoiceTotalsByCurrency: vi.fn(),
  monthStartEpoch: vi.fn(),
  receivablesOverdueByCurrency: vi.fn(),
  retrieveReportPreferences: vi.fn(),
}))

vi.mock('../reporting.repository', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  bucketSpine: mocks.bucketSpine,
  invoiceSalesRows: mocks.invoiceSalesRows,
  salesReceiptRows: mocks.salesReceiptRows,
  creditNoteRows: mocks.creditNoteRows,
  subscriptionEventRows: mocks.subscriptionEventRows,
  activeSubscriptionsAt: mocks.activeSubscriptionsAt,
  currentMrrByCurrency: mocks.currentMrrByCurrency,
  subscriptionStatusCounts: mocks.subscriptionStatusCounts,
  dashboardCounts: mocks.dashboardCounts,
  invoiceTotalsByCurrency: mocks.invoiceTotalsByCurrency,
  monthStartEpoch: mocks.monthStartEpoch,
  receivablesOverdueByCurrency: mocks.receivablesOverdueByCurrency,
}))
vi.mock('../report-preferences.repository', () => ({
  retrieveReportPreferences: mocks.retrieveReportPreferences,
}))

import { subscriptionSummary } from '../reporting.service'

const PREFS = {
  object: 'report_preferences' as const,
  timezone: 'America/Jamaica',
  fiscalYearStartMonth: 1,
}

describe('subscription summary composition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveReportPreferences.mockResolvedValue(PREFS)
    mocks.bucketSpine.mockResolvedValue([{ start: 1_000, end: 2_000 }])
    mocks.subscriptionEventRows.mockResolvedValue([])
    mocks.activeSubscriptionsAt.mockResolvedValue(0)
    mocks.currentMrrByCurrency.mockResolvedValue([])
    mocks.subscriptionStatusCounts.mockResolvedValue([])
    mocks.invoiceSalesRows.mockResolvedValue([])
    mocks.salesReceiptRows.mockResolvedValue([])
    mocks.creditNoteRows.mockResolvedValue([])
  })

  function summarize(overrides: Record<string, unknown> = {}) {
    return subscriptionSummary('ten_1', {
      from: 1_000,
      to: 2_000,
      groupBy: 'month',
      ...overrides,
    })
  }

  it('splits invoice revenue into subscription, recurring-invoice, and one-off sources', async () => {
    mocks.currentMrrByCurrency.mockResolvedValue([
      { currency: 'JMD', mrr: '10000', arr: '120000' },
    ])
    mocks.invoiceSalesRows.mockResolvedValue([
      {
        bucketStart: 1_000,
        currency: 'JMD',
        billingReason: 'SUBSCRIPTION_CYCLE',
        count: 1,
        netAmount: '9000',
        taxAmount: '0',
        totalAmount: '9000',
      },
      {
        bucketStart: 1_000,
        currency: 'JMD',
        billingReason: 'RECURRING_INVOICE',
        count: 1,
        netAmount: '4000',
        taxAmount: '0',
        totalAmount: '4000',
      },
      {
        bucketStart: 1_000,
        currency: 'JMD',
        billingReason: 'MANUAL',
        count: 1,
        netAmount: '1000',
        taxAmount: '0',
        totalAmount: '1000',
      },
    ])

    const result = await summarize()

    const jmd = result.currencies.find((entry) => entry.currency === 'JMD')
    expect(jmd?.buckets[0]?.subscriptionRevenue).toBe('9000')
    expect(result.object).toBe('subscription-summary')
  })

  it('counts paused subscriptions in the current snapshot', async () => {
    mocks.currentMrrByCurrency.mockResolvedValue([
      { currency: 'JMD', mrr: '0', arr: '0' },
    ])
    mocks.subscriptionStatusCounts.mockResolvedValue([
      { status: 'ACTIVE', count: 3 },
      { status: 'TRIALING', count: 1 },
      { status: 'PAUSED', count: 2 },
    ])

    const result = await summarize()

    expect(
      result.currencies.find((entry) => entry.currency === 'JMD')?.current
    ).toMatchObject({ active: 3, trialing: 1, paused: 2 })
  })

  it('reports a null churn rate when nothing was active at range start', async () => {
    mocks.currentMrrByCurrency.mockResolvedValue([
      { currency: 'JMD', mrr: '0', arr: '0' },
    ])
    mocks.subscriptionEventRows.mockResolvedValue([
      { event: 'canceled', bucketStart: 1_000, count: 2 },
    ])
    mocks.activeSubscriptionsAt.mockResolvedValue(0)

    const result = await summarize()

    expect(
      result.currencies.find((entry) => entry.currency === 'JMD')?.churnRate
    ).toBeNull()
  })

  it('computes churn as canceled-in-range over active-at-range-start', async () => {
    mocks.currentMrrByCurrency.mockResolvedValue([
      { currency: 'JMD', mrr: '0', arr: '0' },
    ])
    mocks.subscriptionEventRows.mockResolvedValue([
      { event: 'new', bucketStart: 1_000, count: 5 },
      { event: 'canceled', bucketStart: 1_000, count: 1 },
      { event: 'ended', bucketStart: 1_000, count: 1 },
      { event: 'paused', bucketStart: 1_000, count: 1 },
    ])
    mocks.activeSubscriptionsAt.mockResolvedValue(4)

    const result = await summarize()

    const jmd = result.currencies.find((entry) => entry.currency === 'JMD')
    expect(jmd?.churnRate).toBe('0.25')
    expect(jmd?.buckets[0]).toMatchObject({
      new: 5,
      canceled: 1,
      ended: 1,
      paused: 1,
    })
  })

  it('shares the dashboard MRR implementation', async () => {
    const { dashboardOverview } = await import('../reporting.service')
    mocks.currentMrrByCurrency.mockResolvedValue([
      { currency: 'JMD', mrr: '10000', arr: '120000' },
    ])
    mocks.dashboardCounts.mockResolvedValue({
      customerCount: 1,
      productCount: 1,
      draftQuoteCount: 0,
    })
    mocks.invoiceTotalsByCurrency.mockResolvedValue([])
    mocks.monthStartEpoch.mockResolvedValue(1_000)
    mocks.receivablesOverdueByCurrency.mockResolvedValue([])

    await summarize()
    const dashboard = await dashboardOverview('ten_1')

    expect(mocks.currentMrrByCurrency).toHaveBeenCalledWith('ten_1', undefined)
    expect(mocks.currentMrrByCurrency.mock.calls.length).toBeGreaterThanOrEqual(
      2
    )
    expect(dashboard.recurringRevenue).toEqual([
      { currency: 'JMD', mrr: '10000', arr: '120000' },
    ])
  })
})
