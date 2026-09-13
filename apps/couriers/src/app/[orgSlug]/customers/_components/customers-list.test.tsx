/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
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

import type { CustomerTableRow } from './customers-table'
import { CustomersList } from './customers-list'

function createRow(
  overrides: Partial<CustomerTableRow> = {}
): CustomerTableRow {
  return {
    id: 'profile_ada',
    billingCustomerId: 'cus_ada',
    customerName: 'Ada Campbell',
    companyName: null,
    email: 'ada@example.test',
    phone: '+1 876 555 0101',
    status: 'ACTIVE',
    ...overrides,
  }
}

function renderList() {
  return render(
    <CustomersList
      orgSlug="island-logistics"
      customers={[
        createRow(),
        createRow({
          id: 'profile_blue',
          billingCustomerId: 'cus_blue',
          customerName: 'Blue Mountain Trading',
          companyName: 'Blue Mountain Trading Ltd',
          status: 'SUSPENDED',
        }),
      ]}
    />
  )
}

describe('CustomersList', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  describe('closed (no customer open)', () => {
    it('renders the full table with its column headers', () => {
      renderList()

      expect(screen.getByRole('columnheader', { name: 'Name' })).toBeVisible()
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeVisible()
      expect(screen.getByText('Ada Campbell')).toBeVisible()
      expect(screen.getByText('Blue Mountain Trading')).toBeVisible()
    })

    it('ignores the list-only route group when deciding the table is shown', () => {
      mocks.segments = ['(list)']

      renderList()

      expect(screen.getByRole('table')).toBeVisible()
    })

    it('filters rows by courier profile status', () => {
      mocks.searchParams = new URLSearchParams('status=suspended')

      renderList()

      expect(screen.getByText('Blue Mountain Trading')).toBeVisible()
      expect(screen.queryByText('Ada Campbell')).toBeNull()
    })

    it('treats an unknown status as no filter', () => {
      mocks.searchParams = new URLSearchParams('status=archived')

      renderList()

      expect(screen.getByText('Ada Campbell')).toBeVisible()
      expect(screen.getByText('Blue Mountain Trading')).toBeVisible()
    })
  })

  describe('open (customer beside the list)', () => {
    it('collapses to the condensed pane and marks the open customer', () => {
      mocks.segments = ['profile_blue']

      renderList()

      expect(screen.queryByRole('table')).toBeNull()
      const selected = screen.getByRole('link', {
        name: 'View customer Blue Mountain Trading',
      })
      expect(selected).toHaveAttribute('aria-current', 'true')
      expect(
        screen.getByRole('link', { name: 'View customer Ada Campbell' })
      ).not.toHaveAttribute('aria-current')
    })

    it('keeps the status badge and supporting line in the condensed row', () => {
      mocks.segments = ['profile_blue', 'packages']

      renderList()

      expect(screen.getByText('Suspended')).toBeVisible()
      expect(screen.getByText('Active')).toBeVisible()
      expect(screen.getByText('Blue Mountain Trading Ltd')).toBeVisible()
      expect(screen.getByText('ada@example.test')).toBeVisible()
    })

    it('carries the active query string onto row links', () => {
      mocks.segments = ['profile_ada']
      mocks.searchParams = new URLSearchParams('status=active')

      renderList()

      expect(
        screen.getByRole('link', { name: 'View customer Ada Campbell' })
      ).toHaveAttribute(
        'href',
        '/island-logistics/customers/profile_ada?status=active'
      )
    })

    it('selects no row while the add form is open', () => {
      mocks.segments = ['new']

      renderList()

      expect(screen.queryByRole('table')).toBeNull()
      expect(
        screen
          .getAllByRole('link')
          .filter((link) => link.getAttribute('aria-current') === 'true')
      ).toHaveLength(0)
    })

    it('shows an empty pane when the filter leaves no rows', () => {
      mocks.segments = ['profile_ada']
      mocks.searchParams = new URLSearchParams('status=suspended')

      render(
        <CustomersList orgSlug="island-logistics" customers={[createRow()]} />
      )

      expect(screen.getByText('No customers')).toBeVisible()
      expect(screen.queryByRole('link')).toBeNull()
    })
  })
})
