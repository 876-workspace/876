import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Warehouse } from '@/lib/db'

type MockPrismaClient = {
  warehouse: {
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

function createWarehouse(overrides: Partial<Warehouse> = {}): Warehouse {
  return {
    id: 'wh_rocketship_miami',
    tenantId: 'ten_rocketship',
    name: 'Miami Receiving Hub',
    street1: '8760 NW 25th Street',
    street2: 'Suite RSJ',
    city: 'Doral',
    state: 'FL',
    country: 'US',
    postalCode: '33172',
    isPrimary: true,
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

describe('warehouses.list', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPrismaRef.current = {
      warehouse: { findMany: vi.fn().mockResolvedValue([]) },
    }
  })

  it('scopes warehouses to the tenant with primary-first stable ordering', async () => {
    const warehouses = [
      createWarehouse(),
      createWarehouse({
        id: 'wh_rocketship_amazon',
        name: 'Amazon Receiving Hub',
        isPrimary: false,
      }),
    ]
    const findMany = mockPrismaRef.current!.warehouse.findMany
    findMany.mockResolvedValue(warehouses)

    const result = await list({ tenantId: 'ten_rocketship' })

    expect(result).toEqual(warehouses)
    expect(findMany).toHaveBeenCalledTimes(1)
    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_rocketship' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
    })
  })
})
