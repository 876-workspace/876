import { describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ list: vi.fn() }))

vi.mock('@/lib/auth/billing-context', () => ({
  getWorkspaceContext: vi
    .fn()
    .mockResolvedValue({ tenant: { id: 'tenant_1' } }),
}))
vi.mock('@/lib/service', () => ({
  service: { salesOrders: { list: mocks.list } },
}))

import { SalesOrdersListData } from './sales-orders-list-data'

describe('SalesOrdersListData', () => {
  it('keeps the list shell mounted when the list request fails', async () => {
    mocks.list.mockRejectedValueOnce(new Error('offline'))
    const element = await SalesOrdersListData()
    expect(element).not.toBeNull()
    const children = element?.props.children
    expect(children).toHaveLength(2)
    expect(children[0].props.title).toBe('Sales orders unavailable')
    expect(children[1].props.orders).toEqual([])
  })
})
