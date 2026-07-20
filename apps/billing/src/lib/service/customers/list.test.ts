import { beforeEach, describe, expect, it, vi } from 'vitest'

const { customer } = vi.hoisted(() => ({
  customer: {
    count: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
  },
}))

vi.mock('@/lib/db', () => ({ prisma: { customer } }))

import { listCustomerPage } from './list'

describe('listCustomerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    customer.count.mockResolvedValue(3)
  })

  it('returns a deterministic forward page and detects another page', async () => {
    customer.findFirst.mockResolvedValue({ id: 'cus_2', createdAt: 20 })
    customer.findMany.mockResolvedValue([
      { id: 'cus_1', createdAt: 10 },
      { id: 'cus_0', createdAt: 5 },
    ])

    const result = await listCustomerPage('blten_1', {
      limit: 1,
      startingAfter: 'cus_2',
    })

    expect(result).toEqual({
      customers: [{ id: 'cus_1', createdAt: 10 }],
      hasMore: true,
      totalCount: 3,
    })
    expect(customer.findMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'blten_1',
        OR: [{ createdAt: { lt: 20 } }, { createdAt: 20, id: { lt: 'cus_2' } }],
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 2,
    })
  })

  it('reverses the ascending database window for ending_before', async () => {
    customer.findFirst.mockResolvedValue({ id: 'cus_2', createdAt: 20 })
    customer.findMany.mockResolvedValue([
      { id: 'cus_3', createdAt: 30 },
      { id: 'cus_4', createdAt: 40 },
    ])

    const result = await listCustomerPage('blten_1', {
      limit: 2,
      endingBefore: 'cus_2',
    })

    expect(result?.customers).toEqual([
      { id: 'cus_4', createdAt: 40 },
      { id: 'cus_3', createdAt: 30 },
    ])
    expect(result?.hasMore).toBe(false)
  })

  it('rejects a cursor outside the tenant before listing data', async () => {
    customer.findFirst.mockResolvedValue(null)

    const result = await listCustomerPage('blten_1', {
      limit: 25,
      startingAfter: 'cus_other_tenant',
    })

    expect(result).toBeNull()
    expect(customer.findMany).not.toHaveBeenCalled()
    expect(customer.count).not.toHaveBeenCalled()
  })

  it('filters shared customer resolution by an opaque Core user ID', async () => {
    customer.findMany.mockResolvedValue([{ id: 'cus_1', userId: 'usr_1' }])
    customer.count.mockResolvedValue(1)

    const result = await listCustomerPage('blten_1', {
      limit: 2,
      userId: 'usr_1',
    })

    expect(result?.customers).toEqual([{ id: 'cus_1', userId: 'usr_1' }])
    expect(customer.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'blten_1', userId: 'usr_1' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 3,
    })
    expect(customer.count).toHaveBeenCalledWith({
      where: { tenantId: 'blten_1', userId: 'usr_1' },
    })
  })

  it('filters the page and total count by lifecycle status', async () => {
    customer.findMany.mockResolvedValue([
      { id: 'cus_active', status: 'ACTIVE' },
    ])
    customer.count.mockResolvedValue(1)

    const result = await listCustomerPage('blten_1', {
      limit: 25,
      status: 'ACTIVE',
    })

    expect(result?.customers).toEqual([{ id: 'cus_active', status: 'ACTIVE' }])
    expect(customer.findMany).toHaveBeenCalledWith({
      where: { tenantId: 'blten_1', status: 'ACTIVE' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 26,
    })
    expect(customer.count).toHaveBeenCalledWith({
      where: { tenantId: 'blten_1', status: 'ACTIVE' },
    })
  })
})
