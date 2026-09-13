/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  useBillingPermission: vi.fn(),
}))

vi.mock('@/components/providers/permissions-provider', () => ({
  useBillingPermission: mocks.useBillingPermission,
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/customers',
  useSearchParams: () => new URLSearchParams(),
}))

import { CustomersToolbar } from './customers-toolbar'

describe('CustomersToolbar', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders Customers heading with status filter', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(<CustomersToolbar status="all" />)
    expect(screen.getByText('All Customers')).toBeTruthy()
  })

  it('shows Add primary when customers:write allowed', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(<CustomersToolbar status="active" />)
    expect(screen.getByRole('link', { name: /Add/ })).toHaveAttribute(
      'href',
      '/customers/new'
    )
    expect(mocks.useBillingPermission).toHaveBeenCalledWith('customers:write')
  })

  it('hides primary when not permitted', () => {
    mocks.useBillingPermission.mockReturnValue(false)
    render(<CustomersToolbar status="all" />)
    expect(screen.queryByRole('link', { name: /Add/ })).toBeNull()
  })

  it('always shows refresh dropdown', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    const { container } = render(<CustomersToolbar status="all" />)
    expect(container.querySelector('[aria-label="More actions"]')).toBeTruthy()
  })

  it('reflects archived status label', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(<CustomersToolbar status="archived" />)
    expect(screen.getByText('Archived Customers')).toBeTruthy()
  })

  it('reflects active status label', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(<CustomersToolbar status="active" />)
    expect(screen.getByText('Active Customers')).toBeTruthy()
  })

  it('calls permission hook exactly once per render', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(<CustomersToolbar status="all" />)
    expect(mocks.useBillingPermission).toHaveBeenCalledTimes(1)
    expect(mocks.useBillingPermission).toHaveBeenCalledWith('customers:write')
  })

  it('handles unknown status gracefully', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(<CustomersToolbar status="unknown" />)
    // falls back to label Customers (no matching headingLabel)
    expect(screen.getByText('Customers')).toBeTruthy()
  })
})
