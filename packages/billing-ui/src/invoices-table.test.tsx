/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { InvoicesTable, type InvoiceRow } from './invoices-table'

function formatAmount(amount: bigint | string, currency: string): string {
  return `${currency} ${(Number(amount) / 100).toFixed(2)}`
}

function invoices(overrides: Partial<InvoiceRow>[] = []): InvoiceRow[] {
  const base: InvoiceRow[] = [
    {
      id: 'inv_1',
      number: 'INV-0001',
      totalAmount: '250000',
      amountDue: '100000',
      currency: 'JMD',
      status: 'PAST_DUE',
      customer: { name: 'Alejandra Reyes' },
    },
    {
      id: 'inv_2',
      number: 'INV-0002',
      totalAmount: 75000n,
      currency: 'JMD',
      status: 'PAID',
      customer: 'Kingston Freight',
    },
  ]

  return base.map((row, index) => ({ ...row, ...overrides[index] }))
}

function renderTable(props: Partial<Parameters<typeof InvoicesTable>[0]> = {}) {
  return render(
    <InvoicesTable
      invoices={invoices()}
      baseHref="/invoices"
      formatAmount={formatAmount}
      {...props}
    />
  )
}

describe('InvoicesTable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('links each invoice number under the supplied base href', () => {
    renderTable()

    expect(screen.getByRole('link', { name: 'INV-0001' })).toHaveAttribute(
      'href',
      '/invoices/inv_1'
    )
  })

  it('scopes links to the host base href rather than a hard-coded path', () => {
    renderTable({ baseHref: '/orgs/acme/workspace/invoice/invoices' })

    expect(screen.getByRole('link', { name: 'INV-0001' })).toHaveAttribute(
      'href',
      '/orgs/acme/workspace/invoice/invoices/inv_1'
    )
  })

  it('renders a customer object by name', () => {
    renderTable()

    expect(screen.getByText('Alejandra Reyes')).toBeTruthy()
  })

  it('renders a customer supplied as a bare name string', () => {
    renderTable()

    expect(screen.getByText('Kingston Freight')).toBeTruthy()
  })

  it('renders an em dash when the customer could not be resolved', () => {
    renderTable({ invoices: invoices([{ customer: null }]) })

    expect(screen.getAllByText('—')).toHaveLength(1)
  })

  it('formats the total through the host formatter', () => {
    renderTable()

    expect(screen.getByText('JMD 2500.00')).toBeTruthy()
  })

  it('falls back to the total when the row carries no amount due', () => {
    renderTable()

    // inv_2 has no amountDue, so its total appears in both money columns.
    expect(screen.getAllByText('JMD 750.00')).toHaveLength(2)
  })

  it('shows a distinct amount due when the row carries one', () => {
    renderTable()

    expect(screen.getByText('JMD 1000.00')).toBeTruthy()
  })

  it('accepts bigint minor units as well as a serialized string', () => {
    renderTable({ invoices: invoices([{ totalAmount: 250000n }]) })

    expect(screen.getByText('JMD 2500.00')).toBeTruthy()
  })

  it('renders the status as a humanised badge, not a raw enum', () => {
    renderTable()

    expect(screen.getByText('past due')).toBeTruthy()
    expect(screen.queryByText('PAST_DUE')).toBeNull()
  })

  it('renders the host empty state when there are no invoices', () => {
    renderTable({ invoices: [], emptyState: <div>empty-invoices</div> })

    expect(screen.getByText('empty-invoices')).toBeTruthy()
  })

  it('navigates to the row under the base href on row click', async () => {
    const user = userEvent.setup()
    renderTable({ baseHref: '/orgs/acme/workspace/invoice/invoices' })

    const row = screen.getByText('Alejandra Reyes').closest('tr')
    if (row) await user.click(row)

    expect(pushMock).toHaveBeenCalledWith(
      '/orgs/acme/workspace/invoice/invoices/inv_1'
    )
  })

  it('does not navigate when the invoice link itself is clicked', async () => {
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole('link', { name: 'INV-0001' }))

    expect(pushMock).not.toHaveBeenCalled()
  })

  it('renders every column header', () => {
    const { container } = renderTable()

    for (const header of [
      'Invoice',
      'Customer',
      'Total',
      'Amount due',
      'Status',
    ])
      expect(container.textContent).toContain(header)
  })
})
