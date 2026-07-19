import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalPackage } from '@/types/package'

type MockPrismaClient = {
  package: {
    findMany: ReturnType<typeof vi.fn>
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

import { list } from './list'

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
    status: 'IN_TRANSIT',
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

describe('packages.list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaRef.current = {
      package: { findMany: vi.fn().mockResolvedValue([]) },
    }
  })

  it('scopes packages to both tenant and customer with deterministic ordering', async () => {
    const packages = [
      createPortalPackage(),
      createPortalPackage({
        id: 'pkg_rocketship_1000',
        trackingNum: 'FX876JM1000',
      }),
    ]
    const findMany = mockPrismaRef.current!.package.findMany
    findMany.mockResolvedValue(packages)

    const result = await list({
      tenantId: 'ten_rocketship',
      customerId: 'cprof_kimani',
    })

    expect(result).toEqual(packages)
    expect(findMany).toHaveBeenCalledTimes(1)
    expect(findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'ten_rocketship',
        customerId: 'cprof_kimani',
      },
      include: {
        carrier: { select: { name: true } },
        branch: { select: { name: true } },
        mailbox: { select: { number: true } },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    })
  })
})
