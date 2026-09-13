/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/invoices',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import { InvoicesSection } from './invoices-section'

function renderSection() {
  return render(
    <InvoicesSection
      orgSlug="island-logistics"
      list={<div data-testid="invoice-list" />}
    >
      <div data-testid="detail-route" />
    </InvoicesSection>
  )
}

describe('InvoicesSection', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  it('renders the toolbar and list with the Add action while closed', () => {
    renderSection()

    expect(screen.getByTestId('invoice-list')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toHaveAttribute(
      'href',
      '/island-logistics/invoices/new'
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /All/ })
    ).toBeInTheDocument()
  })

  it('keeps the toolbar and list mounted beside an open invoice', () => {
    mocks.segments = ['inv_1']

    renderSection()

    expect(screen.getByTestId('invoice-list')).toBeInTheDocument()
    expect(screen.getByTestId('detail-route')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })

  it('reflects the invoice status filter in the heading', () => {
    mocks.searchParams = new URLSearchParams('status=overdue')

    renderSection()

    expect(
      screen.getByRole('heading', { level: 1, name: /Overdue/ })
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

  it('keeps the toolbar mounted on a nested invoice route', () => {
    mocks.segments = ['inv_1', 'payments']

    renderSection()

    expect(screen.getByTestId('invoice-list')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })
})
