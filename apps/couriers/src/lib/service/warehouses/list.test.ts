import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Address, Warehouse } from '@/lib/db'

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

function createAddress(overrides: Partial<Address> = {}): Address {
  return {
    id: 'adr_rocketship_miami',
    tenantId: 'ten_rocketship',
    name: 'Miami Receiving Hub',
    line1: '8760 NW 25th Street',
    line2: 'Suite RSJ',
    city: 'Doral',
    regionCode: 'US-FL',
    regionName: 'Florida',
    countryCode: 'US',
    postalCode: '33172',
    latitude: null,
    longitude: null,
    isActive: true,
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    ...overrides,
  }
}

function createWarehouse(
  overrides: Partial<Warehouse & { address: Address }> = {}
): Warehouse & { address: Address } {
  return {
    id: 'wh_rocketship_miami',
    tenantId: 'ten_rocketship',
    addressId: 'adr_rocketship_miami',
    orgLocationId: null,
    name: 'Miami Receiving Hub',
    isPrimary: true,
    createdAt: 1_784_419_200,
    updatedAt: 1_784_419_200,
    address: createAddress(),
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

    expect(findMany).toHaveBeenCalledTimes(1)
    expect(findMany).toHaveBeenCalledWith({
      where: { tenantId: 'ten_rocketship' },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
      include: { address: true },
    })
    expect(result).toHaveLength(2)
    expect(result[0]!.name).toBe('Miami Receiving Hub')
  })

  it('returns the address nested on each warehouse', async () => {
    mockPrismaRef.current!.warehouse.findMany.mockResolvedValue([
      createWarehouse(),
    ])

    const [warehouse] = await list({ tenantId: 'ten_rocketship' })

    expect(warehouse!.address.line1).toBe('8760 NW 25th Street')
    expect(warehouse!.address.regionName).toBe('Florida')
    expect(warehouse!.addressId).toBe('adr_rocketship_miami')
  })

  it('fetches addresses in the same query rather than one per warehouse', async () => {
    mockPrismaRef.current!.warehouse.findMany.mockResolvedValue([
      createWarehouse(),
      createWarehouse({ id: 'wh_two', name: 'Second' }),
      createWarehouse({ id: 'wh_three', name: 'Third' }),
    ])

    await list({ tenantId: 'ten_rocketship' })

    expect(mockPrismaRef.current!.warehouse.findMany).toHaveBeenCalledTimes(1)
  })
})
