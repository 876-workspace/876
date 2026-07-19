/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  getFinanceClient: vi.fn(),
  listProfiles: vi.fn(),
  listCustomers: vi.fn(),
  listItems: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/org/island-logistics/customers',
  useRouter: () => ({ refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
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

import CustomersPage from './customers/page'
import ItemsPage from './items/page'

const context = {
  orgId: 'org_123',
  orgName: 'Island Logistics',
  tenant: { id: 'tenant_123', name: 'Island Couriers' },
}
const params = Promise.resolve({ orgSlug: 'island-logistics' })
const searchParams = Promise.resolve({})

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

  it('when shared customers exist, distinguishes enrolled and unenrolled courier profiles', async () => {
    mocks.listCustomers.mockResolvedValue(
      listResult(
        [
          {
            id: 'cus_business',
            name: 'Blue Mountain Trading',
            email: 'ops@bluemountain.test',
            customerNumber: 'C-1001',
            customerKind: 'BUSINESS',
            status: 'ACTIVE',
          },
          {
            id: 'cus_person',
            name: 'Nia Campbell',
            email: null,
            customerNumber: null,
            customerKind: 'INDIVIDUAL',
            status: 'ARCHIVED',
          },
        ],
        true
      )
    )
    mocks.listProfiles.mockResolvedValue([
      { id: 'profile_1', billingCustomerId: 'cus_business' },
    ])

    render(await CustomersPage({ params, searchParams }))

    expect(screen.getByText('Blue Mountain Trading')).toBeVisible()
    expect(screen.getByText('Nia Campbell')).toBeVisible()
    expect(screen.getByText('Enrolled')).toBeVisible()
    expect(screen.getByText('Not enrolled')).toBeVisible()
    expect(screen.getByText('C-1001')).toBeVisible()
    expect(screen.getByRole('link', { name: 'Next' })).toBeVisible()
    expect(mocks.listCustomers).toHaveBeenCalledWith('org_123', {
      limit: 25,
      starting_after: undefined,
      ending_before: undefined,
      status: undefined,
    })
  })

  it('when the customer service is empty or unavailable, renders an actionable state instead of a blank table', async () => {
    mocks.listCustomers.mockResolvedValueOnce(listResult([]))
    const { rerender } = render(await CustomersPage({ params, searchParams }))
    expect(screen.getByText('No shared customers.')).toBeVisible()

    mocks.listCustomers.mockResolvedValueOnce({
      data: null,
      error: { message: 'Finance customers are temporarily unavailable.' },
    })
    rerender(await CustomersPage({ params, searchParams }))
    expect(
      screen.getByText('Finance customers are temporarily unavailable.')
    ).toBeVisible()
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
          isActive: true,
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
          isActive: false,
        },
      ])
    )

    render(await ItemsPage({ params, searchParams }))

    expect(screen.getByText('Same-day delivery')).toBeVisible()
    expect(screen.getByText('Connected app')).toBeVisible()
    expect(screen.getByText('Billing workspace')).toBeVisible()
    expect(screen.getByText(/1,250/)).toBeVisible()
    expect(screen.getByText('—')).toBeVisible()
    expect(screen.getByText('Active')).toBeVisible()
    expect(screen.getByText('Inactive')).toBeVisible()
    expect(mocks.listItems).toHaveBeenCalledWith('org_123', {
      active: undefined,
    })
  })

  it('when the item service fails, exposes the service message', async () => {
    mocks.listItems.mockResolvedValue({
      data: null,
      error: { message: 'The shared catalog could not be loaded.' },
    })

    render(await ItemsPage({ params, searchParams }))

    expect(
      screen.getByText('The shared catalog could not be loaded.')
    ).toBeVisible()
  })
})
