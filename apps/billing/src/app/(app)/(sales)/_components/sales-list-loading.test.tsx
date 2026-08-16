/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => '/invoices',
  useSearchParams: () => new URLSearchParams(),
}))

const permissionMock = vi.hoisted(() => ({ fn: vi.fn() }))
vi.mock('@/components/providers/permissions-provider', () => ({
  useBillingPermission: permissionMock.fn,
}))

import { SalesListLoading } from './sales-list-loading'

const OPTIONS = [
  { value: 'all', label: 'All', headingLabel: 'All Invoices' },
  { value: 'draft', label: 'Draft', headingLabel: 'Draft Invoices' },
]

const COLUMNS = [
  { label: 'Invoice', cell: 'avatar' as const },
  { label: 'Customer' },
  { label: 'Amount' },
  { label: 'Status', cell: 'badge' as const },
]

describe('SalesListLoading', () => {
  beforeEach(() => {
    permissionMock.fn.mockReturnValue(true)
  })

  it('renders toolbar with given title and primary', () => {
    render(
      <SalesListLoading
        title="Invoices"
        options={OPTIONS}
        primary={{
          label: 'New',
          href: '/invoices/new',
          permission: 'sales:write',
        }}
        columns={COLUMNS}
      />
    )
    expect(screen.getByText('All Invoices')).toBeTruthy()
    expect(screen.getByRole('link', { name: /^New$/ })).toHaveAttribute(
      'href',
      '/invoices/new'
    )
  })

  it('renders DataTableSkeleton with given columns and 5 rows', () => {
    const { container } = render(
      <SalesListLoading
        title="Quotes"
        options={OPTIONS}
        primary={{
          label: 'New',
          href: '/quotes/new',
          permission: 'sales:write',
        }}
        columns={COLUMNS}
      />
    )
    // headers
    const headers = Array.from(container.querySelectorAll('th')).map((th) =>
      th.textContent?.trim()
    )
    expect(headers).toEqual(COLUMNS.map((c) => c.label))
    expect(container.querySelectorAll('tbody tr').length).toBe(5)
  })

  it('passes status all to toolbar', () => {
    render(
      <SalesListLoading
        title="Payments"
        options={OPTIONS}
        primary={{ label: 'New', href: '/x', permission: 'sales:write' }}
        columns={COLUMNS}
      />
    )
    expect(screen.getByText('All Invoices')).toBeTruthy()
  })

  it('wraps in Page', () => {
    const { container } = render(
      <SalesListLoading
        title="T"
        options={OPTIONS}
        primary={{ label: 'L', href: '/l', permission: 'sales:write' }}
        columns={COLUMNS}
      />
    )
    expect(container.querySelector('[data-slot="page"]')).toBeTruthy()
  })

  it('toolbar permission gated', () => {
    permissionMock.fn.mockReturnValue(false)
    render(
      <SalesListLoading
        title="Invoices"
        options={OPTIONS}
        primary={{
          label: 'New',
          href: '/invoices/new',
          permission: 'sales:write',
        }}
        columns={COLUMNS}
      />
    )
    expect(screen.queryByRole('link', { name: /^New$/ })).toBeNull()
  })

  it('renders table container aria-hidden', () => {
    const { container } = render(
      <SalesListLoading
        title="T"
        options={OPTIONS}
        primary={{ label: 'L', href: '/l', permission: 'sales:write' }}
        columns={COLUMNS}
      />
    )
    expect(
      container.querySelector('[data-slot="table-container"]')
    ).toHaveAttribute('aria-hidden', 'true')
  })

  it('handles different column sets', () => {
    const custom = [
      { label: 'Quote', cell: 'avatar' as const },
      { label: 'Customer' },
    ]
    const { container } = render(
      <SalesListLoading
        title="Quotes"
        options={OPTIONS}
        primary={{
          label: 'New',
          href: '/quotes/new',
          permission: 'sales:write',
        }}
        columns={custom}
      />
    )
    expect(container.querySelectorAll('th').length).toBe(2)
  })
})
