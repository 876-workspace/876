/** @vitest-environment jsdom */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  refresh: vi.fn(),
  listProjects: vi.fn(),
  listLabels: vi.fn(),
  loadStates: vi.fn(),
  loadMembers: vi.fn(),
  boardDataCalls: [] as Array<{
    query: Record<string, unknown>
    groupBy: string
  }>,
}))

vi.mock('next/navigation', () => ({
  usePathname: () => '/board',
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/lib/auth/require-projects-context', () => ({
  requireAppAccess: vi.fn().mockResolvedValue(undefined),
  requireProjectsContext: vi
    .fn()
    .mockResolvedValue({ orgId: 'org_1', userId: 'user_1' }),
}))

vi.mock('@/lib/clients/projects', () => ({
  projects: {
    projects: { list: mocks.listProjects },
    labels: { list: mocks.listLabels },
  },
}))

vi.mock('@/features/projects/member-labels', () => ({
  loadMemberLabels: mocks.loadMembers,
}))

vi.mock('@/features/projects/workflow-state-options', async (importOriginal) => {
  const actual =
    await importOriginal<
      typeof import('@/features/projects/workflow-state-options')
    >()
  return { ...actual, loadWorkflowStateOptions: mocks.loadStates }
})

vi.mock('@/features/projects/components/board-data', () => ({
  BoardData: (props: {
    query: Record<string, unknown>
    groupBy: string
  }) => {
    mocks.boardDataCalls.push(props)
    return <div>Board data</div>
  },
}))

import BoardPage from './page'

const STATES = [
  { key: 'todo', name: 'To do' },
  { key: 'done', name: 'Done' },
]

beforeEach(() => {
  vi.clearAllMocks()
  mocks.boardDataCalls.length = 0
  mocks.listProjects.mockResolvedValue({ data: { data: [] }, error: null })
  mocks.listLabels.mockResolvedValue({ data: { data: [] }, error: null })
  mocks.loadMembers.mockResolvedValue({ labels: {}, error: null })
  mocks.loadStates.mockResolvedValue({ states: STATES, error: null })
})

describe('BoardPage', () => {
  it('renders the standard toolbar with Add and disabled transfer actions', async () => {
    const user = userEvent.setup()
    render(await BoardPage({ searchParams: Promise.resolve({}) }))
    await user.click(screen.getByRole('button', { name: 'More actions' }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'All states' })
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('menuitem', { name: 'Refresh' })
    ).toBeVisible()
    expect(screen.getByRole('menuitem', { name: 'Import' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(screen.getByRole('menuitem', { name: 'Export' })).toHaveAttribute(
      'aria-disabled',
      'true'
    )
    expect(screen.getByRole('link', { name: 'Add' })).toHaveAttribute(
      'href',
      '/issues/new'
    )
  })

  it('renders the status filter heading with every workflow state', async () => {
    const user = userEvent.setup()
    render(await BoardPage({ searchParams: Promise.resolve({}) }))

    await user.click(
      screen.getByRole('button', { name: 'Filter board by status' })
    )

    expect(
      await screen.findByRole('menuitem', { name: 'All states' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('menuitem', { name: 'To do' })
    ).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: 'Done' })).toBeInTheDocument()
  })

  it('passes a known status through to the board query', async () => {
    render(await BoardPage({ searchParams: Promise.resolve({ status: 'done' }) }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'Done' })
    ).toBeInTheDocument()
    expect(mocks.boardDataCalls).toHaveLength(1)
    expect(mocks.boardDataCalls[0].query.status).toBe('done')
  })

  it('omits the status filter from the board query for status=all', async () => {
    render(await BoardPage({ searchParams: Promise.resolve({}) }))

    expect(
      screen.getByRole('heading', { level: 1, name: 'All states' })
    ).toBeInTheDocument()
    expect(mocks.boardDataCalls).toHaveLength(1)
    expect(mocks.boardDataCalls[0].query.status).toBeUndefined()
  })

  it('falls back to the unfiltered heading for an unknown status value', async () => {
    render(
      await BoardPage({ searchParams: Promise.resolve({ status: 'bogus' }) })
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'All states' })
    ).toBeInTheDocument()
    expect(mocks.boardDataCalls).toHaveLength(1)
    expect(mocks.boardDataCalls[0].query.status).toBeUndefined()
  })
})
