import type { TimeEntry } from '@876/projects/contracts'
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  refresh: vi.fn(),
  createEntry: vi.fn(),
  updateEntry: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace, refresh: mocks.refresh }),
}))
vi.mock('@/lib/client/time', () => ({
  timeClient: {
    createEntry: mocks.createEntry,
    updateEntry: mocks.updateEntry,
  },
}))

const { TimeEntryForm } = await import('./time-entry-form')

const PROJECTS = [{ id: 'prj_1', name: 'Website rebuild' }]

// Wednesday 2024-01-03 09:15 UTC, and an hour and a half later.
const MORNING = 1704273300
const ENDED = MORNING + 5400

function entry(overrides: Partial<TimeEntry> = {}): TimeEntry {
  return {
    object: 'projects.time-entry',
    id: 'tme_1',
    tenantId: 'tnt_1',
    projectId: 'prj_1',
    issueId: null,
    milestoneId: null,
    taskListId: null,
    userId: 'usr_1',
    startedAt: MORNING,
    endedAt: ENDED,
    durationMinutes: 90,
    billable: false,
    note: null,
    approvalStatus: 'draft',
    timesheetId: null,
    createdBy: 'usr_1',
    createdAt: MORNING,
    updatedAt: MORNING,
    ...overrides,
  }
}

function renderForm(props: Partial<Parameters<typeof TimeEntryForm>[0]> = {}) {
  return render(
    <TimeEntryForm
      projects={PROJECTS}
      defaultDate="2024-01-03"
      closeHref="/projects/prj_1/time"
      projectId="prj_1"
      {...props}
    />
  )
}

function fillTimes(start: string, end: string) {
  fireEvent.change(screen.getByLabelText('Start'), {
    target: { value: start },
  })
  fireEvent.change(screen.getByLabelText('End'), { target: { value: end } })
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.createEntry.mockResolvedValue({
    data: { object: 'projects.time-entry', id: 'tme_1' },
    error: null,
  })
  mocks.updateEntry.mockResolvedValue({
    data: { object: 'projects.time-entry', id: 'tme_1' },
    error: null,
  })
})

describe('TimeEntryForm', () => {
  it('sends the two instants the user typed, never a duration', async () => {
    const user = userEvent.setup()
    renderForm()
    fillTimes('09:15', '10:45')

    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(mocks.createEntry).toHaveBeenCalledWith({
      projectId: 'prj_1',
      startedAt: MORNING,
      endedAt: MORNING + 5400,
      billable: false,
      note: null,
    })
    expect(mocks.createEntry.mock.calls[0]?.[0]).not.toHaveProperty(
      'durationMinutes'
    )
  })

  it('carries the note and the billable flag', async () => {
    const user = userEvent.setup()
    renderForm()
    fillTimes('09:15', '10:45')

    await user.type(screen.getByLabelText('Note'), 'Wrote the migration')
    await user.click(screen.getByRole('checkbox', { name: 'Billable' }))
    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(mocks.createEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        note: 'Wrote the migration',
        billable: true,
      })
    )
  })

  it('asks for the missing times instead of sending an incomplete entry', async () => {
    const user = userEvent.setup()
    renderForm()

    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(
      screen.getByText('Enter a date, a start time, and an end time.')
    ).toBeInTheDocument()
    expect(mocks.createEntry).not.toHaveBeenCalled()
  })

  it('refuses an end that is not after the start', async () => {
    const user = userEvent.setup()
    renderForm()
    fillTimes('10:45', '09:15')

    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(
      screen.getByText('Enter an end time after the start time.')
    ).toBeInTheDocument()
    expect(mocks.createEntry).not.toHaveBeenCalled()
  })

  it('keeps what was typed when the service refuses the entry', async () => {
    const user = userEvent.setup()
    mocks.createEntry.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/time-entry-locked',
        message: 'That entry is on a submitted timesheet.',
      },
    })
    renderForm()
    fillTimes('09:15', '10:45')

    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(
      screen.getByText('That entry is on a submitted timesheet.')
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Start')).toHaveValue('09:15')
    expect(mocks.refresh).not.toHaveBeenCalled()
  })

  it('refreshes the list after logging an entry', async () => {
    const user = userEvent.setup()
    renderForm()
    fillTimes('09:15', '10:45')

    await user.click(screen.getByRole('button', { name: 'Add' }))

    expect(mocks.refresh).toHaveBeenCalled()
    expect(screen.getByLabelText('Start')).toHaveValue('')
  })

  it('prefills the entry being edited and returns to the list on save', async () => {
    const user = userEvent.setup()
    renderForm({ entry: entry() })

    expect(screen.getByLabelText('Start')).toHaveValue('09:15')
    expect(screen.getByLabelText('End')).toHaveValue('10:45')

    await user.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(mocks.updateEntry).toHaveBeenCalledWith('tme_1', {
      startedAt: MORNING,
      endedAt: MORNING + 5400,
      billable: false,
      note: null,
    })
    expect(mocks.replace).toHaveBeenCalledWith('/projects/prj_1/time')
  })

  it('offers the project picker only when the page is not about one project', () => {
    const { rerender } = renderForm({ projectId: null, entry: null })

    expect(screen.getByLabelText('Project')).toBeInTheDocument()

    rerender(
      <TimeEntryForm
        projects={PROJECTS}
        defaultDate="2024-01-03"
        closeHref="/projects/prj_1/time"
        projectId="prj_1"
      />
    )

    expect(screen.queryByLabelText('Project')).toBeNull()
  })
})
