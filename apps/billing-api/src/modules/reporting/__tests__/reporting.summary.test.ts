import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isAppHttpError } from '@/http/errors'

const mocks = vi.hoisted(() => ({
  bucketSpine: vi.fn(),
  invoiceSalesRows: vi.fn(),
  salesReceiptRows: vi.fn(),
  creditNoteRows: vi.fn(),
  paymentCashRows: vi.fn(),
  refundRows: vi.fn(),
  retrieveReportPreferences: vi.fn(),
}))

vi.mock('../reporting.repository', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  bucketSpine: mocks.bucketSpine,
  invoiceSalesRows: mocks.invoiceSalesRows,
  salesReceiptRows: mocks.salesReceiptRows,
  creditNoteRows: mocks.creditNoteRows,
  paymentCashRows: mocks.paymentCashRows,
  refundRows: mocks.refundRows,
}))
vi.mock('../report-preferences.repository', () => ({
  retrieveReportPreferences: mocks.retrieveReportPreferences,
}))

import { cashSummary, salesSummary } from '../reporting.service'

async function validationError(
  promise: Promise<unknown>
): Promise<{ code: string; httpStatus: number }> {
  try {
    await promise
  } catch (error) {
    if (isAppHttpError(error))
      return { code: error.code, httpStatus: error.httpStatus }
    throw error
  }
  throw new Error('Expected a validation error.')
}

const PREFS = { object: 'report_preferences' as const, timezone: 'America/Jamaica', fiscalYearStartMonth: 1 }
const SPINE = [
  { start: 1_000, end: 1_001 },
  { start: 1_001, end: 1_002 },
]

function invoiceRow(overrides: Record<string, unknown> = {}) {
  return {
    bucketStart: 1_000,
    currency: 'JMD',
    billingReason: 'MANUAL',
    count: 1,
    netAmount: '10000',
    taxAmount: '1500',
    totalAmount: '11500',
    ...overrides,
  }
}

describe('sales summary composition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveReportPreferences.mockResolvedValue(PREFS)
    mocks.bucketSpine.mockResolvedValue(SPINE)
    mocks.invoiceSalesRows.mockResolvedValue([])
    mocks.salesReceiptRows.mockResolvedValue([])
    mocks.creditNoteRows.mockResolvedValue([])
  })

  it('subtracts credit notes from gross sales for net sales', async () => {
    mocks.invoiceSalesRows.mockResolvedValue([invoiceRow()])
    mocks.salesReceiptRows.mockResolvedValue([
      {
        bucketStart: 1_000,
        currency: 'JMD',
        count: 1,
        netAmount: '5000',
        taxAmount: '750',
        totalAmount: '5750',
      },
    ])
    mocks.creditNoteRows.mockResolvedValue([
      {
        bucketStart: 1_000,
        currency: 'JMD',
        count: 1,
        netAmount: '2000',
        taxAmount: '300',
        totalAmount: '2300',
      },
    ])

    const result = await salesSummary('ten_1', {
      from: 1_000,
      to: 1_002,
      groupBy: 'day',
    })

    const jmd = result.currencies.find((entry) => entry.currency === 'JMD')
    expect(jmd?.totals.netSales).toEqual({
      netAmount: '13000',
      taxAmount: '1950',
      totalAmount: '14950',
    })
    expect(result.object).toBe('sales-summary')
    expect(result.timezone).toBe('America/Jamaica')
    expect(result.fiscalYearStartMonth).toBe(1)
  })

  it('never merges money across currencies', async () => {
    mocks.invoiceSalesRows.mockResolvedValue([
      invoiceRow({ currency: 'JMD' }),
      invoiceRow({ currency: 'USD', netAmount: '7000', taxAmount: '0', totalAmount: '7000' }),
    ])

    const result = await salesSummary('ten_1', {
      from: 1_000,
      to: 1_002,
      groupBy: 'day',
    })

    expect(result.currencies.map((entry) => entry.currency)).toEqual(['JMD', 'USD'])
    expect(
      result.currencies.find((entry) => entry.currency === 'JMD')?.totals
        .netSales.netAmount
    ).toBe('10000')
    expect(
      result.currencies.find((entry) => entry.currency === 'USD')?.totals
        .netSales.netAmount
    ).toBe('7000')
  })

  it('zero-fills buckets without facts', async () => {
    const result = await salesSummary('ten_1', {
      from: 1_000,
      to: 1_002,
      groupBy: 'day',
    })

    expect(result.currencies).toEqual([])
  })

  it('zero-fills empty buckets inside an active currency series', async () => {
    mocks.invoiceSalesRows.mockResolvedValue([invoiceRow({ bucketStart: 1_000 })])

    const result = await salesSummary('ten_1', {
      from: 1_000,
      to: 1_002,
      groupBy: 'day',
    })

    const buckets = result.currencies[0]?.buckets ?? []
    expect(buckets).toHaveLength(2)
    expect(buckets[1]).toMatchObject({
      start: 1_001,
      end: 1_002,
      invoices: { count: 0, netAmount: '0', taxAmount: '0', totalAmount: '0' },
      netSales: { netAmount: '0', taxAmount: '0', totalAmount: '0' },
    })
  })

  it('rejects a range where from is not before to', async () => {
    const result = await validationError(
      salesSummary('ten_1', { from: 2_000, to: 2_000, groupBy: 'day' })
    )

    expect(result.code).toBe('validation/invalid-request')
    expect(result.httpStatus).toBe(422)
    expect(mocks.invoiceSalesRows).not.toHaveBeenCalled()
  })

  it('rejects a range longer than 400 days', async () => {
    const result = await validationError(
      salesSummary('ten_1', {
        from: 0,
        to: 400 * 86400 + 1,
        groupBy: 'day',
      })
    )

    expect(result.code).toBe('validation/invalid-request')
    expect(result.httpStatus).toBe(422)
    expect(mocks.invoiceSalesRows).not.toHaveBeenCalled()
  })
})

