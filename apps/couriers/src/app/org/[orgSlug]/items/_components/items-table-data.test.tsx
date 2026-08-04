/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  get876Client: vi.fn(),
  listItems: vi.fn(),
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/876', () => ({
  get876Client: mocks.get876Client,
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/org/island-logistics/items',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn() }),
}))

// The page shell is a sync component whose data lives in an async child behind
// <Suspense>; rendering the shell would only produce fallbacks. These tests
// target that data boundary directly, which is the unit they have always
// exercised: fetch resolution plus table rendering.
import { ItemsTableData } from './items-table-data'

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

describe('Couriers items page data', () => {
  beforeEach(() => {
    mocks.getManageContext.mockResolvedValue(context)
    mocks.get876Client.mockResolvedValue({
      billing: { items: { list: mocks.listItems } },
    })
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
          sourceAppId: '876-couriers',
          defaultSellingAmount: '125000',
          defaultSellingCurrency: 'JMD',
        },
        {
          id: 'item_2',
          name: 'Packaging sleeve',
          sku: null,
          description: 'Reusable mailer',
          type: 'GOOD',
          sourceAppId: null,
          defaultSellingAmount: null,
          defaultSellingCurrency: null,
        },
      ])
    )

    render(await ItemsTableData({ params, searchParams: emptySearchParams }))

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
      await ItemsTableData({
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

    render(await ItemsTableData({ params, searchParams: emptySearchParams }))

    expect(screen.getByRole('columnheader', { name: 'Item' })).toBeVisible()
    expect(
      screen.getByText('The shared catalog could not be loaded.')
    ).toBeVisible()
    expect(screen.getByText('No items')).toBeVisible()
  })
})
