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

import { ItemsSection } from './items-section'

function renderSection() {
  return render(
    <ItemsSection
      orgSlug="island-logistics"
      list={<div data-testid="item-list" />}
    >
      <div data-testid="detail-route" />
    </ItemsSection>
  )
}

describe('ItemsSection', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  it('renders the toolbar and list while closed', () => {
    renderSection()

    expect(screen.getByTestId('item-list')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: /All Items/ })
    ).toBeInTheDocument()
  })

  it('keeps the toolbar and list mounted beside an open item', () => {
    mocks.segments = ['item_1']

    renderSection()

    expect(screen.getByTestId('item-list')).toBeInTheDocument()
    expect(screen.getByTestId('detail-route')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: /All Items/ })
    ).toBeInTheDocument()
  })

  it('reflects the active status filter in the heading', () => {
    mocks.searchParams = new URLSearchParams('status=active')

    renderSection()

    expect(
      screen.getByRole('heading', { level: 1, name: /Active Items/ })
    ).toBeInTheDocument()
  })

  it('reflects the inactive status filter in the heading', () => {
    mocks.searchParams = new URLSearchParams('status=inactive')

    renderSection()

    expect(
      screen.getByRole('heading', { level: 1, name: /Inactive Items/ })
    ).toBeInTheDocument()
  })
})
