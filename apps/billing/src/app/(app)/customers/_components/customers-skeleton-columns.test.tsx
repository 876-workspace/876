/** @vitest-environment jsdom */

import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/customers',
  useSearchParams: () => new URLSearchParams(),
}))

import { CustomersTable } from './customers-table'
import { CUSTOMERS_SKELETON_COLUMNS } from './customers-skeleton-columns'

/**
 * `customers-skeleton-columns.ts` is a hand-maintained mirror of the table's
 * columns — the layout's Suspense fallback renders it while rows are in
 * flight, so the two drifting apart is what makes the skeleton lie about the
 * table it is standing in for. This is the test that catches that.
 *
 * It renders the table rather than a route fallback: the section's list lives
 * in `layout.tsx` now, so there is no `(list)/loading.tsx` left to render.
 */
describe('customers skeleton column parity', () => {
  it('mirrors every column the table renders, in order', () => {
    const { container } = render(
      <CustomersTable
        customers={[
          {
            id: 'cus_1',
            name: 'Alejandra Reyes',
            companyName: 'Reyes Logistics',
            contactName: 'Alejandra Reyes',
            phone: '+18761234567',
            receivablesAmount: 125000n,
            receivablesCurrency: 'JMD',
            status: 'ACTIVE',
          } as unknown as Parameters<
            typeof CustomersTable
          >[0]['customers'][number],
        ]}
      />
    )

    const headers = Array.from(container.querySelectorAll('th')).map((th) =>
      th.textContent?.trim()
    )

    expect(headers).toEqual(CUSTOMERS_SKELETON_COLUMNS.map((c) => c.label))
  })
})
