/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/packages/manifest',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import { ManifestSection } from './manifest-section'

function renderSection() {
  return render(
    <ManifestSection
      orgSlug="island-logistics"
      list={<div data-testid="manifest-list" />}
    >
      <div data-testid="detail-route" />
    </ManifestSection>
  )
}

describe('ManifestSection', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  it('renders the toolbar and list with the Add action while closed', () => {
    renderSection()

    expect(screen.getByTestId('manifest-list')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toHaveAttribute(
      'href',
      '/island-logistics/packages/manifest/new'
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /All/ })
    ).toBeInTheDocument()
  })

  it('keeps the toolbar and list mounted beside an open manifest', () => {
    mocks.segments = ['mnf_1']

    renderSection()

    expect(screen.getByTestId('manifest-list')).toBeInTheDocument()
    expect(screen.getByTestId('detail-route')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })

  it('reflects the manifest status filter in the heading', () => {
    mocks.searchParams = new URLSearchParams('status=sealed')

    renderSection()

    expect(
      screen.getByRole('heading', { level: 1, name: /Sealed/ })
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

  it('keeps the toolbar mounted on a nested manifest route', () => {
    mocks.segments = ['mnf_1', 'packages']

    renderSection()

    expect(screen.getByTestId('manifest-list')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })
})
