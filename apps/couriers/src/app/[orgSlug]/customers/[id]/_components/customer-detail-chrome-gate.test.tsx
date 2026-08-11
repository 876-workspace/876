/** @vitest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  pathname: '/nkr-express/customers/cprof_123',
}))

vi.mock('next/navigation', () => ({
  usePathname: () => mocks.pathname,
}))

import { CustomerDetailChromeGate } from './customer-detail-chrome-gate'

describe('CustomerDetailChromeGate', () => {
  beforeEach(() => {
    mocks.pathname = '/nkr-express/customers/cprof_123'
  })

  it('renders children on the overview page', () => {
    render(
      <CustomerDetailChromeGate>
        <span>chrome</span>
      </CustomerDetailChromeGate>
    )
    expect(screen.getByText('chrome')).toBeVisible()
  })

  it('renders children on sub-tabs like addresses', () => {
    mocks.pathname = '/nkr-express/customers/cprof_123/addresses'
    render(
      <CustomerDetailChromeGate>
        <span>sub-tab chrome</span>
      </CustomerDetailChromeGate>
    )
    expect(screen.getByText('sub-tab chrome')).toBeVisible()
  })

  it('hides chrome when the pathname ends with /edit', () => {
    mocks.pathname = '/nkr-express/customers/cprof_123/edit'
    render(
      <CustomerDetailChromeGate>
        <span>should be hidden</span>
      </CustomerDetailChromeGate>
    )
    expect(screen.queryByText('should be hidden')).not.toBeInTheDocument()
  })

  it('still renders children when pathname is null', () => {
    mocks.pathname = null as unknown as string
    render(
      <CustomerDetailChromeGate>
        <span>fallback</span>
      </CustomerDetailChromeGate>
    )
    expect(screen.getByText('fallback')).toBeVisible()
  })

  it('does not hide chrome for a path that merely contains /edit in the middle', () => {
    mocks.pathname = '/nkr-express/customers/cprof_123/edit/history'
    render(
      <CustomerDetailChromeGate>
        <span>still visible</span>
      </CustomerDetailChromeGate>
    )
    expect(screen.getByText('still visible')).toBeVisible()
  })
})
