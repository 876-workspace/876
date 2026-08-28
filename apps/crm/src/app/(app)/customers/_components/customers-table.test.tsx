import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import { CustomersTable, type CrmCustomerRow } from './customers-table'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

const sampleCustomers: CrmCustomerRow[] = [
  {
    profileId: 'crm_prof_1',
    billingCustomerId: 'cus_1',
    name: 'Island Traders Ltd',
    isBusiness: true,
    email: 'info@islandtraders.com',
    phone: '+18765550100',
    contactName: 'Althea Morgan',
    contactEmail: 'althea@islandtraders.com',
    status: 'ACTIVE',
  },
  {
    profileId: 'crm_prof_2',
    billingCustomerId: 'cus_2',
    name: 'Jane Doe',
    isBusiness: false,
    email: 'jane@example.com',
    phone: null,
    contactName: null,
    contactEmail: null,
    status: 'INACTIVE',
  },
]

describe('CustomersTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders customers with links and contact info', () => {
    render(<CustomersTable customers={sampleCustomers} />)

    expect(
      screen.getByRole('link', { name: 'Island Traders Ltd' })
    ).toHaveAttribute('href', '/customers/crm_prof_1')
    expect(screen.getByText('Althea Morgan')).toBeTruthy()
    expect(screen.getByText('althea@islandtraders.com')).toBeTruthy()
    expect(screen.getByText('+18765550100')).toBeTruthy()
    expect(screen.getByText('Active')).toBeTruthy()

    expect(screen.getByRole('link', { name: 'Jane Doe' })).toHaveAttribute(
      'href',
      '/customers/crm_prof_2'
    )
    expect(screen.getByText('jane@example.com')).toBeTruthy()
    expect(screen.getByText('Inactive')).toBeTruthy()
  })

  it('renders empty data table with headers and empty state when customers array is empty', () => {
    render(<CustomersTable customers={[]} />)

    // Table headers should still be present in the data table
    expect(screen.getByText('Customer')).toBeTruthy()
    expect(screen.getByText('Contact')).toBeTruthy()
    expect(screen.getByText('Phone')).toBeTruthy()
    expect(screen.getByText('Status')).toBeTruthy()

    // Empty state should be rendered
    expect(screen.getByText('No customers yet')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/customers/new'
    )
  })

  it('renders custom emptyState when provided', () => {
    render(
      <CustomersTable
        customers={[]}
        emptyState={<div>Custom empty customers state</div>}
      />
    )

    expect(screen.getByText('Custom empty customers state')).toBeTruthy()
  })

  it('navigates on row click', async () => {
    const user = userEvent.setup()
    render(<CustomersTable customers={sampleCustomers} />)

    const row = screen.getByText('Island Traders Ltd').closest('tr')
    expect(row).toBeTruthy()
    if (row) await user.click(row)

    expect(pushMock).toHaveBeenCalledWith('/customers/crm_prof_1')
  })
})
