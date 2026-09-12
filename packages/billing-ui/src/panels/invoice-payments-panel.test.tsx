import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import { describe, expect, it, vi } from 'vitest'

import {
  InvoicePaymentsPanel,
  InvoicePaymentsPanelSkeleton,
  type InvoicePaymentsPanelProps,
} from './invoice-payments-panel'

const data = {
  payments: [
    {
      id: 'pay_1',
      date: '12 Sep 2026',
      number: 'PAY-001',
      reference: null,
      mode: 'Bank transfer',
      amount: '$300.00',
      status: 'OVERDUE',
    },
  ],
  creditNotes: [
    {
      id: 'cn_1',
      date: '11 Sep 2026',
      number: 'CN-001',
      amount: 'J$5.00',
    },
  ],
}

function renderPanel(
  state: InvoicePaymentsPanelProps['state'] = { status: 'ready', data }
) {
  return render(
    <InvoicePaymentsPanel
      title="Payments received"
      state={state}
      hrefForPayment={(id) => `/workspace/payments/${id}`}
      hrefForCreditNote={(id) => `/workspace/credit-notes/${id}`}
    />
  )
}

describe('InvoicePaymentsPanel', () => {
  it('renders ready payment and credit note rows', () => {
    renderPanel()

    expect(screen.getByText('PAY-001')).toBeInTheDocument()
    expect(screen.getByText('CN-001')).toBeInTheDocument()
    expect(screen.getByText('—')).toHaveClass('text-muted-foreground')
    expect(screen.getByText('$300.00')).toHaveClass('tabular-nums')
    expect(screen.getByText('OVERDUE')).toHaveAttribute('data-slot', 'badge')
  })

  it('opens by default with a count badge and the payment ledger columns', () => {
    renderPanel()

    expect(screen.getByText('1')).toHaveAttribute('data-slot', 'badge')
    expect(
      screen.getByRole('button', { name: /Payments received/ })
    ).toHaveAttribute('aria-expanded', 'true')
    for (const column of [
      'DATE',
      'PAYMENT #',
      'REFERENCE#',
      'STATUS',
      'PAYMENT MODE',
      'AMOUNT',
    ])
      expect(screen.getAllByText(column).length).toBeGreaterThan(0)
  })

  it('renders nothing when a loaded invoice has no payments or credits', () => {
    const { container } = renderPanel({
      status: 'ready',
      data: { payments: [], creditNotes: [] },
    })

    expect(container).toBeEmptyDOMElement()
    expect(screen.queryByText('Payments received')).not.toBeInTheDocument()
  })

  it('renders nothing for an explicitly empty state', () => {
    const { container } = renderPanel({ status: 'empty' })

    expect(container).toBeEmptyDOMElement()
  })

  it('still renders a failed load rather than hiding it', () => {
    renderPanel({
      status: 'error',
      error: { code: 'payments/unavailable', message: 'Payments unavailable' },
    })

    expect(screen.getByText('Payments unavailable')).toBeInTheDocument()
    expect(screen.queryByText('No payments yet.')).not.toBeInTheDocument()
  })

  it('renders its skeleton', () => {
    render(<InvoicePaymentsPanelSkeleton />)

    expect(screen.getByLabelText('Loading panel')).toBeInTheDocument()
  })

  it('invokes payment href builders with the payment id', () => {
    const hrefForPayment = vi.fn((id: string) => `/payments/${id}`)
    render(
      <InvoicePaymentsPanel
        title="Payments received"
        state={{ status: 'ready', data }}
        hrefForPayment={hrefForPayment}
        hrefForCreditNote={(id) => `/credit-notes/${id}`}
      />
    )

    expect(hrefForPayment).toHaveBeenCalledWith('pay_1')
  })

  it('invokes credit note href builders with the credit note id', () => {
    const hrefForCreditNote = vi.fn((id: string) => `/credit-notes/${id}`)
    render(
      <InvoicePaymentsPanel
        title="Payments received"
        state={{ status: 'ready', data }}
        hrefForPayment={(id) => `/payments/${id}`}
        hrefForCreditNote={hrefForCreditNote}
      />
    )

    expect(hrefForCreditNote).toHaveBeenCalledWith('cn_1')
  })

  it('hides the credit note section when there are no credit notes', () => {
    renderPanel({
      status: 'ready',
      data: { payments: data.payments, creditNotes: [] },
    })

    expect(screen.queryByText('Credit notes applied')).not.toBeInTheDocument()
  })

  it('does not hard-code a payments route', () => {
    expect(
      readFileSync('src/panels/invoice-payments-panel.tsx', 'utf8')
    ).not.toMatch(/href=["']\/payments\//)
  })
})
