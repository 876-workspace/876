import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type Tx = {
  branch: { findFirst: ReturnType<typeof vi.fn> }
  courierCustomerProfile: { create: ReturnType<typeof vi.fn> }
}

const { mockPrismaRef, mockTxRef, mockReportServiceFailure } = vi.hoisted(
  () => ({
    mockPrismaRef: {
      current: null as { $transaction: ReturnType<typeof vi.fn> } | null,
    },
    mockTxRef: { current: null as Tx | null },
    mockReportServiceFailure: vi.fn(),
  })
)

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))
vi.mock('../report', () => ({ reportServiceFailure: mockReportServiceFailure }))

import { create } from './create'

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
function params(overrides: Partial<Parameters<typeof create>[1]> = {}) {
  return {
    id: 'cprof_nkr',
    billingCustomerId: 'cus_nkr',
    userId: null,
    mailboxNumber: 'KNG-1042',
    ...overrides,
  }
}

describe('customerProfiles.create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW * 1000))
    mockTxRef.current = {
      branch: { findFirst: vi.fn().mockResolvedValue({ id: 'br_kingston' }) },
      courierCustomerProfile: { create: vi.fn().mockResolvedValue(profile()) },
    }
    mockPrismaRef.current = {
      $transaction: vi.fn(async (run) => run(mockTxRef.current!)),
    }
  })
  afterEach(() => vi.useRealTimers())

  it('creates the profile and its primary mailbox in one transaction with the supplied branch', async () => {
    const result = await create(
      'ten_nkr',
      params({
        branchId: 'br_montego',
        trn: '123-456-789',
        isCommercial: true,
        status: 'SUSPENDED',
      })
    )
    expect(result).toEqual({ data: profile(), error: null })
    expect(mockPrismaRef.current!.$transaction).toHaveBeenCalledTimes(1)
    expect(mockTxRef.current!.branch.findFirst).not.toHaveBeenCalled()
    expect(
      mockTxRef.current!.courierCustomerProfile.create
    ).toHaveBeenCalledWith({
      data: {
        id: 'cprof_nkr',
        tenantId: 'ten_nkr',
        userId: null,
        billingCustomerId: 'cus_nkr',
        branchId: 'br_montego',
        status: 'SUSPENDED',
        trn: '123-456-789',
        isCommercial: true,
        firstSeenAt: NOW,
        createdAt: NOW,
        updatedAt: NOW,
        mailboxes: {
          create: {
            tenantId: 'ten_nkr',
            number: 'KNG-1042',
            isPrimary: true,
            createdAt: NOW,
            updatedAt: NOW,
          },
        },
      },
    })
  })

  it('falls back to the tenant default branch when no branch is supplied', async () => {
    const result = await create('ten_nkr', params())
    expect(result).toEqual({ data: profile(), error: null })
    expect(mockTxRef.current!.branch.findFirst).toHaveBeenCalledTimes(1)
    expect(mockTxRef.current!.branch.findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_nkr', isDefault: true },
      select: { id: true },
    })
    expect(
      mockTxRef.current!.courierCustomerProfile.create
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          branchId: 'br_kingston',
          userId: null,
        }),
      })
    )
  })

  it('returns conflict without reporting a unique constraint failure as an outage', async () => {
    mockPrismaRef.current!.$transaction.mockRejectedValue({ code: 'P2002' })
    const result = await create('ten_nkr', params())
    expect(result).toEqual({
      data: null,
      error: 'A customer with these details already exists.',
      status: 409,
    })
    expect(mockReportServiceFailure).not.toHaveBeenCalled()
  })

  it('reports a cold-start database failure once', async () => {
    const error = Object.assign(new Error('connection timeout'), {
      code: 'P2024',
    })
    mockPrismaRef.current!.$transaction.mockRejectedValue(error)
    const result = await create('ten_nkr', params())
    expect(result).toEqual({
      data: null,
      error: 'The database is waking up. Please try again in a moment.',
      status: 503,
      code: 'error/database-unavailable',
    })
    expect(mockReportServiceFailure).toHaveBeenCalledTimes(1)
    expect(mockReportServiceFailure).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ operation: 'customerProfiles.create' })
    )
  })

  it('reports an unexpected failure once and returns 500', async () => {
    const error = new Error('Accelerate refused the write')
    mockPrismaRef.current!.$transaction.mockRejectedValue(error)
    const result = await create('ten_nkr', params())
    expect(result).toEqual({
      data: null,
      error: 'Failed to create customer.',
      status: 500,
    })
    expect(mockReportServiceFailure).toHaveBeenCalledTimes(1)
    expect(mockReportServiceFailure).toHaveBeenCalledWith(
      error,
      expect.objectContaining({ operation: 'customerProfiles.create' })
    )
  })
})
