/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/deliveries',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import type { DeliveryTableRow } from './deliveries-table'
import { DeliveriesList } from './deliveries-list'

function createRow(
  overrides: Partial<DeliveryTableRow> = {}
): DeliveryTableRow {
  return {
    id: 'dlv_1',
    customerName: 'Ada Campbell',
    code: 'DLV-1042',
    area: 'Kingston',
    dateTime: '2026-09-01 10:00',
    packages: '3',
    status: 'scheduled',
    ...overrides,
  }
}

function renderList() {
  return render(
    <DeliveriesList
      orgSlug="island-logistics"
      deliveries={[
        createRow(),
        createRow({
          id: 'dlv_2',
          customerName: 'Blue Mountain Trading',
          code: 'DLV-1043',
          status: 'delivered',
        }),
      ]}
    />
  )
}

describe('DeliveriesList', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  describe('closed (no delivery open)', () => {
    it('renders the full table with its column headers', () => {
      renderList()

      expect(
        screen.getByRole('columnheader', { name: 'Customer' })
      ).toBeVisible()
      expect(screen.getByRole('columnheader', { name: 'Code' })).toBeVisible()
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeVisible()
      expect(screen.getByText('DLV-1042')).toBeVisible()
      expect(screen.getByText('DLV-1043')).toBeVisible()
    })

    it('ignores the list-only route group when deciding the table is shown', () => {
      mocks.segments = ['(list)']

      renderList()

      expect(screen.getByRole('table')).toBeVisible()
    })

    it('links each row code to its delivery detail route', () => {
      renderList()

      expect(screen.getByRole('link', { name: 'DLV-1042' })).toHaveAttribute(
        'href',
        '/island-logistics/deliveries/dlv_1'
      )
    })

    it('filters rows by delivery status', () => {
      mocks.searchParams = new URLSearchParams('status=delivered')

      renderList()

      expect(screen.getByText('DLV-1043')).toBeVisible()
      expect(screen.queryByText('DLV-1042')).toBeNull()
    })

    it('treats an unknown status as no filter', () => {
      mocks.searchParams = new URLSearchParams('status=teleported')

      renderList()

      expect(screen.getByText('DLV-1042')).toBeVisible()
      expect(screen.getByText('DLV-1043')).toBeVisible()
    })
  })

  describe('open (delivery beside the list)', () => {
    it('collapses to the condensed pane and marks the open delivery', () => {
      mocks.segments = ['dlv_2']

      renderList()

      expect(screen.queryByRole('table')).toBeNull()
      const selected = screen.getByRole('link', {
        name: 'View delivery DLV-1043',
      })
      expect(selected).toHaveAttribute('aria-current', 'true')
      expect(
        screen.getByRole('link', { name: 'View delivery DLV-1042' })
      ).not.toHaveAttribute('aria-current')
    })

    it('keeps the status badge and supporting line in the condensed row', () => {
      mocks.segments = ['dlv_2']

      renderList()

      expect(screen.getByText('delivered')).toBeVisible()
      expect(screen.getByText('scheduled')).toBeVisible()
      expect(screen.getByText('Blue Mountain Trading')).toBeVisible()
      expect(screen.getByText('Ada Campbell')).toBeVisible()
    })

    it('carries the active query string onto row links', () => {
      mocks.segments = ['dlv_1']
      mocks.searchParams = new URLSearchParams('status=scheduled')

      renderList()

      expect(
        screen.getByRole('link', { name: 'View delivery DLV-1042' })
      ).toHaveAttribute(
        'href',
        '/island-logistics/deliveries/dlv_1?status=scheduled'
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
      mocks.segments = ['dlv_1']
      mocks.searchParams = new URLSearchParams('status=failed')

      render(
        <DeliveriesList orgSlug="island-logistics" deliveries={[createRow()]} />
      )

      expect(screen.getByText('No deliveries')).toBeVisible()
      expect(screen.queryByRole('link')).toBeNull()
    })
  })
})
