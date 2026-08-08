import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: {
    current: null as {
      courierCustomerProfile: {
        findFirst: ReturnType<typeof vi.fn>
        update: ReturnType<typeof vi.fn>
      }
    } | null,
  },
}))
vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))
import { update } from './update'

const NOW = 1_785_427_200
function profile(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cprof_nkr',
    tenantId: 'ten_nkr',
    userId: null,
    billingCustomerId: 'cus_nkr',
    branchId: 'br_kingston',
    status: 'ACTIVE',
    trn: null,
    isCommercial: false,
    firstSeenAt: NOW,
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}
describe('customerProfiles.update', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW * 1000))
    mockPrismaRef.current = {
      courierCustomerProfile: {
        findFirst: vi.fn().mockResolvedValue(profile()),
        update: vi.fn().mockResolvedValue(
          profile({
            branchId: 'br_mobay',
            trn: '123-456-789',
            isCommercial: true,
            updatedAt: NOW,
          })
        ),
      },
    }
  })
  afterEach(() => vi.useRealTimers())
  it('scopes the current profile lookup to its tenant and excludes soft-deleted profiles', async () => {
    const result = await update('ten_nkr', 'cprof_nkr', {
      branchId: 'br_mobay',
      trn: '123-456-789',
      isCommercial: true,
    })
    expect(result).toEqual({
      data: profile({
        branchId: 'br_mobay',
        trn: '123-456-789',
        isCommercial: true,
      }),
      error: null,
    })
    expect(
      mockPrismaRef.current!.courierCustomerProfile.findFirst
    ).toHaveBeenCalledTimes(1)
    expect(
      mockPrismaRef.current!.courierCustomerProfile.findFirst
    ).toHaveBeenCalledWith({
      where: { id: 'cprof_nkr', tenantId: 'ten_nkr', deletedAt: null },
    })
  })
  it('does not update a soft-deleted or another-tenant profile', async () => {
    mockPrismaRef.current!.courierCustomerProfile.findFirst.mockResolvedValue(
      null
    )
    const result = await update('ten_nkr', 'cprof_other', {
      status: 'SUSPENDED',
    })
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
    })
    expect(
      mockPrismaRef.current!.courierCustomerProfile.update
    ).not.toHaveBeenCalled()
  })
  it('writes only supplied courier-owned fields without undefined clears', async () => {
    const result = await update('ten_nkr', 'cprof_nkr', { trn: '123-456-789' })
    expect(result.data).toEqual(
      profile({ branchId: 'br_mobay', trn: '123-456-789', isCommercial: true })
    )
    expect(result.error).toBeNull()
    expect(
      mockPrismaRef.current!.courierCustomerProfile.update
    ).toHaveBeenCalledTimes(1)
    expect(
      mockPrismaRef.current!.courierCustomerProfile.update
    ).toHaveBeenCalledWith({
      where: { id: 'cprof_nkr' },
      data: { trn: '123-456-789', updatedAt: NOW },
    })
  })
})
