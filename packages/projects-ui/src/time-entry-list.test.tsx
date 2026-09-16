// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { TimeEntryList, type TimeEntryListRow } from './time-entry-list'

const ISSUES_BASE = '/issues'
const EMPTY_TITLE = 'No time logged yet'

function entry(
  overrides: Partial<TimeEntryListRow> & Pick<TimeEntryListRow, 'id'>
): TimeEntryListRow {
  return {
    startedAt: Date.UTC(2026, 8, 15, 9, 0, 0) / 1000,
    durationMinutes: 60,
    billable: true,
    note: null,
    approvalStatus: 'draft',
    projectName: 'Acme Redesign',
    issue: null,
    ...overrides,
  }
}

function renderList({
  entries = [entry({ id: 'entry_1' })],
  canEdit = true,
  emptyTitle = EMPTY_TITLE,
}: {
  entries?: TimeEntryListRow[]
  canEdit?: boolean
  emptyTitle?: string
} = {}) {
  const onEdit = vi.fn<(entry: TimeEntryListRow) => void>()
  const onDelete = vi.fn<(entry: TimeEntryListRow) => void>()

  const view = render(
    <TimeEntryList
      entries={entries}
      issuesBaseHref={ISSUES_BASE}
      canEdit={canEdit}
      onEdit={onEdit}
      onDelete={onDelete}
      emptyTitle={emptyTitle}
    />
  )

  return { onEdit, onDelete, ...view }
}

function rowFor(id: string): HTMLElement {
  const row = document.querySelector(`[data-time-entry="${id}"]`)
  if (!row) throw new Error(`Missing row for entry ${id}`)
  return row as HTMLElement
}

describe('TimeEntryList', () => {
  afterEach(cleanup)

  it('renders one row per entry', () => {
    const { container } = renderList({
      entries: [entry({ id: 'entry_1' }), entry({ id: 'entry_2' })],
    })

    expect(container.querySelectorAll('[data-time-entry]')).toHaveLength(2)
    expect(rowFor('entry_1')).toHaveTextContent('Acme Redesign')
  })

  it('renders the date the entry started', () => {
    renderList({
      entries: [
        entry({
          id: 'entry_1',
          startedAt: Date.UTC(2026, 8, 15, 9, 0, 0) / 1000,
        }),
      ],
    })

    expect(
      within(rowFor('entry_1')).getByText('Sep 15, 2026')
    ).toBeInTheDocument()
  })

  it('links a work item to the issues base href', () => {
    renderList({
      entries: [
        entry({
          id: 'entry_1',
          issue: { id: 'iss_1', title: 'Fix the login redirect' },
        }),
      ],
    })

    expect(
      screen.getByRole('link', { name: 'Fix the login redirect' })
    ).toHaveAttribute('href', `${ISSUES_BASE}/iss_1`)
  })

  it('renders an em dash when an entry has no work item', () => {
    const { container } = renderList({
      entries: [entry({ id: 'entry_1', note: 'Pairing on the redirect' })],
    })

    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(screen.getByText('—')).toBeInTheDocument()
  })

  it('renders a zero duration as 0m', () => {
    renderList({ entries: [entry({ id: 'entry_1', durationMinutes: 0 })] })

    expect(within(rowFor('entry_1')).getByText('0m')).toBeInTheDocument()
  })

  it('renders 59 minutes as 59m', () => {
    renderList({ entries: [entry({ id: 'entry_1', durationMinutes: 59 })] })

    expect(within(rowFor('entry_1')).getByText('59m')).toBeInTheDocument()
  })

  it('renders 60 minutes as 1h', () => {
    renderList({ entries: [entry({ id: 'entry_1', durationMinutes: 60 })] })

    expect(within(rowFor('entry_1')).getByText('1h')).toBeInTheDocument()
  })

  it('renders 1445 minutes as 24h 5m', () => {
    renderList({ entries: [entry({ id: 'entry_1', durationMinutes: 1445 })] })

    expect(within(rowFor('entry_1')).getByText('24h 5m')).toBeInTheDocument()
  })

  it('never renders a duration as a decimal', () => {
    renderList({ entries: [entry({ id: 'entry_1', durationMinutes: 90 })] })

    expect(within(rowFor('entry_1')).getByText('1h 30m')).toBeInTheDocument()
    expect(screen.queryByText('1.5h')).toBeNull()
  })

  it('marks billable entries and mutes the rest', () => {
    const { container } = renderList({
      entries: [
        entry({ id: 'entry_1', billable: true }),
        entry({ id: 'entry_2', billable: false }),
      ],
    })

    expect(container.querySelector('[data-billable="true"]')).toHaveTextContent(
      'Billable'
    )
    expect(
      container.querySelector('[data-billable="false"]')
    ).toHaveTextContent('Non-billable')
  })

  it('badges a draft entry', () => {
    renderList({ entries: [entry({ id: 'entry_1', approvalStatus: 'draft' })] })

    expect(within(rowFor('entry_1')).getByText('Draft')).toBeInTheDocument()
  })

  it('badges a submitted entry', () => {
    renderList({
      entries: [entry({ id: 'entry_1', approvalStatus: 'submitted' })],
    })

    expect(within(rowFor('entry_1')).getByText('Submitted')).toBeInTheDocument()
  })

  it('badges an approved entry', () => {
    renderList({
      entries: [entry({ id: 'entry_1', approvalStatus: 'approved' })],
    })

    expect(within(rowFor('entry_1')).getByText('Approved')).toBeInTheDocument()
  })

  it('badges a rejected entry', () => {
    renderList({
      entries: [entry({ id: 'entry_1', approvalStatus: 'rejected' })],
    })

    expect(within(rowFor('entry_1')).getByText('Rejected')).toBeInTheDocument()
  })

  it('hides edit and delete on an entry in an approved timesheet', () => {
    const { container } = renderList({
      entries: [entry({ id: 'entry_1', approvalStatus: 'approved' })],
    })

    expect(container.querySelector('[data-entry-actions]')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
  })

  it('keeps edit and delete on an entry in a submitted timesheet', () => {
    renderList({
      entries: [entry({ id: 'entry_1', approvalStatus: 'submitted' })],
    })

    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
  })

  it('hides edit and delete when the viewer cannot edit', () => {
    const { container } = renderList({
      entries: [entry({ id: 'entry_1', approvalStatus: 'draft' })],
      canEdit: false,
    })

    expect(container.querySelector('[data-entry-actions]')).toBeNull()
  })

  it('reports the entry through onEdit', () => {
    const draft = entry({ id: 'entry_1' })
    const { onEdit } = renderList({ entries: [draft] })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith(draft)
  })

  it('reports the entry through onDelete', () => {
    const draft = entry({ id: 'entry_1' })
    const { onDelete } = renderList({ entries: [draft] })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledWith(draft)
  })

  it('reports the row that was acted on, not the first row', () => {
    const second = entry({ id: 'entry_2' })
    const { onEdit } = renderList({
      entries: [entry({ id: 'entry_1' }), second],
    })

    fireEvent.click(
      within(rowFor('entry_2')).getByRole('button', { name: 'Edit' })
    )

    expect(onEdit).toHaveBeenCalledTimes(1)
    expect(onEdit).toHaveBeenCalledWith(second)
  })

  it('renders the given empty title and nothing else', () => {
    const { container } = renderList({ entries: [], emptyTitle: EMPTY_TITLE })

    expect(container.querySelector('table')).toBeNull()
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.textContent).toBe(EMPTY_TITLE)
  })
})
