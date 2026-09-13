/** @vitest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  useBillingPermission: vi.fn(),
}))

vi.mock('@/components/providers/permissions-provider', () => ({
  useBillingPermission: mocks.useBillingPermission,
}))

// ResourceToolbar uses next/navigation useRouter, need mock
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/test',
  useSearchParams: () => new URLSearchParams(),
}))

import { StreamingResourceToolbar } from './streaming-resource-toolbar'

const OPTIONS = [
  { value: 'all', label: 'All Invoices', headingLabel: 'All Invoices' },
  { value: 'active', label: 'Active', headingLabel: 'Active Test' },
]

describe('StreamingResourceToolbar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders title filter with given status and options', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(
      <StreamingResourceToolbar
        title="Invoices"
        status="active"
        options={OPTIONS}
      />
    )
    // StatusFilterHeading renders headingLabel for active -> Active Test.
    expect(screen.getByText('Active Test')).toBeTruthy()
  })

  it('gates primary action on permission - shows when permitted', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(
      <StreamingResourceToolbar
        title="Invoices"
        status="all"
        options={OPTIONS}
        primary={{
          href: '/invoices/new',
          permission: 'sales:write',
        }}
      />
    )
    expect(screen.getByRole('link', { name: /^Add$/ })).toHaveAttribute(
      'href',
      '/invoices/new'
    )
  })

  it('hides primary when permission denied', () => {
    mocks.useBillingPermission.mockReturnValue(false)
    render(
      <StreamingResourceToolbar
        title="Invoices"
        status="all"
        options={OPTIONS}
        primary={{
          href: '/invoices/new',
          permission: 'sales:write',
        }}
      />
    )
    expect(screen.queryByRole('link', { name: /^Add$/ })).toBeNull()
  })

  it('always renders refresh affordance', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    const { container } = render(
      <StreamingResourceToolbar title="Quotes" status="all" options={OPTIONS} />
    )
    // ResourceToolbar renders dropdown with refresh
    expect(container.querySelector('[aria-label="More actions"]')).toBeTruthy()
  })

  it('uses billing:access fallback when primary has no permission', () => {
    mocks.useBillingPermission.mockImplementation(
      (perm: string) => perm === 'billing:access'
    )
    render(
      <StreamingResourceToolbar
        title="Test"
        status="all"
        options={OPTIONS}
        primary={{ href: '/x', permission: 'billing:access' }}
      />
    )
    expect(mocks.useBillingPermission).toHaveBeenCalledWith('billing:access')
  })

  it('calls useBillingPermission with billing:access when no primary provided', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(
      <StreamingResourceToolbar
        title="NoPrimary"
        status="all"
        options={OPTIONS}
      />
    )
    expect(mocks.useBillingPermission).toHaveBeenCalledWith('billing:access')
  })

  it('renders the standard list toolbar actions', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(
      <StreamingResourceToolbar
        title="Invoices"
        status="all"
        options={OPTIONS}
        primary={{
          href: '/invoices/new',
          permission: 'sales:write',
        }}
      />
    )
    expect(screen.getByText('All Invoices')).toBeTruthy()
    expect(screen.getByRole('link', { name: /^Add$/ })).toHaveAttribute(
      'href',
      '/invoices/new'
    )
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(screen.getByText('Refresh')).toBeTruthy()
    expect(screen.getByText('Import')).toBeTruthy()
    expect(screen.getByText('Export')).toBeTruthy()
  })

  it('passes correct title prop to StatusFilterHeading', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(
      <StreamingResourceToolbar
        title="My Title"
        status="all"
        options={OPTIONS}
      />
    )
    expect(screen.getByText('All Invoices')).toBeTruthy()
    // title is used as fallback label when no active option matches
    render(
      <StreamingResourceToolbar
        title="Other"
        status="unknown"
        options={OPTIONS}
      />
    )
    expect(screen.getByText('Other')).toBeTruthy()
  })

  it('renders with empty options without crashing', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    expect(() =>
      render(
        <StreamingResourceToolbar title="Empty" status="all" options={[]} />
      )
    ).not.toThrow()
    expect(screen.getByText('Empty')).toBeTruthy()
  })

  it('uses one fallback permission check when no primary is provided', () => {
    mocks.useBillingPermission.mockReturnValue(false)
    render(
      <StreamingResourceToolbar title="X" status="all" options={OPTIONS} />
    )
    expect(mocks.useBillingPermission).toHaveBeenCalledWith('billing:access')
    expect(mocks.useBillingPermission).toHaveBeenCalledTimes(1)
  })

  it('normalizes every permitted create action to the bare Add label', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(
      <StreamingResourceToolbar
        title="Subscriptions"
        status="all"
        options={OPTIONS}
        primary={{
          href: '/subscriptions/new',
          permission: 'subscriptions:write',
        }}
      />
    )
    expect(screen.getByRole('link', { name: /^Add$/ })).toHaveAttribute(
      'href',
      '/subscriptions/new'
    )
  })

  it('keeps the disabled transfer actions visible without an integration', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(
      <StreamingResourceToolbar title="Quotes" status="all" options={OPTIONS} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(screen.getByText('Import').closest('[data-disabled]')).not.toBeNull()
    expect(screen.getByText('Export').closest('[data-disabled]')).not.toBeNull()
  })

  it('renders Refresh before the transfer actions', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(
      <StreamingResourceToolbar title="Quotes" status="all" options={OPTIONS} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    const actions = Array.from(
      document.querySelectorAll('[role="menuitem"]')
    ).map((item) => item.textContent)
    expect(actions).toEqual(['Refresh', 'Import', 'Export'])
  })

  it('renders the status filter heading without a create action', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(
      <StreamingResourceToolbar
        title="Payments Received"
        status="all"
        options={[{ value: 'all', label: 'All Payments Received' }]}
      />
    )
    expect(screen.getByText('All Payments Received')).toBeTruthy()
    expect(screen.queryByRole('link', { name: /^Add$/ })).toBeNull()
  })

  it('keeps the standard menu available when creation is not permitted', () => {
    mocks.useBillingPermission.mockReturnValue(false)
    render(
      <StreamingResourceToolbar
        title="Invoices"
        status="all"
        options={OPTIONS}
        primary={{
          href: '/invoices/new',
          permission: 'sales:write',
        }}
      />
    )
    expect(screen.queryByRole('link', { name: /^Add$/ })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'More actions' }))
    expect(screen.getByText('Refresh')).toBeTruthy()
    expect(screen.getByText('Import')).toBeTruthy()
    expect(screen.getByText('Export')).toBeTruthy()
  })
})
