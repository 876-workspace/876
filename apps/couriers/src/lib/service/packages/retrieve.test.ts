import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalPackage } from '@/types/package'

type MockPrismaClient = {
  package: {
    findFirst: ReturnType<typeof vi.fn>
  }
}

const { mockPrismaRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as MockPrismaClient | null },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

import { retrieve } from './retrieve'

function createPortalPackage(
  overrides: Partial<PortalPackage> = {}
): PortalPackage {
  return {
    id: 'pkg_rocketship_1001',
    tenantId: 'ten_rocketship',
    customerId: 'cprof_kimani',
    branchId: 'br_kingston',
    mailboxId: 'mbx_rsj1001',
    carrierId: 'car_fedex',
    sellerId: null,
    categoryId: null,
    billingInvoiceId: null,
    manifestId: null,
    trackingNum: 'FX876JM1001',
    status: 'ARRIVED',
    packageType: 'CARTON',
    description: 'Running shoes',
    quantity: 1,
    actualWeight: 4.5,
    chargeableWeight: 5,
    length: 14,
    width: 10,
    height: 6,
    dimensionalWeight: 6.04,
    declaredValue: 12_500,
    hsCode: '6404110000',
    countryOfOrigin: 'US',
    hasCustomsDuty: false,
    importDutyAmount: null,
    gctAmount: null,
    customsEntryNumber: null,
    customsClearedAt: null,
    customsHoldReason: null,
    isHazardous: false,
    condition: 'Good condition',
    collectedAt: null,
    collectedById: null,
    createdAt: 1_784_419_200,
    updatedAt: 1_784_505_600,
    carrier: { name: 'FedEx' },
    branch: { name: 'Kingston' },
    mailbox: { number: 'RSJ1001' },
    ...overrides,
  }
}

describe('packages.retrieve', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaRef.current = {
      package: { findFirst: vi.fn().mockResolvedValue(null) },
    }
  })

  it('retrieves a package only within the requested tenant', async () => {
    const packageRecord = createPortalPackage()
    const findFirst = mockPrismaRef.current!.package.findFirst
    findFirst.mockResolvedValue(packageRecord)

    const result = await retrieve({
      tenantId: 'ten_rocketship',
      id: 'pkg_rocketship_1001',
    })

    expect(result).toEqual(packageRecord)
    expect(findFirst).toHaveBeenCalledTimes(1)
    expect(findFirst).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_rocketship',
        id: 'pkg_rocketship_1001',
      },
      include: {
        carrier: { select: { name: true } },
        branch: { select: { name: true } },
        mailbox: { select: { number: true } },
      },
    })
  })

  it('returns null without broadening the tenant-scoped lookup', async () => {
    const findFirst = mockPrismaRef.current!.package.findFirst

    const result = await retrieve({
      tenantId: 'ten_rocketship',
      id: 'pkg_missing',
    })

    expect(result).toBeNull()
    expect(findFirst).toHaveBeenCalledTimes(1)
    expect(findFirst).toHaveBeenCalledWith({
      where: { tenantId: 'ten_rocketship', id: 'pkg_missing' },
      include: {
        carrier: { select: { name: true } },
        branch: { select: { name: true } },
        mailbox: { select: { number: true } },
      },
    })
  })
})
