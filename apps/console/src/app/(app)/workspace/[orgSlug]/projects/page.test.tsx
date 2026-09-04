// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Issue, Project } from '@876/projects/contracts'

const mocks = vi.hoisted(() => ({
  listProjects: vi.fn(),
  listIssues: vi.fn(),
  resolveOrg: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/workspace/test-org/projects',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    projects: {
      list: mocks.listProjects,
    },
    issues: {
      list: mocks.listIssues,
    },
  },
}))

vi.mock('@/features/orgs/org-data', () => ({
  resolveOrg: mocks.resolveOrg,
}))

import ProjectsWorkspaceOverviewPage from './page'
import { OverviewData } from '@/features/projects/components/overview-data'

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

const mockProjects: Project[] = [
  {
    object: 'projects.project',
    id: 'proj_1',
    tenantId: 'tenant_1',
    name: 'Mars Rover',
    key: 'ROV',
    slug: 'mars-rover',
    description: null,
    leadUserId: null,
    status: 'active',
    health: 'on-track',
    startDate: null,
    targetDate: null,
    nextIssueNumber: 10,
    customerId: null,
    defaultWorkItemTypeId: null,
    position: 1,
    archivedAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    memberCount: 2,
  },
]

const mockIssues: Issue[] = [
  {
    object: 'projects.issue',
    id: 'issue_1',
    tenantId: 'tenant_1',
    projectId: 'proj_1',
    projectKey: 'ROV',
    number: 1,
    identifier: 'ROV-1',
    title: 'Wheel motor calibration',
    description: null,
    status: 'in-progress',
    typeKey: 'task',
    type: sampleType,
    state: null,
    milestone: null,
    customFields: [],
    priority: 'high',
    assigneeUserId: 'user_eng',
    creatorUserId: 'user_1',
    parentIssueId: null,
    estimate: 5,
    dueDate: null,
    position: 1,
    labels: [],
    commentCount: 0,
    subIssueCount: 0,
    startedAt: 1700000000,
    completedAt: null,
    canceledAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
  },
]

afterEach(cleanup)

describe('ProjectsWorkspaceOverviewPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveOrg.mockResolvedValue({
      id: 'org_123',
      slug: 'test-org',
      name: 'Test Org',
    })
    mocks.listProjects.mockResolvedValue({
      data: {
        object: 'list',
        data: mockProjects,
        hasMore: false,
        totalCount: 1,
      },
      error: null,
    })
    mocks.listIssues.mockResolvedValue({
      data: { object: 'list', data: mockIssues, hasMore: false, totalCount: 1 },
      error: null,
    })
  })

  it('renders overview header and title', async () => {
    const page = await ProjectsWorkspaceOverviewPage({
      params: Promise.resolve({ orgSlug: 'test-org' }),
    })

    render(page)
    expect(
      screen.getByRole('heading', { name: 'Overview' })
    ).toBeInTheDocument()
  })

  it('renders overview stat tiles and recent issues list', async () => {
    const element = await OverviewData({
      organizationId: 'org_123',
      base: '/workspace/test-org/projects',
    })
    render(element)

    expect(mocks.listProjects).toHaveBeenCalledWith('org_123')
    expect(mocks.listIssues).toHaveBeenCalledWith('org_123')

    expect(screen.getByText('Active projects')).toBeInTheDocument()
    expect(screen.getByText('Open issues')).toBeInTheDocument()
    expect(screen.getByText('Total issues')).toBeInTheDocument()

    expect(screen.getByText('Recently updated issues')).toBeInTheDocument()
    // The list renders a desktop table and a mobile ListRow group at once
    // (CSS media queries pick one — jsdom applies neither), so scope every
    // query to the table to avoid matching the row twice.
    const table = within(screen.getByRole('table'))
    expect(table.getByText('ROV-1')).toBeInTheDocument()
    expect(table.getByText('Wheel motor calibration')).toBeInTheDocument()
  })

  it('renders AppError banner when overview data fails to load', async () => {
    mocks.listProjects.mockResolvedValue({
      data: null,
      error: { code: 'projects/unavailable', message: 'Project cluster down' },
    })

    const element = await OverviewData({
      organizationId: 'org_123',
      base: '/workspace/test-org/projects',
    })
    render(element)

    expect(
      screen.getByText('Project data is temporarily unavailable')
    ).toBeInTheDocument()
    expect(screen.getByText('Project cluster down')).toBeInTheDocument()
  })
})
