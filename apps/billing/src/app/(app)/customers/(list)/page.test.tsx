/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getWorkspaceContext: vi.fn(),
  listCustomers: vi.fn(),
  useRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('next/navigation', () => ({
  useRouter: mocks.useRouter,
  usePathname: () => '/customers',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/lib/auth/billing-context', () => ({
  getWorkspaceContext: mocks.getWorkspaceContext,
}))
vi.mock('@/components/providers/permissions-provider', () => ({
  useBillingPermission: () => true,
}))
vi.mock('@/lib/service', () => ({
  service: {
    customers: {
      list: mocks.listCustomers,
    },
  },
}))

import CustomersPage, { CustomersTableData } from './page'

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getWorkspaceContext.mockResolvedValue({
      tenant: { id: 'tenant_1', defaultCurrency: 'USD' },
    })
  })

  it('renders customers list even when customer.contacts is undefined', async () => {
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

    const jsx = await CustomersTableData({
      searchParams: Promise.resolve({ status: 'all' }),
    })
    render(jsx!)

    expect(screen.getByText('Acme Co')).toBeTruthy()
    expect(screen.getByText('Acme Global Inc')).toBeTruthy()
    expect(screen.getByText('John Smith')).toBeTruthy()
    expect(screen.getByText('+18765551000')).toBeTruthy()

    expect(screen.getAllByText('Jane Individual').length).toBeGreaterThanOrEqual(1)
  })

  it('renders empty state when no customers are returned', async () => {
    mocks.listCustomers.mockResolvedValue([])

    const jsx = await CustomersTableData({
      searchParams: Promise.resolve({ status: 'all' }),
    })
    render(jsx!)

    expect(screen.getByText('No customers yet')).toBeTruthy()
  })

  it('renders page layout with toolbar and Suspense fallback', async () => {
    const jsx = await CustomersPage({
      searchParams: Promise.resolve({ status: 'all' }),
    })
    render(jsx)
    expect(
      screen.getByRole('button', { name: /Filter customers by status/i })
    ).toBeTruthy()
  })
})
