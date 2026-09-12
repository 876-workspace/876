import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import {
  InvoiceDocumentPanel,
  type InvoiceDocumentPanelProps,
  type InvoiceDocumentSeller,
} from './invoice-document-panel'

function props(
  overrides: Partial<InvoiceDocumentPanelProps['invoice']> = {},
  seller: Partial<InvoiceDocumentSeller> = {}
): InvoiceDocumentPanelProps {
  return {
    seller: { name: '876', countryLabel: 'Jamaica', ...seller },
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
  it('omits the discount and tax columns when no line uses them', () => {
    render(<InvoiceDocumentPanel {...props()} />)

    expect(
      screen.queryByRole('columnheader', { name: 'Discount' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: 'Tax' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Description' })
    ).toBeInTheDocument()
  })

  it('renders the tax column when a line carries tax', () => {
    const base = props()
    render(
      <InvoiceDocumentPanel
        {...base}
        invoice={{
          ...base.invoice,
          lines: [{ ...base.invoice.lines[0], taxAmount: '$1.50' }],
        }}
      />
    )

    expect(
      screen.getByRole('columnheader', { name: 'Tax' })
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: 'Discount' })
    ).not.toBeInTheDocument()
    expect(screen.getByText('$1.50')).toBeInTheDocument()
  })

  it('renders the discount column when a line carries a discount', () => {
    const base = props()
    render(
      <InvoiceDocumentPanel
        {...base}
        invoice={{
          ...base.invoice,
          lines: [{ ...base.invoice.lines[0], discountAmount: '$2.00' }],
        }}
      />
    )

    expect(
      screen.getByRole('columnheader', { name: 'Discount' })
    ).toBeInTheDocument()
    expect(screen.getByText('−$2.00')).toBeInTheDocument()
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

  it('renders the organization logo above the seller name', () => {
    // ARRANGE
    const { container } = render(
      <InvoiceDocumentPanel
        {...props({}, { logoUrl: 'https://cdn.876.test/orgs/876.png' })}
      />
    )

    // ACT
    const logo = container.querySelector('img')

    // ASSERT
    expect(logo).toHaveAttribute('src', 'https://cdn.876.test/orgs/876.png')
    expect(
      logo!.compareDocumentPosition(screen.getByText('876')) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()

    // AFTER — testing-library performs cleanup.
  })

  it('renders the seller name alone when the organization has no logo', () => {
    // ARRANGE
    const { container } = render(
      <InvoiceDocumentPanel {...props({}, { logoUrl: null })} />
    )

    // ACT
    const logo = container.querySelector('img')

    // ASSERT
    expect(logo).not.toBeInTheDocument()
    expect(screen.getByText('876')).toBeVisible()

    // AFTER — testing-library performs cleanup.
  })

  it('renders the balance due under the invoice number', () => {
    // ARRANGE
    render(<InvoiceDocumentPanel {...props({ amountDue: '$11.00' })} />)

    // ACT
    const callout = screen.getByText('Balance due').parentElement

    // ASSERT
    expect(callout).toHaveTextContent('$11.00')

    // AFTER — testing-library performs cleanup.
  })

  it('renders the status ribbon with the current status', () => {
    // ARRANGE
    const { container } = render(
      <InvoiceDocumentPanel {...props({ status: 'PARTIALLY_PAID' })} />
    )

    // ACT
    const ribbon = container.querySelector('[data-document-ribbon]')

    // ASSERT
    expect(ribbon).toHaveAttribute('data-document-ribbon', 'PARTIALLY_PAID')
    expect(ribbon).toHaveTextContent('partially paid')
    expect(ribbon).toHaveAttribute('aria-hidden', 'true')

    // AFTER — testing-library performs cleanup.
  })

  it('keeps one status label in the document instead of two', () => {
    // ARRANGE
    render(<InvoiceDocumentPanel {...props({ status: 'UNCOLLECTIBLE' })} />)

    // ACT
    const statusLabels = screen.getAllByText('uncollectible')

    // ASSERT
    expect(statusLabels).toHaveLength(1)

    // AFTER — testing-library performs cleanup.
  })

  it('carries the status colour of the shared document variant', () => {
    // ARRANGE
    const { container } = render(
      <InvoiceDocumentPanel {...props({ status: 'PAID' })} />
    )

    // ACT
    const ribbonLabel = container.querySelector('[data-document-ribbon] span')

    // ASSERT
    expect(ribbonLabel).toHaveClass('bg-success')

    // AFTER — testing-library performs cleanup.
  })

  it('renders the seller address and contact details when present', () => {
    // ARRANGE
    render(
      <InvoiceDocumentPanel
        {...props(
          {},
          {
            email: 'billing@876.test',
            phone: '+1 876 555 0100',
            address: {
              line1: '14 Harbour Street',
              line2: 'Suite 4',
              city: 'Kingston',
              countryLabel: 'Jamaica',
            },
          }
        )}
      />
    )

    // ACT
    const line1 = screen.getByText('14 Harbour Street')

    // ASSERT
    expect(line1).toBeVisible()
    expect(screen.getByText('Suite 4')).toBeVisible()
    expect(screen.getByText('Kingston, Jamaica')).toBeVisible()
    expect(screen.getByText('+1 876 555 0100')).toBeVisible()
    expect(screen.getByText('billing@876.test')).toBeVisible()

    // AFTER — testing-library performs cleanup.
  })

  it('falls back to the country when the organization has no address', () => {
    // ARRANGE
    render(
      <InvoiceDocumentPanel {...props({}, { countryLabel: 'Barbados' })} />
    )

    // ACT
    const country = screen.getByText('Barbados')

    // ASSERT
    expect(country).toBeVisible()

    // AFTER — testing-library performs cleanup.
  })

  it('omits the seller address block when the organization has neither', () => {
    // ARRANGE
    render(<InvoiceDocumentPanel {...props({}, { countryLabel: null })} />)

    // ACT
    const name = screen.getByText('876')

    // ASSERT
    expect(name.nextElementSibling).toBeNull()

    // AFTER — testing-library performs cleanup.
  })
})
