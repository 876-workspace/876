import type { Invoice } from '@876/billing'
import { describe, expect, it } from 'vitest'

import { formatAmount, formatDate, toInvoiceRow } from './invoice-row'

function createInvoice(overrides: Record<string, unknown> = {}): Invoice {
  return {
    object: 'invoice',
    id: 'inv_2kL9mN4q',
    number: 'INV-000123',
    status: 'SENT',
    currency: 'JMD',
    totalAmount: '4500000',
    customerName: 'Alejandra Reyes',
    dueAt: 1_760_000_000,
    ...overrides,
  }
}

describe('toInvoiceRow', () => {
  it('narrows a full passthrough invoice to the rendered fields', () => {
    const row = toInvoiceRow(createInvoice())

    expect(row).toEqual({
      id: 'inv_2kL9mN4q',
      number: 'INV-000123',
      status: 'SENT',
      currency: 'JMD',
      totalAmount: '4500000',
      customerName: 'Alejandra Reyes',
      dueAt: 1_760_000_000,
    })
  })

  it('falls back to the id when the API omits the invoice number', () => {
    const row = toInvoiceRow(createInvoice({ number: undefined }))

    expect(row.number).toBe('inv_2kL9mN4q')
  })

  it('falls back to the id when the number is an empty string', () => {
    const row = toInvoiceRow(createInvoice({ number: '' }))

    expect(row.number).toBe('inv_2kL9mN4q')
  })

  it('reports an unknown status rather than rendering a blank badge', () => {
    const row = toInvoiceRow(createInvoice({ status: null }))

    expect(row.status).toBe('unknown')
  })

  it('stringifies a numeric total so BigInt serialization is tolerated', () => {
    const row = toInvoiceRow(createInvoice({ totalAmount: 4500000 }))

    expect(row.totalAmount).toBe('4500000')
  })

  it('nulls the optional fields the API may omit entirely', () => {
    const row = toInvoiceRow(
      createInvoice({
        currency: undefined,
        totalAmount: undefined,
        customerName: undefined,
        dueAt: undefined,
      })
    )

    expect(row.currency).toBeNull()
    expect(row.totalAmount).toBeNull()
    expect(row.customerName).toBeNull()
    expect(row.dueAt).toBeNull()
  })

  it('rejects a non-numeric dueAt rather than passing it to Date', () => {
    const row = toInvoiceRow(createInvoice({ dueAt: '1760000000' }))

    expect(row.dueAt).toBeNull()
  })
})

describe('formatAmount', () => {
  it('renders minor units as major-unit currency', () => {
    expect(formatAmount('4500000', 'JMD')).toBe('$45,000.00')
  })

  it('renders a bare decimal when the currency is unknown', () => {
    expect(formatAmount('4500000', null)).toBe('45000.00')
  })

  it('renders an em dash when the amount is absent', () => {
    expect(formatAmount(null, 'JMD')).toBe('—')
  })

  it('renders an em dash when the amount is not a number', () => {
    expect(formatAmount('not-an-amount', 'JMD')).toBe('—')
  })

  it('falls back to a prefixed decimal for an invalid currency code', () => {
    expect(formatAmount('4500000', 'NOT_A_CURRENCY')).toBe(
      'NOT_A_CURRENCY 45000.00'
    )
  })
})

describe('formatDate', () => {
  it('renders an em dash when the timestamp is absent', () => {
    expect(formatDate(null)).toBe('—')
  })

  it('formats a Unix-seconds timestamp as a short date', () => {
    expect(formatDate(1_760_000_000)).toBe('9 Oct 2025')
  })
})
