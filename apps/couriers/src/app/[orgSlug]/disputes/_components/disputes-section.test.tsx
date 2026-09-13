/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/disputes',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import { DisputesSection } from './disputes-section'

function renderSection() {
  return render(
    <DisputesSection
      orgSlug="island-logistics"
      list={<div data-testid="dispute-list" />}
    >
      <div data-testid="detail-route" />
    </DisputesSection>
  )
}

describe('DisputesSection', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  it('renders the Disputes heading with the list while closed', () => {
    renderSection()

    expect(
      screen.getByRole('heading', { level: 1, name: 'All Disputes' })
    ).toBeInTheDocument()
    expect(screen.getByTestId('dispute-list')).toBeInTheDocument()
  })

  it('renders the Add action against the new dispute route', () => {
    renderSection()

    expect(screen.getByRole('link', { name: /Add/ })).toHaveAttribute(
      'href',
      '/island-logistics/disputes/new'
    )
  })

  it('keeps the toolbar and list mounted beside an open dispute', () => {
    mocks.segments = ['dsp_1']

    renderSection()

    expect(screen.getByTestId('dispute-list')).toBeInTheDocument()
    expect(screen.getByTestId('detail-route')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })

  it('keeps the toolbar mounted on a nested dispute route', () => {
    mocks.segments = ['dsp_1', 'activity']

    renderSection()

    expect(screen.getByTestId('dispute-list')).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'All Disputes' })
    ).toBeInTheDocument()
  })

  it('keeps the detail route rendered beside the list', () => {
    mocks.segments = ['dsp_9']

    renderSection()

    expect(screen.getByTestId('detail-route')).toBeInTheDocument()
  })
})
