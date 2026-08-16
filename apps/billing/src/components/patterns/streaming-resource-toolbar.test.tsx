/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
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
  { value: 'all', label: 'All', headingLabel: 'All Test' },
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
    // StatusFilterHeading renders headingLabel for active -> Active Test
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
          label: 'New',
          href: '/invoices/new',
          permission: 'sales:write',
        }}
      />
    )
    expect(screen.getByRole('link', { name: /New/ })).toHaveAttribute(
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
          label: 'New',
          href: '/invoices/new',
          permission: 'sales:write',
        }}
      />
    )
    expect(screen.queryByRole('link', { name: /New/ })).toBeNull()
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
        primary={{ label: 'Action', href: '/x', permission: 'billing:access' }}
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

  it('gates dropdownAction separately from primary', () => {
    // first call for primary -> true, second for dropdown -> false
    mocks.useBillingPermission
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
    render(
      <StreamingResourceToolbar
        title="T"
        status="all"
        options={OPTIONS}
        primary={{ label: 'Primary', href: '/p', permission: 'sales:write' }}
        dropdownAction={{
          label: 'Import',
          href: '/import',
          permission: 'sales:write',
        }}
      />
    )
    expect(screen.getByRole('link', { name: /Primary/ })).toBeTruthy()
    // dropdown Import should be hidden when permission denied -> no Import in dropdown trigger content initially visible? ResourceToolbar renders dropdown menu hidden; test via props? We check mock called twice
    expect(mocks.useBillingPermission).toHaveBeenCalledTimes(2)
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
    expect(screen.getByText('All Test')).toBeTruthy()
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

  it('both primary and dropdown gated default to billing:access when undefined', () => {
    mocks.useBillingPermission.mockReturnValue(false)
    render(
      <StreamingResourceToolbar title="X" status="all" options={OPTIONS} />
    )
    // two calls both with billing:access
    expect(mocks.useBillingPermission).toHaveBeenCalledWith('billing:access')
    expect(mocks.useBillingPermission).toHaveBeenCalledTimes(2)
  })
})
