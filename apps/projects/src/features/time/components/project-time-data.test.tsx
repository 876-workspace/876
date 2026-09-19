import type { TimeEntry } from '@876/projects/contracts'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  listEntries: vi.fn(),
  listIssues: vi.fn(),
  retrieveProject: vi.fn(),
  currentTimer: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    timeEntries: { list: mocks.listEntries, currentTimer: mocks.currentTimer },
    issues: { list: mocks.listIssues },
    projects: { retrieve: mocks.retrieveProject },
  },
}))
vi.mock('next/navigation', () => ({
  notFound: mocks.notFound,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}))
vi.mock('@/lib/client/time', () => ({
  timeClient: {
    createEntry: vi.fn(),
    updateEntry: vi.fn(),
    deleteEntry: vi.fn(),
    startTimer: vi.fn(),
    stopTimer: vi.fn(),
  },
}))

const { ProjectTimeData } = await import('./project-time-data')

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
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.listEntries.mockResolvedValue({
    data: { data: [entry()] },
    error: null,
  })
  mocks.listIssues.mockResolvedValue({ data: { data: [] }, error: null })
  mocks.retrieveProject.mockResolvedValue({
    data: { id: 'prj_1', name: 'Website rebuild' },
    error: null,
  })
  mocks.currentTimer.mockResolvedValue({ data: null, error: null })
})

describe('ProjectTimeData', () => {
  it('reads the entries of this project for the signed-in viewer', async () => {
    render(
      await ProjectTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        projectId: 'prj_1',
        canEdit: true,
      })
    )

    expect(mocks.listEntries).toHaveBeenCalledWith('org_1', {
      projectId: 'prj_1',
    })
    expect(mocks.currentTimer).toHaveBeenCalledWith('org_1', 'usr_1')
    const projectNames = screen.getAllByText('Website rebuild')
    expect(projectNames).toHaveLength(2)
    expect(projectNames[0]).toBeInTheDocument()
  })

  it('names the work item each entry points at', async () => {
    mocks.listEntries.mockResolvedValue({
      data: { data: [entry({ issueId: 'iss_1' })] },
      error: null,
    })
    mocks.listIssues.mockResolvedValue({
      data: { data: [{ id: 'iss_1', title: 'Ship the header' }] },
      error: null,
    })

    render(
      await ProjectTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        projectId: 'prj_1',
        canEdit: true,
      })
    )

    expect(
      screen.getByRole('link', { name: 'Ship the header' })
    ).toBeInTheDocument()
  })

  it('shows a timer running against another project without naming it wrongly', async () => {
    mocks.currentTimer.mockResolvedValue({
      data: entry({ projectId: 'prj_2', endedAt: null, durationMinutes: null }),
      error: null,
    })

    render(
      await ProjectTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        projectId: 'prj_1',
        canEdit: true,
      })
    )

    expect(screen.getByText('Tracking another project')).toBeInTheDocument()
  })

  it('keeps the table mounted when the entries could not be read', async () => {
    mocks.listEntries.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/time-unavailable',
        message: 'The time entries could not be loaded.',
      },
    })

    render(
      await ProjectTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        projectId: 'prj_1',
        canEdit: true,
      })
    )

    expect(
      screen.getByText('Some time data could not be loaded')
    ).toBeInTheDocument()
    const emptyNotes = screen.getAllByText(
      'No time logged against this project yet.'
    )
    expect(emptyNotes).toHaveLength(2)
    expect(emptyNotes[0]).toBeInTheDocument()
  })

  it('opens the editor for the entry the URL names', async () => {
    render(
      await ProjectTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        projectId: 'prj_1',
        entryParam: 'tme_1',
        canEdit: true,
      })
    )

    expect(
      screen.getByRole('heading', { name: 'Edit entry' })
    ).toBeInTheDocument()
  })

  it('opens the add form for the new-entry query', async () => {
    render(
      await ProjectTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        projectId: 'prj_1',
        entryParam: 'new',
        canEdit: true,
      })
    )

    expect(
      screen.getByRole('heading', { name: 'Add entry' })
    ).toBeInTheDocument()
  })

  it('answers a missing project with not-found', async () => {
    mocks.retrieveProject.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/project-not-found',
        message: 'That project does not exist.',
      },
    })

    render(
      await ProjectTimeData({
        orgId: 'org_1',
        userId: 'usr_1',
        projectId: 'prj_9',
        canEdit: true,
      })
    )

    expect(mocks.notFound).toHaveBeenCalled()
  })
})
