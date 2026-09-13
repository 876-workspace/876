/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/invoices',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import type { InvoiceRow } from '@876/billing-ui/invoices-table'
import { InvoicesList } from './invoices-list'

function createRow(overrides: Partial<InvoiceRow> = {}): InvoiceRow {
  return {
    id: 'inv_1',
    number: 'INV-1042',
    totalAmount: '250000',
    amountDue: '100000',
    currency: 'JMD',
    status: 'SENT',
    customer: { name: 'Alejandra Reyes' },
    ...overrides,
  }
}

function renderList() {
  return render(
    <InvoicesList
      orgSlug="island-logistics"
      invoices={[
        createRow(),
        createRow({
          id: 'inv_2',
          number: 'INV-1043',
          status: 'PAID',
          customer: { name: 'Blue Mountain Trading' },
        }),
      ]}
    />
  )
}

describe('InvoicesList', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  describe('closed (no invoice open)', () => {
    it('renders the shared table with its column headers', () => {
      renderList()

      expect(
        screen.getByRole('columnheader', { name: 'Invoice' })
      ).toBeVisible()
      expect(
        screen.getByRole('columnheader', { name: 'Customer' })
      ).toBeVisible()
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeVisible()
      expect(screen.getByText('INV-1042')).toBeVisible()
      expect(screen.getByText('INV-1043')).toBeVisible()
    })

    it('ignores the list-only route group when deciding the table is shown', () => {
      mocks.segments = ['(list)']

      renderList()

      expect(screen.getByRole('table')).toBeVisible()
    })

    it('links each row number to its invoice detail route', () => {
      renderList()

      expect(screen.getByRole('link', { name: 'INV-1042' })).toHaveAttribute(
        'href',
        '/island-logistics/invoices/inv_1'
      )
    })

    it('filters rows by Billing invoice status', () => {
      mocks.searchParams = new URLSearchParams('status=paid')

      renderList()

      expect(screen.getByText('INV-1043')).toBeVisible()
      expect(screen.queryByText('INV-1042')).toBeNull()
    })

    it('treats an unknown status as no filter', () => {
      mocks.searchParams = new URLSearchParams('status=bogus')

      renderList()

      expect(screen.getByText('INV-1042')).toBeVisible()
      expect(screen.getByText('INV-1043')).toBeVisible()
    })

    it('names the active filter in the empty state', () => {
      mocks.searchParams = new URLSearchParams('status=overdue')

      render(
        <InvoicesList
          orgSlug="island-logistics"
          invoices={[createRow({ status: 'PAID' })]}
        />
      )

      expect(screen.getByText('No overdue invoices.')).toBeVisible()
    })
  })

  describe('open (invoice beside the list)', () => {
    it('collapses to the condensed pane and marks the open invoice', () => {
      mocks.segments = ['inv_2']

      renderList()

      expect(screen.queryByRole('table')).toBeNull()
      const selected = screen.getByRole('link', {
        name: 'View invoice INV-1043',
      })
      expect(selected).toHaveAttribute('aria-current', 'true')
      expect(
        screen.getByRole('link', { name: 'View invoice INV-1042' })
      ).not.toHaveAttribute('aria-current')
    })

    it('keeps the status badge and supporting line in the condensed row', () => {
      mocks.segments = ['inv_2']

      renderList()

      expect(screen.getByText('PAID')).toBeVisible()
      expect(screen.getByText('SENT')).toBeVisible()
      expect(screen.getByText('Blue Mountain Trading')).toBeVisible()
      expect(screen.getByText('Alejandra Reyes')).toBeVisible()
    })

    it('carries the active query string onto row links', () => {
      mocks.segments = ['inv_1']
      mocks.searchParams = new URLSearchParams('status=sent')

      renderList()

      expect(
        screen.getByRole('link', { name: 'View invoice INV-1042' })
      ).toHaveAttribute('href', '/island-logistics/invoices/inv_1?status=sent')
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
      mocks.segments = ['inv_1']
      mocks.searchParams = new URLSearchParams('status=void')

      render(
        <InvoicesList orgSlug="island-logistics" invoices={[createRow()]} />
      )

      expect(screen.getByText('No invoices')).toBeVisible()
      expect(screen.queryByRole('link')).toBeNull()
    })
  })
})
