/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/payments',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import { PaymentsSection } from './payments-section'

function renderSection() {
  return render(
    <PaymentsSection
      orgSlug="island-logistics"
      list={<div data-testid="payment-list" />}
    >
      <div data-testid="detail-route" />
    </PaymentsSection>
  )
}

describe('PaymentsSection', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  it('renders the toolbar and list with the Add action while closed', () => {
    renderSection()

    expect(screen.getByTestId('payment-list')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toHaveAttribute(
      'href',
      '/island-logistics/payments/new'
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /All/ })
    ).toBeInTheDocument()
  })

  it('keeps the toolbar and list mounted beside an open payment', () => {
    mocks.segments = ['pay_1']

    renderSection()

    expect(screen.getByTestId('payment-list')).toBeInTheDocument()
    expect(screen.getByTestId('detail-route')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })

  it('reflects the payment status filter in the heading', () => {
    mocks.searchParams = new URLSearchParams('status=completed')

    renderSection()

    expect(
      screen.getByRole('heading', { level: 1, name: /Completed/ })
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

  it('keeps the toolbar mounted on a nested payment route', () => {
    mocks.segments = ['pay_1', 'refund']

    renderSection()

    expect(screen.getByTestId('payment-list')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })
})
