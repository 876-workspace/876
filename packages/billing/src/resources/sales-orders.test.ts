import { describe, expect, it, vi } from 'vitest'

import { create876Client } from '../client'
import type { SalesOrder, SalesOrderList } from '../types/sales-order'

const order: SalesOrder = {
  object: 'sales-order',
  id: 'so_123',
  customerId: 'cus_123',
  customerName: 'Island Outfitters',
  customerEmail: 'billing@example.test',
  priceListId: null,
  priceListName: null,
  quoteId: null,
  salespersonId: null,
  salespersonName: null,
  number: 'SO-1001',
  status: 'draft',
  invoicingStatus: 'not-invoiced',
  paymentStatus: null,
  invoiceId: null,
  currency: 'JMD',
  referenceNumber: null,
  taxBehavior: 'EXCLUSIVE',
  billingAddressSnapshot: null,
  shippingAddressSnapshot: null,
  orderedAt: 1_789_318_800,
  confirmedAt: null,
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
      taxRateId: null,
      description: 'Classic T-Shirt — Black / Medium',
      unit: 'each',
      position: 0,
      quantity: 2,
      unitAmount: '125000',
      taxAmount: '0',
      taxName: null,
      taxRate: null,
      taxInclusive: false,
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
  total_count: null,
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

const invalidResponse = {
  data: null,
  error: {
    code: 'billing/invalid-response',
    message: 'The Billing service returned an invalid response.',
  },
}

describe('sales orders resource', () => {
  it('lists with server-side status, customer, cursor, and limit filters', async () => {
    const { client, fetch } = clientFor({ data: list, error: null })

    const result = await client.salesOrders.list({
      status: 'confirmed',
      customerId: 'cus_123',
      starting_after: 'so_100',
      limit: 25,
    })

    expect(result).toEqual({ data: list, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/sales-orders?status=confirmed&customerId=cus_123&starting_after=so_100&limit=25',
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
          taxRateId: 'tax_123',
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

  it('confirms with the explicit lifecycle endpoint', async () => {
    const { client, fetch } = clientFor({ data: order, error: null })
    await client.salesOrders.confirm('so_123')
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/sales-orders/so_123/confirm',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('cancels with the explicit lifecycle endpoint', async () => {
    const { client, fetch } = clientFor({ data: order, error: null })
    await client.salesOrders.cancel('so_123')
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/sales-orders/so_123/cancel',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('completes with the explicit lifecycle endpoint', async () => {
    const { client, fetch } = clientFor({ data: order, error: null })
    await client.salesOrders.complete('so_123')
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/sales-orders/so_123/complete',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('converts a Sales Order to an invoice', async () => {
    const created = { object: 'invoice' as const, id: 'inv_123' }
    const { client, fetch } = clientFor({ data: created, error: null })

    const result = await client.salesOrders.convertToInvoice('so_123')

    expect(result).toEqual({ data: created, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/sales-orders/so_123/convert-to-invoice',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('converts an accepted quote to a Sales Order', async () => {
    const { client, fetch } = clientFor({ data: order, error: null })
    const body = { referenceNumber: 'WEB-5001' }

    const result = await client.quotes.convertToSalesOrder('quo/123', body)

    expect(result).toEqual({ data: order, error: null })
    expect(fetch).toHaveBeenCalledWith(
      'https://billing.example.test/api/v1/quotes/quo%2F123/convert-to-sales-order',
      expect.objectContaining({ method: 'POST', body: JSON.stringify(body) })
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

  it('rejects a malformed list response', async () => {
    const { client } = clientFor({
      data: { object: 'list', data: [{ id: 'so_123' }] },
      error: null,
    })
    await expect(client.salesOrders.list()).resolves.toEqual(invalidResponse)
  })

  it('rejects a malformed create response', async () => {
    const { client } = clientFor({
      data: { object: 'sales-order', id: 'so_123' },
      error: null,
    })
    await expect(
      client.salesOrders.create({
        customerId: 'cus_123',
        lines: [{ description: 'Service', quantity: 1, unitAmount: '100' }],
      })
    ).resolves.toEqual(invalidResponse)
  })

  it('rejects a malformed lifecycle response', async () => {
    const { client } = clientFor({
      data: { object: 'sales-order', id: 'so_123', status: 'confirmed' },
      error: null,
    })
    await expect(client.salesOrders.confirm('so_123')).resolves.toEqual(
      invalidResponse
    )
  })

  it('rejects a malformed invoice conversion response', async () => {
    const { client } = clientFor({
      data: { object: 'invoice' },
      error: null,
    })
    await expect(
      client.salesOrders.convertToInvoice('so_123')
    ).resolves.toEqual(invalidResponse)
  })
})
