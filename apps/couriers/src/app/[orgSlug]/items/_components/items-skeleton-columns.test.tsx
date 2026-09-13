/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => [],
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/island-logistics/items',
}))

import { ItemsList } from './items-list'
import { ITEMS_SKELETON_COLUMNS } from './items-skeleton-columns'

describe('items skeleton column parity', () => {
  it('mirrors every column the shared items table renders, in order', () => {
    const { container } = render(
      <ItemsList
        orgSlug="island-logistics"
        items={[
          {
            id: 'item_1',
            name: 'Same-day delivery',
            type: 'SERVICE',
            sku: 'DELIVERY-SAME-DAY',
            unit: null,
            defaultSellingAmount: '125000',
            defaultSellingCurrency: 'JMD',
            isTaxable: true,
            isActive: true,
          },
        ]}
      />
    )

    const headers = Array.from(container.querySelectorAll('th')).map((th) =>
      th.textContent?.trim()
    )

    expect(headers).toEqual(
      ITEMS_SKELETON_COLUMNS.map((column) => column.label)
    )
  })
})
