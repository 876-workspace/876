import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  claimCommand: vi.fn(),
  completeCommand: vi.fn(),
  lockSalesOrderForInvoice: vi.fn(),
  runSalesOrderTransaction: vi.fn(),
  nextDocumentNumber: vi.fn(),
  invoiceCreate: vi.fn(),
}))

vi.mock('@876/core/timestamps', () => ({ nowUnixSeconds: () => 100 }))
vi.mock('@/platform/ids', () => ({
  generateId: (kind: string) => `${kind}_123`,
}))
vi.mock('@/modules/command-idempotency', () => ({
  claimCommand: mocks.claimCommand,
  completeCommand: mocks.completeCommand,
}))
vi.mock('../document-numbers.repository', () => ({
  nextDocumentNumber: mocks.nextDocumentNumber,
}))
vi.mock('../repositories/sales-orders', () => ({
  lockSalesOrderForInvoice: mocks.lockSalesOrderForInvoice,
  runSalesOrderTransaction: mocks.runSalesOrderTransaction,
}))

import { convertSalesOrderToInvoiceWorkflow } from './convert-sales-order-to-invoice'

const order = {
  id: 'so_123',
  status: 'CONFIRMED',
  customerId: 'cus_123',
  priceListId: 'pl_123',
  priceListName: 'Standard',
  salespersonId: 'sp_123',
  salespersonName: 'Ari',
  currency: 'USD',
  number: 'SO-000001',
  referenceNumber: 'PO-9',
  taxBehavior: 'EXCLUSIVE',
  customerName: 'Ana',
  customerEmail: 'ana@example.test',
  billingAddressSnapshot: { city: 'Kingston' },
  shippingAddressSnapshot: { city: 'Ocho Rios' },
  subtotalAmount: 10000n,
  taxAmount: 1500n,
  totalAmount: 11500n,
  notes: 'Note',
  terms: 'Net 30',
  invoices: [],
  lines: [
    {
      itemId: 'item_123',
      variantId: 'var_123',
      variantName: 'Large',
      variantSku: 'SKU-1',
      priceId: 'price_123',
      taxRateId: 'tax_123',
      description: 'Consulting',
      unit: 'hour',
      position: 2,
      quantity: 2,
      unitAmount: 5000n,
      taxAmount: 1500n,
      taxName: 'GCT',
      taxRate: '0.1500',
      taxInclusive: false,
      discountAmount: 500n,
      totalAmount: 11500n,
    },
  ],
}

describe('convertSalesOrderToInvoiceWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.lockSalesOrderForInvoice.mockResolvedValue(order)
    mocks.nextDocumentNumber.mockResolvedValue('INV-000001')
    mocks.invoiceCreate.mockResolvedValue({ id: 'Invoice_123' })
    mocks.runSalesOrderTransaction.mockImplementation(
      async (work: (tx: object) => Promise<unknown>) =>
        work({ invoice: { create: mocks.invoiceCreate } })
    )
  })

  it('requires a confirmed Sales Order', async () => {
    mocks.lockSalesOrderForInvoice.mockResolvedValue({
      ...order,
      status: 'DRAFT',
    })
    const result = await convertSalesOrderToInvoiceWorkflow(
      'tenant_123',
      'so_123'
    )
    expect(result).toMatchObject({
      data: null,
      code: 'billing/sales-order-invalid-state',
      status: 409,
    })
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('returns not found when the Sales Order is outside the tenant', async () => {
    mocks.lockSalesOrderForInvoice.mockResolvedValue(null)
    const result = await convertSalesOrderToInvoiceWorkflow(
      'tenant_other',
      'so_123'
    )
    expect(result).toMatchObject({
      data: null,
      code: 'billing/sales-order-not-found',
      status: 404,
    })
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('creates an invoice from snapshots without repricing the order', async () => {
    const result = await convertSalesOrderToInvoiceWorkflow(
      'tenant_123',
      'so_123'
    )
    expect(result).toEqual({ data: { id: 'Invoice_123' }, error: null })
    expect(mocks.invoiceCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        billingReason: 'SALES_ORDER',
        salesOrderId: 'so_123',
        lines: {
          create: [
            expect.objectContaining({
              itemId: 'item_123',
              priceId: 'price_123',
              taxRateId: 'tax_123',
              taxName: 'GCT',
              taxRate: '0.1500',
              taxInclusive: false,
              unitAmount: 5000n,
              taxAmount: 1500n,
              discountAmount: 500n,
              totalAmount: 11500n,
            }),
          ],
        },
      }),
    })
    expect(mocks.nextDocumentNumber).toHaveBeenCalledTimes(1)
  })

  it('rejects a second non-void invoice for the Sales Order', async () => {
    mocks.lockSalesOrderForInvoice.mockResolvedValue({
      ...order,
      invoices: [{ id: 'inv_existing', status: 'OPEN' }],
    })
    const result = await convertSalesOrderToInvoiceWorkflow(
      'tenant_123',
      'so_123'
    )
    expect(result).toMatchObject({
      data: null,
      code: 'billing/sales-order-already-invoiced',
      status: 409,
    })
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('allows re-invoicing when a prior invoice was voided', async () => {
    mocks.lockSalesOrderForInvoice.mockResolvedValue({ ...order, invoices: [] })
    const result = await convertSalesOrderToInvoiceWorkflow(
      'tenant_123',
      'so_123'
    )
    expect(result).toEqual({ data: { id: 'Invoice_123' }, error: null })
    expect(mocks.invoiceCreate).toHaveBeenCalledTimes(1)
  })

  it('replays an idempotent conversion without creating another invoice', async () => {
    mocks.claimCommand.mockResolvedValue({
      data: {
        state: 'replayed',
        resource: { type: 'invoice', id: 'inv_existing' },
      },
      error: null,
    })
    const result = await convertSalesOrderToInvoiceWorkflow(
      'tenant_123',
      'so_123',
      { key: 'retry-1', requestHash: 'hash' }
    )
    expect(result).toEqual({
      data: { id: 'inv_existing', replayed: true },
      error: null,
    })
    expect(mocks.lockSalesOrderForInvoice).not.toHaveBeenCalled()
    expect(mocks.invoiceCreate).not.toHaveBeenCalled()
  })

  it('completes an idempotency claim after invoice creation', async () => {
    mocks.claimCommand.mockResolvedValue({
      data: { state: 'claimed', claimId: 'cmd_123' },
      error: null,
    })
    const result = await convertSalesOrderToInvoiceWorkflow(
      'tenant_123',
      'so_123',
      { key: 'retry-1', requestHash: 'hash' }
    )
    expect(result).toEqual({ data: { id: 'Invoice_123' }, error: null })
    expect(mocks.completeCommand).toHaveBeenCalledWith(
      expect.anything(),
      'tenant_123',
      'cmd_123',
      100
    )
  })

  it('keeps the order line discount snapshot on the invoice line', async () => {
    await convertSalesOrderToInvoiceWorkflow('tenant_123', 'so_123')
    expect(mocks.invoiceCreate.mock.calls[0]?.[0]).toMatchObject({
      data: {
        lines: { create: [expect.objectContaining({ discountAmount: 500n })] },
      },
    })
  })
})
