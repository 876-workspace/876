/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import type { Issue } from '@876/projects/contracts'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  refresh: vi.fn(),
}))

vi.mock('@/lib/client', () => ({
  issuesClient: { update: mocks.update },
}))
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: mocks.refresh }),
}))

const { BoardDragBoard } = await import('./board-drag-board')

function makeBoardIssue(overrides: Partial<Issue> = {}): Issue {
  return {
    object: 'projects.issue',
    id: 'iss_1',
    tenantId: 'tnt_1',
    projectId: 'prj_1',
    projectKey: 'PROJ',
    number: 1,
    identifier: 'PROJ-1',
    title: 'Ship the release',
    description: null,
    status: 'todo',
    typeKey: 'task',
    type: null,
    state: null,
    milestone: null,
    taskListId: null,
    cycleId: null,
    customFields: [],
    priority: 'none',
    assigneeUserId: null,
    creatorUserId: null,
    parentIssueId: null,
    estimate: null,
    dueDate: null,
    plannedStartDate: null,
    plannedFinishDate: null,
    plannedDurationMinutes: null,
    blocked: false,
    relationCount: 0,
    dependencyCount: 0,
    position: 0,
    labels: [],
    commentCount: 0,
    subIssueCount: 0,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    createdAt: 1,
    updatedAt: 1,
    ...overrides,
  }
}

const STATES = [
  { key: 'todo', label: 'To do' },
  { key: 'done', label: 'Done' },
]

beforeEach(() => {
  vi.clearAllMocks()
  mocks.update.mockResolvedValue({
    data: { object: 'projects.issue', id: 'iss_1' },
    error: null,
  })
})

afterEach(cleanup)

describe('BoardDragBoard', () => {
  it('groups issues into one column per workflow state', () => {
    render(
      <BoardDragBoard
        issues={[makeBoardIssue(), makeBoardIssue({ id: 'iss_2', identifier: 'PROJ-2', title: 'Review the release', status: 'done' })]}
        states={STATES}
        issuesHref="/issues"
      />
    )

    expect(
      screen.getByRole('heading', { name: 'To do' })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument()
    expect(screen.getByText('Ship the release')).toBeInTheDocument()
  })

  it('moves an issue through its state control', async () => {
    render(
      <BoardDragBoard issues={[makeBoardIssue()]} states={STATES} issuesHref="/issues" />
    )

    fireEvent.change(screen.getByLabelText('Move PROJ-1 to state'), {
      target: { value: 'done' },
    })

    expect(mocks.update).toHaveBeenCalledWith('PROJ-1', { status: 'done' })
    expect(await screen.findByText('Ship the release')).toBeInTheDocument()
  })

  it('shows a local error with a comment retry when the move needs one', async () => {
    render(
      <BoardDragBoard issues={[makeBoardIssue()]} states={STATES} issuesHref="/issues" />
    )
    mocks.update.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/transition-requirements-unmet',
        message: 'This transition requires a comment.',
      },
    })

    fireEvent.change(screen.getByLabelText('Move PROJ-1 to state'), {
      target: { value: 'done' },
    })

    expect(
      await screen.findByText(/not moved/)
    ).toBeInTheDocument()
    const comment = screen.getByLabelText(
      'Comment (required by this transition)'
    )
    fireEvent.change(comment, { target: { value: 'Approved offline' } })
    fireEvent.click(screen.getByRole('button', { name: 'Retry with comment' }))

    expect(mocks.update).toHaveBeenLastCalledWith('PROJ-1', {
      status: 'done',
      comment: 'Approved offline',
    })
  })
})
