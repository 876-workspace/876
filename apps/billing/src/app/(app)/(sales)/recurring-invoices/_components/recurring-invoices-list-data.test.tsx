/** @vitest-environment jsdom */

import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  listProfiles: vi.fn(),
  listCustomers: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/recurring-invoices',
  useSelectedLayoutSegments: () => [],
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@/lib/client', () => ({
  client: {
    recurringInvoices: { list: mocks.listProfiles },
    customers: { list: mocks.listCustomers },
  },
}))

import { RecurringInvoicesListData } from './recurring-invoices-list-data'

const profile = {
  id: 'rinv_1',
  profileName: 'Monthly retainer',
  customerId: 'cus_1',
  frequency: { intervalUnit: 'month', intervalCount: 1 },
  totalAmount: '4500000',
  currency: 'JMD',
  status: 'active',
  nextRunAt: 1767225600,
  lastRunAt: 1764547200,
  generatedCount: 2,
}

describe('RecurringInvoicesListData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.searchParams = new URLSearchParams()
    mocks.listProfiles.mockResolvedValue({
      data: { data: [profile] },
      error: null,
    })
    mocks.listCustomers.mockResolvedValue({
      data: { data: [{ id: 'cus_1', name: 'Alejandra Reyes' }] },
      error: null,
    })
  })

  it('threads a paused status into the SDK list call', async () => {
    // ARRANGE
    mocks.searchParams = new URLSearchParams('status=paused')

    // ACT
    render(<RecurringInvoicesListData />)

    // ASSERT
    await waitFor(() =>
      expect(mocks.listProfiles).toHaveBeenCalledWith({ status: 'paused' })
    )

    // AFTER — testing-library performs cleanup.
  })

  it('lists unfiltered when the status is all or missing', async () => {
    // ARRANGE
    mocks.searchParams = new URLSearchParams('status=all')

    // ACT
    render(<RecurringInvoicesListData />)

    // ASSERT
    await waitFor(() =>
      expect(mocks.listProfiles).toHaveBeenCalledWith({})
    )

    // AFTER — testing-library performs cleanup.
  })

  it('renders the fetched profiles with resolved customer names', async () => {
    // ARRANGE — defaults return one profile and its customer.

    // ACT
    render(<RecurringInvoicesListData />)

    // ASSERT
    expect(await screen.findByText('Monthly retainer')).toBeVisible()
    expect(await screen.findByText('Alejandra Reyes')).toBeVisible()

    // AFTER — testing-library performs cleanup.
  })

  it('renders an inline error instead of rows when the list fails', async () => {
    // ARRANGE
    mocks.listProfiles.mockResolvedValue({
      data: null,
      error: { code: 'billing/unreachable', message: 'Billing is down.' },
    })

    // ACT
    render(<RecurringInvoicesListData />)

    // ASSERT
    expect(await screen.findByText('Billing is down.')).toBeVisible()
    expect(screen.queryByText('Monthly retainer')).toBeNull()

    // AFTER — testing-library performs cleanup.
  })
})
