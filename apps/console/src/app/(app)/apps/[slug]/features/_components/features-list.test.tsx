// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { AdminFeature } from '@876/platform/compat'

import { FeaturesList } from './features-list'

const mocks = vi.hoisted(() => ({ pathname: '/apps/876-couriers/features' }))

// Only the pathname is provided: inside the `@list` slot the layout segments
// never describe the open record, so the list must not depend on them.
vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

vi.mock('./features-table', () => ({
  AppFeaturesTable: () => <div data-testid="features-table" />,
}))

function aFeature(overrides: Partial<AdminFeature> = {}): AdminFeature {
  return {
    id: 'feat_1',
    object: 'feature',
    name: 'Pre-alerts',
    slug: 'couriers-pre-alerts',
    enabled: true,
    ...overrides,
  } as unknown as AdminFeature
}

describe('FeaturesList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pathname = '/apps/876-couriers/features'
  })

  it('renders the full table on the list route', () => {
    render(
      <FeaturesList
        appSlug="876-couriers"
        data={[
          aFeature(),
          aFeature({
            id: 'feat_2',
            name: 'Branches',
            slug: 'couriers-branches',
          }),
        ]}
        query=""
        moduleFeatureIds={[]}
        hasMore={false}
        firstId={null}
        lastId={null}
      />
    )

    expect(screen.getByTestId('features-table')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="list-pane"]')).toBeNull()
  })

  it('collapses to the condensed pane when a record is open', () => {
    mocks.pathname = '/apps/876-couriers/features/feat_1'
    render(
      <FeaturesList
        appSlug="876-couriers"
        data={[
          aFeature(),
          aFeature({
            id: 'feat_2',
            name: 'Branches',
            slug: 'couriers-branches',
          }),
        ]}
        query=""
        moduleFeatureIds={[]}
        hasMore={false}
        firstId={null}
        lastId={null}
      />
    )

    expect(screen.queryByTestId('features-table')).toBeNull()
    expect(
      screen.getByRole('link', { name: 'View feature Pre-alerts' })
    ).toHaveAttribute('aria-current', 'true')
    expect(
      screen.getByRole('link', { name: 'View feature Branches' })
    ).not.toHaveAttribute('aria-current')
  })

  it('stays collapsed on a nested tab of the open record', () => {
    mocks.pathname = '/apps/876-couriers/features/feat_1/access'
    render(
      <FeaturesList
        appSlug="876-couriers"
        data={[
          aFeature(),
          aFeature({
            id: 'feat_2',
            name: 'Branches',
            slug: 'couriers-branches',
          }),
        ]}
        query=""
        moduleFeatureIds={[]}
        hasMore={false}
        firstId={null}
        lastId={null}
      />
    )

    expect(screen.queryByTestId('features-table')).toBeNull()
    expect(
      screen.getByRole('link', { name: 'View feature Pre-alerts' })
    ).toHaveAttribute('href', '/apps/876-couriers/features/feat_1')
  })
})
