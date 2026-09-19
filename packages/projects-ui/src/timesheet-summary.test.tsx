// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import {
  TimesheetSummary,
  type TimesheetSummaryEntry,
} from './timesheet-summary'
import type { TimesheetApprovalStatus } from './time-tracking'

const DAY_SECONDS = 86400

function day(dayOfMonth: number, hour = 0): number {
  return Date.UTC(2026, 8, dayOfMonth, hour) / 1000
}

const PERIOD_START = day(8)
const PERIOD_END = day(14)
const SUBMITTED_AT = day(15)
const DECIDED_AT = day(16)

function entry(
  overrides: Partial<TimesheetSummaryEntry> & Pick<TimesheetSummaryEntry, 'id'>
): TimesheetSummaryEntry {
  return {
    startedAt: day(8, 9),
    durationMinutes: 60,
    billable: true,
    projectId: 'proj_1',
    projectName: 'Acme Redesign',
    ...overrides,
  }
}

function renderSummary({
  status = 'submitted',
  submittedAt = SUBMITTED_AT,
  submittedBy = 'Ada Lovelace',
  decidedAt = null,
  decidedBy = null,
  entries = [entry({ id: 'entry_1' })],
  groupBy = 'project',
}: {
  status?: TimesheetApprovalStatus
  submittedAt?: number | null
  submittedBy?: string | null
  decidedAt?: number | null
  decidedBy?: string | null
  entries?: TimesheetSummaryEntry[]
  groupBy?: 'project' | 'day'
} = {}) {
  return render(
    <TimesheetSummary
      periodStart={PERIOD_START}
      periodEnd={PERIOD_END}
      status={status}
      submittedAt={submittedAt}
      submittedBy={submittedBy}
      decidedAt={decidedAt}
      decidedBy={decidedBy}
      entries={entries}
      groupBy={groupBy}
    />
  )
}

function total(slot: 'total' | 'billable' | 'non-billable'): HTMLElement {
  const element = document.querySelector(`[data-total="${slot}"]`)
  if (!element) throw new Error(`Missing ${slot} total`)
  return element as HTMLElement
}

function groupFor(key: string): HTMLElement {
  const element = document.querySelector(`[data-group="${key}"]`)
  if (!element) throw new Error(`Missing group ${key}`)
  return element as HTMLElement
}

function mobileList(container: HTMLElement): HTMLElement {
  const list = container.querySelector('ul')
  if (!list) throw new Error('Expected a mobile list')
  return list as HTMLElement
}

function mobileRows(container: HTMLElement): HTMLElement[] {
  return [...mobileList(container).querySelectorAll<HTMLElement>(':scope > li')]
}

function mobileMeta(row: HTMLElement): HTMLElement | null {
  return row.querySelector('[data-cell-content] > div > span')
}

