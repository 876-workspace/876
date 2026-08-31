// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'

import CustomersLayout from './layout'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  listCustomers: vi.fn(),
  resolveOrg: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  useSelectedLayoutSegments: () => mocks.segments,
  useRouter: () => ({ refresh: vi.fn() }),
}))

vi.mock('@/lib/services/crm', () => ({
  crm: {
    customers: {
      list: mocks.listCustomers,
    },
  },
}))

vi.mock('@876/crm-ui/customer-list-shell', () => ({
  CustomerListShell: ({
    toolbar,
    list,
    children,
  }: {
    toolbar: React.ReactNode
    list: React.ReactNode
    children: React.ReactNode
  }) => (
    <div data-slot="customer-list-shell">
      {toolbar}
      {list}
      {children}
    </div>
  ),
}))

vi.mock('@876/ui/resource-toolbar', () => ({
  ResourceToolbar: ({
    title,
    primaryLabel,
    refresh,
  }: {
    title: string
    primaryLabel?: string
    refresh?: boolean
  }) => (
    <div data-refresh={refresh} data-slot="resource-toolbar">
      <h1>{title}</h1>
      {primaryLabel ? <button type="button">{primaryLabel}</button> : null}
    </div>
  ),
}))

vi.mock('@876/ui/data-table-skeleton', () => ({
  DataTableSkeleton: () => <div>Customer list column</div>,
}))

vi.mock('../../../_data', () => ({
  resolveOrg: mocks.resolveOrg,
}))

afterEach(cleanup)

function renderLayout() {
  render(
    <CustomersLayout params={Promise.resolve({ slug: 'efesto' })}>
      <div>Customer detail</div>
    </CustomersLayout>
  )
}

describe('CustomersLayout', () => {
  beforeEach(() => {
    mocks.segments = ['crm_cus_123']
    mocks.resolveOrg.mockResolvedValue({ id: 'org_123' })
    mocks.listCustomers.mockReturnValue(new Promise(() => {}))
  })

  it('renders the customer list column and detail child simultaneously', () => {
    renderLayout()

    expect(screen.getByText('Customer list column')).toBeInTheDocument()
    expect(screen.getByText('Customer detail')).toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="customer-list-shell"]')
    ).toBeInTheDocument()
  })

  it('renders a refresh toolbar without an Add action', () => {
    renderLayout()

    expect(screen.getByText('Customer list column')).toBeInTheDocument()

    expect(screen.queryByRole('link', { name: 'Add' })).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Add' })
    ).not.toBeInTheDocument()
    expect(
      document.querySelector('[data-slot="resource-toolbar"]')
    ).toHaveAttribute('data-refresh', 'true')
  })
})
