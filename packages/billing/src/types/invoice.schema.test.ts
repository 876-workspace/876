import { describe, expect, it } from 'vitest'

import { InvoiceDetailSchema } from './invoice.schema'

function invoice() {
  return {
    object: 'invoice',
    id: 'inv_1',
    number: 'INV-001',
    status: 'OPEN',
    customerId: 'cus_1',
    currency: 'JMD',
    billingReason: 'MANUAL',
    subscriptionId: null,
    priceListId: null,
    salespersonId: null,
    customerName: null,
    customerEmail: null,
    billingAddressSnapshot: null,
    taxBehavior: 'EXCLUSIVE',
    subject: null,
    orderNumber: null,
    referenceNumber: null,
    paymentTermName: null,
    salespersonName: null,
    notes: null,
    terms: null,
    issueAt: null,
    dueAt: null,
    servicePeriodStart: null,
    servicePeriodEnd: null,
    subtotalAmount: '1000',
    taxAmount: '0',
    discountAmount: '0',
    shippingAmount: '0',
    adjustmentAmount: '0',
    totalAmount: '1000',
    amountDue: '1000',
    amountPaid: '0',
    amountCredited: '0',
    customer: {
      id: 'cus_1',
      name: 'Ada Lovelace',
      companyName: null,
      email: null,
      phone: null,
      addresses: [],
    },
    lines: [],
    lateFeeAssessment: null,
  }
}

const paymentAllocation = {
  object: 'payment_allocation',
  id: 'palloc_1',
  amount: '1000',
  createdAt: 1_700_000_000,
  updatedAt: 1_700_000_001,
  payment: {
    object: 'payment',
    id: 'pay_1',
    number: 'PAY-001',
    paymentDate: 1_700_000_000,
    currency: 'JMD',
    referenceNumber: null,
    status: 'SUCCEEDED',
    paymentMode: { id: 'pmode_1', name: 'Bank transfer' },
  },
}

const creditNoteAllocation = {
  object: 'credit_note_allocation',
  id: 'cnalloc_1',
  amount: '500',
  createdAt: 1_700_000_000,
  updatedAt: 1_700_000_001,
  creditNote: {
    object: 'credit_note',
    id: 'cn_1',
    number: 'CN-001',
    issueAt: 1_700_000_000,
    currency: 'JMD',
  },
}

describe('InvoiceDetailSchema payment history', () => {
  it('parses present payment and credit note allocations', () => {
    const parsed = InvoiceDetailSchema.parse({
      ...invoice(),
      paymentAllocations: [paymentAllocation],
      creditNoteAllocations: [creditNoteAllocation],
    })

    expect(parsed.paymentAllocations).toEqual([paymentAllocation])
    expect(parsed.creditNoteAllocations).toEqual([creditNoteAllocation])
  })

  it('defaults allocations omitted by an older API to empty arrays', () => {
    const parsed = InvoiceDetailSchema.parse(invoice())

    expect(parsed.paymentAllocations).toEqual([])
    expect(parsed.creditNoteAllocations).toEqual([])
  })

  it('parses explicitly empty allocation arrays', () => {
    const parsed = InvoiceDetailSchema.parse({
      ...invoice(),
      paymentAllocations: [],
      creditNoteAllocations: [],
    })

    expect(parsed.paymentAllocations).toEqual([])
    expect(parsed.creditNoteAllocations).toEqual([])
  })

  it('rejects a malformed payment allocation', () => {
    const parsed = InvoiceDetailSchema.safeParse({
      ...invoice(),
      paymentAllocations: [{ ...paymentAllocation, amount: 1000 }],
      creditNoteAllocations: [],
    })

    expect(parsed.success).toBe(false)
  })
})