describe('TimesheetSummary', () => {
  afterEach(cleanup)

  it('renders the period the timesheet covers', () => {
    renderSummary()

    expect(document.querySelector('[data-period-range]')?.textContent).toBe(
      'Sep 8, 2026 – Sep 14, 2026'
    )
  })

  it('renders the status badge of the timesheet', () => {
    const { container } = renderSummary({ status: 'approved' })

    expect(within(container).getByText('Approved')).toBeInTheDocument()
  })

  it('names who submitted the timesheet and when', () => {
    renderSummary()

    expect(
      screen.getByText('Submitted by Ada Lovelace on Sep 15, 2026')
    ).toBeInTheDocument()
  })

  it('names who decided the timesheet and when', () => {
    renderSummary({
      status: 'approved',
      decidedAt: DECIDED_AT,
      decidedBy: 'Grace Hopper',
    })

    expect(
      screen.getByText(/Approved by Grace Hopper on Sep 16, 2026/)
    ).toBeInTheDocument()
  })

  it('leaves out the decision line while the timesheet is undecided', () => {
    renderSummary({ status: 'submitted', decidedAt: null, decidedBy: null })

    expect(
      screen.getByText('Submitted by Ada Lovelace on Sep 15, 2026')
    ).toBeInTheDocument()
    expect(screen.queryByText(/Decided/)).toBeNull()
  })

  it('totals the minutes of every entry', () => {
    renderSummary({
      entries: [
        entry({ id: 'entry_1', durationMinutes: 60 }),
        entry({ id: 'entry_2', durationMinutes: 45 }),
      ],
    })

    expect(total('total')).toHaveTextContent('1h 45m')
  })

  it('splits the total into billable and non-billable minutes', () => {
    renderSummary({
      entries: [
        entry({ id: 'entry_1', durationMinutes: 60, billable: true }),
        entry({ id: 'entry_2', durationMinutes: 60, billable: true }),
        entry({ id: 'entry_3', durationMinutes: 45, billable: false }),
        entry({ id: 'entry_4', durationMinutes: 30, billable: false }),
      ],
    })

    expect(total('total')).toHaveTextContent('3h 15m')
    expect(total('billable')).toHaveTextContent('2h')
    expect(total('non-billable')).toHaveTextContent('1h 15m')
  })

  it('breaks the period down by project', () => {
    const { container } = renderSummary({
      entries: [
        entry({ id: 'entry_1', durationMinutes: 60 }),
        entry({
          id: 'entry_2',
          projectId: 'proj_2',
          projectName: 'Internal',
          durationMinutes: 30,
        }),
      ],
    })

    expect(container.querySelectorAll('[data-group]')).toHaveLength(2)
    const cells = within(groupFor('proj_1')).getAllByRole('cell')
    expect(cells[0].textContent).toBe('Acme Redesign')
    expect(cells[2].textContent).toBe('1h')
  })

  it('totals each project group from its entries', () => {
    renderSummary({
      entries: [
        entry({ id: 'entry_1', durationMinutes: 60, billable: true }),
        entry({ id: 'entry_2', durationMinutes: 45, billable: false }),
      ],
    })

    const cells = within(groupFor('proj_1')).getAllByRole('cell')
    expect(cells[1].textContent).toBe('1h')
    expect(cells[2].textContent).toBe('1h 45m')
  })

  it('breaks the period down by day when asked', () => {
    const { container } = renderSummary({
      groupBy: 'day',
      entries: [
        entry({ id: 'entry_1', startedAt: day(8, 9) }),
        entry({ id: 'entry_2', startedAt: day(9, 9), durationMinutes: 30 }),
      ],
    })

    expect(container.querySelectorAll('[data-group]')).toHaveLength(2)
    const cells = within(groupFor(String(day(9)))).getAllByRole('cell')
    expect(cells[0].textContent).toBe('Sep 9, 2026')
    expect(cells[2].textContent).toBe('30m')
  })

  it('collapses two entries on the same day into one group', () => {
    const { container } = renderSummary({
      groupBy: 'day',
      entries: [
        entry({ id: 'entry_1', startedAt: day(8, 9), durationMinutes: 60 }),
        entry({ id: 'entry_2', startedAt: day(8, 17), durationMinutes: 30 }),
      ],
    })

    expect(container.querySelectorAll('[data-group]')).toHaveLength(1)
    expect(groupFor(String(day(8)))).toHaveTextContent('1h 30m')
  })

  it('orders the day groups oldest first', () => {
    const { container } = renderSummary({
      groupBy: 'day',
      entries: [
        entry({ id: 'entry_1', startedAt: day(10, 9) }),
        entry({ id: 'entry_2', startedAt: day(8, 9) }),
        entry({ id: 'entry_3', startedAt: day(9, 9) }),
      ],
    })

    const keys = Array.from(container.querySelectorAll('[data-group]')).map(
      (element) => element.getAttribute('data-group')
    )

    expect(keys).toEqual([String(day(8)), String(day(9)), String(day(10))])
  })

  it('labels the breakdown column after the grouping', () => {
    const { unmount } = renderSummary({ groupBy: 'project' })
    expect(
      screen.getByRole('columnheader', { name: 'Project' })
    ).toBeInTheDocument()
    unmount()

    renderSummary({ groupBy: 'day' })
    expect(
      screen.getByRole('columnheader', { name: 'Day' })
    ).toBeInTheDocument()
  })

  it('renders a zero total and an empty breakdown for a period with no entries', () => {
    const { container } = renderSummary({ entries: [] })

    expect(total('total')).toHaveTextContent('0m')
    expect(total('billable')).toHaveTextContent('0m')
    expect(total('non-billable')).toHaveTextContent('0m')
    expect(container.querySelectorAll('[data-group]')).toHaveLength(0)
    expect(screen.getAllByText('No time logged in this period.')).toHaveLength(
      2
    )
  })

  it('renders a phone row per breakdown group with the total as its meta', () => {
    const { container } = renderSummary({
      entries: [
        entry({ id: 'entry_1', durationMinutes: 60 }),
        entry({
          id: 'entry_2',
          projectId: 'proj_2',
          projectName: 'Internal',
          durationMinutes: 30,
        }),
      ],
    })

    const rows = mobileRows(container)
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Acme Redesign')).toBeInTheDocument()
    expect(mobileMeta(rows[0])).toHaveTextContent('1h')
    expect(within(rows[1]).getByText('Internal')).toBeInTheDocument()
    expect(mobileMeta(rows[1])).toHaveTextContent('30m')
  })

  it('shows the period as the subtitle of every phone row', () => {
    const { container } = renderSummary({ entries: [entry({ id: 'entry_1' })] })

    expect(
      mobileRows(container)[0].querySelector('[data-cell-content] > p')
        ?.textContent
    ).toBe('Sep 8, 2026 – Sep 14, 2026')
  })

  it('renders the empty period in the phone list', () => {
    const { container } = renderSummary({ entries: [] })

    expect(mobileList(container).children).toHaveLength(1)
    expect(
      within(mobileList(container)).getByText('No time logged in this period.')
    ).toBeInTheDocument()
  })

  it('reads day groups from the same UTC day the server stores', () => {
    const { container } = renderSummary({
      groupBy: 'day',
      entries: [
        entry({
          id: 'entry_1',
          startedAt: day(8) + DAY_SECONDS - 60,
          durationMinutes: 30,
        }),
      ],
    })

    const keys = Array.from(container.querySelectorAll('[data-group]')).map(
      (element) => element.getAttribute('data-group')
    )

    expect(keys).toEqual([String(day(8))])
  })
})
