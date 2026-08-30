import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { CrmCustomerRow } from '@/features/customers/types'
import { CustomersTable } from './customers-table'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => new URLSearchParams('status=active'),
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

  it('renders customers with names, contact info, and status', () => {
    render(<CustomersTable customers={sampleCustomers} />)

    expect(screen.getByText('Island Traders Ltd')).toBeTruthy()
    expect(screen.getByText('Althea Morgan')).toBeTruthy()
    expect(screen.getByText('althea@islandtraders.com')).toBeTruthy()
    expect(screen.getByText('+18765550100')).toBeTruthy()
    expect(screen.getByText('Active')).toBeTruthy()

    expect(screen.getByText('Jane Doe')).toBeTruthy()
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
    expect(screen.getByRole('link', { name: /Add/ })).toHaveAttribute(
      'href',
      '/customers/new'
    )
  })

  it('links each row to that customer, carrying the list query forward', () => {
    render(<CustomersTable customers={sampleCustomers} />)

    expect(
      screen.getByRole('link', { name: 'View customer Island Traders Ltd' })
    ).toHaveAttribute('href', '/customers/crm_prof_1?status=active')
  })

  it('encodes a customer id that is not URL-safe', () => {
    render(
      <CustomersTable
        customers={[{ ...sampleCustomers[0], profileId: 'a/b c' }]}
      />
    )

    expect(
      screen.getByRole('link', { name: 'View customer Island Traders Ltd' })
    ).toHaveAttribute('href', '/customers/a%2Fb%20c?status=active')
  })
})
