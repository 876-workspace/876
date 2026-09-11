import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: { $queryRaw: mocks.queryRaw },
}))

import { itemBucketRows, itemSalesRows } from '../reporting.repository'

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

describe('item sales definitions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryRaw.mockResolvedValue([])
  })

  it('returns stock through credit-note lines while selling through invoices and receipts', async () => {
    await itemSalesRows('ten_1', FILTER, 25)

    const { text } = lastQuery()
    expect(text).toContain('billing_invoice_lines')
    expect(text).toContain('billing_sales_receipt_lines')
    expect(text).toContain('billing_credit_note_lines')
    expect(text).toContain("'sale' AS kind")
    expect(text).toContain("'return' AS kind")
  })

  it('keeps variants separated in the grouping', async () => {
    await itemSalesRows('ten_1', FILTER, 25)

    expect(lastQuery().text).toContain('legs.variant_id')
  })

  it('bounds the top-N result with the requested limit', async () => {
    await itemSalesRows('ten_1', FILTER, 10)

    const { text, values } = lastQuery()
    expect(text).toContain('LIMIT')
    expect(values).toContain(10)
  })

  it('counts one document once even when it carries several lines', async () => {
    await itemSalesRows('ten_1', FILTER, 25)

    expect(lastQuery().text).toContain('COUNT(DISTINCT')
  })

  it('merges sold and returned quantities per item variant and currency', async () => {
    mocks.queryRaw.mockResolvedValue([
      {
        itemId: 'item_1',
        variantId: 'var_1',
        currency: 'JMD',
        quantitySold: 5n,
        quantityReturned: 2n,
        netAmount: 3_000n,
        documentCount: 2,
      },
      {
        itemId: 'item_1',
        variantId: null,
        currency: 'JMD',
        quantitySold: 1n,
        quantityReturned: 0n,
        netAmount: 1_000n,
        documentCount: 1,
      },
    ])

    const rows = await itemSalesRows('ten_1', FILTER, 25)

    expect(rows).toEqual([
      {
        itemId: 'item_1',
        variantId: 'var_1',
        currency: 'JMD',
        quantitySold: 5,
        quantityReturned: 2,
        netAmount: '3000',
        documentCount: 2,
      },
      {
        itemId: 'item_1',
        variantId: null,
        currency: 'JMD',
        quantitySold: 1,
        quantityReturned: 0,
        netAmount: '1000',
        documentCount: 1,
      },
    ])
  })

  it('buckets one item per currency for the item detail view', async () => {
    await itemBucketRows('ten_1', 'item_1', FILTER, 'month', 'America/Jamaica')

    const { text, values } = lastQuery()
    expect(text).toContain('legs.currency')
    expect(values).toContain('item_1')
    expect(values).toContain('America/Jamaica')
  })
})
