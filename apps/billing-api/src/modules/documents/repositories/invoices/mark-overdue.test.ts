import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ updateMany: vi.fn() }))

vi.mock('@/db/client', () => ({
  prisma: { invoice: { updateMany: mocks.updateMany } },
}))

import { markOverdue, markOverdueAcrossActiveTenants } from './mark-overdue'

describe('markOverdue', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.updateMany.mockResolvedValue({ count: 1 })
  })

  it('only flips collectible invoices with an outstanding balance', async () => {
    await markOverdue('ten_1', 1_700_000_000)

    expect(mocks.updateMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_1',
        dueAt: { lt: 1_700_000_000 },
        amountDue: { gt: 0n },
        status: { in: ['OPEN', 'SENT', 'PARTIALLY_PAID'] },
      },
      data: { status: 'OVERDUE', updatedAt: 1_700_000_000 },
    })
  })

  it('excludes inactive and soft-deleted tenants from the cross-tenant sweep', async () => {
    await markOverdueAcrossActiveTenants(1_700_000_000)

    expect(mocks.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenant: { status: 'ACTIVE', deletedAt: null },
        }),
      })
    )
  })
})
