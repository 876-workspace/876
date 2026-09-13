import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Prisma } from '@/db'

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn(), findFirst: vi.fn() }))

import { lockQuoteConversion } from './conversion'

const tx = {
  $queryRaw: mocks.queryRaw,
  quote: { findFirst: mocks.findFirst },
} as unknown as Prisma.TransactionClient

function quote(
  overrides: Partial<Awaited<ReturnType<typeof mocks.findFirst>>> = {}
) {
  return {
    id: 'quo_1',
    status: 'ACCEPTED',
    convertedInvoice: null,
    convertedSalesReceipt: null,
    ...overrides,
  }
}

describe('quote conversion lock', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.queryRaw.mockResolvedValue([{ id: 'quo_1' }])
    mocks.findFirst.mockResolvedValue(quote())
  })

  it('rejects a Sales Receipt when the locked quote already has an invoice', async () => {
    mocks.findFirst.mockResolvedValue(
      quote({ convertedInvoice: { id: 'inv_1' } })
    )

    await expect(
      lockQuoteConversion(tx, 'ten_1', 'quo_1', 'sales-receipt')
    ).resolves.toEqual({
      kind: 'conflict',
      message: 'This quote has already been converted to an invoice.',
    })
  })

  it('rejects an invoice when the locked quote already has a Sales Receipt', async () => {
    mocks.findFirst.mockResolvedValue(
      quote({ convertedSalesReceipt: { id: 'sr_1' } })
    )

    await expect(
      lockQuoteConversion(tx, 'ten_1', 'quo_1', 'invoice')
    ).resolves.toEqual({
      kind: 'conflict',
      message: 'This quote has already been converted to a Sales Receipt.',
    })
  })

  it('issues the row lock before checking either conversion relation', async () => {
    await lockQuoteConversion(tx, 'ten_1', 'quo_1', 'invoice')

    expect(mocks.queryRaw).toHaveBeenCalledTimes(1)
    expect(mocks.findFirst).toHaveBeenCalledTimes(1)
    expect(mocks.queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.findFirst.mock.invocationCallOrder[0]!
    )
    expect(String(mocks.queryRaw.mock.calls[0])).toContain('FOR UPDATE')
  })

  it('uses the provided transaction client for the conversion relation check', async () => {
    await lockQuoteConversion(tx, 'ten_1', 'quo_1', 'sales-receipt')

    expect(mocks.findFirst).toHaveBeenCalledWith({
      where: { id: 'quo_1', tenantId: 'ten_1' },
      select: {
        id: true,
        status: true,
        convertedInvoice: { select: { id: true } },
        convertedSalesReceipt: { select: { id: true } },
        convertedSalesOrder: { select: { id: true } },
      },
    })
  })

  it('replays a same-kind invoice conversion without allowing a second write', async () => {
    mocks.findFirst.mockResolvedValue(
      quote({ convertedInvoice: { id: 'inv_1' } })
    )

    await expect(
      lockQuoteConversion(tx, 'ten_1', 'quo_1', 'invoice')
    ).resolves.toEqual({
      kind: 'replayed',
      resourceId: 'inv_1',
    })
  })

  it('returns not found when the row lock cannot find the tenant quote', async () => {
    mocks.queryRaw.mockResolvedValue([])

    await expect(
      lockQuoteConversion(tx, 'ten_1', 'quo_1', 'invoice')
    ).resolves.toEqual({
      kind: 'not_found',
    })
    expect(mocks.findFirst).toHaveBeenCalledTimes(0)
  })
})