describe('cash summary composition', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.retrieveReportPreferences.mockResolvedValue(PREFS)
    mocks.bucketSpine.mockResolvedValue(SPINE)
    mocks.paymentCashRows.mockResolvedValue([])
    mocks.refundRows.mockResolvedValue([])
  })

  it('separates immediate-sale cash from receivables cash', async () => {
    mocks.paymentCashRows.mockResolvedValue([
      {
        bucketStart: 1_000,
        currency: 'JMD',
        isSalesReceiptCash: false,
        count: 2,
        amount: '20000',
      },
      {
        bucketStart: 1_000,
        currency: 'JMD',
        isSalesReceiptCash: true,
        count: 1,
        amount: '5000',
      },
    ])

    const result = await cashSummary('ten_1', {
      from: 1_000,
      to: 1_002,
      groupBy: 'day',
    })

    const jmd = result.currencies.find((entry) => entry.currency === 'JMD')
    expect(jmd?.totals.payments).toEqual({ count: 2, amount: '20000' })
    expect(jmd?.totals.salesReceipts).toEqual({ count: 1, amount: '5000' })
    expect(result.object).toBe('cash-summary')
  })

  it('subtracts refunds from received cash for net cash', async () => {
    mocks.paymentCashRows.mockResolvedValue([
      {
        bucketStart: 1_000,
        currency: 'JMD',
        isSalesReceiptCash: false,
        count: 1,
        amount: '20000',
      },
    ])
    mocks.refundRows.mockResolvedValue([
      { bucketStart: 1_000, currency: 'JMD', count: 1, amount: '3000' },
    ])

    const result = await cashSummary('ten_1', {
      from: 1_000,
      to: 1_002,
      groupBy: 'day',
    })

    expect(
      result.currencies.find((entry) => entry.currency === 'JMD')?.totals
        .netCash
    ).toBe('17000')
  })

  it('rejects an oversized cash range before querying', async () => {
    const result = await validationError(
      cashSummary('ten_1', { from: 5_000, to: 1_000, groupBy: 'day' })
    )

    expect(result.code).toBe('validation/invalid-request')
    expect(mocks.paymentCashRows).not.toHaveBeenCalled()
  })
})
