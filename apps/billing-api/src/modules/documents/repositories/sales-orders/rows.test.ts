import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  salesOrderFindMany: vi.fn(),
  invoiceFindMany: vi.fn(),
}))

vi.mock('@/db/client', () => ({
  prisma: {
    salesOrder: { findMany: mocks.salesOrderFindMany },
    invoice: { findMany: mocks.invoiceFindMany },
  },
}))

import { listSalesOrderRows } from './rows'

describe('listSalesOrderRows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.salesOrderFindMany.mockResolvedValue([])
    mocks.invoiceFindMany.mockResolvedValue([])
  })

  it('passes the status filter into the tenant-scoped Sales Order query', async () => {
    await listSalesOrderRows(
      'tenant_123',
      { status: 'confirmed', limit: 25 },
      'CONFIRMED'
    )

    expect(mocks.salesOrderFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_123', status: 'CONFIRMED' },
      orderBy: [{ orderedAt: 'desc' }, { id: 'desc' }],
      take: 26,
    })
    expect(mocks.invoiceFindMany).not.toHaveBeenCalled()
  })

  it('passes the customer filter into the tenant-scoped Sales Order query', async () => {
    await listSalesOrderRows('tenant_123', { customerId: 'cus_123', limit: 25 })

    expect(mocks.salesOrderFindMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant_123', customerId: 'cus_123' },
      orderBy: [{ orderedAt: 'desc' }, { id: 'desc' }],
      take: 26,
    })
    expect(mocks.invoiceFindMany).not.toHaveBeenCalled()
  })

  it('loads all derived invoice states with one query regardless of page size', async () => {
    mocks.salesOrderFindMany.mockResolvedValue([
      { id: 'so_1' },
      { id: 'so_2' },
      { id: 'so_3' },
    ])
    mocks.invoiceFindMany.mockResolvedValue([
      { id: 'inv_1', salesOrderId: 'so_1', status: 'OPEN' },
      { id: 'inv_2', salesOrderId: 'so_2', status: 'PAID' },
    ])

    const result = await listSalesOrderRows('tenant_123', { limit: 3 })

    expect(mocks.invoiceFindMany).toHaveBeenCalledTimes(1)
    expect(mocks.invoiceFindMany).toHaveBeenCalledWith({
      where: {
        tenantId: 'tenant_123',
        salesOrderId: { in: ['so_1', 'so_2', 'so_3'] },
        status: { not: 'VOID' },
      },
      select: { id: true, salesOrderId: true, status: true },
      orderBy: { createdAt: 'desc' },
    })
    expect([...result.activeInvoiceByOrderId.entries()]).toEqual([
      ['so_1', { id: 'inv_1', salesOrderId: 'so_1', status: 'OPEN' }],
      ['so_2', { id: 'inv_2', salesOrderId: 'so_2', status: 'PAID' }],
    ])
  })
})
