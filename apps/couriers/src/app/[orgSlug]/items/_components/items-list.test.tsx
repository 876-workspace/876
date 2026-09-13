/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/items',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import type { ItemRow } from '@876/billing-ui/items-table'
import { ItemsList } from './items-list'

function createItem(overrides: Partial<ItemRow> = {}): ItemRow {
  return {
    id: 'item_1',
    name: 'Same-day delivery',
    type: 'SERVICE',
    sku: 'DELIVERY-SAME-DAY',
    unit: null,
    defaultSellingAmount: '125000',
    defaultSellingCurrency: 'JMD',
    isTaxable: true,
    isActive: true,
    ...overrides,
  }
}

function renderList(items: ItemRow[]) {
  return render(<ItemsList orgSlug="island-logistics" items={items} />)
}

const twoItems = [
  createItem(),
  createItem({
    id: 'item_2',
    name: 'Packaging sleeve',
    type: 'GOOD',
    sku: null,
    unit: 'each',
    defaultSellingAmount: null,
    defaultSellingCurrency: null,
    isTaxable: false,
    isActive: false,
  }),
]

describe('ItemsList', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  describe('closed (no item open)', () => {
    it('renders the full table with its column headers', () => {
      renderList(twoItems)

      expect(screen.getByRole('columnheader', { name: 'Item' })).toBeVisible()
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeVisible()
      expect(screen.getByText('Same-day delivery')).toBeVisible()
      expect(screen.getByText('Packaging sleeve')).toBeVisible()
    })

    it('ignores the list-only route group when deciding the table is shown', () => {
      mocks.segments = ['(list)']

      renderList(twoItems)

      expect(screen.getByRole('table')).toBeVisible()
    })

    it('filters rows to the active status', () => {
      mocks.searchParams = new URLSearchParams('status=active')

      renderList(twoItems)

      expect(screen.getByText('Same-day delivery')).toBeVisible()
      expect(screen.queryByText('Packaging sleeve')).toBeNull()
    })

    it('treats an unknown status as no filter', () => {
      mocks.searchParams = new URLSearchParams('status=archived')

      renderList(twoItems)

      expect(screen.getByText('Same-day delivery')).toBeVisible()
      expect(screen.getByText('Packaging sleeve')).toBeVisible()
    })
  })

  describe('open (item beside the list)', () => {
    it('collapses to the condensed pane and marks the open item', () => {
      mocks.segments = ['item_2']

      renderList(twoItems)

      expect(screen.queryByRole('table')).toBeNull()
      const selected = screen.getByRole('link', {
        name: 'View item Packaging sleeve',
      })
      expect(selected).toHaveAttribute('aria-current', 'true')
      expect(
        screen.getByRole('link', { name: 'View item Same-day delivery' })
      ).not.toHaveAttribute('aria-current')
    })

    it('keeps the status badge and supporting line in the condensed row', () => {
      mocks.segments = ['item_2']

      renderList(twoItems)

      expect(screen.getByText('Active')).toBeVisible()
      expect(screen.getByText('Inactive')).toBeVisible()
      expect(screen.getByText('DELIVERY-SAME-DAY')).toBeVisible()
      expect(screen.getByText('each')).toBeVisible()
    })

    it('carries the active query string onto row links', () => {
      mocks.segments = ['item_1']
      mocks.searchParams = new URLSearchParams('status=active')

      renderList(twoItems)

      expect(
        screen.getByRole('link', { name: 'View item Same-day delivery' })
      ).toHaveAttribute('href', '/island-logistics/items/item_1?status=active')
    })

    it('shows an empty pane when the filter leaves no rows', () => {
      mocks.segments = ['item_1']
      mocks.searchParams = new URLSearchParams('status=inactive')

      render(<ItemsList orgSlug="island-logistics" items={[createItem()]} />)

      expect(screen.getByText('No items')).toBeVisible()
      expect(screen.queryByRole('link')).toBeNull()
    })
  })
})
