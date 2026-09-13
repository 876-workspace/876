import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../client'
import type {
  DeletedSalesOrder,
  SalesOrder,
  SalesOrderList,
} from '../types/sales-order'

const order: SalesOrder = {
  object: 'sales-order',
  id: 'so_123',
  customerId: 'cus_123',
  priceListId: null,
  priceListName: null,
  number: 'SO-1001',
  status: 'draft',
  paymentStatus: 'unpaid',
  fulfillmentStatus: 'unfulfilled',
  currency: 'JMD',
  orderedAt: null,
  confirmedAt: null,
  processingAt: null,
  completedAt: null,
  canceledAt: null,
  subtotalAmount: '250000',
  taxAmount: '0',
  discountAmount: '0',
  totalAmount: '250000',
  notes: null,
  terms: null,
  metadata: null,
  createdAt: 1_789_318_800,
  updatedAt: 1_789_318_800,
  lines: [
    {
      object: 'sales-order-line',
      id: 'sol_123',
      itemId: 'item_123',
      variantId: 'ivar_123',
      variantName: 'Black / Medium',
      variantSku: 'TS-BLK-M',
      priceId: null,
      description: 'Classic T-Shirt — Black / Medium',
      unit: 'each',
      quantity: 2,
      unitAmount: '125000',
      taxAmount: '0',
      discountAmount: '0',
      totalAmount: '250000',
      createdAt: 1_789_318_800,
      updatedAt: 1_789_318_800,
    },
  ],
}

const { lines: _lines, ...orderSummary } = order
const list: SalesOrderList = {
  object: 'list',
  data: [orderSummary],
  has_more: false,
  total_count: 1,
  url: '/api/v1/sales-orders',
}

function clientFor(payload: unknown) {
  const fetch = vi
    .fn<typeof globalThis.fetch>()
    .mockResolvedValue(Response.json(payload))
  return {
    client: create876Client({ baseUrl: 'https://billing.example.test', fetch }),
    fetch,
  }
}

describe('sales orders resource', () => {
  it('lists Sales Orders with server-side status filters', async () => {
    const { client, fetch } = clientFor({ data: list, error: null })

    const result = await client.salesOrders.list({
      status: 'confirmed',
      paymentStatus: 'unpaid',
    })

    expect(result).toEqual({ data: list, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/sales-orders?status=confirmed&paymentStatus=unpaid',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('creates a Sales Order with exact commercial line input', async () => {
    const { client, fetch } = clientFor({ data: order, error: null })
    const body = {
      customerId: 'cus_123',
      currency: 'JMD',
      lines: [
        {
          itemId: 'item_123',
          variantId: 'ivar_123',
          quantity: 2,
          unitAmount: '125000',
        },
      ],
    }

    const result = await client.salesOrders.create(body)

    expect(result).toEqual({ data: order, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/sales-orders',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) })
    )
  })

  it('retrieves an encoded Sales Order id', async () => {
    const { client, fetch } = clientFor({ data: order, error: null })

    await client.salesOrders.retrieve('so/123')

    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/sales-orders/so%2F123',
      expect.objectContaining({ method: 'GET' })
    )
  })

  it('updates a draft Sales Order', async () => {
    const { client, fetch } = clientFor({ data: order, error: null })

    await client.salesOrders.update('so_123', { notes: 'Pack carefully.' })

    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/sales-orders/so_123',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Pack carefully.' }),
      })
    )
  })

  it('uses explicit lifecycle endpoints', async () => {
    const { client, fetch } = clientFor({ data: order, error: null })

    await client.salesOrders.startProcessing('so_123')

    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/sales-orders/so_123/start-processing',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('deletes a draft Sales Order', async () => {
    const deleted: DeletedSalesOrder = {
      object: 'sales-order',
      id: 'so_123',
      deleted: true,
    }
    const { client, fetch } = clientFor({ data: deleted, error: null })

    const result = await client.salesOrders.delete('so_123')

    expect(result).toEqual({ data: deleted, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/sales-orders/so_123',
      expect.objectContaining({ method: 'DELETE' })
    )
  })

  it('returns a lifecycle value error without data', async () => {
    const { client } = clientFor({
      data: null,
      error: {
        code: 'billing/sales-order-invalid-state',
        message: 'This Sales Order cannot be changed from its current status.',
      },
    })

    const result = await client.salesOrders.confirm('so_123')

    expect(result).toEqual({
      data: null,
      error: {
        code: 'billing/sales-order-invalid-state',
        message: 'This Sales Order cannot be changed from its current status.',
      },
    })
  })
})
