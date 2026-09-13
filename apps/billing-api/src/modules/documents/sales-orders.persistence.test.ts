import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import {
  derivedSalesOrderFinancialState,
  serializeSalesOrderSummary,
} from './sales-orders.serializers'

const migration = readFileSync(
  new URL(
    '../../../prisma/migrations/20260913183000_sales_orders/migration.sql',
    import.meta.url
  ),
  'utf8'
)

const baseRow = {
  id: 'so_123',
  customerId: 'cus_123',
  customerName: 'Island Outfitters',
  customerEmail: 'billing@example.test',
  priceListId: null,
  priceListName: null,
  quoteId: null,
  salespersonId: null,
  salespersonName: null,
  number: 'SO-000001',
  status: 'DRAFT',
  currency: 'JMD',
  referenceNumber: null,
  taxBehavior: 'EXCLUSIVE' as const,
  billingAddressSnapshot: null,
  shippingAddressSnapshot: null,
  orderedAt: 1,
  confirmedAt: null,
  completedAt: null,
  canceledAt: null,
  subtotalAmount: 100n,
  taxAmount: 0n,
  discountAmount: 0n,
  totalAmount: 100n,
  notes: null,
  terms: null,
  metadata: null,
  createdAt: 1,
  updatedAt: 1,
}

describe('Sales Order persistence contract', () => {
  it('adds enum values before creating or altering dependent Sales Order tables', () => {
    const documentType = migration.indexOf(
      `ALTER TYPE "BillingDocumentType" ADD VALUE 'SALES_ORDER'`
    )
    const billingReason = migration.indexOf(
      `ALTER TYPE "BillingInvoiceBillingReason" ADD VALUE 'SALES_ORDER'`
    )
    const createOrder = migration.indexOf(
      'CREATE TABLE "billing_sales_orders"'
    )
    const invoiceColumn = migration.indexOf(
      'ALTER TABLE "billing_invoices"\n  ADD COLUMN "sales_order_id"'
    )

    expect(documentType).toBeGreaterThanOrEqual(0)
    expect(billingReason).toBeGreaterThan(documentType)
    expect(invoiceColumn).toBeGreaterThan(billingReason)
    expect(createOrder).toBeGreaterThan(invoiceColumn)
  })

  it('pins tenant-composite customer isolation and the non-unique invoice link', () => {
    expect(migration).toContain(
      'FOREIGN KEY ("tenant_id", "customer_id")\n  REFERENCES "billing_customers"("tenant_id", "id")'
    )
    expect(migration).toContain(
      'CREATE INDEX "billing_invoices_sales_order_id_idx"'
    )
    expect(migration).not.toContain(
      'CREATE UNIQUE INDEX "billing_invoices_sales_order_id'
    )
  })

  it('maps every stored Sales Order lifecycle enum to the lower-kebab wire contract', () => {
    for (const [stored, wire] of [
      ['DRAFT', 'draft'],
      ['CONFIRMED', 'confirmed'],
      ['COMPLETED', 'completed'],
      ['CANCELED', 'canceled'],
    ] as const) {
      expect(
        serializeSalesOrderSummary({ ...baseRow, status: stored }, null).status
      ).toBe(wire)
    }
  })

  it('derives invoicing and payment status without persisted order fields', () => {
    expect(derivedSalesOrderFinancialState(null)).toEqual({
      invoicingStatus: 'not-invoiced',
      paymentStatus: null,
      invoiceId: null,
    })
    expect(
      derivedSalesOrderFinancialState({ id: 'inv_open', status: 'OPEN' })
    ).toMatchObject({ invoicingStatus: 'invoiced', paymentStatus: 'unpaid' })
    expect(
      derivedSalesOrderFinancialState({
        id: 'inv_partial',
        status: 'PARTIALLY_PAID',
      })
    ).toMatchObject({ paymentStatus: 'partially-paid' })
    expect(
      derivedSalesOrderFinancialState({ id: 'inv_paid', status: 'PAID' })
    ).toMatchObject({ paymentStatus: 'paid' })
  })
})
