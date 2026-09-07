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
  usePathname: () => '/items',
  useSearchParams: () => new URLSearchParams(),
}))

import { ItemsToolbar } from './items-toolbar'

describe('ItemsToolbar', () => {
  beforeEach(() => vi.clearAllMocks())

  it('renders Items heading with all status', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(<ItemsToolbar status="all" />)
    expect(screen.getByText('All Items')).toBeTruthy()
  })

  it('shows the Add primary action when catalog:write is allowed', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(<ItemsToolbar status="active" />)
    expect(screen.getByRole('link', { name: /^Add$/ })).toHaveAttribute(
      'href',
      '/items/new'
    )
    expect(mocks.useBillingPermission).toHaveBeenCalledWith('catalog:write')
  })

  it('hides the Add primary action when not permitted', () => {
    mocks.useBillingPermission.mockReturnValue(false)
    render(<ItemsToolbar status="all" />)
    expect(screen.queryByRole('link', { name: /^Add$/ })).toBeNull()
  })

  it('reflects inactive status label', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(<ItemsToolbar status="inactive" />)
    expect(screen.getByText('Inactive Items')).toBeTruthy()
  })

  it('does not render dropdown Import action (items has no dropdown)', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(<ItemsToolbar status="all" />)
    // still has refresh dropdown, but not Import
    expect(screen.queryByText('Import')).toBeNull()
  })

  it('calls permission hook with catalog:write', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(<ItemsToolbar status="all" />)
    expect(mocks.useBillingPermission).toHaveBeenCalledWith('catalog:write')
  })

  it('handles unknown status', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    render(<ItemsToolbar status="bogus" />)
    expect(screen.getByText('Items')).toBeTruthy()
  })

  it('has refresh dropdown affordance', () => {
    mocks.useBillingPermission.mockReturnValue(true)
    const { container } = render(<ItemsToolbar status="all" />)
    expect(container.querySelector('[aria-label="More actions"]')).toBeTruthy()
  })
})
