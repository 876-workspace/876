import type { TimeEntry, Timesheet } from '@876/projects/contracts'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listEntries: vi.fn(),
  listTimesheets: vi.fn(),
  listProjects: vi.fn(),
  listIssues: vi.fn(),
  currentTimer: vi.fn(),
  loadMembers: vi.fn(),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    timeEntries: { list: mocks.listEntries, currentTimer: mocks.currentTimer },
    timesheets: { list: mocks.listTimesheets },
    projects: { list: mocks.listProjects },
    issues: { list: mocks.listIssues },
  },
}))
vi.mock('@/features/projects/member-labels', () => ({
  loadMemberLabels: mocks.loadMembers,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/lib/client/time', () => ({
  timeClient: {
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
    createTimesheet: vi.fn(),
    submitTimesheet: vi.fn(),
    recallTimesheet: vi.fn(),
    approveTimesheet: vi.fn(),
    rejectTimesheet: vi.fn(),
  },
}))

const { MyTimeData } = await import('./my-time-data')

const PERIOD = { from: 1704067200, to: 1704671999 }
const IN_PERIOD = 1704273300

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
    startedAt: IN_PERIOD,
    endedAt: IN_PERIOD + 5400,
    durationMinutes: 90,
    billable: false,
    note: null,
    approvalStatus: 'draft',
    timesheetId: null,
    createdBy: 'usr_1',
    createdAt: IN_PERIOD,
    updatedAt: IN_PERIOD,
    ...overrides,
  }
}

function timesheet(overrides: Partial<Timesheet> = {}): Timesheet {
  return {
    object: 'projects.timesheet',
    id: 'tsh_1',
    tenantId: 'tnt_1',
    userId: 'usr_1',
    periodStart: PERIOD.from,
    periodEnd: PERIOD.to,
    status: 'draft',
    submittedAt: null,
    decidedAt: null,
    decidedBy: null,
    note: null,
    createdAt: IN_PERIOD,
    updatedAt: IN_PERIOD,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listEntries.mockResolvedValue({ data: { data: [entry()] }, error: null })
  mocks.listTimesheets.mockResolvedValue({ data: { data: [] }, error: null })
  mocks.listProjects.mockResolvedValue({
    data: { data: [{ id: 'prj_1', name: 'Website rebuild' }] },
    error: null,
  })
  mocks.listIssues.mockResolvedValue({ data: { data: [] }, error: null })
  mocks.currentTimer.mockResolvedValue({ data: null, error: null })
  mocks.loadMembers.mockResolvedValue({
    labels: { usr_1: 'Ada Lovelace' },
    error: null,
  })
})

describe('MyTimeData', () => {
  it('reads the viewer’s own entries over the whole period', async () => {
    render(
      await MyTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        period: PERIOD,
        canEdit: true,
      })
    )

    expect(mocks.listEntries).toHaveBeenCalledWith('org_1', { userId: 'usr_1' })
    expect(screen.getByText('Entries in this period')).toBeInTheDocument()
    expect(screen.getByText('1h 30m')).toBeInTheDocument()
  })

  it('leaves out entries the period does not cover', async () => {
    mocks.listEntries.mockResolvedValue({
      data: {
        data: [
          entry({ id: 'tme_old', startedAt: PERIOD.from - 86400 }),
          entry({ id: 'tme_new' }),
        ],
      },
      error: null,
    })

    render(
      await MyTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        period: PERIOD,
        canEdit: true,
      })
    )

    expect(document.querySelector('[data-time-entry="tme_new"]')).not.toBeNull()
    expect(document.querySelector('[data-time-entry="tme_old"]')).toBeNull()
  })

  it('names the project the running timer is going to', async () => {
    mocks.currentTimer.mockResolvedValue({
      data: entry({ endedAt: null, durationMinutes: null }),
      error: null,
    })

    render(
      await MyTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        period: PERIOD,
        canEdit: true,
      })
    )

    expect(screen.getByText('Tracking Website rebuild')).toBeInTheDocument()
  })

  it('offers to gather the period only while no sheet covers it', async () => {
    const { rerender } = render(
      await MyTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        period: PERIOD,
        canEdit: true,
      })
    )

    expect(
      screen.getByRole('button', { name: 'Create for period' })
    ).toBeInTheDocument()

    mocks.listTimesheets.mockResolvedValue({
      data: { data: [timesheet()] },
      error: null,
    })
    rerender(
      await MyTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        period: PERIOD,
        canEdit: true,
      })
    )

    expect(screen.queryByRole('button', { name: 'Create for period' })).toBeNull()
  })

  it('shows each sheet with the entries it gathered', async () => {
    mocks.listEntries.mockResolvedValue({
      data: { data: [entry({ timesheetId: 'tsh_1' })] },
      error: null,
    })
    mocks.listTimesheets.mockResolvedValue({
      data: { data: [timesheet()] },
      error: null,
    })

    render(
      await MyTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        period: PERIOD,
        canEdit: true,
      })
    )

    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
    expect(screen.getByText('Jan 1, 2024 – Jan 7, 2024')).toBeInTheDocument()
  })

  it('withholds the sheet actions from a viewer who cannot edit', async () => {
    mocks.listTimesheets.mockResolvedValue({
      data: { data: [timesheet()] },
      error: null,
    })

    render(
      await MyTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        period: PERIOD,
        canEdit: false,
      })
    )

    expect(screen.queryByRole('button', { name: 'Submit' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Create for period' })).toBeNull()
  })

  it('reports a failed read without dropping the sections', async () => {
    mocks.listEntries.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/time-unavailable',
        message: 'The time entries could not be loaded.',
      },
    })

    render(
      await MyTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        period: PERIOD,
        canEdit: true,
      })
    )

    expect(
      screen.getByText('Some time data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('Timesheets')).toBeInTheDocument()
  })
})
