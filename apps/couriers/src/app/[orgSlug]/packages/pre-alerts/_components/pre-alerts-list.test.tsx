/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/packages/pre-alerts',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import type { PreAlertTableRow } from './pre-alerts-table'
import { PreAlertsList } from './pre-alerts-list'

function createRow(
  overrides: Partial<PreAlertTableRow> = {}
): PreAlertTableRow {
  return {
    id: 'pa_1',
    reference: 'PA-9001',
    customer: 'Ada Campbell',
    status: 'pending',
    ...overrides,
  }
}

function renderList() {
  return render(
    <PreAlertsList
      orgSlug="island-logistics"
      preAlerts={[
        createRow(),
        createRow({
          id: 'pa_2',
          reference: 'PA-9002',
          customer: 'Blue Mountain Trading',
          status: 'received',
        }),
      ]}
    />
  )
}

describe('PreAlertsList', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  describe('closed (no pre-alert open)', () => {
    it('renders the full table with its column headers', () => {
      renderList()

      expect(
        screen.getByRole('columnheader', { name: 'Reference' })
      ).toBeVisible()
      expect(
        screen.getByRole('columnheader', { name: 'Customer' })
      ).toBeVisible()
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeVisible()
      expect(screen.getByText('PA-9001')).toBeVisible()
      expect(screen.getByText('PA-9002')).toBeVisible()
    })

    it('ignores the list-only route group when deciding the table is shown', () => {
      mocks.segments = ['(list)']

      renderList()

      expect(screen.getByRole('table')).toBeVisible()
    })

    it('links each row reference to its pre-alert detail route', () => {
      renderList()

      expect(screen.getByRole('link', { name: 'PA-9001' })).toHaveAttribute(
        'href',
        '/island-logistics/packages/pre-alerts/pa_1'
      )
    })

    it('filters rows by pre-alert status', () => {
      mocks.searchParams = new URLSearchParams('status=received')

      renderList()

      expect(screen.getByText('PA-9002')).toBeVisible()
      expect(screen.queryByText('PA-9001')).toBeNull()
    })

    it('treats an unknown status as no filter', () => {
      mocks.searchParams = new URLSearchParams('status=teleported')

      renderList()

      expect(screen.getByText('PA-9001')).toBeVisible()
      expect(screen.getByText('PA-9002')).toBeVisible()
    })

    it('names the active filter in the empty state', () => {
      mocks.searchParams = new URLSearchParams('status=pending')

      render(
        <PreAlertsList
          orgSlug="island-logistics"
          preAlerts={[createRow({ status: 'received' })]}
        />
      )

      expect(screen.getByText('No pending pre-alerts.')).toBeVisible()
    })
  })

  describe('open (pre-alert beside the list)', () => {
    it('collapses to the condensed pane and marks the open pre-alert', () => {
      mocks.segments = ['pa_2']

      renderList()

      expect(screen.queryByRole('table')).toBeNull()
      const selected = screen.getByRole('link', {
        name: 'View pre-alert PA-9002',
      })
      expect(selected).toHaveAttribute('aria-current', 'true')
      expect(
        screen.getByRole('link', { name: 'View pre-alert PA-9001' })
      ).not.toHaveAttribute('aria-current')
    })

    it('keeps the status badge and supporting line in the condensed row', () => {
      mocks.segments = ['pa_2']

      renderList()

      expect(screen.getByText('received')).toBeVisible()
      expect(screen.getByText('pending')).toBeVisible()
      expect(screen.getByText('Blue Mountain Trading')).toBeVisible()
      expect(screen.getByText('Ada Campbell')).toBeVisible()
    })

    it('carries the active query string onto row links', () => {
      mocks.segments = ['pa_1']
      mocks.searchParams = new URLSearchParams('status=pending')

      renderList()

      expect(
        screen.getByRole('link', { name: 'View pre-alert PA-9001' })
      ).toHaveAttribute(
        'href',
        '/island-logistics/packages/pre-alerts/pa_1?status=pending'
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
      mocks.segments = ['pa_1']
      mocks.searchParams = new URLSearchParams('status=cancelled')

      render(
        <PreAlertsList orgSlug="island-logistics" preAlerts={[createRow()]} />
      )

      expect(screen.getByText('No pre-alerts')).toBeVisible()
      expect(screen.queryByRole('link')).toBeNull()
    })
  })
})
