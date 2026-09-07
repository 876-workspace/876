/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  listCustomers: vi.fn(),
  segments: [] as string[],
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/customers',
  useSearchParams: () => new URLSearchParams(),
  useSelectedLayoutSegments: () => mocks.segments,
}))
vi.mock('@/lib/auth/billing-context', () => ({
  getWorkspaceContext: mocks.getWorkspaceContext,
}))
vi.mock('@/components/providers/permissions-provider', () => ({
  useBillingPermission: () => true,
}))
vi.mock('@/lib/service', () => ({
  service: { customers: { list: mocks.listCustomers } },
}))

import { CustomersListData } from './customers-list-data'

describe('CustomersListData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.segments = []
    mocks.getWorkspaceContext.mockResolvedValue({
      tenant: { id: 'tenant_1', defaultCurrency: 'USD' },
    })
  })

  it('renders the full table when no customer is open', async () => {
    mocks.listCustomers.mockResolvedValue([
      {
        id: 'cus_1',
        name: 'Acme Co',
        companyName: 'Acme Global Inc',
        customerKind: 'BUSINESS',
        customerType: 'EXTERNAL',
        firstName: null,
        lastName: null,
        phone: '+18765551000',
        workPhone: null,
        outstandingReceivable: '1500',
        defaultCurrency: 'USD',
        status: 'ACTIVE',
        primaryContact: {
          object: 'contact',
          id: 'con_1',
          userId: null,
          salutation: 'Mr.',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@acme.com',
          workPhone: null,
          mobilePhone: '+18765552000',
          isPrimary: true,
          coreSyncedAt: null,
        },
        // Notice `contacts` is undefined, simulating the serialized API response
      },
      {
        id: 'cus_2',
        name: 'Jane Individual',
        companyName: null,
        customerKind: 'INDIVIDUAL',
        customerType: 'EXTERNAL',
        firstName: 'Jane',
        lastName: 'Individual',
        phone: null,
        workPhone: '+18765553000',
        outstandingReceivable: '0',
        defaultCurrency: null,
        status: 'ACTIVE',
        primaryContact: null,
      },
    ])

    const jsx = await CustomersListData()
    render(jsx!)

    expect(screen.getByText('Acme Co')).toBeTruthy()
    expect(screen.getByText('Acme Global Inc')).toBeTruthy()
    expect(screen.getByText('John Smith')).toBeTruthy()
    expect(screen.getByText('+18765551000')).toBeTruthy()
    expect(
      screen.getAllByText('Jane Individual').length
    ).toBeGreaterThanOrEqual(1)
  })

  it('renders the condensed pane and marks the open customer when one is selected', async () => {
    mocks.segments = ['cus_2']
    mocks.listCustomers.mockResolvedValue([
      {
        id: 'cus_1',
        name: 'Acme Co',
        companyName: 'Acme Global Inc',
        customerKind: 'BUSINESS',
        customerType: 'EXTERNAL',
        firstName: null,
        lastName: null,
        phone: '+18765551000',
        workPhone: null,
        outstandingReceivable: '1500',
        defaultCurrency: 'USD',
        status: 'ACTIVE',
        primaryContact: {
          object: 'contact',
          id: 'con_1',
          userId: null,
          salutation: 'Mr.',
          firstName: 'John',
          lastName: 'Smith',
          email: 'john@acme.com',
          workPhone: null,
          mobilePhone: '+18765552000',
          isPrimary: true,
          coreSyncedAt: null,
        },
        // Notice `contacts` is undefined, simulating the serialized API response
      },
      {
        id: 'cus_2',
        name: 'Jane Individual',
        companyName: null,
        customerKind: 'INDIVIDUAL',
        customerType: 'EXTERNAL',
        firstName: 'Jane',
        lastName: 'Individual',
        phone: null,
        workPhone: '+18765553000',
        outstandingReceivable: '0',
        defaultCurrency: null,
        status: 'ACTIVE',
        primaryContact: null,
      },
    ])

    const jsx = await CustomersListData()
    render(jsx!)

    // The pane replaces the table, showing the open row marked current
    // and the customer's email.
    expect(screen.getByText('john@acme.com')).toBeTruthy()
    const openRow = screen.getByRole('link', {
      name: 'View customer Jane Individual',
    })
    expect(openRow.getAttribute('aria-current')).toBe('true')
    expect(
      screen
        .getByRole('link', { name: 'View customer Acme Co' })
        .getAttribute('aria-current')
    ).toBeNull()
    // Table-only columns are gone.
    expect(screen.queryByText('+18765551000')).toBeNull()
  })

  it('renders the empty state when the workspace has no customers', async () => {
    mocks.listCustomers.mockResolvedValue([])

    const jsx = await CustomersListData()
    render(jsx!)

    expect(screen.getByText('No customers yet')).toBeTruthy()
  })
})
