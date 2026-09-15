/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import type {
  Milestone,
  TaskList,
  WorkBreakdown as WorkBreakdownModel,
  WorkBreakdownIssue,
} from '@876/projects/contracts'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  archive: vi.fn(),
  restore: vi.fn(),
  reorder: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  taskListsClient: {
    archive: mocks.archive,
    restore: mocks.restore,
    reorder: mocks.reorder,
  },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

import { WorkBreakdown } from './work-breakdown'

const milestone: Milestone = {
  object: 'projects.milestone',
  id: 'ms_1',
  tenantId: 'tenant_1',
  projectId: 'prj_1',
  key: 'M1',
  name: 'Release one',
  description: null,
  status: 'open',
  startDate: null,
  targetDate: null,
  completedAt: null,
  position: 0,
  createdAt: 1,
  updatedAt: 1,
}

function makeTaskList(overrides: Partial<TaskList> & { id: string }): TaskList {
  return {
    object: 'task-list',
    tenantId: 'tenant_1',
    projectId: 'prj_1',
    milestoneId: null,
    name: 'Backend groundwork',
    description: null,
    ownerUserId: null,
    startDate: null,
    targetDate: null,
    position: 0,
    archivedAt: null,
    progress: { total: 0, completed: 0 },
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

function makeIssue(
  overrides: Partial<WorkBreakdownIssue> & { id: string; identifier: string }
): WorkBreakdownIssue {
  return {
    title: 'Wire the API',
    status: 'todo',
    taskListId: null,
    milestoneId: null,
    parentIssueId: null,
    subIssueCount: 0,
    ...overrides,
  }
}

const taskList = makeTaskList({
  id: 'tl_1',
  name: 'Backend groundwork',
  milestoneId: 'ms_1',
  ownerUserId: 'usr_ana',
  progress: { total: 3, completed: 1 },
})

const secondTaskList = makeTaskList({
  id: 'tl_2',
  name: 'Client groundwork',
  milestoneId: 'ms_1',
  progress: { total: 2, completed: 2 },
})

const unphasedTaskList = makeTaskList({
  id: 'tl_3',
  name: 'Operations',
  progress: { total: 1, completed: 0 },
})

const breakdown: WorkBreakdownModel = {
  object: 'work-breakdown',
  projectId: 'prj_1',
  phases: [
    {
      milestone,
      taskLists: [
        {
          taskList,
          issues: [
            makeIssue({
              id: 'iss_9',
              identifier: 'CONSOLE-9',
              title: 'Wire the API',
              taskListId: taskList.id,
              milestoneId: milestone.id,
            }),
          ],
        },
        { taskList: secondTaskList, issues: [] },
      ],
      unlistedIssues: [
        makeIssue({
          id: 'iss_8',
          identifier: 'CONSOLE-8',
          title: 'Phase-level item',
          milestoneId: milestone.id,
        }),
      ],
    },
  ],
  unphasedTaskLists: [{ taskList: unphasedTaskList, issues: [] }],
  unlistedIssues: [
    makeIssue({ id: 'iss_10', identifier: 'CONSOLE-10', title: 'Loose item' }),
  ],
}

const ownerLabels = { usr_ana: 'Ana Brown' }

function renderBreakdown(canEdit = true) {
  return render(
    <WorkBreakdown
      breakdown={breakdown}
      ownerLabels={ownerLabels}
      canEdit={canEdit}
    />
  )
}

function taskListRow(name: string) {
  const row = screen.getByText(name).closest('li')
  if (!row) throw new Error(`No rendered row for ${name}`)
  return within(row)
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.archive.mockResolvedValue({ data: taskList, error: null })
  mocks.restore.mockResolvedValue({ data: taskList, error: null })
  mocks.reorder.mockResolvedValue({
    data: { object: 'list', data: [] },
    error: null,
  })
})

describe('WorkBreakdown', () => {
  it('renders the phase, its task lists, and its root work item links', () => {
    renderBreakdown()

    expect(screen.getByText('Release one')).toBeInTheDocument()
    expect(screen.getByText('Backend groundwork')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'CONSOLE-9 — Wire the API' })
    ).toHaveAttribute('href', '/issues/CONSOLE-9')
  })

  it('shows the task list owner and derived progress', () => {
    renderBreakdown()

    expect(screen.getByText(/Ana Brown/)).toBeInTheDocument()
    expect(screen.getByText(/1\/3 complete/)).toBeInTheDocument()
  })

  it('keeps task lists without a phase in their own group', () => {
    renderBreakdown()

    expect(screen.getByText('No phase')).toBeInTheDocument()
    expect(screen.getByText('Operations')).toBeInTheDocument()
  })

  it('keeps work items outside any task list in an unlisted group', () => {
    renderBreakdown()

    expect(screen.getByText('Unlisted')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: 'CONSOLE-10 — Loose item' })
    ).toHaveAttribute('href', '/issues/CONSOLE-10')
  })

  it('archives a task list through the client and refreshes', async () => {
    renderBreakdown()

    fireEvent.click(
      taskListRow('Backend groundwork').getByRole('button', { name: 'Archive' })
    )

    await waitFor(() => expect(mocks.archive).toHaveBeenCalledWith('tl_1'))
    expect(mocks.refresh).toHaveBeenCalled()
  })

  it('offers restore for an archived task list', async () => {
    const archivedList = { ...taskList, archivedAt: 1700000000 }
    render(
      <WorkBreakdown
        breakdown={{
          ...breakdown,
          phases: [
            {
              milestone,
              taskLists: [{ taskList: archivedList, issues: [] }],
              unlistedIssues: [],
            },
          ],
        }}
        ownerLabels={ownerLabels}
        canEdit
      />
    )

    expect(screen.getByText('Archived')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    await waitFor(() => expect(mocks.restore).toHaveBeenCalledWith('tl_1'))
  })

  it('reorders task lists within their group through the client', async () => {
    renderBreakdown()

    fireEvent.click(
      screen.getByRole('button', { name: 'Move Backend groundwork down' })
    )

    await waitFor(() =>
      expect(mocks.reorder).toHaveBeenCalledWith('prj_1', ['tl_2', 'tl_1'])
    )
  })

  it('hides the mutating actions from a viewer without edit access', () => {
    renderBreakdown(false)

    expect(
      screen.queryByRole('button', { name: 'Archive' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Restore' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Move Backend groundwork up' })
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Edit' })).not.toBeInTheDocument()
  })
})
