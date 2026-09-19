/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getManageContext: vi.fn(),
  listItems: vi.fn(),
  searchParams: new URLSearchParams(),
  segments: [] as string[],
}))

vi.mock('@/lib/auth/manage-context', () => ({
  getManageContext: mocks.getManageContext,
}))
vi.mock('@/lib/clients/billing', () => ({
  billingIntegration: { items: { list: mocks.listItems } },
}))
vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/items',
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

// The layout renders this async data half behind <Suspense>; these tests target
// that boundary directly: fetch resolution plus list rendering.
import { ItemsListData } from './items-list-data'

const context = {
  orgId: 'org_123',
  orgName: 'Island Logistics',
  tenant: { id: 'tenant_123', name: 'Island Couriers' },
}

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

function createItem(overrides: Record<string, unknown> = {}) {
  return {
    id: 'item_1',
    name: 'Same-day delivery',
    sku: 'DELIVERY-SAME-DAY',
    description: null,
    type: 'SERVICE',
    unit: null,
    isTaxable: true,
    isActive: true,
    sourceAppId: '876-couriers',
    defaultSellingAmount: '125000',
    defaultSellingCurrency: 'JMD',
    ...overrides,
  }
}

describe('Couriers items list data', () => {
  beforeEach(() => {
    mocks.searchParams = new URLSearchParams()
    mocks.segments = []
    mocks.getManageContext.mockResolvedValue(context)
  })

  it('loads every shared-catalog item without narrowing the finance query', async () => {
    mocks.listItems.mockResolvedValue(
      listResult([
        createItem(),
        createItem({ id: 'item_2', name: 'Packaging sleeve', isActive: false }),
      ])
    )

    render(await ItemsListData({ orgSlug: 'island-logistics' }))

    // The layout cannot see `searchParams`, so the query is never narrowed —
    // the status filter is applied by `ItemsList` instead.
    expect(mocks.listItems).toHaveBeenCalledWith('org_123')
    expect(mocks.listItems).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Same-day delivery')).toBeVisible()
    expect(screen.getByText('Packaging sleeve')).toBeVisible()
  })

  it('renders the empty state without calling finance when there is no tenant', async () => {
    mocks.getManageContext.mockResolvedValue(null)

    render(await ItemsListData({ orgSlug: 'island-logistics' }))

    expect(mocks.listItems).not.toHaveBeenCalled()
    expect(screen.getByText('No items')).toBeVisible()
  })

  it('keeps the list shell mounted with a notice when the item service fails', async () => {
    mocks.listItems.mockResolvedValue({
      data: null,
      error: {
        code: 'billing/unavailable',
        message: 'The shared catalog could not be loaded.',
      },
    })

    render(await ItemsListData({ orgSlug: 'island-logistics' }))

    expect(screen.getByText('Items could not be loaded')).toBeVisible()
    expect(
      screen.getByText('The shared catalog could not be loaded.')
    ).toBeVisible()
    expect(screen.getByRole('columnheader', { name: 'Item' })).toBeVisible()
    expect(screen.getByText('No items')).toBeVisible()
  })

  it('renders the empty state without a notice when the Billing workspace is missing', async () => {
    mocks.listItems.mockResolvedValue({
      data: null,
      error: {
        code: 'billing/tenant-not-found',
        message: 'The Billing workspace was not found.',
      },
    })

    render(await ItemsListData({ orgSlug: 'island-logistics' }))

    expect(screen.getByText('No items')).toBeVisible()
    expect(
      screen.queryByText('The Billing workspace was not found.')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Items could not be loaded')
    ).not.toBeInTheDocument()
  })
})
