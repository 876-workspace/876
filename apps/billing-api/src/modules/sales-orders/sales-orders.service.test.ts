import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  resolveCommercialCustomer: vi.fn(),
  hasEnabledCurrency: vi.fn(),
  buildCommercialLines: vi.fn(),
  listSalesOrderRows: vi.fn(),
  findSalesOrderRow: vi.fn(),
  createSalesOrderRow: vi.fn(),
  updateDraftSalesOrderRow: vi.fn(),
  transitionSalesOrderRow: vi.fn(),
  deleteDraftSalesOrderRow: vi.fn(),
}))

vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => 100 }))
vi.mock('@/modules/customers', () => ({
  resolveCommercialCustomer: mocks.resolveCommercialCustomer,
}))
vi.mock('@/modules/currencies', () => ({
  hasEnabledCurrency: mocks.hasEnabledCurrency,
}))
vi.mock('@/modules/commercial-lines', () => ({
  buildCommercialLines: mocks.buildCommercialLines,
}))
vi.mock('@/platform/ids', () => ({
  generateId: (type: string) =>
    type === 'SalesOrder' ? 'so_123456789012' : 'sol_123',
}))
vi.mock('@/platform/prisma-errors', () => ({
  isUniqueConstraintError: () => false,
}))
vi.mock('./sales-orders.repository', () => ({
  listSalesOrderRows: mocks.listSalesOrderRows,
  findSalesOrderRow: mocks.findSalesOrderRow,
  createSalesOrderRow: mocks.createSalesOrderRow,
  updateDraftSalesOrderRow: mocks.updateDraftSalesOrderRow,
  transitionSalesOrderRow: mocks.transitionSalesOrderRow,
  deleteDraftSalesOrderRow: mocks.deleteDraftSalesOrderRow,
}))

import {
  cancelSalesOrder,
  createSalesOrder,
  deleteSalesOrder,
  listSalesOrders,
  submitSalesOrder,
  updateSalesOrder,
} from './sales-orders.service'

const line = {
  id: 'sol_123',
  salesOrderId: 'so_123456789012',
  itemId: 'item_123',
  variantId: 'ivar_123',
  variantName: 'Black / Medium',
  variantSku: 'TS-BLK-M',
  priceId: 'prc_123',
  description: 'Classic T-Shirt — Black / Medium',
  unit: 'each',
  quantity: 2,
  unitAmount: 125000n,
  taxAmount: 0n,
  discountAmount: 0n,
  totalAmount: 250000n,
  createdAt: 100,
  updatedAt: 100,
}

const draftRow = {
  id: 'so_123456789012',
  tenantId: 'ten_123',
  customerId: 'cus_123',
  priceListId: 'plist_123',
  priceListName: 'Retail',
  number: 'SO-3456789012',
  status: 'DRAFT' as const,
  paymentStatus: 'UNPAID' as const,
  fulfillmentStatus: 'UNFULFILLED' as const,
  currency: 'JMD',
  orderedAt: null,
  confirmedAt: null,
  processingAt: null,
  completedAt: null,
  canceledAt: null,
  subtotalAmount: 250000n,
  taxAmount: 0n,
  discountAmount: 0n,
  totalAmount: 250000n,
  notes: null,
  terms: null,
  metadata: null,
  createdAt: 100,
  updatedAt: 100,
  lines: [line],
}

const prepared = {
  data: {
    lines: [
      {
        itemId: 'item_123',
        variantId: 'ivar_123',
        variantName: 'Black / Medium',
        variantSku: 'TS-BLK-M',
        priceId: 'prc_123',
        description: 'Classic T-Shirt — Black / Medium',
        unit: 'each',
        quantity: 2,
        unitAmount: 125000n,
        taxAmount: 0n,
        discountAmount: 0n,
        totalAmount: 250000n,
      },
    ],
    lineAmounts: [
      { subtotalAmount: 250000n, taxAmount: 0n, discountAmount: 0n },
    ],
    subtotalAmount: 250000n,
    taxAmount: 0n,
    discountAmount: 0n,
    totalAmount: 250000n,
    priceList: { id: 'plist_123', name: 'Retail' },
  },
  error: null,
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.resolveCommercialCustomer.mockResolvedValue({
    id: 'cus_123',
    defaultCurrency: 'JMD',
    priceListId: 'plist_123',
  })
  mocks.hasEnabledCurrency.mockResolvedValue(true)
  mocks.buildCommercialLines.mockResolvedValue(prepared)
  mocks.createSalesOrderRow.mockResolvedValue(draftRow)
  mocks.findSalesOrderRow.mockResolvedValue(draftRow)
  mocks.updateDraftSalesOrderRow.mockResolvedValue(draftRow)
  mocks.transitionSalesOrderRow.mockResolvedValue(draftRow)
  mocks.deleteDraftSalesOrderRow.mockResolvedValue(true)
  mocks.listSalesOrderRows.mockResolvedValue([draftRow])
})

