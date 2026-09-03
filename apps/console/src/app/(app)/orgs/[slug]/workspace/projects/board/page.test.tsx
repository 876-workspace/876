// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Issue } from '@876/projects/contracts'

const mocks = vi.hoisted(() => ({
  listIssues: vi.fn(),
  resolveOrg: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/orgs/test-org/workspace/projects/board',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    issues: {
      list: mocks.listIssues,
    },
  },
}))

vi.mock('../../../_data', () => ({
  resolveOrg: mocks.resolveOrg,
}))

import OrganizationIssueBoardPage from './page'
import { BoardData } from '@/features/projects/components/board-data'

const mockIssues: Issue[] = [
  {
    object: 'projects.issue',
    id: 'issue_b1',
    tenantId: 'tenant_1',
    projectId: 'proj_1',
    projectKey: 'APO',
    number: 1,
    identifier: 'APO-1',
    title: 'Backlog issue on board',
    description: null,
    status: 'backlog',
    priority: 'low',
    assigneeUserId: null,
    creatorUserId: 'user_1',
    parentIssueId: null,
    estimate: null,
    dueDate: null,
    position: 1,
    labels: [],
    commentCount: 0,
    subIssueCount: 0,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
  },
  {
    object: 'projects.issue',
    id: 'issue_b2',
    tenantId: 'tenant_1',
    projectId: 'proj_1',
    projectKey: 'APO',
    number: 2,
    identifier: 'APO-2',
    title: 'Done issue on board',
    description: null,
    status: 'done',
    priority: 'high',
    assigneeUserId: 'user_dev',
    creatorUserId: 'user_1',
    parentIssueId: null,
    estimate: 2,
    dueDate: null,
    position: 2,
    labels: [],
    commentCount: 1,
    subIssueCount: 0,
    startedAt: 1700000000,
    completedAt: 1700010000,
    canceledAt: null,
    createdAt: 1700000000,
    updatedAt: 1700010000,
  },
]

afterEach(cleanup)

describe('OrganizationIssueBoardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveOrg.mockResolvedValue({
      id: 'org_123',
      slug: 'test-org',
      name: 'Test Org',
    })
    mocks.listIssues.mockResolvedValue({
      data: { object: 'list', data: mockIssues, hasMore: false, totalCount: 2 },
      error: null,
    })
  })

  it('renders board toolbar while pending', async () => {
    const page = await OrganizationIssueBoardPage({
      params: Promise.resolve({ slug: 'test-org' }),
    })

    render(page)
    expect(screen.getByRole('heading', { name: 'Board' })).toBeInTheDocument()
  })

  it('renders all six status columns and categorizes board issues', async () => {
    const element = await BoardData({ slug: 'test-org' })
    render(element)

    expect(mocks.listIssues).toHaveBeenCalledWith('org_123')
    expect(screen.getByText('Backlog')).toBeInTheDocument()
    expect(screen.getByText('Todo')).toBeInTheDocument()
    expect(screen.getByText('In Progress')).toBeInTheDocument()
    expect(screen.getByText('In Review')).toBeInTheDocument()
    expect(screen.getByText('Done')).toBeInTheDocument()
    expect(screen.getByText('Canceled')).toBeInTheDocument()

    expect(screen.getByText('APO-1')).toBeInTheDocument()
    expect(screen.getByText('Backlog issue on board')).toBeInTheDocument()
    expect(screen.getByText('APO-2')).toBeInTheDocument()
    expect(screen.getByText('Done issue on board')).toBeInTheDocument()
  })

  it('renders AppError notice when board issues fail to load', async () => {
    mocks.listIssues.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Board data offline' },
    })

    const element = await BoardData({ slug: 'test-org' })
    render(element)

    expect(
      screen.getByText('Board issues could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('Board data offline')).toBeInTheDocument()
  })
})
