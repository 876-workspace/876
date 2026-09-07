import { describe, expect, it } from 'vitest'

import {
  getInvoiceEditability,
  RESTRICTED_INVOICE_EDIT_FIELDS,
} from './invoice-editability'

describe('getInvoiceEditability', () => {
  it('allows editing DRAFT invoices', () =>
    expect(getInvoiceEditability('DRAFT').editable).toBe(true))
  it('allows editing OPEN invoices', () =>
    expect(getInvoiceEditability('OPEN').editable).toBe(true))
  it('allows editing SENT invoices', () =>
    expect(getInvoiceEditability('SENT').editable).toBe(true))
  it('allows editing PARTIALLY_PAID invoices', () =>
    expect(getInvoiceEditability('PARTIALLY_PAID').editable).toBe(true))
  it('allows editing OVERDUE invoices', () =>
    expect(getInvoiceEditability('OVERDUE').editable).toBe(true))
  it('prevents editing PAID invoices', () =>
    expect(getInvoiceEditability('PAID').editable).toBe(false))
  it('prevents editing UNCOLLECTIBLE invoices', () =>
    expect(getInvoiceEditability('UNCOLLECTIBLE').editable).toBe(false))
  it('prevents editing VOID invoices', () =>
    expect(getInvoiceEditability('VOID').editable).toBe(false))
  it('allows deleting DRAFT invoices', () =>
    expect(getInvoiceEditability('DRAFT').deletable).toBe(true))
  it('prevents deleting OPEN invoices', () =>
    expect(getInvoiceEditability('OPEN').deletable).toBe(false))
  it('prevents deleting SENT invoices', () =>
    expect(getInvoiceEditability('SENT').deletable).toBe(false))
  it('prevents deleting PARTIALLY_PAID invoices', () =>
    expect(getInvoiceEditability('PARTIALLY_PAID').deletable).toBe(false))
  it('prevents deleting OVERDUE invoices', () =>
    expect(getInvoiceEditability('OVERDUE').deletable).toBe(false))
  it('prevents deleting PAID invoices', () =>
    expect(getInvoiceEditability('PAID').deletable).toBe(false))
  it('prevents deleting UNCOLLECTIBLE invoices', () =>
    expect(getInvoiceEditability('UNCOLLECTIBLE').deletable).toBe(false))
  it('prevents deleting VOID invoices', () =>
    expect(getInvoiceEditability('VOID').deletable).toBe(false))
  it('uses exactly the four restricted fields for SENT invoices', () => {
    expect(getInvoiceEditability('SENT')).toEqual({
      editable: true,
      deletable: false,
      restricted: true,
      fields: RESTRICTED_INVOICE_EDIT_FIELDS,
    })
    expect(RESTRICTED_INVOICE_EDIT_FIELDS).toEqual([
      'dueAt',
      'notes',
      'terms',
      'referenceNumber',
    ])
  })
})