describe('Sales Orders service', () => {
  it('inherits the customer price list and snapshots prepared lines on create', async () => {
    const result = await createSalesOrder('ten_123', {
      customerId: 'cus_123',
      currency: 'JMD',
      lines: [{ itemId: 'item_123', variantId: 'ivar_123', quantity: 2 }],
    })

    expect(result).toMatchObject({
      object: 'sales-order',
      id: 'so_123456789012',
      priceListId: 'plist_123',
      totalAmount: '250000',
    })
    expect(mocks.buildCommercialLines).toHaveBeenCalledWith(
      'ten_123',
      'JMD',
      [{ itemId: 'item_123', variantId: 'ivar_123', quantity: 2 }],
      'plist_123'
    )
    expect(mocks.createSalesOrderRow).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'so_123456789012',
        customerId: 'cus_123',
        priceListId: 'plist_123',
        priceListName: 'Retail',
        subtotalAmount: 250000n,
        totalAmount: 250000n,
        lines: [
          expect.objectContaining({
            id: 'sol_123',
            variantId: 'ivar_123',
            totalAmount: 250000n,
          }),
        ],
      })
    )
  })

  it('returns a registered value error when the customer is unavailable', async () => {
    mocks.resolveCommercialCustomer.mockResolvedValue(null)

    const result = await createSalesOrder('ten_123', {
      customerId: 'missing',
      currency: 'JMD',
      lines: [{ description: 'Manual line', quantity: 1, unitAmount: 1000n }],
    })

    expect(result).toMatchObject({
      code: 'billing/sales-order-customer-not-found',
      httpStatus: 404,
    })
    expect(mocks.createSalesOrderRow).not.toHaveBeenCalled()
  })

  it('refuses structural edits after draft state', async () => {
    mocks.findSalesOrderRow.mockResolvedValue({
      ...draftRow,
      status: 'CONFIRMED',
    })

    const result = await updateSalesOrder('ten_123', 'so_123456789012', {
      notes: 'Too late',
    })

    expect(result).toMatchObject({
      code: 'billing/sales-order-invalid-state',
      httpStatus: 409,
    })
    expect(mocks.updateDraftSalesOrderRow).not.toHaveBeenCalled()
  })

  it('requires refreshed lines when the commercial context changes', async () => {
    const result = await updateSalesOrder('ten_123', 'so_123456789012', {
      currency: 'USD',
    })

    expect(result).toMatchObject({
      code: 'billing/sales-order-invalid-lines',
      httpStatus: 422,
    })
    expect(mocks.updateDraftSalesOrderRow).not.toHaveBeenCalled()
  })

  it('submits only a draft and records the order timestamp', async () => {
    mocks.transitionSalesOrderRow.mockResolvedValue({
      ...draftRow,
      status: 'PENDING',
      orderedAt: 100,
    })

    const result = await submitSalesOrder('ten_123', 'so_123456789012')

    expect(result).toMatchObject({ status: 'pending', orderedAt: 100 })
    expect(mocks.transitionSalesOrderRow).toHaveBeenCalledWith({
      tenantId: 'ten_123',
      salesOrderId: 'so_123456789012',
      from: ['DRAFT'],
      to: 'PENDING',
      timestampField: 'orderedAt',
      now: 100,
    })
  })

  it('preserves an explicitly supplied order timestamp during submit', async () => {
    mocks.findSalesOrderRow.mockResolvedValue({ ...draftRow, orderedAt: 90 })
    mocks.transitionSalesOrderRow.mockResolvedValue({
      ...draftRow,
      status: 'PENDING',
      orderedAt: 90,
    })

    await submitSalesOrder('ten_123', 'so_123456789012')

    expect(mocks.transitionSalesOrderRow).toHaveBeenCalledWith({
      tenantId: 'ten_123',
      salesOrderId: 'so_123456789012',
      from: ['DRAFT'],
      to: 'PENDING',
      now: 100,
    })
  })

  it('does not allow cancellation after completion', async () => {
    mocks.findSalesOrderRow.mockResolvedValue({
      ...draftRow,
      status: 'COMPLETED',
    })

    const result = await cancelSalesOrder('ten_123', 'so_123456789012')

    expect(result).toMatchObject({
      code: 'billing/sales-order-invalid-state',
      httpStatus: 409,
    })
    expect(mocks.transitionSalesOrderRow).not.toHaveBeenCalled()
  })

  it('deletes draft Sales Orders only', async () => {
    const result = await deleteSalesOrder('ten_123', 'so_123456789012')

    expect(result).toEqual({
      object: 'sales-order',
      id: 'so_123456789012',
      deleted: true,
    })
    expect(mocks.deleteDraftSalesOrderRow).toHaveBeenCalledWith(
      'ten_123',
      'so_123456789012'
    )
  })

  it('maps wire filters to database enums before listing', async () => {
    const result = await listSalesOrders('ten_123', {
      status: 'confirmed',
      paymentStatus: 'partially-paid',
      fulfillmentStatus: 'unfulfilled',
      customerId: 'cus_123',
    })

    expect(result).toMatchObject({ hasMore: false })
    expect(mocks.listSalesOrderRows).toHaveBeenCalledWith('ten_123', {
      status: 'CONFIRMED',
      paymentStatus: 'PARTIALLY_PAID',
      fulfillmentStatus: 'UNFULFILLED',
      customerId: 'cus_123',
    })
  })
})
