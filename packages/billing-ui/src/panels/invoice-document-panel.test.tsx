import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import {
  InvoiceDocumentPanel,
  type InvoiceDocumentPanelProps,
} from './invoice-document-panel'

function props(
  overrides: Partial<InvoiceDocumentPanelProps['invoice']> = {}
): InvoiceDocumentPanelProps {
  return {
    seller: { name: '876', countryLabel: 'Jamaica' },
    recipient: {
      name: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '555-0100',
      address: null,
    },
    meta: [{ label: 'Invoice date', value: 'Sep 11, 2026' }],
    footer: <p>Manual invoice</p>,
    invoice: {
      number: 'INV-1',
      status: 'DRAFT',
      subject: null,
      subtotalAmount: '$10.00',
      taxAmount: '$1.00',
      discountAmount: null,
      shippingAmount: null,
      adjustmentAmount: null,
      totalAmount: '$11.00',
      amountCredited: null,
      amountPaid: null,
      amountDue: '$11.00',
      notes: null,
      terms: null,
      lines: [
        {
          id: 'line_1',
          description: 'Consulting',
          quantity: 1,
          servicePeriod: null,
          unitAmount: '$10.00',
          discountAmount: null,
          taxAmount: null,
          totalAmount: '$10.00',
        },
      ],
      ...overrides,
    },
  }
}

describe('InvoiceDocumentPanel', () => {
  it('renders a subject when supplied', () => {
    render(
      <InvoiceDocumentPanel {...props({ subject: 'September retainer' })} />
    )
    expect(screen.getByText('September retainer')).toBeInTheDocument()
  })
  it('omits a subject when absent', () => {
    render(<InvoiceDocumentPanel {...props()} />)
    expect(screen.queryByText('September retainer')).not.toBeInTheDocument()
  })
  it('renders an order number meta row', () => {
    render(
      <InvoiceDocumentPanel
        {...props()}
        meta={[{ label: 'Order number', value: 'PO-4' }]}
      />
    )
    expect(screen.getByText('PO-4')).toBeInTheDocument()
  })
  it('renders a reference meta row', () => {
    render(
      <InvoiceDocumentPanel
        {...props()}
        meta={[{ label: 'Reference', value: 'REF-4' }]}
      />
    )
    expect(screen.getByText('REF-4')).toBeInTheDocument()
  })
  it('renders payment terms and salesperson meta rows', () => {
    render(
      <InvoiceDocumentPanel
        {...props()}
        meta={[
          { label: 'Payment terms', value: 'Net 30' },
          { label: 'Salesperson', value: 'Grace' },
        ]}
      />
    )
    expect(screen.getByText('Net 30')).toBeInTheDocument()
    expect(screen.getByText('Grace')).toBeInTheDocument()
  })
  it('renders a service period meta row', () => {
    render(
      <InvoiceDocumentPanel
        {...props()}
        meta={[{ label: 'Service period', value: 'Sep 1 – Sep 30' }]}
      />
    )
    expect(screen.getByText('Sep 1 – Sep 30')).toBeInTheDocument()
  })
  it('renders a line service period when supplied', () => {
    render(
      <InvoiceDocumentPanel
        {...props({
          lines: [
            { ...props().invoice.lines[0], servicePeriod: 'Sep 1 – Sep 30' },
          ],
        })}
      />
    )
    expect(screen.getByText('Sep 1 – Sep 30')).toBeInTheDocument()
  })
  it('omits a line service period when absent', () => {
    render(<InvoiceDocumentPanel {...props()} />)
    expect(screen.queryByText('Sep 1 – Sep 30')).not.toBeInTheDocument()
  })
  it('renders notes and terms when supplied', () => {
    render(
      <InvoiceDocumentPanel
        {...props({ notes: 'Thank you.', terms: 'Due on receipt.' })}
      />
    )
    expect(screen.getByText('Thank you.')).toBeInTheDocument()
    expect(screen.getByText('Due on receipt.')).toBeInTheDocument()
  })
  it('renders discount shipping and adjustment when supplied', () => {
    render(
      <InvoiceDocumentPanel
        {...props({
          discountAmount: '$1.00',
          shippingAmount: '$2.00',
          adjustmentAmount: '$3.00',
        })}
      />
    )
    expect(screen.getByText('Invoice discount')).toBeInTheDocument()
    expect(screen.getByText('Shipping')).toBeInTheDocument()
    expect(screen.getByText('Adjustment')).toBeInTheDocument()
  })
  it('renders credits and payments when supplied', () => {
    render(
      <InvoiceDocumentPanel
        {...props({ amountCredited: '$1.00', amountPaid: '$2.00' })}
      />
    )
    expect(screen.getByText('Credits applied')).toBeInTheDocument()
    expect(screen.getByText('Payments received')).toBeInTheDocument()
  })
  it('renders a document table with no lines', () => {
    render(<InvoiceDocumentPanel {...props({ lines: [] })} />)
    expect(
      screen.getByRole('columnheader', { name: 'Description' })
    ).toBeInTheDocument()
  })
  it('omits optional summary rows when their amounts are absent', () => {
    render(<InvoiceDocumentPanel {...props()} />)
    expect(screen.queryByText('Invoice discount')).not.toBeInTheDocument()
    expect(screen.queryByText('Shipping')).not.toBeInTheDocument()
  })
  it('keeps monetary display values typed as formatted strings', () => {
    expect(
      readFileSync('src/panels/invoice-document-panel.tsx', 'utf8')
    ).not.toMatch(/Amount: number|amount: number/)
  })
})
