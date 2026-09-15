import type { BillingInvoice } from '@876/billing/integration'
import type { InvoiceDocumentSeller } from '@876/billing-ui/panels/invoice-document-panel'
import { describe, expect, it } from 'vitest'

import { formatDate, formatMoney } from '@/lib/finance/format'

import { toInvoiceDocumentProps } from './invoice-document'

const seller: InvoiceDocumentSeller = {
  name: 'Island Logistics',
  countryLabel: 'Jamaica',
  logoUrl: null,
  email: null,
  phone: null,
  address: null,
}

function line(overrides: Record<string, unknown> = {}) {
  return {
    object: 'invoice_line',
    id: 'line_1',
    itemId: null,
    priceId: null,
    description: 'Courier delivery',
    unit: null,
    position: 1,
    quantity: 2,
    unitAmount: '50000',
    taxAmount: '7500',
    discountAmount: '5000',
    totalAmount: '102500',
    createdAt: 1756684800,
    updatedAt: 1756684800,
    ...overrides,
  }
}

function invoice(overrides: Record<string, unknown> = {}): BillingInvoice {
  return {
    object: 'invoice',
    id: 'inv_1',
    source: null,
    customerId: 'cus_1',
    quoteId: null,
    subscriptionId: null,
    number: 'INV-1042',
    status: 'SENT',
    billingReason: 'manual',
    currency: 'JMD',
    orderNumber: null,
    referenceNumber: null,
    subject: 'August deliveries',
    taxBehavior: 'EXCLUSIVE',
    issueAt: 1756684800,
    dueAt: 1759276800,
    sentAt: null,
    paidAt: null,
    voidedAt: null,
    subtotalAmount: '250000',
    taxAmount: '37500',
    discountAmount: '10000',
    shippingAmount: '5000',
    adjustmentAmount: '0',
    totalAmount: '287500',
    amountDue: '100000',
    amountPaid: '187500',
    amountCredited: '0',
    amountWrittenOff: '0',
    notes: 'Thanks for your business.',
    terms: 'Due in 30 days.',
    metadata: null,
    createdAt: 1756684800,
    updatedAt: 1756684800,
    customer: { object: 'customer', id: 'cus_1', name: 'Alejandra Reyes' },
    lines: [line()],
    ...overrides,
  } as BillingInvoice
}

describe('toInvoiceDocumentProps', () => {
  it('maps a realistic invoice to the full panel props', () => {
    const inv = invoice()
    expect(toInvoiceDocumentProps(inv, seller)).toEqual({
      invoice: {
        number: 'INV-1042',
        status: 'SENT',
        subject: 'August deliveries',
        subtotalAmount: formatMoney('250000', 'JMD'),
        taxAmount: formatMoney('37500', 'JMD'),
        discountAmount: formatMoney('10000', 'JMD'),
        shippingAmount: formatMoney('5000', 'JMD'),
        adjustmentAmount: null,
        totalAmount: formatMoney('287500', 'JMD'),
        amountCredited: null,
        amountPaid: formatMoney('187500', 'JMD'),
        amountDue: formatMoney('100000', 'JMD'),
        notes: 'Thanks for your business.',
        terms: 'Due in 30 days.',
        lines: [
          {
            id: 'line_1',
            description: 'Courier delivery',
            quantity: 2,
            servicePeriod: null,
            unitAmount: formatMoney('50000', 'JMD'),
            discountAmount: formatMoney('5000', 'JMD'),
            taxAmount: formatMoney('7500', 'JMD'),
            totalAmount: formatMoney('102500', 'JMD'),
          },
        ],
      },
      recipient: {
        name: 'Alejandra Reyes',
        email: null,
        phone: null,
        address: null,
      },
      meta: [
        { label: 'Invoice date', value: formatDate(1756684800) },
        { label: 'Due date', value: formatDate(1759276800) },
      ],
    })
  })

  it('maps missing lines to an empty array', () => {
    const { lines: _dropped, ...rest } = invoice()
    const inv = { ...rest } as BillingInvoice
    delete inv.lines
    expect(toInvoiceDocumentProps(inv, seller).invoice.lines).toEqual([])
  })

  it('maps zero tax and discount to null', () => {
    const inv = invoice({
      discountAmount: '0',
      shippingAmount: '0',
      amountCredited: '0',
      amountPaid: '0',
      lines: [line({ taxAmount: '0', discountAmount: '0' })],
    })
    const props = toInvoiceDocumentProps(inv, seller)
    expect(props.invoice.discountAmount).toBeNull()
    expect(props.invoice.shippingAmount).toBeNull()
    expect(props.invoice.amountCredited).toBeNull()
    expect(props.invoice.amountPaid).toBeNull()
    expect(props.invoice.lines[0]?.discountAmount).toBeNull()
    expect(props.invoice.lines[0]?.taxAmount).toBeNull()
  })

  it('falls back to the customer id when the customer name is missing', () => {
    const { customer: _dropped, ...rest } = invoice()
    const inv = { ...rest, customerId: 'cus_9' } as BillingInvoice
    delete (inv as { customer?: unknown }).customer
    expect(toInvoiceDocumentProps(inv, seller).recipient.name).toBe('cus_9')
  })

  it('never invents recipient email, phone, or address', () => {
    const props = toInvoiceDocumentProps(invoice(), seller)
    expect(props.recipient.email).toBeNull()
    expect(props.recipient.phone).toBeNull()
    expect(props.recipient.address).toBeNull()
  })

  it('omits optional dates when absent', () => {
    const props = toInvoiceDocumentProps(invoice(), seller)
    expect(props.meta).toHaveLength(2)
  })

  it('includes sent and paid dates only when present', () => {
    const props = toInvoiceDocumentProps(
      invoice({ sentAt: 1756771200, paidAt: 1756857600 }),
      seller
    )
    expect(props.meta).toEqual([
      { label: 'Invoice date', value: formatDate(1756684800) },
      { label: 'Due date', value: formatDate(1759276800) },
      { label: 'Sent date', value: formatDate(1756771200) },
      { label: 'Paid date', value: formatDate(1756857600) },
    ])
  })

  it('passes a security-corpus line description through verbatim', () => {
    const payload = '<script>alert(1)</script>'
    const props = toInvoiceDocumentProps(
      invoice({ lines: [line({ description: payload })] }),
      seller
    )
    expect(props.invoice.lines[0]?.description).toBe(payload)
  })

  it('falls back to Item for a missing line description', () => {
    const props = toInvoiceDocumentProps(
      invoice({ lines: [line({ description: '' })] }),
      seller
    )
    expect(props.invoice.lines[0]?.description).toBe('Item')
  })

  it('maps absent subject, notes, and terms to null', () => {
    const props = toInvoiceDocumentProps(
      invoice({ subject: null, notes: null, terms: null }),
      seller
    )
    expect(props.invoice.subject).toBeNull()
    expect(props.invoice.notes).toBeNull()
    expect(props.invoice.terms).toBeNull()
  })

  it('does not mutate its input', () => {
    const inv = invoice()
    const snapshot = structuredClone(inv)
    toInvoiceDocumentProps(inv, seller)
    expect(inv).toEqual(snapshot)
  })
})
