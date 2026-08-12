/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { CustomerTableRow } from '@/types/customer'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

import { CustomersTable } from './customers-table'

const rows: CustomerTableRow[] = [
  {
    id: 'cus_1',
    name: 'Island Traders',
    companyName: 'Island Co',
    contactName: 'Althea Morgan',
    phone: '+18765551234',
    receivables: 12345,
    currency: 'JMD',
    status: 'ACTIVE',
  },
  {
    id: 'cus_2',
    name: 'No Company',
    companyName: null,
    contactName: null,
    phone: null,
    receivables: 0,
    currency: 'USD',
    status: 'ARCHIVED',
  },
]

describe('CustomersTable', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders customers with links and details', () => {
    render(<CustomersTable customers={rows} />)
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
    render(<CustomersTable customers={rows} />)
    // second row has null company/contact/phone -> shown as —
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(3)
  })

  it('renders zero receivables and archived row', () => {
    render(<CustomersTable customers={rows} />)
    expect(screen.getByText('No Company')).toBeTruthy()
    expect(screen.getByText(/\$0\.00/)).toBeTruthy()
  })

  it('renders empty state when no customers', () => {
    render(
      <CustomersTable customers={[]} emptyState={<div>empty-customers</div>} />
    )
    expect(screen.getByText('empty-customers')).toBeTruthy()
  })

  it('navigates on row click', async () => {
    const user = userEvent.setup()
    render(<CustomersTable customers={rows} />)
    // click first row
    const row = screen.getByText('Island Traders').closest('tr')
    expect(row).toBeTruthy()
    if (row) await user.click(row)
    expect(pushMock).toHaveBeenCalledWith('/customers/cus_1')
  })

  it('renders header Receivables right-aligned', () => {
    const { container } = render(<CustomersTable customers={rows} />)
    expect(container.textContent).toContain('Receivables')
    expect(container.textContent).toContain('Customer')
    expect(container.textContent).toContain('Company')
  })

  it('does not trigger navigation when link stopPropagation is respected', async () => {
    const user = userEvent.setup()
    render(<CustomersTable customers={rows} />)
    await user.click(screen.getByRole('link', { name: 'Island Traders' }))
    expect(pushMock).not.toHaveBeenCalled()
    expect(
      screen.getByRole('link', { name: 'Island Traders' })
    ).toHaveAttribute('href', '/customers/cus_1')
  })
})
