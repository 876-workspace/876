/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/island-logistics/disputes',
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  useSelectedLayoutSegments: () => mocks.segments,
  useSearchParams: () => mocks.searchParams,
}))

import type { DisputeTableRow } from './disputes-table'
import { DisputesList } from './disputes-list'

function createRow(overrides: Partial<DisputeTableRow> = {}): DisputeTableRow {
  return {
    id: 'dsp_1',
    date: '2026-09-01',
    disputeNumber: 'DSP-101',
    customer: 'Ada Campbell',
    paymentNumber: 'PAY-500',
    reason: 'Duplicate charge',
    status: 'open',
    ...overrides,
  }
}

function renderList() {
  return render(
    <DisputesList
      orgSlug="island-logistics"
      disputes={[
        createRow(),
        createRow({
          id: 'dsp_2',
          disputeNumber: 'DSP-102',
          customer: 'Blue Mountain Trading',
          status: 'lost',
        }),
      ]}
    />
  )
}

describe('DisputesList', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  describe('closed (no dispute open)', () => {
    it('renders the full table with its column headers', () => {
      renderList()

      expect(
        screen.getByRole('columnheader', { name: 'Dispute #' })
      ).toBeVisible()
      expect(
        screen.getByRole('columnheader', { name: 'Customer' })
      ).toBeVisible()
      expect(screen.getByRole('columnheader', { name: 'Status' })).toBeVisible()
      expect(screen.getByText('DSP-101')).toBeVisible()
      expect(screen.getByText('DSP-102')).toBeVisible()
    })

    it('shows the dispute metadata in the closed rows', () => {
      renderList()

      expect(screen.getAllByText('Duplicate charge')).toHaveLength(2)
      expect(screen.getAllByText('PAY-500')).toHaveLength(2)
      expect(screen.getByText('Ada Campbell')).toBeVisible()
    })

    it('ignores the list-only route group when deciding the table is shown', () => {
      mocks.segments = ['(list)']

      renderList()

      expect(screen.getByRole('table')).toBeVisible()
    })

    it('links each row number to its dispute detail route', () => {
      renderList()

      expect(screen.getByRole('link', { name: 'DSP-101' })).toHaveAttribute(
        'href',
        '/island-logistics/disputes/dsp_1'
      )
    })

    it('renders the empty state when there are no disputes', () => {
      render(<DisputesList orgSlug="island-logistics" disputes={[]} />)

      expect(screen.getByText('No disputes')).toBeVisible()
      expect(
        screen.getByText('No disputes have been reported yet.')
      ).toBeVisible()
    })
  })

  describe('open (dispute beside the list)', () => {
    it('collapses to the condensed pane and marks the open dispute', () => {
      mocks.segments = ['dsp_2']

      renderList()

      expect(screen.queryByRole('table')).toBeNull()
      const selected = screen.getByRole('link', {
        name: 'View dispute DSP-102',
      })
      expect(selected).toHaveAttribute('aria-current', 'true')
      expect(
        screen.getByRole('link', { name: 'View dispute DSP-101' })
      ).not.toHaveAttribute('aria-current')
    })

    it('keeps the status badge and supporting line in the condensed row', () => {
      mocks.segments = ['dsp_2']

      renderList()

      expect(screen.getByText('lost')).toBeVisible()
      expect(screen.getByText('open')).toBeVisible()
      expect(screen.getByText('Blue Mountain Trading')).toBeVisible()
      expect(screen.getByText('Ada Campbell')).toBeVisible()
    })

    it('carries the active query string onto row links', () => {
      mocks.segments = ['dsp_1']
      mocks.searchParams = new URLSearchParams('after=cur_1')

      renderList()

      expect(
        screen.getByRole('link', { name: 'View dispute DSP-101' })
      ).toHaveAttribute('href', '/island-logistics/disputes/dsp_1?after=cur_1')
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

    it('shows an empty pane when there are no disputes', () => {
      mocks.segments = ['dsp_1']

      render(<DisputesList orgSlug="island-logistics" disputes={[]} />)

      expect(screen.getByText('No disputes')).toBeVisible()
      expect(screen.queryByRole('link')).toBeNull()
    })
  })
})
