// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Issue } from '@876/projects/contracts'

const sampleType = {
  object: 'projects.work-item-type' as const,
  id: 'wit_task_1',
  tenantId: 'tenant_1',
  key: 'task',
  name: 'Task',
  iconKey: 'circle-check',
  color: '#3b82f6',
  hierarchyLevel: 1,
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: 1700000000,
  updatedAt: 1700000000,
}

const mocks = vi.hoisted(() => ({
  listIssues: vi.fn(),
  resolveOrg: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/workspace/test-org/projects/board',
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

vi.mock('@/features/orgs/org-data', () => ({
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
    typeKey: 'task',
    type: sampleType,
    state: null,
    milestone: null,
    taskListId: null,
    cycleId: null,
    customFields: [],
    priority: 'low',
    assigneeUserId: null,
    creatorUserId: 'user_1',
    parentIssueId: null,
    estimate: null,
    dueDate: null,
    plannedStartDate: null,
    plannedFinishDate: null,
    plannedDurationMinutes: null,
    blocked: false,
    relationCount: 0,
    dependencyCount: 0,
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
    typeKey: 'task',
    type: sampleType,
    state: null,
    milestone: null,
    taskListId: null,
    cycleId: null,
    customFields: [],
    priority: 'high',
    assigneeUserId: 'user_dev',
    creatorUserId: 'user_1',
    parentIssueId: null,
    estimate: 2,
    dueDate: null,
    plannedStartDate: null,
    plannedFinishDate: null,
    plannedDurationMinutes: null,
    blocked: false,
    relationCount: 0,
    dependencyCount: 0,
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
      params: Promise.resolve({ orgSlug: 'test-org' }),
    })

    render(page)
    expect(
      screen.getByRole('heading', { name: 'All Board Issues' })
    ).toBeInTheDocument()
  })

  it('renders all six status columns and categorizes board issues', async () => {
    const element = await BoardData({
      organizationId: 'org_123',
      base: '/workspace/test-org/projects',
    })
    render(element)

    expect(mocks.listIssues).toHaveBeenCalledWith('org_123')
    expect(screen.getByRole('heading', { name: 'Backlog' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Todo' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'In Progress' })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'In Review' })
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { name: 'Canceled' })
    ).toBeInTheDocument()

    expect(screen.getAllByText('APO-1').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Backlog issue on board')).toHaveLength(2)
    expect(screen.getAllByText('APO-2').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Done issue on board')).toHaveLength(2)
  })

  it('renders AppError notice when board issues fail to load', async () => {
    mocks.listIssues.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Board data offline' },
    })

    const element = await BoardData({
      organizationId: 'org_123',
      base: '/workspace/test-org/projects',
    })
    render(element)

    expect(
      screen.getByText('Board issues could not be loaded')
    ).toBeInTheDocument()
    expect(screen.getByText('Board data offline')).toBeInTheDocument()
  })
})
