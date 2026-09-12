import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it } from 'vitest'

import { InvoiceNextActionPanel } from './invoice-next-action-panel'

describe('InvoiceNextActionPanel', () => {
  it('renders the overdue payment action and disabled reminder', () => {
    render(
      <InvoiceNextActionPanel
        status="OVERDUE"
        recordPaymentHref="/payments/new?invoiceId=inv_1"
      />
    )

    expect(screen.getByText('Payment is overdue')).toBeInTheDocument()
    // "What's next" was the reference product's label; it announces a prompt
    // instead of saying anything, so it must not come back.
    expect(screen.queryByText(/what.s next/i)).not.toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'Record payment' })
    ).toHaveAttribute('href', '/payments/new?invoiceId=inv_1')
    expect(screen.getByRole('button', { name: 'Send reminder' })).toBeDisabled()
  })

  it('shows the outstanding balance when one is supplied', () => {
    render(
      <InvoiceNextActionPanel
        status="PARTIALLY_PAID"
        recordPaymentHref="/invoices/inv_1/payments/new"
        balance="$4,700.00"
      />
    )

    expect(screen.getByText('$4,700.00 outstanding')).toBeInTheDocument()
    expect(screen.getByText('Awaiting payment')).toBeInTheDocument()
  })

  it('omits the balance line when none is supplied', () => {
    render(
      <InvoiceNextActionPanel
        status="OVERDUE"
        recordPaymentHref="/invoices/inv_1/payments/new"
      />
    )

    expect(screen.queryByText(/outstanding/)).not.toBeInTheDocument()
  })

  it('does not render for a non-collectible invoice', () => {
    const { container } = render(
      <InvoiceNextActionPanel
        status="PAID"
        recordPaymentHref="/payments/new?invoiceId=inv_1"
      />
    )

    expect(container).toBeEmptyDOMElement()
  })
})
