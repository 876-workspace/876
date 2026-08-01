import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Prisma } from '@/lib/db/generated/prisma/client'
import type { BranchCreateParams, BranchView } from '@/types/branch'

type MockTx = {
  branch: {
    count: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  address: { create: ReturnType<typeof vi.fn> }
}

const {
  MockPrismaClientKnownRequestError,
  mockBuildAddressData,
  mockPrismaRef,
  mockReportServiceFailure,
  mockScheduleSync,
  mockTxRef,
} = vi.hoisted(() => {
  class MockPrismaClientKnownRequestError extends Error {
    readonly code: string

    constructor(message: string, options: { code: string }) {
      super(message)
      this.code = options.code
    }
  }

  return {
    MockPrismaClientKnownRequestError,
    mockBuildAddressData: vi.fn(),
    mockPrismaRef: {
      current: null as { $transaction: ReturnType<typeof vi.fn> } | null,
    },
    mockReportServiceFailure: vi.fn(),
    mockScheduleSync: vi.fn(),
    mockTxRef: { current: null as MockTx | null },
  }
})

vi.mock('@/lib/db/generated/prisma/client', () => ({
  Prisma: { PrismaClientKnownRequestError: MockPrismaClientKnownRequestError },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

vi.mock('../addresses/create', () => ({
  buildAddressData: mockBuildAddressData,
}))

vi.mock('../report', () => ({
  reportServiceFailure: mockReportServiceFailure,
}))

vi.mock('../org-locations/sync', () => ({
  scheduleSync: mockScheduleSync,
}))

import { create } from './create'

const TENANT_ID = 'ten_rocketship'
const ORG_ID = 'org_rocketship'
const NOW = 1_785_427_200

function params(
  overrides: Partial<BranchCreateParams> = {}
): BranchCreateParams {
  return {
    name: 'Kingston branch',
    phone: '+18765550123',
    isDefault: false,
    isActive: true,
    settings: { deliveryWindow: 'weekday' },
    address: {
      name: 'Kingston branch',
      line1: '12 Hope Road',
      line2: 'Suite 3',
      city: 'Kingston',
      countryCode: 'JM',
      regionCode: 'JM-02',
      postalCode: 'JMAKN05',
    },
    ...overrides,
  }
}

function addressData() {
  return {
    tenantId: TENANT_ID,
    name: 'Kingston branch',
    line1: '12 Hope Road',
    line2: 'Suite 3',
    city: 'Kingston',
    countryCode: 'JM',
    regionCode: 'JM-02',
    regionName: 'Saint Andrew',
    postalCode: 'JMAKN05',
    latitude: null,
    longitude: null,
    isActive: true,
    createdAt: NOW,
    updatedAt: NOW,
  }
}

function branchView(overrides: Partial<BranchView> = {}): BranchView {
  return {
    id: 'br_kingston',
    tenantId: TENANT_ID,
    addressId: 'adr_kingston',
    orgLocationId: null,
    name: 'Kingston branch',
    phone: '+18765550123',
    isDefault: true,
    isActive: true,
    settings: { deliveryWindow: 'weekday' },
    address: { id: 'adr_kingston', ...addressData() },
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  }
}

function prismaError(code: 'P2002' | 'P2024') {
  return new Prisma.PrismaClientKnownRequestError('Prisma request failed.', {
    code,
    clientVersion: 'test',
  })
}

describe('branches.create', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW * 1_000))

    mockBuildAddressData.mockResolvedValue({ ok: true, data: addressData() })
    mockTxRef.current = {
      branch: {
        count: vi.fn().mockResolvedValue(0),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue(branchView()),
      },
      address: { create: vi.fn().mockResolvedValue({ id: 'adr_kingston' }) },
    }
    mockPrismaRef.current = {
      $transaction: vi.fn(async (run) => run(mockTxRef.current!)),
    }
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('creates the branch and address in one transaction', async () => {
    const input = params()

    const result = await create(TENANT_ID, ORG_ID, input)

    expect(result).toEqual({ data: branchView(), error: null })
    expect(mockBuildAddressData).toHaveBeenCalledTimes(1)
    expect(mockBuildAddressData).toHaveBeenCalledWith(TENANT_ID, {
      ...input.address,
      name: 'Kingston branch',
    })
    expect(mockPrismaRef.current!.$transaction).toHaveBeenCalledTimes(1)
    expect(mockTxRef.current!.address.create).toHaveBeenCalledTimes(1)
    expect(mockTxRef.current!.address.create).toHaveBeenCalledWith({
      data: addressData(),
    })
    expect(mockTxRef.current!.branch.create).toHaveBeenCalledTimes(1)
    expect(mockTxRef.current!.branch.create).toHaveBeenCalledWith({
      data: {
        tenantId: TENANT_ID,
        addressId: 'adr_kingston',
        name: 'Kingston branch',
        phone: '+18765550123',
        isDefault: true,
        isActive: true,
        settings: { deliveryWindow: 'weekday' },
        createdAt: NOW,
        updatedAt: NOW,
      },
      include: { address: true },
    })
    expect(mockReportServiceFailure).not.toHaveBeenCalled()
  })

  it('forces the first branch to default when the caller requests false', async () => {
    const result = await create(TENANT_ID, ORG_ID, params({ isDefault: false }))

    expect(result).toEqual({ data: branchView(), error: null })
    expect(mockTxRef.current!.branch.create).toHaveBeenCalledTimes(1)
    expect(mockTxRef.current!.branch.create).toHaveBeenCalledWith({
      data: {
        tenantId: TENANT_ID,
        addressId: 'adr_kingston',
        name: 'Kingston branch',
        phone: '+18765550123',
        isDefault: true,
        isActive: true,
        settings: { deliveryWindow: 'weekday' },
        createdAt: NOW,
        updatedAt: NOW,
      },
      include: { address: true },
    })
    expect(mockTxRef.current!.branch.updateMany).not.toHaveBeenCalled()
  })

  it('demotes the previous default when a later branch is requested as default', async () => {
    mockTxRef.current!.branch.count.mockResolvedValue(1)

    const result = await create(TENANT_ID, ORG_ID, params({ isDefault: true }))

    expect(result).toEqual({ data: branchView(), error: null })
    expect(mockTxRef.current!.branch.updateMany).toHaveBeenCalledTimes(1)
    expect(mockTxRef.current!.branch.updateMany).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID, isDefault: true },
      data: { isDefault: false, updatedAt: NOW },
    })
  })

  it('returns the existing conflict and does not report a duplicate name', async () => {
    const error = prismaError('P2002')
    mockPrismaRef.current!.$transaction.mockRejectedValue(error)

    const result = await create(TENANT_ID, ORG_ID, params())

    expect(result).toEqual({
      data: null,
      error: 'A branch with that name already exists.',
      status: 409,
    })
    expect(mockPrismaRef.current!.$transaction).toHaveBeenCalledTimes(1)
    expect(mockReportServiceFailure).not.toHaveBeenCalled()
  })

  it('returns database unavailable and reports once after two P2024 failures', async () => {
    const error = prismaError('P2024')
    mockPrismaRef.current!.$transaction.mockRejectedValue(error)

    const result = await create(TENANT_ID, ORG_ID, params())

    expect(result).toEqual({
      data: null,
      error: 'The database is waking up. Please try again in a moment.',
      status: 503,
      code: 'error/database-unavailable',
    })
    expect(mockPrismaRef.current!.$transaction).toHaveBeenCalledTimes(2)
    expect(mockReportServiceFailure).toHaveBeenCalledTimes(1)
    expect(mockReportServiceFailure).toHaveBeenCalledWith(error, {
      operation: 'branches.create',
      consequence:
        'The branch was not created and the form asks the user to try again shortly.',
    })
  })

  it('returns a geography failure without opening a transaction', async () => {
    const geographyFailure = {
      data: null,
      error: 'The selected region is not available for this country.',
      status: 404,
      code: 'address/unknown-region',
    }
    mockBuildAddressData.mockResolvedValue({
      ok: false,
      result: geographyFailure,
    })

    const result = await create(TENANT_ID, ORG_ID, params())

    expect(result).toEqual(geographyFailure)
    expect(mockPrismaRef.current!.$transaction).not.toHaveBeenCalled()
    expect(mockTxRef.current!.address.create).not.toHaveBeenCalled()
    expect(mockTxRef.current!.branch.create).not.toHaveBeenCalled()
    expect(mockReportServiceFailure).not.toHaveBeenCalled()
  })
})
