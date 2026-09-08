/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PaymentDetailCard, type PaymentDetailView } from './payment-detail-card'

const payment: PaymentDetailView = {
  id: 'pay_1',
  number: 'PAY-001',
  status: 'PARTIALLY_REFUNDED',
  customerName: 'Acme Ltd',
  paymentDate: '8 Sep 2026',
  received: 'J$150.00',
  allocated: 'J$100.00',
  unapplied: 'J$30.00',
  refunded: 'J$20.00',
  bankCharges: 'J$0.00',
  paymentMode: 'Bank transfer',
  depositAccount: 'Main bank',
  reference: 'BANK-123',
  notes: 'Partial return requested.',
  allocations: [
    {
      id: 'alloc_1',
      invoiceId: 'inv_1',
      invoiceNumber: 'INV-001',
      invoiceStatus: 'PARTIALLY_PAID',
      amount: 'J$100.00',
      href: '/invoices/inv_1',
    },
  ],
  refunds: [
    {
      id: 'ref_1',
      number: 'REF-001',
      amount: 'J$20.00',
      date: '8 Sep 2026',
      reason: 'Duplicate payment',
    },
  ],
}

describe('PaymentDetailCard', () => {
  it('renders refund evidence and host-provided mutation links', () => {
    render(
      <PaymentDetailCard
        payment={payment}
        closeHref="/payments"
        editHref="/payments/pay_1/edit"
        refundHref="/payments/pay_1/refund"
      />
    )

    expect(screen.getByText('Partially refunded')).toBeVisible()
    expect(screen.getByText('REF-001')).toBeVisible()
    expect(screen.getByText('Duplicate payment')).toBeVisible()
    expect(screen.getAllByText('J$20.00')).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Refund' })).toHaveAttribute(
      'href',
      '/payments/pay_1/refund'
    )
    expect(screen.getByRole('link', { name: 'Edit' })).toHaveAttribute(
      'href',
      '/payments/pay_1/edit'
    )
    expect(screen.getByRole('link', { name: /INV-001/i })).toHaveAttribute(
      'href',
      '/invoices/inv_1'
    )
  })

  it('omits mutation actions when the host does not authorize them', () => {
    render(<PaymentDetailCard payment={payment} closeHref="/payments" />)

    expect(screen.queryByRole('link', { name: 'Refund' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
  })
})
