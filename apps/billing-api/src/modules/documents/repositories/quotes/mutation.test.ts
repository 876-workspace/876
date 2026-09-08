import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findFirst: vi.fn(),
  updateMany: vi.fn(),
  deleteMany: vi.fn(),
}))
vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => 100 }))
vi.mock('@/db/client', () => ({ prisma: { quote: mocks } }))

import { update } from './update'
import { deleteQuote } from './delete'

describe('quote mutation guards', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    mocks.findFirst.mockResolvedValue({ id: 'quo_1', status: 'DRAFT' })
  })

  it.each(['update', 'delete'] as const)(
    'guards %s at the write even after an earlier draft read',
    async (action) => {
      const write = action === 'update' ? mocks.updateMany : mocks.deleteMany
      write.mockResolvedValue({ count: 0 })
      const result =
        action === 'update'
          ? await update('ten_1', 'quo_1', { notes: 'Changed' })
          : await deleteQuote('ten_1', 'quo_1')
      expect(result).toMatchObject({
        data: null,
        status: 409,
        code: 'billing/quote-invalid-state',
      })
      expect(write).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'quo_1',
            tenantId: 'ten_1',
            status: 'DRAFT',
            OR: [{ expiresAt: null }, { expiresAt: { gt: 100 } }],
          },
        })
      )
    }
  )
})
