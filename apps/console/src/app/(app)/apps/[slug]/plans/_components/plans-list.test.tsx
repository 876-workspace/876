// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { AdminProduct } from '@876/platform/compat'

import { PlansList } from './plans-list'

const mocks = vi.hoisted(() => ({ pathname: '/apps/876-couriers/plans' }))

// Only the pathname is provided: inside the `@list` slot the layout segments
// never describe the open record, so the list must not depend on them.
vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

vi.mock('./plans-table', () => ({
  PlansTable: () => <div data-testid="plans-table" />,
  formatPrice: () => 'Free',
}))

function aPlan(overrides: Partial<AdminProduct> = {}): AdminProduct {
  return {
    id: 'prod_1',
    object: 'product',
    name: 'Free',
    slug: '876-couriers-free',
    ...overrides,
  } as unknown as AdminProduct
}

describe('PlansList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pathname = '/apps/876-couriers/plans'
  })

  it('renders the full table on the list route', () => {
    render(
      <PlansList
        data={[
          aPlan(),
          aPlan({ id: 'prod_2', name: 'Pro', slug: '876-couriers-pro' }),
        ]}
        appSlug="876-couriers"
      />
    )

    expect(screen.getByTestId('plans-table')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="list-pane"]')).toBeNull()
  })

  it('collapses to the condensed pane when a record is open', () => {
    mocks.pathname = '/apps/876-couriers/plans/876-couriers-free'
    render(
      <PlansList
        data={[
          aPlan(),
          aPlan({ id: 'prod_2', name: 'Pro', slug: '876-couriers-pro' }),
        ]}
        appSlug="876-couriers"
      />
    )

    expect(screen.queryByTestId('plans-table')).toBeNull()
    expect(
      screen.getByRole('link', { name: 'View plan Free' })
    ).toHaveAttribute('aria-current', 'true')
    expect(
      screen.getByRole('link', { name: 'View plan Pro' })
    ).not.toHaveAttribute('aria-current')
  })

  it('stays collapsed on a nested tab of the open record', () => {
    mocks.pathname = '/apps/876-couriers/plans/876-couriers-free/pricing'
    render(
      <PlansList
        data={[
          aPlan(),
          aPlan({ id: 'prod_2', name: 'Pro', slug: '876-couriers-pro' }),
        ]}
        appSlug="876-couriers"
      />
    )

    expect(screen.queryByTestId('plans-table')).toBeNull()
    expect(
      screen.getByRole('link', { name: 'View plan Free' })
    ).toHaveAttribute('href', '/apps/876-couriers/plans/876-couriers-free')
  })
})
