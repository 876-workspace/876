import { beforeEach, describe, expect, it, vi } from 'vitest'

import { expectErr } from '@/test/service-result'
import type { CustomerAddressCreateParams } from '@/types/customer-address'

type MockTx = {
  courierCustomerProfile: { findFirst: ReturnType<typeof vi.fn> }
  customerAddress: {
    count: ReturnType<typeof vi.fn>
    updateMany: ReturnType<typeof vi.fn>
    create: ReturnType<typeof vi.fn>
  }
  address: { create: ReturnType<typeof vi.fn> }
}

const { mockPrismaRef, mockTxRef, mockResolveRegion } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as { $transaction: unknown } | null },
  mockTxRef: { current: null as MockTx | null },
  mockResolveRegion: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

vi.mock('@/lib/geo/resolve-region', () => ({
  resolveRegion: mockResolveRegion,
}))

import { create } from './create'

const TENANT_ID = 'ten_rocketship'

function params(
  overrides: Partial<CustomerAddressCreateParams> = {}
): CustomerAddressCreateParams {
  return {
    customerId: 'cus_alejandra',
    address: {
      name: 'Home',
      line1: '12 Hope Road',
      city: 'Kingston',
      countryCode: 'JM',
      regionCode: 'JM-02',
    },
    ...overrides,
  }
}

describe('customerAddresses.create', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockTxRef.current = {
      courierCustomerProfile: {
        findFirst: vi.fn().mockResolvedValue({ id: 'cus_alejandra' }),
      },
      customerAddress: {
        count: vi.fn().mockResolvedValue(0),
        updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        create: vi.fn().mockResolvedValue({ id: 'cadr_home' }),
      },
      address: { create: vi.fn().mockResolvedValue({ id: 'adr_home' }) },
    }
    mockPrismaRef.current = {
      $transaction: vi
        .fn()
        .mockImplementation((fn: (tx: MockTx) => unknown) =>
          fn(mockTxRef.current!)
        ),
    }
    mockResolveRegion.mockResolvedValue({
      ok: true,
      region: { regionCode: 'JM-02', regionName: 'Saint Andrew' },
    })
  })

  it('defaults the role to DELIVERY', async () => {
    await create(TENANT_ID, params())

    expect(
      mockTxRef.current!.customerAddress.create.mock.calls[0]![0]!.data.type
    ).toBe('DELIVERY')
  })

  it('makes the first address of a role its default', async () => {
    await create(TENANT_ID, params())

    expect(
      mockTxRef.current!.customerAddress.create.mock.calls[0]![0]!.data
        .isDefault
    ).toBe(true)
    expect(mockTxRef.current!.customerAddress.updateMany).not.toHaveBeenCalled()
  })

  it('does not make a later address default unless asked', async () => {
    mockTxRef.current!.customerAddress.count.mockResolvedValue(1)

    await create(TENANT_ID, params())

    expect(
      mockTxRef.current!.customerAddress.create.mock.calls[0]![0]!.data
        .isDefault
    ).toBe(false)
  })

  it('demotes the previous default of that role only', async () => {
    mockTxRef.current!.customerAddress.count.mockResolvedValue(1)

    await create(TENANT_ID, params({ type: 'BILLING', isDefault: true }))

    expect(
      mockTxRef.current!.customerAddress.updateMany.mock.calls[0]![0]!.where
    ).toEqual({
      tenantId: TENANT_ID,
      customerId: 'cus_alejandra',
      type: 'BILLING',
      isDefault: true,
    })
  })

  it.each([
    'HOME',
    'WORK',
    'DELIVERY',
    'SHIPPING',
    'BILLING',
    'RETURN',
    'OTHER',
  ] as const)('accepts the %s role', async (type) => {
    await create(TENANT_ID, params({ type }))

    expect(
      mockTxRef.current!.customerAddress.create.mock.calls[0]![0]!.data.type
    ).toBe(type)
  })

  it('rejects a customer belonging to another tenant', async () => {
    mockTxRef.current!.courierCustomerProfile.findFirst.mockResolvedValue(null)

    const result = await create(TENANT_ID, params())

    expect(expectErr(result).status).toBe(404)
    expect(mockTxRef.current!.address.create).not.toHaveBeenCalled()
  })

  it('scopes the customer lookup to the tenant', async () => {
    await create(TENANT_ID, params())

    expect(
      mockTxRef.current!.courierCustomerProfile.findFirst.mock.calls[0]![0]!
        .where
    ).toEqual({ id: 'cus_alejandra', tenantId: TENANT_ID })
  })

  it('surfaces an invalid region without writing', async () => {
    mockResolveRegion.mockResolvedValue({
      ok: false,
      code: 'address/unknown-region',
    })

    const result = await create(TENANT_ID, params())

    expect(expectErr(result).code).toBe('address/unknown-region')
    expect(mockTxRef.current!.address.create).not.toHaveBeenCalled()
  })
})
