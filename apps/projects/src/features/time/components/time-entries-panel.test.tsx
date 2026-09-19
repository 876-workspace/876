import type { TimeEntry } from '@876/projects/contracts'
import type { TimeEntryListRow } from '@876/projects-ui/time-entry-list'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  deleteEntry: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mocks.push,
    replace: mocks.replace,
    refresh: mocks.refresh,
  }),
}))
vi.mock('@/lib/client/time', () => ({
  timeClient: { deleteEntry: mocks.deleteEntry },
}))

const { TimeEntriesPanel } = await import('./time-entries-panel')

const PROJECTS = [{ id: 'prj_1', name: 'Website rebuild' }]

function row(overrides: Partial<TimeEntryListRow> = {}): TimeEntryListRow {
  return {
    id: 'tme_1',
    startedAt: 1704273300,
    durationMinutes: 90,
    billable: false,
    note: null,
    approvalStatus: 'draft',
    projectName: 'Website rebuild',
    issue: null,
    ...overrides,
  }
}

function entry(): TimeEntry {
  return {
    object: 'projects.time-entry',
    id: 'tme_1',
    tenantId: 'tnt_1',
    projectId: 'prj_1',
    issueId: null,
    milestoneId: null,
    taskListId: null,
    userId: 'usr_1',
    startedAt: 1704273300,
    endedAt: 1704278700,
    durationMinutes: 90,
    billable: false,
    note: null,
    approvalStatus: 'draft',
    timesheetId: null,
    createdBy: 'usr_1',
    createdAt: 1704273300,
    updatedAt: 1704273300,
  }
}

function renderPanel(
  props: Partial<Parameters<typeof TimeEntriesPanel>[0]> = {}
) {
  return render(
    <TimeEntriesPanel
      rows={[row()]}
      projects={PROJECTS}
      baseHref="/projects/prj_1/time"
      defaultDate="2024-01-03"
      canEdit
      createOpen={false}
      editingEntry={null}
      emptyTitle="No time logged against this project yet."
      {...props}
    />
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.deleteEntry.mockResolvedValue({
    data: { object: 'projects.time-entry', id: 'tme_1', deleted: true },
    error: null,
  })
})

describe('TimeEntriesPanel', () => {
  it('renders the entries it was given', () => {
    renderPanel()

    const projectNames = screen.getAllByText('Website rebuild')
    expect(projectNames).toHaveLength(2)
    expect(projectNames[0]).toBeInTheDocument()
    const durations = screen.getAllByText('1h 30m')
    expect(durations).toHaveLength(2)
    expect(durations[0]).toBeInTheDocument()
  })

  it('says so when the period holds nothing', () => {
    renderPanel({ rows: [] })

    const emptyNotes = screen.getAllByText(
      'No time logged against this project yet.'
    )
    expect(emptyNotes).toHaveLength(2)
    expect(emptyNotes[0]).toBeInTheDocument()
  })

  it('opens the picked entry’s editor on the URL', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(mocks.push).toHaveBeenCalledWith('/projects/prj_1/time?entry=tme_1')
  })

  it('keeps the period when the base URL already carries it', async () => {
    const user = userEvent.setup()
    renderPanel({ baseHref: '/time?from=1&to=2' })

    await user.click(screen.getByRole('button', { name: 'Edit' }))

    expect(mocks.push).toHaveBeenCalledWith('/time?from=1&to=2&entry=tme_1')
  })

  it('asks before deleting and then removes the entry', async () => {
    const user = userEvent.setup()
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(screen.getByText('Delete entry')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(mocks.deleteEntry).toHaveBeenCalledWith('tme_1')
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('keeps the confirmation open with the reason when deleting is refused', async () => {
    const user = userEvent.setup()
    mocks.deleteEntry.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/time-entry-locked',
        message: 'That entry is on a submitted timesheet.',
      },
    })
    renderPanel()

    await user.click(screen.getByRole('button', { name: 'Delete' }))
    await user.click(screen.getByRole('button', { name: 'Delete' }))

    expect(
      screen.getByText('That entry is on a submitted timesheet.')
    ).toBeInTheDocument()
    expect(screen.getByText('Delete entry')).toBeInTheDocument()
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('opens the add form when the page asked for it', () => {
    renderPanel({ createOpen: true })

    expect(
      screen.getByRole('heading', { name: 'Add entry' })
    ).toBeInTheDocument()
  })

  it('opens the editor for the entry the page named', () => {
    renderPanel({ editingEntry: entry() })

    expect(
      screen.getByRole('heading', { name: 'Edit entry' })
    ).toBeInTheDocument()
  })

  it('offers no editor or row action to a viewer who cannot edit', () => {
    renderPanel({ canEdit: false, createOpen: true })

    expect(screen.queryByRole('heading', { name: 'Add entry' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Delete' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull()
  })
})
