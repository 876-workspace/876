import { beforeEach, describe, expect, it, vi } from 'vitest'
const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: {
    current: null as {
      courierCustomerProfile: { findMany: ReturnType<typeof vi.fn> }
    } | null,
  },
}))
vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))
import { list } from './list'
describe('customerProfiles.list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaRef.current = {
      courierCustomerProfile: { findMany: vi.fn().mockResolvedValue([]) },
    }
  })
  it('excludes soft-deleted profiles and applies a supplied status', async () => {
    const result = await list('ten_nkr', 'SUSPENDED')
    expect(result).toEqual([])
    expect(
      mockPrismaRef.current!.courierCustomerProfile.findMany
    ).toHaveBeenCalledTimes(1)
    expect(
      mockPrismaRef.current!.courierCustomerProfile.findMany
    ).toHaveBeenCalledWith({
      where: { tenantId: 'ten_nkr', deletedAt: null, status: 'SUSPENDED' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
  })
  it('omits the status filter when none is supplied', async () => {
    const result = await list('ten_nkr')
    expect(result).toEqual([])
    expect(
      mockPrismaRef.current!.courierCustomerProfile.findMany
    ).toHaveBeenCalledWith({
      where: { tenantId: 'ten_nkr', deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
  })
})
