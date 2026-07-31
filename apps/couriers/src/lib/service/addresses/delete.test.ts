import { beforeEach, describe, expect, it, vi } from 'vitest'

type MockTx = {
  address: {
    findFirst: ReturnType<typeof vi.fn>
    delete: ReturnType<typeof vi.fn>
  }
  branch: { count: ReturnType<typeof vi.fn> }
  warehouse: { count: ReturnType<typeof vi.fn> }
  customerAddress: { count: ReturnType<typeof vi.fn> }
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
const ADDRESS_ID = 'adr_kingston'

function setUsage(counts: {
  branch?: number
  warehouse?: number
  customerAddress?: number
}) {
  mockTxRef.current!.branch.count.mockResolvedValue(counts.branch ?? 0)
  mockTxRef.current!.warehouse.count.mockResolvedValue(counts.warehouse ?? 0)
  mockTxRef.current!.customerAddress.count.mockResolvedValue(
    counts.customerAddress ?? 0
  )
}

describe('addresses.delete', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mockTxRef.current = {
      address: {
        findFirst: vi.fn().mockResolvedValue({ id: ADDRESS_ID }),
        delete: vi.fn().mockResolvedValue({ id: ADDRESS_ID }),
      },
      branch: { count: vi.fn().mockResolvedValue(0) },
      warehouse: { count: vi.fn().mockResolvedValue(0) },
      customerAddress: { count: vi.fn().mockResolvedValue(0) },
    }
    mockPrismaRef.current = {
      $transaction: vi
        .fn()
        .mockImplementation((fn: (tx: MockTx) => unknown) =>
          fn(mockTxRef.current!)
        ),
    }
  })

  it('deletes an address nothing references', async () => {
    const result = await del(TENANT_ID, ADDRESS_ID)

    expect(result).toEqual({
      data: { id: ADDRESS_ID, deleted: true },
      error: null,
    })
    expect(mockTxRef.current!.address.delete).toHaveBeenCalledTimes(1)
    expect(mockTxRef.current!.address.delete.mock.calls[0]![0]!.where).toEqual({
      id: ADDRESS_ID,
    })
  })

  it('checks usage inside the same transaction as the delete', async () => {
    await del(TENANT_ID, ADDRESS_ID)

    expect(mockPrismaRef.current!.$transaction).toHaveBeenCalledTimes(1)
    expect(mockTxRef.current!.branch.count).toHaveBeenCalledWith({
      where: { tenantId: TENANT_ID, addressId: ADDRESS_ID },
    })
  })

  it.each([
    ['a branch', { branch: 1 }],
    ['a warehouse', { warehouse: 1 }],
    ['a customer', { customerAddress: 1 }],
  ])('refuses to delete an address used by %s', async (_owner, counts) => {
    setUsage(counts)

    const result = await del(TENANT_ID, ADDRESS_ID)

    expect(result.code).toBe('address/in-use')
    expect(result.status).toBe(409)
    expect(mockTxRef.current!.address.delete).not.toHaveBeenCalled()
  })

  it('returns not-found for another tenant’s address', async () => {
    mockTxRef.current!.address.findFirst.mockResolvedValue(null)

    const result = await del('ten_other', ADDRESS_ID)

    expect(result.code).toBe('address/not-found')
    expect(result.status).toBe(404)
    expect(mockTxRef.current!.address.delete).not.toHaveBeenCalled()
  })

  it('scopes the lookup to the tenant', async () => {
    await del(TENANT_ID, ADDRESS_ID)

    expect(
      mockTxRef.current!.address.findFirst.mock.calls[0]![0]!.where
    ).toEqual({
      id: ADDRESS_ID,
      tenantId: TENANT_ID,
    })
  })

  it('returns a safe error when the delete fails', async () => {
    mockTxRef.current!.address.delete.mockRejectedValue(new Error('boom'))

    const result = await del(TENANT_ID, ADDRESS_ID)

    expect(result).toEqual({
      data: null,
      error: 'Failed to delete address.',
      status: 500,
    })
  })
})
