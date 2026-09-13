/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/deliveries',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import { DeliveriesSection } from './deliveries-section'

function renderSection() {
  return render(
    <DeliveriesSection
      orgSlug="island-logistics"
      list={<div data-testid="delivery-list" />}
    >
      <div data-testid="detail-route" />
    </DeliveriesSection>
  )
}

describe('DeliveriesSection', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  it('renders the toolbar and list with the Add action while closed', () => {
    renderSection()

    expect(screen.getByTestId('delivery-list')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toHaveAttribute(
      'href',
      '/island-logistics/deliveries/new'
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /All/ })
    ).toBeInTheDocument()
  })

  it('keeps the toolbar and list mounted beside an open delivery', () => {
    mocks.segments = ['dlv_1']

    renderSection()

    expect(screen.getByTestId('delivery-list')).toBeInTheDocument()
    expect(screen.getByTestId('detail-route')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })

  it('reflects the delivery status filter in the heading', () => {
    mocks.searchParams = new URLSearchParams('status=delivered')

    renderSection()

    expect(
      screen.getByRole('heading', { level: 1, name: /Delivered/ })
    ).toBeInTheDocument()
  })

  it('shows the All heading when no status is selected', () => {
    renderSection()

    expect(
      screen.getByRole('heading', { level: 1, name: /All/ })
    ).toBeInTheDocument()
  })

  it('resolves an unknown status to the All heading', () => {
    mocks.searchParams = new URLSearchParams('status=teleported')

    renderSection()

    expect(
      screen.getByRole('heading', { level: 1, name: /All/ })
    ).toBeInTheDocument()
  })

  it('keeps the toolbar mounted on a nested delivery route', () => {
    mocks.segments = ['dlv_1', 'packages']

    renderSection()

    expect(screen.getByTestId('delivery-list')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })
})
