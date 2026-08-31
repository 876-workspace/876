import { describe, expect, it } from 'vitest'

import {
  EstimateSchema,
  InvoiceListSchema,
  InvoiceSchema,
  QuoteSchema,
} from '../invoice.schema'

function customer() {
  return {
    object: 'customer' as const,
    id: 'cus_1',
    name: 'Mango Company',
    email: 'billing@example.com',
  }
}

function invoice(overrides: Record<string, unknown> = {}) {
  return {
    object: 'invoice' as const,
    id: 'inv_1',
    tenantId: 'ten_internal',
    customerId: 'cus_1',
    quoteId: null,
    estimateId: null,
    subscriptionId: null,
    number: 'INV-0001',
    status: 'DRAFT' as const,
    billingReason: 'MANUAL' as const,
    currency: 'JMD',
    orderNumber: null,
    referenceNumber: null,
    subject: null,
    taxBehavior: 'EXCLUSIVE' as const,
    customerName: 'Mango Company',
    customerEmail: 'billing@example.com',
    issueAt: 1,
    dueAt: 2,
    sentAt: null,
    paidAt: null,
    voidedAt: null,
    finalizedAt: null,
    subtotalAmount: '10000',
    taxAmount: '1500',
    discountAmount: '0',
    shippingAmount: '0',
    adjustmentAmount: '0',
    totalAmount: '11500',
    amountDue: '11500',
    amountPaid: '0',
    amountCredited: '0',
    amountWrittenOff: '0',
    notes: null,
    terms: null,
    createdAt: 1,
    updatedAt: 1,
    customer: customer(),
    lines: [
      {
        object: 'invoice_line' as const,
        id: 'il_1',
        invoiceId: 'inv_1',
        itemId: null,
        priceId: null,
        description: 'Consulting',
        quantity: 1,
        unitAmount: '10000',
        taxAmount: '1500',
        discountAmount: '0',
        totalAmount: '11500',
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    ...overrides,
  }
}

function proposal(object: 'quote' | 'estimate') {
  return {
    object,
    id: `${object}_1`,
    tenantId: 'ten_internal',
    customerId: 'cus_1',
    number: object === 'quote' ? 'QUO-0001' : 'EST-0001',
    status: 'DRAFT' as const,
    currency: 'JMD',
    issueAt: 1,
    expiresAt: null,
    acceptedAt: null,
    declinedAt: null,
    canceledAt: null,
    subtotalAmount: '10000',
    taxAmount: '1500',
    totalAmount: '11500',
    notes: null,
    terms: null,
    createdAt: 1,
    updatedAt: 1,
    customer: customer(),
    lines: [
      {
        object: `${object}_line`,
        id: `${object}_line_1`,
        itemId: null,
        priceId: null,
        description: 'Consulting',
        quantity: 1,
        unitAmount: '10000',
        taxAmount: '1500',
        discountAmount: '0',
        totalAmount: '11500',
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  }
}

describe('InvoiceSchema', () => {
  it('accepts every invoice status from the Billing data model', () => {
    for (const status of [
      'DRAFT',
      'OPEN',
      'SENT',
      'PARTIALLY_PAID',
      'OVERDUE',
      'PAID',
      'UNCOLLECTIBLE',
      'VOID',
    ] as const) {
      expect(InvoiceSchema.safeParse(invoice({ status })).success).toBe(true)
    }
  })

  it('rejects quote-only statuses on invoices', () => {
    expect(InvoiceSchema.safeParse(invoice({ status: 'ACCEPTED' })).success).toBe(
      false
    )
  })

  it('strips internal API fields instead of exposing an unknown-key bag', () => {
    const result = InvoiceSchema.parse(invoice())

    expect(result).not.toHaveProperty('tenantId')
    expect(result.customer).not.toHaveProperty('email')
    expect(result.lines[0]).not.toHaveProperty('invoiceId')
  })

  it('validates the invoice list envelope', () => {
    expect(
      InvoiceListSchema.safeParse({
        object: 'list',
        data: [invoice()],
        has_more: false,
        total_count: 1,
        url: '/api/v1/invoices',
      }).success
    ).toBe(true)
  })
})

describe('proposal document schemas', () => {
  it('validates quote projections including converted invoice metadata', () => {
    expect(
      QuoteSchema.safeParse({
        ...proposal('quote'),
        convertedInvoice: {
          id: 'inv_1',
          number: 'INV-0001',
          tenantId: 'ten_internal',
        },
      }).success
    ).toBe(true)
  })

  it('validates estimate projections', () => {
    expect(EstimateSchema.safeParse(proposal('estimate')).success).toBe(true)
  })
})
