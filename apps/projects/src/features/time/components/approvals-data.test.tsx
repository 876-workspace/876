import type { TimeEntry, Timesheet } from '@876/projects/contracts'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listEntries: vi.fn(),
  listTimesheets: vi.fn(),
  listProjects: vi.fn(),
  loadMembers: vi.fn(),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    timeEntries: { list: mocks.listEntries },
    timesheets: { list: mocks.listTimesheets },
    projects: { list: mocks.listProjects },
  },
}))
vi.mock('@/features/projects/member-labels', () => ({
  loadMemberLabels: mocks.loadMembers,
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}))
vi.mock('@/lib/client/time', () => ({
  timeClient: {
    submitTimesheet: vi.fn(),
    recallTimesheet: vi.fn(),
    approveTimesheet: vi.fn(),
    rejectTimesheet: vi.fn(),
  },
}))

const { TimesheetApprovalsData } = await import('./approvals-data')

const SUBMITTED_AT = 1704273300

function timesheet(overrides: Partial<Timesheet> = {}): Timesheet {
  return {
    object: 'projects.timesheet',
    id: 'tsh_1',
    tenantId: 'tnt_1',
    userId: 'usr_1',
    periodStart: 1704067200,
    periodEnd: 1704671999,
    status: 'submitted',
    submittedAt: SUBMITTED_AT,
    decidedAt: null,
    decidedBy: null,
    note: null,
    createdAt: SUBMITTED_AT,
    updatedAt: SUBMITTED_AT,
    ...overrides,
  }
}

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
    startedAt: SUBMITTED_AT,
    endedAt: SUBMITTED_AT + 5400,
    durationMinutes: 90,
    billable: false,
    note: null,
    approvalStatus: 'submitted',
    timesheetId: 'tsh_1',
    createdBy: 'usr_1',
    createdAt: SUBMITTED_AT,
    updatedAt: SUBMITTED_AT,
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listTimesheets.mockResolvedValue({
    data: { data: [timesheet()] },
    error: null,
  })
  mocks.listEntries.mockResolvedValue({
    data: { data: [entry()] },
    error: null,
  })
  mocks.listProjects.mockResolvedValue({
    data: { data: [{ id: 'prj_1', name: 'Website rebuild' }] },
    error: null,
  })
  mocks.loadMembers.mockResolvedValue({
    labels: { usr_1: 'Ada Lovelace', usr_manager: 'Grace Hopper' },
    error: null,
  })
})

describe('TimesheetApprovalsData', () => {
  it('asks for the sheets awaiting a decision and the entries they cover', async () => {
    render(
      await TimesheetApprovalsData({ orgId: 'org_1', userId: 'usr_manager' })
    )

    expect(mocks.listTimesheets).toHaveBeenCalledWith('org_1', {
      status: 'submitted',
    })
    expect(mocks.listEntries).toHaveBeenCalledWith('org_1', {
      approvalStatus: 'submitted',
    })
  })

  it('shows an approver who submitted the sheet and what it covers', async () => {
    render(
      await TimesheetApprovalsData({ orgId: 'org_1', userId: 'usr_manager' })
    )

    expect(screen.getByText(/Submitted by Ada Lovelace/)).toBeInTheDocument()
    const projectNames = screen.getAllByText('Website rebuild')
    expect(projectNames).toHaveLength(2)
    expect(projectNames[0]).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
  })

  it('offers no decision on the approver’s own sheet', async () => {
    render(await TimesheetApprovalsData({ orgId: 'org_1', userId: 'usr_1' }))

    expect(screen.queryByRole('button', { name: 'Approve' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Recall' })).toBeInTheDocument()
  })

  it('says so when nothing is waiting', async () => {
    mocks.listTimesheets.mockResolvedValue({ data: { data: [] }, error: null })

    render(
      await TimesheetApprovalsData({ orgId: 'org_1', userId: 'usr_manager' })
    )

    expect(
      screen.getByText('No timesheets are waiting for approval.')
    ).toBeInTheDocument()
  })

  it('reports a failed read without dropping the shell', async () => {
    mocks.listEntries.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/time-unavailable',
        message: 'The entries could not be loaded.',
      },
    })

    render(
      await TimesheetApprovalsData({ orgId: 'org_1', userId: 'usr_manager' })
    )

    expect(
      screen.getByText('Some timesheet data could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument()
  })
})
