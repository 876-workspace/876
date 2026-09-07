import { describe, expect, it } from 'vitest'

import {
  documentStatusVariant,
  INVOICE_STATUS_OPTIONS,
  INVOICE_STATUS_VALUES,
  resolveInvoiceStatus,
} from './document-status'

describe('documentStatusVariant', () => {
  it.each(['PAID', 'ACCEPTED', 'CLOSED'])('reads %s as success', (status) => {
    expect(documentStatusVariant(status)).toBe('success')
  })

  it.each(['OPEN', 'SENT', 'ISSUED'])('reads %s as info', (status) => {
    expect(documentStatusVariant(status)).toBe('info')
  })

  it.each(['PAST_DUE', 'OVERDUE', 'EXPIRED'])('warns on %s', (status) => {
    expect(documentStatusVariant(status)).toBe('warning')
  })

  it.each(['VOID', 'UNCOLLECTIBLE', 'DECLINED', 'REJECTED'])(
    'reads %s as destructive',
    (status) => {
      expect(documentStatusVariant(status)).toBe('destructive')
    }
  )

  it('is case-insensitive, since hosts hold status in both cases', () => {
    expect(documentStatusVariant('paid')).toBe('success')
    expect(documentStatusVariant('Past_Due')).toBe('warning')
  })

  it('falls back to secondary for an unknown status rather than throwing', () => {
    expect(documentStatusVariant('SOMETHING_NEW')).toBe('secondary')
  })

  it('falls back to secondary for an empty status', () => {
    expect(documentStatusVariant('')).toBe('secondary')
  })
})

describe('invoice status filter options and resolver', () => {
  it('contains exactly 9 entries in INVOICE_STATUS_OPTIONS', () => {
    expect(INVOICE_STATUS_OPTIONS).toHaveLength(9)
  })

  it('has values equal in order to all, draft, open, sent, partially_paid, overdue, paid, uncollectible, void', () => {
    expect(INVOICE_STATUS_OPTIONS.map((option) => option.value)).toEqual([
      'all',
      'draft',
      'open',
      'sent',
      'partially_paid',
      'overdue',
      'paid',
      'uncollectible',
      'void',
    ])
  })

  it('lowercases every non-all value from a real InvoiceStatus enum member', () => {
    const expectedFromPrismaEnum = [
      'DRAFT',
      'OPEN',
      'SENT',
      'PARTIALLY_PAID',
      'OVERDUE',
      'PAID',
      'UNCOLLECTIBLE',
      'VOID',
    ].map((s) => s.toLowerCase())

    const nonAllValues = INVOICE_STATUS_OPTIONS.filter(
      (option) => option.value !== 'all'
    ).map((option) => option.value)

    expect(nonAllValues).toEqual(expectedFromPrismaEnum)
    expect(nonAllValues).toEqual([
      'draft',
      'open',
      'sent',
      'partially_paid',
      'overdue',
      'paid',
      'uncollectible',
      'void',
    ])
  })

  it('excludes all from INVOICE_STATUS_VALUES and has 8 entries', () => {
    expect(INVOICE_STATUS_VALUES).not.toContain('all')
    expect(INVOICE_STATUS_VALUES).toHaveLength(8)
    expect(INVOICE_STATUS_VALUES).toEqual([
      'draft',
      'open',
      'sent',
      'partially_paid',
      'overdue',
      'paid',
      'uncollectible',
      'void',
    ])
  })

  it("resolves partially_paid to 'partially_paid'", () => {
    expect(resolveInvoiceStatus('partially_paid')).toBe('partially_paid')
  })

  it("resolves uncollectible to 'uncollectible'", () => {
    expect(resolveInvoiceStatus('uncollectible')).toBe('uncollectible')
  })

  it("resolves bogus to 'all'", () => {
    expect(resolveInvoiceStatus('bogus')).toBe('all')
  })

  it("resolves null and undefined to 'all'", () => {
    expect(resolveInvoiceStatus(null)).toBe('all')
    expect(resolveInvoiceStatus(undefined)).toBe('all')
  })

  it('has non-empty label and headingLabel for every option', () => {
    for (const option of INVOICE_STATUS_OPTIONS) {
      expect(typeof option.label).toBe('string')
      expect(option.label.length).toBeGreaterThan(0)
      expect(typeof option.headingLabel).toBe('string')
      expect(option.headingLabel.length).toBeGreaterThan(0)
    }
  })
})
