/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/items',
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock('@/components/providers/permissions-provider', () => ({
  useBillingPermission: () => true,
}))

import { ItemsTable } from './items-table'
import { ITEMS_SKELETON_COLUMNS } from './items-skeleton-columns'

/**
 * `items-skeleton-columns.ts` is a hand-maintained mirror of the table's
 * columns — the layout's Suspense fallback renders it while rows are in
 * flight, so the two drifting apart is what makes the skeleton lie about the
 * table it stands in for. This is the test that catches that.
 */
describe('items skeleton column parity', () => {
  it('mirrors every column the table renders, in order', () => {
    const { container } = render(
      <ItemsTable
        defaultCurrency="JMD"
        items={[
          {
            id: 'item_1',
            name: 'Freight forwarding',
            type: 'SERVICE',
            sku: 'FF-01',
            unit: 'each',
            defaultSellingAmount: 250000n,
            defaultSellingCurrency: 'JMD',
            isTaxable: true,
            isActive: true,
            prices: [],
          } as unknown as Parameters<typeof ItemsTable>[0]['items'][number],
        ]}
      />
    )

    const headers = Array.from(container.querySelectorAll('th')).map((th) =>
      th.textContent?.trim()
    )

    expect(headers).toEqual(
      ITEMS_SKELETON_COLUMNS.map((column) => column.label ?? '')
    )
  })
})
