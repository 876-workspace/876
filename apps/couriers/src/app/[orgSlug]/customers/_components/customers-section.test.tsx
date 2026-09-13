/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/customers',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import { CustomersSection } from './customers-section'

function renderSection() {
  return render(
    <CustomersSection
      orgSlug="island-logistics"
      list={<div data-testid="customer-list" />}
    >
      <div data-testid="detail-route" />
    </CustomersSection>
  )
}

describe('CustomersSection', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  it('renders the toolbar and list with the Add action while closed', () => {
    renderSection()

    expect(screen.getByTestId('customer-list')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toHaveAttribute(
      'href',
      '/island-logistics/customers/new'
    )
    expect(
      screen.getByRole('heading', { level: 1, name: /All/ })
    ).toBeInTheDocument()
  })

  it('renders the standard status heading and actions menu', async () => {
    const user = userEvent.setup()

    renderSection()
    await user.click(screen.getByRole('button', { name: 'More actions' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'All Customers' })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('menuitem', { name: 'Refresh' })
    ).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Import' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/island-logistics/customers/new'
    )
  })

  it('keeps the toolbar and list mounted beside an open customer', () => {
    mocks.segments = ['profile_ada']

    renderSection()

    expect(screen.getByTestId('customer-list')).toBeInTheDocument()
    expect(screen.getByTestId('detail-route')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Add/ })).toBeInTheDocument()
  })

  it('opens the add form in the detail column rather than taking over', () => {
    mocks.segments = ['new']

    renderSection()

    expect(screen.getByTestId('customer-list')).toBeInTheDocument()
    expect(screen.getByTestId('detail-route')).toBeInTheDocument()
  })

  it('lets the edit form take over the whole content area', () => {
    mocks.segments = ['profile_ada', 'edit']

    renderSection()

    expect(screen.queryByTestId('customer-list')).toBeNull()
    expect(screen.queryByRole('link', { name: /Add/ })).toBeNull()
    expect(screen.getByTestId('detail-route')).toBeInTheDocument()
  })

  it('reflects the courier status filter in the heading', () => {
    mocks.searchParams = new URLSearchParams('status=suspended')

    renderSection()

    expect(
      screen.getByRole('heading', { level: 1, name: /Suspended/ })
    ).toBeInTheDocument()
  })
})
