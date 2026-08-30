// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'

import type { CrmCustomerRow } from '../customers-table'
import { CustomerSplit } from '../customer-split'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/client', () => ({
  client: {
    customers: {
      create: mocks.create,
      update: mocks.update,
      delete: mocks.delete,
    },
  },
}))

const sampleCustomers: CrmCustomerRow[] = [
  {
    profileId: 'crm_prof_1',
    billingCustomerId: 'cus_1',
    name: 'Island Traders Ltd',
    legalName: 'Island Traders Jamaica Limited',
    isBusiness: true,
    typeLabel: '876 organization',
    email: 'info@islandtraders.com',
    phone: '+18765550100',
    contactName: 'Althea Morgan',
    contactEmail: 'althea@islandtraders.com',
    contactPhone: '+18765550101',
    contactUserId: 'usr_althea',
    ownerId: 'usr_admin',
    status: 'ACTIVE',
    createdAt: 1720000000,
    updatedAt: 1720000500,
  },
  {
    profileId: 'crm_prof_2',
    billingCustomerId: 'cus_2',
    name: 'Jane Doe',
    legalName: null,
    isBusiness: false,
    typeLabel: 'External customer',
    email: 'jane@example.com',
    phone: '+18765550200',
    contactName: null,
    contactEmail: null,
    status: 'INACTIVE',
    createdAt: 1710000000,
    updatedAt: 1715000000,
  },
]

describe('CustomerSplit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders full table when no customer is selected', () => {
    render(<CustomerSplit customers={sampleCustomers} selectedId={undefined} />)

    expect(screen.getByText('Island Traders Ltd')).toBeInTheDocument()
    expect(screen.getByText('Althea Morgan')).toBeInTheDocument()
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
  })

  it('navigates when clicking a customer in full table', () => {
    render(<CustomerSplit customers={sampleCustomers} selectedId={undefined} />)

    const row = screen.getByText('Island Traders Ltd')
    fireEvent.click(row)

    expect(mocks.push).toHaveBeenCalledWith('/customers?customer=crm_prof_1')
  })

  it('renders split master-detail view when a customer is selected', () => {
    render(
      <CustomerSplit customers={sampleCustomers} selectedId="crm_prof_1" />
    )

    // Left sidebar has Customers header and condensed rows
    expect(screen.getByText('Customers')).toBeInTheDocument()
    expect(screen.getAllByText('Althea Morgan').length).toBeGreaterThan(0)

    // Right card has details
    expect(
      screen.getByLabelText('Customer details: Island Traders Ltd')
    ).toBeInTheDocument()
    expect(
      screen.getAllByText('Island Traders Jamaica Limited').length
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByText('info@islandtraders.com').length
    ).toBeGreaterThan(0)
    expect(screen.getByText('usr_althea')).toBeInTheDocument()
  })

  it('switches between Overview and Activity tabs in customer detail card', () => {
    render(
      <CustomerSplit customers={sampleCustomers} selectedId="crm_prof_1" />
    )

    expect(screen.getByText('Organization Details')).toBeInTheDocument()

    const activityTab = screen.getByRole('tab', { name: 'Activity' })
    fireEvent.click(activityTab)

    expect(screen.getByText('Customer record created')).toBeInTheDocument()
    expect(screen.getByText('Customer updated')).toBeInTheDocument()
  })

  it('renders customer creation card when selectedId="new"', () => {
    render(<CustomerSplit customers={sampleCustomers} selectedId="new" />)

    expect(screen.getByLabelText('Close customer creation')).toBeInTheDocument()
    expect(screen.getByText('New customer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument()
  })

  it('renders empty table when customers list is empty and no selection', () => {
    render(<CustomerSplit customers={[]} selectedId={undefined} />)

    expect(screen.getByText('Customer')).toBeInTheDocument()
    expect(screen.getByText('Contact')).toBeInTheDocument()
    expect(screen.getByText('No customers yet')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })

  it('renders split creation card when customers list is empty and selectedId="new"', () => {
    render(<CustomerSplit customers={[]} selectedId="new" />)

    expect(screen.getByText('Customers')).toBeInTheDocument()
    expect(screen.getByText('No customers yet')).toBeInTheDocument()
    expect(screen.getByText('New customer')).toBeInTheDocument()
  })
})
