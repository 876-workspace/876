// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { AdminOrganization, AdminSubscription } from '@876/platform/compat'

import { SubscribersList } from './subscribers-list'

const mocks = vi.hoisted(() => ({
  pathname: '/apps/876-couriers/subscribers',
}))

// Only the pathname is provided: inside the `@list` slot the layout segments
// never describe the open record, so the list must not depend on them.
vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}))

vi.mock('./subscribers-table', () => ({
  SubscribersTable: () => <div data-testid="subscribers-table" />,
}))

function aSubscription(
  overrides: Partial<AdminSubscription> = {}
): AdminSubscription {
  return {
    id: 'sub_1',
    object: 'subscription',
    organization_id: 'org_1',
    status: 'active',
    start_date: null,
    ...overrides,
  } as unknown as AdminSubscription
}

function anOrg(overrides: Partial<AdminOrganization> = {}): AdminOrganization {
  return {
    id: 'org_1',
    object: 'organization',
    name: 'Acme Couriers',
    doing_business_as: null,
    ...overrides,
  } as unknown as AdminOrganization
}

function renderList() {
  render(
    <SubscribersList
      appSlug="876-couriers"
      prices={[]}
      data={[
        aSubscription(),
        aSubscription({ id: 'sub_2', organization_id: 'org_2' }),
      ]}
      orgMap={{
        org_1: anOrg(),
        org_2: anOrg({ id: 'org_2', name: 'Sterling Freight' }),
      }}
    />
  )
}

describe('SubscribersList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.pathname = '/apps/876-couriers/subscribers'
  })

  it('renders the full table on the list route', () => {
    renderList()

    expect(screen.getByTestId('subscribers-table')).toBeInTheDocument()
    expect(document.querySelector('[data-slot="list-pane"]')).toBeNull()
  })

  it('collapses to the condensed pane when a subscription is open', () => {
    mocks.pathname = '/apps/876-couriers/subscribers/sub_1'
    renderList()

    expect(screen.queryByTestId('subscribers-table')).toBeNull()
    expect(
      screen.getByRole('link', { name: 'View subscription for Acme Couriers' })
    ).toHaveAttribute('aria-current', 'true')
    expect(
      screen.getByRole('link', {
        name: 'View subscription for Sterling Freight',
      })
    ).not.toHaveAttribute('aria-current')
  })
})
