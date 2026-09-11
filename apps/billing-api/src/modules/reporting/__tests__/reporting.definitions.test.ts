import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: { $queryRaw: mocks.queryRaw },
}))

import {
  creditNoteRows,
  invoiceSalesRows,
  receivablesAgingRows,
  salesReceiptRows,
} from '../reporting.repository'

function sqlText(argument: unknown): string {
  if (typeof argument === 'string') return argument
  if (argument !== null && typeof argument === 'object') {
    const record = argument as Record<string, unknown>
    if (typeof record.sql === 'string') return record.sql
    if (Array.isArray(record.strings))
      return (record.strings as Array<unknown>)
        .map((part) => (typeof part === 'string' ? part : ''))
        .join(' ')
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

describe('reporting sales definitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryRaw.mockResolvedValue([])
  })

  it('excludes void invoices from sales', async () => {
    await invoiceSalesRows('ten_1', FILTER, 'day', 'America/Jamaica')

    const { text } = lastQuery()
    expect(text).toContain('billing_invoices')
    expect(text).not.toContain("'VOID'")
  })

  it('excludes draft invoices while keeping uncollectible sales', async () => {
    await invoiceSalesRows('ten_1', FILTER, 'day', 'America/Jamaica')

    const { text } = lastQuery()
    expect(text).not.toContain("'DRAFT'")
    expect(text).toContain("'UNCOLLECTIBLE'")
    for (const status of ['OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE', 'PAID'])
      expect(text).toContain(`'${status}'`)
  })

  it('excludes opening-balance invoices from sales', async () => {
    await invoiceSalesRows('ten_1', FILTER, 'day', 'America/Jamaica')

    expect(lastQuery().text).toContain("'OPENING_BALANCE'")
  })

  it('includes paid sales receipts while excluding void ones', async () => {
    await salesReceiptRows('ten_1', FILTER, 'day', 'America/Jamaica')

    const { text } = lastQuery()
    expect(text).toContain("status = 'PAID'")
    expect(text).not.toContain("'VOID'")
  })

  it('counts issued credit notes while excluding drafts and voids', async () => {
    await creditNoteRows('ten_1', FILTER, 'day', 'America/Jamaica')

    const { text } = lastQuery()
    expect(text).toContain("'OPEN'")
    expect(text).toContain("'CLOSED'")
    expect(text).not.toContain("'DRAFT'")
    expect(text).not.toContain("'VOID'")
  })

  it('scopes every sales fact to its tenant', async () => {
    await invoiceSalesRows('ten_1', FILTER, 'day', 'America/Jamaica')
    expect(lastQuery().values).toContain('ten_1')

    await salesReceiptRows('ten_1', FILTER, 'day', 'America/Jamaica')
    expect(lastQuery().values).toContain('ten_1')

    await creditNoteRows('ten_1', FILTER, 'day', 'America/Jamaica')
    expect(lastQuery().values).toContain('ten_1')

    await receivablesAgingRows('ten_1', 2_000)
    expect(lastQuery().values).toContain('ten_1')
  })

  it('buckets facts in the tenant timezone', async () => {
    await invoiceSalesRows('ten_1', FILTER, 'month', 'America/Jamaica')

    const { text, values } = lastQuery()
    expect(text).toContain('AT TIME ZONE')
    expect(text).toContain('date_trunc')
    expect(values).toContain('America/Jamaica')
  })

  it('starts weeks on Monday through date_trunc week', async () => {
    // Postgres date_trunc('week') starts Monday; the unit travels as a bound
    // value while the truncation call stays in the SQL text.
    await invoiceSalesRows('ten_1', FILTER, 'week', 'America/Jamaica')

    const { text, values } = lastQuery()
    expect(text).toContain('date_trunc')
    expect(values).toContain('week')
  })

  it('applies the customer filter only when provided', async () => {
    await invoiceSalesRows(
      'ten_1',
      { ...FILTER, customerId: 'cus_1' },
      'day',
      'America/Jamaica'
    )
    expect(lastQuery().values).toContain('cus_1')

    await invoiceSalesRows('ten_1', FILTER, 'day', 'America/Jamaica')
    expect(lastQuery().values).not.toContain('cus_1')
  })

  it('applies the item filter through a line existence check', async () => {
    await invoiceSalesRows(
      'ten_1',
      { ...FILTER, itemId: 'item_1' },
      'day',
      'America/Jamaica'
    )

    const { text, values } = lastQuery()
    expect(text).toContain('billing_invoice_lines')
    expect(values).toContain('item_1')

    await invoiceSalesRows('ten_1', FILTER, 'day', 'America/Jamaica')
    expect(lastQuery().text).not.toContain('billing_invoice_lines')
  })

  it('keeps sales-receipt and credit-note date filters on their own instants', async () => {
    await salesReceiptRows('ten_1', FILTER, 'day', 'America/Jamaica')
    expect(lastQuery().text).toContain('receipt_at')

    await creditNoteRows('ten_1', FILTER, 'day', 'America/Jamaica')
    expect(lastQuery().text).toContain('issue_at')
  })

  it('restricts aging to collectible balances', async () => {
    await receivablesAgingRows('ten_1', 2_000)

    const { text } = lastQuery()
    expect(text).toContain('amount_due > 0')
    for (const status of ['OPEN', 'SENT', 'PARTIALLY_PAID', 'OVERDUE'])
      expect(text).toContain(`'${status}'`)
    expect(text).not.toContain("'PAID'")
    expect(text).not.toContain("'UNCOLLECTIBLE'")
  })

  it('returns money as strings grouped per currency', async () => {
    mocks.queryRaw.mockResolvedValue([
      {
        bucketStart: 1_000,
        currency: 'jmd',
        billingReason: 'MANUAL',
        count: 2,
        netAmount: 12_000n,
        taxAmount: 1_800n,
        totalAmount: 13_800n,
      },
    ])

    const rows = await invoiceSalesRows('ten_1', FILTER, 'day', 'America/Jamaica')

    expect(rows).toEqual([
      {
        bucketStart: 1_000,
        currency: 'JMD',
        billingReason: 'MANUAL',
        count: 2,
        netAmount: '12000',
        taxAmount: '1800',
        totalAmount: '13800',
      },
    ])
  })

  it('normalizes numeric driver values into money strings', async () => {
    mocks.queryRaw.mockResolvedValue([
      {
        bucketStart: '1000',
        currency: 'JMD',
        billingReason: 'MANUAL',
        count: '3',
        netAmount: '12000.00',
        taxAmount: 1_800,
        totalAmount: null,
      },
    ])

    const rows = await invoiceSalesRows('ten_1', FILTER, 'day', 'America/Jamaica')

    expect(rows[0]).toMatchObject({
      bucketStart: 1_000,
      count: 3,
      netAmount: '12000',
      taxAmount: '1800',
      totalAmount: '0',
    })
  })
})
