import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: {
    current: null as {
      courierCustomerProfile: {
        findFirst: ReturnType<typeof vi.fn>
        update: ReturnType<typeof vi.fn>
        delete: ReturnType<typeof vi.fn>
      }
    } | null,
  },
}))
vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))
import { deleteCustomer } from './delete'

describe('customerProfiles.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(1_785_427_200_000))
    mockPrismaRef.current = {
      courierCustomerProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: 'cprof_nkr' }),
        update: vi.fn().mockResolvedValue({}),
        delete: vi.fn(),
      },
    }
  })
  afterEach(() => vi.useRealTimers())
  it('writes a tombstone and never hard-deletes the tenant customer', async () => {
    const result = await deleteCustomer(
      'ten_nkr',
      'cprof_nkr',
      'usr_ops',
      'Requested account closure'
    )
    expect(result).toEqual({
      data: { id: 'cprof_nkr', deleted: true },
      error: null,
    })
    expect(
      mockPrismaRef.current!.courierCustomerProfile.findFirst
    ).toHaveBeenCalledTimes(1)
    expect(
      mockPrismaRef.current!.courierCustomerProfile.findFirst
    ).toHaveBeenCalledWith({
      where: { id: 'cprof_nkr', tenantId: 'ten_nkr', deletedAt: null },
      select: { id: true },
    })
    expect(
      mockPrismaRef.current!.courierCustomerProfile.update
    ).toHaveBeenCalledTimes(1)
    expect(
      mockPrismaRef.current!.courierCustomerProfile.update
    ).toHaveBeenCalledWith({
      where: { id: 'cprof_nkr' },
      data: {
        deletedAt: 1_785_427_200,
        deletedBy: 'usr_ops',
        deletionReason: 'Requested account closure',
      },
    })
    expect(
      mockPrismaRef.current!.courierCustomerProfile.delete
    ).not.toHaveBeenCalled()
  })
  it('returns customer/not-found when the profile is outside the tenant filter', async () => {
    mockPrismaRef.current!.courierCustomerProfile.findFirst.mockResolvedValue(
      null
    )
    const result = await deleteCustomer('ten_nkr', 'cprof_other', 'usr_ops')
    expect(result).toEqual({
      data: null,
      error: 'The requested customer was not found.',
      status: 404,
      code: 'customer/not-found',
    })
    expect(
      mockPrismaRef.current!.courierCustomerProfile.findFirst
    ).toHaveBeenCalledWith({
      where: { id: 'cprof_other', tenantId: 'ten_nkr', deletedAt: null },
      select: { id: true },
    })
    expect(
      mockPrismaRef.current!.courierCustomerProfile.update
    ).not.toHaveBeenCalled()
    expect(
      mockPrismaRef.current!.courierCustomerProfile.delete
    ).not.toHaveBeenCalled()
  })
})
