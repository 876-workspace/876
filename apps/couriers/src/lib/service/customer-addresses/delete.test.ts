import { beforeEach, describe, expect, it, vi } from 'vitest'

import { expectErr } from '@/test/service-result'

type MockTx = {
  customerAddress: {
    findFirst: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
    count: ReturnType<typeof vi.fn>
  }
  address: { delete: ReturnType<typeof vi.fn> }
  branch: { count: ReturnType<typeof vi.fn> }
  warehouse: { count: ReturnType<typeof vi.fn> }
}

const { mockPrismaRef, mockTxRef } = vi.hoisted(() => ({
  mockPrismaRef: { current: null as { $transaction: unknown } | null },
  mockTxRef: { current: null as MockTx | null },
}))

vi.mock('@/lib/db', () => ({
  get prisma() {
    return mockPrismaRef.current
  },
}))

import { del } from './delete'

const TENANT_ID = 'ten_rocketship'
const ID = 'cadr_home'
const ADDRESS_ID = 'adr_home'

describe('customerAddresses.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockTxRef.current = {
      customerAddress: {
        findFirst: vi.fn().mockResolvedValue({
          id: ID,
          customerId: 'cus_alejandra',
          addressId: ADDRESS_ID,
          type: 'DELIVERY',
          isDefault: false,
        }),
        delete: vi.fn().mockResolvedValue({ id: ID }),
        update: vi.fn().mockResolvedValue({ id: ID }),
        count: vi.fn().mockResolvedValue(0),
      },
      address: { delete: vi.fn().mockResolvedValue({ id: ADDRESS_ID }) },
      branch: { count: vi.fn().mockResolvedValue(0) },
      warehouse: { count: vi.fn().mockResolvedValue(0) },
    }
    mockPrismaRef.current = {
      $transaction: vi
        .fn()
        .mockImplementation((fn: (tx: MockTx) => unknown) =>
          fn(mockTxRef.current!)
        ),
    }
  })

  it('removes the relationship and the now-unreferenced address', async () => {
    const result = await del(TENANT_ID, ID)

    expect(result).toEqual({ data: { id: ID, deleted: true }, error: null })
    expect(mockTxRef.current!.customerAddress.delete).toHaveBeenCalledTimes(1)
    expect(mockTxRef.current!.address.delete).toHaveBeenCalledWith({
      where: { id: ADDRESS_ID },
    })
  })

  it('keeps an address another customer still uses', async () => {
    mockTxRef.current!.customerAddress.count.mockResolvedValue(1)

    await del(TENANT_ID, ID)

    expect(mockTxRef.current!.address.delete).not.toHaveBeenCalled()
  })

  it('keeps an address a branch still uses', async () => {
    mockTxRef.current!.branch.count.mockResolvedValue(1)

    await del(TENANT_ID, ID)

    expect(mockTxRef.current!.address.delete).not.toHaveBeenCalled()
  })

  it('keeps an address a warehouse still uses', async () => {
    mockTxRef.current!.warehouse.count.mockResolvedValue(1)

    await del(TENANT_ID, ID)

    expect(mockTxRef.current!.address.delete).not.toHaveBeenCalled()
  })

  it('promotes the oldest remaining address when the default is removed', async () => {
    mockTxRef
      .current!.customerAddress.findFirst.mockResolvedValueOnce({
        id: ID,
        customerId: 'cus_alejandra',
        addressId: ADDRESS_ID,
        type: 'DELIVERY',
        isDefault: true,
      })
      .mockResolvedValueOnce({ id: 'cadr_work' })

    await del(TENANT_ID, ID)

    expect(mockTxRef.current!.customerAddress.update).toHaveBeenCalledWith({
      where: { id: 'cadr_work' },
      data: { isDefault: true, updatedAt: expect.any(Number) },
    })
  })

  it('promotes nothing when the last address of a role is removed', async () => {
    mockTxRef
      .current!.customerAddress.findFirst.mockResolvedValueOnce({
        id: ID,
        customerId: 'cus_alejandra',
        addressId: ADDRESS_ID,
        type: 'DELIVERY',
        isDefault: true,
      })
      .mockResolvedValueOnce(null)

    await del(TENANT_ID, ID)

    expect(mockTxRef.current!.customerAddress.update).not.toHaveBeenCalled()
  })

  it('does not promote when the removed address was not the default', async () => {
    await del(TENANT_ID, ID)

    expect(mockTxRef.current!.customerAddress.update).not.toHaveBeenCalled()
  })

  it('returns not-found for another tenant’s address', async () => {
    mockTxRef.current!.customerAddress.findFirst.mockResolvedValue(null)

    const result = await del('ten_other', ID)

    expect(expectErr(result).status).toBe(404)
    expect(mockTxRef.current!.customerAddress.delete).not.toHaveBeenCalled()
  })

  it('scopes the lookup to the tenant', async () => {
    await del(TENANT_ID, ID)

    expect(
      mockTxRef.current!.customerAddress.findFirst.mock.calls[0]![0]!.where
    ).toEqual({ id: ID, tenantId: TENANT_ID })
  })
})
