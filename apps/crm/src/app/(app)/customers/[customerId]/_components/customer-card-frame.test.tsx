// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import type { CrmCustomerRow } from '@/features/customers/types'
import { CUSTOMER_TABS } from '../../_lib/customer-tabs'
import { CustomerCardFrame } from './customer-card-frame'
import { CustomerOverviewTab } from './customer-overview-tab'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams('status=active'),
  // `null` is the index route — the Overview tab.
  useSelectedLayoutSegment: () => null,
}))

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}))

vi.mock('@/lib/client', () => ({
  client: {
    customers: {
      update: mocks.update,
      delete: mocks.delete,
    },
  },
}))

const sampleCustomer: CrmCustomerRow = {
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
}

describe('CustomerCardFrame', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('renders customer header, metadata, and party cards', () => {
    render(
      <CustomerCardFrame customer={sampleCustomer}>
        <CustomerOverviewTab customer={sampleCustomer} />
      </CustomerCardFrame>
    )

    expect(screen.getByText('Island Traders Ltd')).toBeInTheDocument()
    expect(
      screen.getAllByText('Island Traders Jamaica Limited').length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Business').length).toBeGreaterThan(0)

    expect(screen.getByText('Organization Details')).toBeInTheDocument()
    expect(
      screen.getAllByText('info@islandtraders.com').length
    ).toBeGreaterThan(0)
    expect(screen.getAllByText('+18765550100').length).toBeGreaterThan(0)

    expect(screen.getByText('Primary Contact')).toBeInTheDocument()
    expect(screen.getByText('Althea Morgan')).toBeInTheDocument()
    expect(screen.getByText('althea@islandtraders.com')).toBeInTheDocument()
    expect(screen.getByText('usr_althea')).toBeInTheDocument()

    expect(screen.getByText('CRM Record')).toBeInTheDocument()
    expect(screen.getByText('cus_1')).toBeInTheDocument()
    expect(screen.getByText('usr_admin')).toBeInTheDocument()
    expect(screen.getByText('crm_prof_1')).toBeInTheDocument()
  })

  it('navigates back to the list when clicking close, keeping the query', () => {
    render(
      <CustomerCardFrame customer={sampleCustomer}>
        <CustomerOverviewTab customer={sampleCustomer} />
      </CustomerCardFrame>
    )

    const closeBtn = screen.getByLabelText('Close customer details')
    fireEvent.click(closeBtn)

    expect(mocks.push).toHaveBeenCalledTimes(1)
    expect(mocks.push).toHaveBeenCalledWith('/customers?status=active')
  })

  it('toggles customer status', async () => {
    mocks.update.mockResolvedValueOnce({
      data: { profile: { status: 'INACTIVE' } },
    })
    render(
      <CustomerCardFrame customer={sampleCustomer}>
        <CustomerOverviewTab customer={sampleCustomer} />
      </CustomerCardFrame>
    )

    const moreBtn = screen.getByLabelText('More customer actions')
    fireEvent.click(moreBtn)

    const deactivateBtn = screen.getByText('Deactivate')
    fireEvent.click(deactivateBtn)

    await waitFor(() => {
      expect(mocks.update).toHaveBeenCalledWith('crm_prof_1', {
        customerKind: 'BUSINESS',
        status: 'INACTIVE',
      })
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Customer deactivated.')
    })
  })

  it('handles customer deletion', async () => {
    mocks.delete.mockResolvedValueOnce({ data: { object: 'customer' } })
    render(
      <CustomerCardFrame customer={sampleCustomer}>
        <CustomerOverviewTab customer={sampleCustomer} />
      </CustomerCardFrame>
    )

    const moreBtn = screen.getByLabelText('More customer actions')
    fireEvent.click(moreBtn)

    const deleteBtn = screen.getByText('Delete')
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(mocks.delete).toHaveBeenCalledWith('crm_prof_1')
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Customer deleted.')
      expect(mocks.push).toHaveBeenCalledWith('/customers?status=active')
    })
  })

  it('renders every tab as a link to its own route, carrying the query', () => {
    render(
      <CustomerCardFrame customer={sampleCustomer}>
        <CustomerOverviewTab customer={sampleCustomer} />
      </CustomerCardFrame>
    )

    const expected: [string, string][] = [
      ['Overview', '/customers/crm_prof_1?status=active'],
      ['Contacts', '/customers/crm_prof_1/contacts?status=active'],
      ['Transactions', '/customers/crm_prof_1/transactions?status=active'],
      ['Requests', '/customers/crm_prof_1/requests?status=active'],
      ['Mails', '/customers/crm_prof_1/mails?status=active'],
      ['Statement', '/customers/crm_prof_1/statement?status=active'],
      ['Activity', '/customers/crm_prof_1/activity?status=active'],
    ]

    for (const [label, href] of expected) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute(
        'href',
        href
      )
    }
  })

  it('covers every declared tab, so a new tab cannot ship unlinked', () => {
    render(
      <CustomerCardFrame customer={sampleCustomer}>
        <CustomerOverviewTab customer={sampleCustomer} />
      </CustomerCardFrame>
    )

    for (const tab of CUSTOMER_TABS) {
      expect(screen.getByRole('link', { name: tab.label })).toBeInTheDocument()
    }
  })

  it('marks the index route as the current tab', () => {
    render(
      <CustomerCardFrame customer={sampleCustomer}>
        <CustomerOverviewTab customer={sampleCustomer} />
      </CustomerCardFrame>
    )

    expect(screen.getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'aria-current',
      'page'
    )
    expect(screen.getByRole('link', { name: 'Mails' })).not.toHaveAttribute(
      'aria-current'
    )
  })
})
