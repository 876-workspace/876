/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { PaymentsTable, type PaymentRow } from './payments-table'

function formatAmount(amount: bigint | string, currency: string): string {
  return `${currency} ${(Number(amount) / 100).toFixed(2)}`
}

function formatDate(date: number | null): string {
  return date === null ? '—' : `day-${date}`
}

function payments(): PaymentRow[] {
  return [
    {
      id: 'pay_1',
      number: 'PAY-0001',
      customerName: 'Kingston Logistics',
      amount: '250000',
      currency: 'JMD',
      paymentDate: 1756000000,
      status: 'SUCCEEDED',
      depositAccountName: 'Operating account',
    },
    {
      id: 'pay_2',
      number: 'PAY-0002',
      customerName: 'Portmore Freight',
      amount: 99900n,
      currency: 'USD',
      paymentDate: null,
      status: 'PENDING',
      depositAccountName: 'Undeposited funds',
    },
  ]
}

function renderTable(baseHref = '/payments') {
  return render(
    <PaymentsTable
      payments={payments()}
      baseHref={baseHref}
      formatAmount={formatAmount}
      formatDate={formatDate}
    />
  )
}

describe('PaymentsTable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders a row per payment with its number and customer', () => {
    renderTable()

    expect(screen.getByText('PAY-0001')).toBeInTheDocument()
    expect(screen.getByText('Kingston Logistics')).toBeInTheDocument()
    expect(screen.getByText('PAY-0002')).toBeInTheDocument()
    expect(screen.getByText('Portmore Freight')).toBeInTheDocument()
  })

  it('links each payment under the host base href', () => {
    renderTable('/orgs/acme/workspace/billing/payments')

    expect(screen.getByRole('link', { name: 'PAY-0001' })).toHaveAttribute(
      'href',
      '/orgs/acme/workspace/billing/payments/pay_1'
    )
    expect(screen.getByRole('link', { name: 'PAY-0002' })).toHaveAttribute(
      'href',
      '/orgs/acme/workspace/billing/payments/pay_2'
    )
  })

  it('renders each amount in that payment’s own currency', () => {
    renderTable()

    expect(screen.getByText('JMD 2500.00')).toBeInTheDocument()
    expect(screen.getByText('USD 999.00')).toBeInTheDocument()
  })

  it('renders a missing payment date through the host formatter', () => {
    renderTable()

    expect(screen.getByText('day-1756000000')).toBeInTheDocument()
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders the deposit account and the status', () => {
    renderTable()

    expect(screen.getByText('Operating account')).toBeInTheDocument()
    expect(screen.getByText('SUCCEEDED')).toBeInTheDocument()
    expect(screen.getByText('PENDING')).toBeInTheDocument()
  })

  it('navigates to the payment when its row is clicked', async () => {
    const user = userEvent.setup()
    renderTable('/orgs/acme/workspace/billing/payments')

    await user.click(screen.getByText('Kingston Logistics'))

    expect(pushMock).toHaveBeenCalledTimes(1)
    expect(pushMock).toHaveBeenCalledWith(
      '/orgs/acme/workspace/billing/payments/pay_1'
    )
  })

  it('does not navigate twice when the row link itself is clicked', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('link', { name: 'PAY-0001' }))

    expect(pushMock).not.toHaveBeenCalled()
  })

  it('renders the host empty state when there are no payments', () => {
    render(
      <PaymentsTable
        payments={[]}
        baseHref="/payments"
        formatAmount={formatAmount}
        formatDate={formatDate}
        emptyState={<div>no-payments</div>}
      />
    )

    expect(screen.getByText('no-payments')).toBeInTheDocument()
  })
})
