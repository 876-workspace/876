/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  getFinanceClient: vi.fn(),
  listProfiles: vi.fn(),
  listCustomers: vi.fn(),
  listItems: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/finance/client', () => ({
  getFinanceClient: mocks.getFinanceClient,
}))
vi.mock('@/lib/service', () => ({
  service: { customerProfiles: { list: mocks.listProfiles } },
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/org/island-logistics/customers',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn() }),
}))

import CustomersPage from './customers/page'
import ItemsPage from './items/page'

const context = {
  orgId: 'org_123',
  orgName: 'Island Logistics',
  tenant: { id: 'tenant_123', name: 'Island Couriers' },
}
const params = Promise.resolve({ orgSlug: 'island-logistics' })
const emptySearchParams = Promise.resolve({})

function listResult<T>(data: T[], hasMore = false) {
  return {
    data: {
      object: 'list',
      data,
      has_more: hasMore,
      url: '/test',
      total_count: data.length,
    },
    error: null,
  }
}

describe('Couriers finance-backed pages', () => {
  beforeEach(() => {
    mocks.getManageContext.mockResolvedValue(context)
    mocks.getFinanceClient.mockResolvedValue({
      customers: { list: mocks.listCustomers },
      items: { list: mocks.listItems },
    })
    mocks.listProfiles.mockResolvedValue([])
  })

  it('lists only customers enrolled in this courier workspace, never the whole registry', async () => {
    mocks.listProfiles.mockResolvedValue([
      {
        id: 'profile_1',
        billingCustomerId: 'cus_business',
        status: 'ACTIVE',
        isCommercial: true,
        mailboxes: [{ number: 'RSJ1001', isPrimary: true }],
      },
    ])
    mocks.listCustomers.mockResolvedValue(
      listResult([
        {
          id: 'cus_business',
          name: 'Blue Mountain Trading',
          email: 'ops@bluemountain.test',
          customerKind: 'BUSINESS',
          status: 'ACTIVE',
          primaryContact: {
            firstName: 'Nia',
            lastName: 'Campbell',
            email: 'nia@bluemountain.test',
          },
        },
      ])
    )

    render(await CustomersPage({ params, searchParams: emptySearchParams }))

    expect(screen.getByText('Blue Mountain Trading')).toBeVisible()
    // The organization's primary contact renders beside the business name.
    expect(screen.getByText('Nia Campbell')).toBeVisible()
    expect(screen.getByText('nia@bluemountain.test')).toBeVisible()
    // Couriers layer-3 mailbox is shown next to the shared identity.
    expect(screen.getByRole('columnheader', { name: 'Mailbox' })).toBeVisible()
    expect(screen.getByText('RSJ1001')).toBeVisible()
    // Identity is resolved by id for the enrolled set only.
    expect(mocks.listCustomers).toHaveBeenCalledWith('org_123', {
      limit: 100,
      ids: ['cus_business'],
    })
  })

  it('does not call the registry at all when no customer is enrolled', async () => {
    mocks.listProfiles.mockResolvedValue([])

    render(await CustomersPage({ params, searchParams: emptySearchParams }))

    // A party who is a customer of this org in another 876 app must never leak
    // into Couriers, so with no local profiles there is nothing to resolve.
    expect(mocks.listCustomers).not.toHaveBeenCalled()
    expect(screen.getByText('No customers')).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Customer' })).toBeVisible()
  })

  it('renders an individual customer without a separate contact name', async () => {
    mocks.listProfiles.mockResolvedValue([
      {
        id: 'profile_person',
        billingCustomerId: 'cus_person',
        status: 'ACTIVE',
        isCommercial: false,
      },
    ])
    mocks.listCustomers.mockResolvedValue(
      listResult([
        {
          id: 'cus_person',
          name: 'Ada Lovelace',
          email: 'ada@example.test',
          customerKind: 'INDIVIDUAL',
          status: 'ACTIVE',
          // Individuals are their own contact — Billing leaves this null.
          primaryContact: null,
        },
      ])
    )

    render(await CustomersPage({ params, searchParams: emptySearchParams }))

    expect(screen.getByText('Ada Lovelace')).toBeVisible()
    expect(screen.getByText('ada@example.test')).toBeVisible()
    expect(screen.getByText('Individual')).toBeVisible()
    // Contact column shows an em dash when there is no separate contact.
    expect(screen.getByText('—')).toBeVisible()
    expect(screen.queryByText('Nia Campbell')).toBeNull()
  })

  it('resolves multiple enrolled profiles in a single ids batch', async () => {
    mocks.listProfiles.mockResolvedValue([
      {
        id: 'profile_1',
        billingCustomerId: 'cus_a',
        status: 'ACTIVE',
        isCommercial: true,
      },
      {
        id: 'profile_2',
        billingCustomerId: 'cus_b',
        status: 'ACTIVE',
        isCommercial: false,
      },
    ])
    mocks.listCustomers.mockResolvedValue(
      listResult([
        {
          id: 'cus_a',
          name: 'Acme Shipping',
          email: 'ap@acme.test',
          customerKind: 'BUSINESS',
          status: 'ACTIVE',
          primaryContact: {
            firstName: 'Grace',
            lastName: 'Hopper',
            email: 'grace@acme.test',
          },
        },
        {
          id: 'cus_b',
          name: 'Bob Buyer',
          email: 'bob@example.test',
          customerKind: 'INDIVIDUAL',
          status: 'ACTIVE',
          primaryContact: null,
        },
      ])
    )

    render(await CustomersPage({ params, searchParams: emptySearchParams }))

    expect(mocks.listCustomers).toHaveBeenCalledWith('org_123', {
      limit: 100,
      ids: ['cus_a', 'cus_b'],
    })
    expect(screen.getByText('Acme Shipping')).toBeVisible()
    expect(screen.getByText('Grace Hopper')).toBeVisible()
    expect(screen.getByText('Bob Buyer')).toBeVisible()
    expect(screen.getByText('Business')).toBeVisible()
    expect(screen.getByText('Individual')).toBeVisible()
  })

  it('falls back to a single-name primary contact when lastName is missing', async () => {
    mocks.listProfiles.mockResolvedValue([
      {
        id: 'profile_1',
        billingCustomerId: 'cus_business',
        status: 'ACTIVE',
        isCommercial: true,
      },
    ])
    mocks.listCustomers.mockResolvedValue(
      listResult([
        {
          id: 'cus_business',
          name: 'Solo Co',
          email: 'hello@solo.test',
          customerKind: 'BUSINESS',
          status: 'ACTIVE',
          primaryContact: {
            firstName: 'Pat',
            lastName: null,
            email: 'pat@solo.test',
          },
        },
      ])
    )

    render(await CustomersPage({ params, searchParams: emptySearchParams }))

    expect(screen.getByText('Pat')).toBeVisible()
    expect(screen.getByText('pat@solo.test')).toBeVisible()
  })

  it('skips profiles without a billingCustomerId when building the ids batch', async () => {
    mocks.listProfiles.mockResolvedValue([
      {
        id: 'profile_orphan',
        billingCustomerId: null,
        status: 'ACTIVE',
        isCommercial: false,
      },
      {
        id: 'profile_linked',
        billingCustomerId: 'cus_linked',
        status: 'ACTIVE',
        isCommercial: false,
      },
    ])
    mocks.listCustomers.mockResolvedValue(
      listResult([
        {
          id: 'cus_linked',
          name: 'Linked Person',
          email: 'linked@example.test',
          customerKind: 'INDIVIDUAL',
          status: 'ACTIVE',
          primaryContact: null,
        },
      ])
    )

    render(await CustomersPage({ params, searchParams: emptySearchParams }))

    expect(mocks.listCustomers).toHaveBeenCalledWith('org_123', {
      limit: 100,
      ids: ['cus_linked'],
    })
    expect(screen.getByText('Linked Person')).toBeVisible()
  })

  it('falls back to billingCustomerId when the registry omits the row', async () => {
    mocks.listProfiles.mockResolvedValue([
      {
        id: 'profile_missing',
        billingCustomerId: 'cus_missing',
        status: 'ACTIVE',
        isCommercial: false,
      },
    ])
    mocks.listCustomers.mockResolvedValue(listResult([]))

    render(await CustomersPage({ params, searchParams: emptySearchParams }))

    // Name and email both fall back to the opaque id when identity is missing.
    expect(screen.getAllByText('cus_missing').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Individual')).toBeVisible()
  })

  it('prefers contact email over customer email for business rows', async () => {
    mocks.listProfiles.mockResolvedValue([
      {
        id: 'profile_1',
        billingCustomerId: 'cus_biz',
        status: 'ACTIVE',
        isCommercial: true,
      },
    ])
    mocks.listCustomers.mockResolvedValue(
      listResult([
        {
          id: 'cus_biz',
          name: 'Biz Co',
          email: 'ap@biz.test',
          customerKind: 'BUSINESS',
          status: 'ACTIVE',
          primaryContact: {
            firstName: 'Nia',
            lastName: 'Campbell',
            email: 'nia@biz.test',
          },
        },
      ])
    )

    render(await CustomersPage({ params, searchParams: emptySearchParams }))

    expect(screen.getByText('nia@biz.test')).toBeVisible()
    expect(screen.queryByText('ap@biz.test')).toBeNull()
  })

  it('uses customer email when primary contact has no email', async () => {
    mocks.listProfiles.mockResolvedValue([
      {
        id: 'profile_1',
        billingCustomerId: 'cus_biz',
        status: 'ACTIVE',
        isCommercial: true,
      },
    ])
    mocks.listCustomers.mockResolvedValue(
      listResult([
        {
          id: 'cus_biz',
          name: 'Biz Co',
          email: 'ap@biz.test',
          customerKind: 'BUSINESS',
          status: 'ACTIVE',
          primaryContact: {
            firstName: 'Nia',
            lastName: 'Campbell',
            email: null,
          },
        },
      ])
    )

    render(await CustomersPage({ params, searchParams: emptySearchParams }))

    expect(screen.getByText('ap@biz.test')).toBeVisible()
    expect(screen.getByText('Nia Campbell')).toBeVisible()
  })

  it('renders a dash contact when first and last names are blank strings', async () => {
    mocks.listProfiles.mockResolvedValue([
      {
        id: 'profile_1',
        billingCustomerId: 'cus_biz',
        status: 'ACTIVE',
        isCommercial: true,
      },
    ])
    mocks.listCustomers.mockResolvedValue(
      listResult([
        {
          id: 'cus_biz',
          name: 'Biz Co',
          email: 'ap@biz.test',
          customerKind: 'BUSINESS',
          status: 'ACTIVE',
          primaryContact: {
            firstName: '',
            lastName: '  ',
            email: 'contact@biz.test',
          },
        },
      ])
    )

    render(await CustomersPage({ params, searchParams: emptySearchParams }))

    expect(screen.getByText('—')).toBeVisible()
    expect(screen.getByText('contact@biz.test')).toBeVisible()
  })

  it('shows Suspended badge for a suspended profile status', async () => {
    mocks.listProfiles.mockResolvedValue([
      {
        id: 'profile_1',
        billingCustomerId: 'cus_1',
        status: 'SUSPENDED',
        isCommercial: false,
      },
    ])
    mocks.listCustomers.mockResolvedValue(
      listResult([
        {
          id: 'cus_1',
          name: 'Suspended Person',
          email: 's@example.test',
          customerKind: 'INDIVIDUAL',
          status: 'ACTIVE',
          primaryContact: null,
        },
      ])
    )

    render(
      await CustomersPage({
        params,
        searchParams: Promise.resolve({ status: 'suspended' }),
      })
    )

    expect(screen.getByText('Suspended')).toBeVisible()
    expect(screen.getByText('Suspended Person')).toBeVisible()
  })

  it('threads the suspended profile status filter into the local profile query', async () => {
    mocks.listProfiles.mockResolvedValue([])

    render(
      await CustomersPage({
        params,
        searchParams: Promise.resolve({ status: 'suspended' }),
      })
    )

    // The filter applies to the courier profile, not the registry customer.
    expect(mocks.listProfiles).toHaveBeenCalledWith('tenant_123', 'SUSPENDED')
    expect(mocks.listCustomers).not.toHaveBeenCalled()
  })

  it('renders the table shell with the error when the registry is unavailable', async () => {
    mocks.listProfiles.mockResolvedValue([
      {
        id: 'profile_1',
        billingCustomerId: 'cus_business',
        status: 'ACTIVE',
        isCommercial: false,
      },
    ])
    mocks.listCustomers.mockResolvedValue({
      data: null,
      error: { message: 'Finance customers are temporarily unavailable.' },
    })

    render(await CustomersPage({ params, searchParams: emptySearchParams }))

    expect(
      screen.getByText('Finance customers are temporarily unavailable.')
    ).toBeVisible()
    // The enrolled profile still lists; only its resolved identity is missing,
    // so the customer id stands in for both the name and the email.
    expect(screen.getAllByText('cus_business')).toHaveLength(2)
    expect(screen.getByRole('columnheader', { name: 'Customer' })).toBeVisible()
  })

  it('when catalog items exist, formats minor-unit prices and identifies their source', async () => {
    mocks.listItems.mockResolvedValue(
      listResult([
        {
          id: 'item_1',
          name: 'Same-day delivery',
          sku: 'DELIVERY-SAME-DAY',
          description: null,
          type: 'SERVICE',
          source: { app: '876-couriers' },
          defaultSellingAmount: '125000',
          defaultSellingCurrency: 'JMD',
        },
        {
          id: 'item_2',
          name: 'Packaging sleeve',
          sku: null,
          description: 'Reusable mailer',
          type: 'GOOD',
          source: null,
          defaultSellingAmount: null,
          defaultSellingCurrency: null,
        },
      ])
    )

    render(await ItemsPage({ params, searchParams: emptySearchParams }))

    expect(screen.getByText('Same-day delivery')).toBeVisible()
    expect(screen.getByText('Connected app')).toBeVisible()
    expect(screen.getByText('Billing workspace')).toBeVisible()
    expect(screen.getByText(/1,250/)).toBeVisible()
    expect(screen.getByText('—')).toBeVisible()
    expect(mocks.listItems).toHaveBeenCalledWith('org_123', {
      active: undefined,
    })
  })

  it('threads the inactive item status filter into the finance list call', async () => {
    mocks.listItems.mockResolvedValue(listResult([]))

    render(
      await ItemsPage({
        params,
        searchParams: Promise.resolve({ status: 'inactive' }),
      })
    )

    expect(mocks.listItems).toHaveBeenCalledWith('org_123', {
      active: false,
    })
    expect(screen.getByRole('columnheader', { name: 'Item' })).toBeVisible()
    expect(screen.getByText('No items')).toBeVisible()
    expect(screen.getByText('No inactive items.')).toBeVisible()
  })

  it('when the item service fails, still renders the table shell with the service message', async () => {
    mocks.listItems.mockResolvedValue({
      data: null,
      error: { message: 'The shared catalog could not be loaded.' },
    })

    render(await ItemsPage({ params, searchParams: emptySearchParams }))

    expect(screen.getByRole('columnheader', { name: 'Item' })).toBeVisible()
    expect(
      screen.getByText('The shared catalog could not be loaded.')
    ).toBeVisible()
    expect(screen.getByText('No items')).toBeVisible()
  })
})
