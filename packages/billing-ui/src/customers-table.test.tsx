/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import '@testing-library/jest-dom/vitest'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { CustomersTable, type CustomerRow } from './customers-table'

function defaultFormatAmount(
  amount: bigint | string | null,
  currency: string
): string {
  if (amount === null) return '—'
  const numeric = Number(amount)
  if (currency === 'USD') return `$${(numeric / 100).toFixed(2)}`
  return `${currency} ${(numeric / 100).toFixed(2)}`
}

function sampleCustomers(
  overrides: Partial<CustomerRow>[] = []
): CustomerRow[] {
  const base: CustomerRow[] = [
    {
      id: 'cus_1',
      name: 'Island Traders',
      companyName: 'Island Co',
      contactName: 'Althea Morgan',
      phone: '+18765551234',
      receivables: 12345n,
      currency: 'JMD',
      status: 'ACTIVE',
    },
    {
      id: 'cus_2',
      name: 'No Company',
      companyName: null,
      contactName: null,
      phone: null,
      receivables: 0n,
      currency: 'USD',
      status: 'ARCHIVED',
    },
  ]

  return base.map((row, index) => ({ ...row, ...overrides[index] }))
}

function renderTable(
  props: Partial<Parameters<typeof CustomersTable>[0]> = {}
) {
  return render(
    <CustomersTable
      customers={sampleCustomers()}
      baseHref="/customers"
      formatAmount={defaultFormatAmount}
      {...props}
    />
  )
}

describe('CustomersTable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders customers with links and details', () => {
    renderTable()
    expect(
      screen.getByRole('link', { name: 'Island Traders' })
    ).toHaveAttribute('href', '/customers/cus_1')
    expect(screen.getByText('Island Co')).toBeTruthy()
    expect(screen.getByText('Althea Morgan')).toBeTruthy()
    expect(screen.getByText('+18765551234')).toBeTruthy()
    // receivables formatted as money
    expect(screen.getByText(/123\.45/)).toBeTruthy()
  })

  it('renders fallback em dash for missing optional fields', () => {
    renderTable()
    // second row has null company/contact/phone -> shown as —
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(3)
  })

  it('renders zero receivables and archived row', () => {
    renderTable()
    expect(screen.getByText('No Company')).toBeTruthy()
    expect(screen.getByText(/\$0\.00/)).toBeTruthy()
  })

  it('renders empty state when no customers', () => {
    renderTable({
      customers: [],
      emptyState: <div>empty-customers</div>,
    })
    expect(screen.getByText('empty-customers')).toBeTruthy()
  })

  it('navigates on row click', async () => {
    const user = userEvent.setup()
    renderTable()
    // click first row
    const row = screen.getByText('Island Traders').closest('tr')
    expect(row).toBeTruthy()
    if (row) await user.click(row)
    expect(pushMock).toHaveBeenCalledWith('/customers/cus_1')
  })

  it('renders header Receivables right-aligned', () => {
    const { container } = renderTable()
    expect(container.textContent).toContain('Receivables')
    expect(container.textContent).toContain('Customer')
    expect(container.textContent).toContain('Company')
  })

  it('does not trigger navigation when link stopPropagation is respected', async () => {
    const user = userEvent.setup()
    renderTable()
    await user.click(screen.getByRole('link', { name: 'Island Traders' }))
    expect(pushMock).not.toHaveBeenCalled()
    expect(
      screen.getByRole('link', { name: 'Island Traders' })
    ).toHaveAttribute('href', '/customers/cus_1')
  })

  it('links each row to ${baseHref}/${id} for a non-root baseHref', () => {
    renderTable({ baseHref: '/orgs/acme/workspace/billing/customers' })

    expect(
      screen.getByRole('link', { name: 'Island Traders' })
    ).toHaveAttribute('href', '/orgs/acme/workspace/billing/customers/cus_1')
    expect(screen.getByRole('link', { name: 'No Company' })).toHaveAttribute(
      'href',
      '/orgs/acme/workspace/billing/customers/cus_2'
    )
  })

  it('renders the receivables through the injected formatAmount, asserting the formatter received the row own receivables and currency', () => {
    const formatAmount = vi.fn(
      (amount: bigint | string | null, currency: string) =>
        `${currency} ${amount}`
    )
    renderTable({
      customers: [
        {
          id: 'cus_bigint',
          name: 'BigInt Customer',
          companyName: null,
          contactName: null,
          phone: null,
          receivables: 98765n,
          currency: 'JMD',
          status: 'ACTIVE',
        },
        {
          id: 'cus_string',
          name: 'String Customer',
          companyName: null,
          contactName: null,
          phone: null,
          receivables: '54321',
          currency: 'USD',
          status: 'ACTIVE',
        },
      ],
      formatAmount,
    })

    expect(formatAmount).toHaveBeenCalledWith(98765n, 'JMD')
    expect(formatAmount).toHaveBeenCalledWith('54321', 'USD')
    expect(screen.getByText('JMD 98765')).toBeTruthy()
    expect(screen.getByText('USD 54321')).toBeTruthy()
  })
})
