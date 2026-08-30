// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'

import { CustomerCard } from '../customer-card'
import type { CrmCustomerRow } from '../customers-table'

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

describe('CustomerCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(window, 'confirm').mockReturnValue(true)
  })

  it('renders customer header, metadata, and party cards', () => {
    const onClose = vi.fn()
    render(<CustomerCard customer={sampleCustomer} onClose={onClose} />)

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

  it('calls onClose when clicking close button', () => {
    const onClose = vi.fn()
    render(<CustomerCard customer={sampleCustomer} onClose={onClose} />)

    const closeBtn = screen.getByLabelText('Close customer details')
    fireEvent.click(closeBtn)

    expect(onClose).toHaveBeenCalled()
  })

  it('toggles customer status', async () => {
    mocks.update.mockResolvedValueOnce({
      data: { profile: { status: 'INACTIVE' } },
    })
    const onClose = vi.fn()
    render(<CustomerCard customer={sampleCustomer} onClose={onClose} />)

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
    const onClose = vi.fn()
    render(<CustomerCard customer={sampleCustomer} onClose={onClose} />)

    const moreBtn = screen.getByLabelText('More customer actions')
    fireEvent.click(moreBtn)

    const deleteBtn = screen.getByText('Delete')
    fireEvent.click(deleteBtn)

    await waitFor(() => {
      expect(mocks.delete).toHaveBeenCalledWith('crm_prof_1')
      expect(mocks.toastSuccess).toHaveBeenCalledWith('Customer deleted.')
      expect(onClose).toHaveBeenCalled()
    })
  })

  it('allows switching between all customer detail tabs', () => {
    const onClose = vi.fn()
    render(<CustomerCard customer={sampleCustomer} onClose={onClose} />)

    // Contacts tab
    fireEvent.click(screen.getByRole('tab', { name: 'Contacts' }))
    expect(screen.getByText(/Contact Directory/i)).toBeInTheDocument()

    // Transactions tab
    fireEvent.click(screen.getByRole('tab', { name: 'Transactions' }))
    expect(screen.getByText('Total Invoiced')).toBeInTheDocument()
    expect(screen.getByText('INV-2026-003')).toBeInTheDocument()

    // Requests tab
    fireEvent.click(screen.getByRole('tab', { name: 'Requests' }))
    expect(screen.getByText(/Support & Service Requests/i)).toBeInTheDocument()
    expect(screen.getByText('REQ-8921')).toBeInTheDocument()

    // Mails tab
    fireEvent.click(screen.getByRole('tab', { name: 'Mails' }))
    expect(screen.getByText(/Communication History/i)).toBeInTheDocument()

    // Statement tab
    fireEvent.click(screen.getByRole('tab', { name: 'Statement' }))
    expect(screen.getByText('Statement of Account')).toBeInTheDocument()

    // Activity tab
    fireEvent.click(screen.getByRole('tab', { name: 'Activity' }))
    expect(screen.getByText('Customer record created')).toBeInTheDocument()
  })
})
