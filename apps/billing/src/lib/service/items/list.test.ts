import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockPrismaRef = vi.hoisted(() => ({
  current: null as unknown as Record<string, unknown>,
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

import { list } from './list'

describe('items.list', () => {
  beforeEach(() => {
    mockPrismaRef.current = {
      item: { findMany: vi.fn().mockResolvedValue([]) },
    }
    vi.clearAllMocks()
  })

  it('filters items by source app when provided', async () => {
    const item = (
      mockPrismaRef.current as unknown as {
        item: { findMany: ReturnType<typeof vi.fn> }
      }
    ).item

    const result = await list('ten_123', undefined, 'app_123')

    expect(result).toEqual([])
    expect(item.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_123', sourceAppId: 'app_123' },
      include: { prices: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
  })

  it('does not filter items by source app when absent', async () => {
    const item = (
      mockPrismaRef.current as unknown as {
        item: { findMany: ReturnType<typeof vi.fn> }
      }
    ).item

    const result = await list('ten_123')

    expect(result).toEqual([])
    expect(item.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_123' },
      include: { prices: { orderBy: { createdAt: 'asc' } } },
      orderBy: { createdAt: 'desc' },
    })
  })
})
