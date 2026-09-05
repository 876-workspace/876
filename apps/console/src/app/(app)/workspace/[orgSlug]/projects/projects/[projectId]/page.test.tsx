// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import '@testing-library/jest-dom/vitest'
import type { Project } from '@876/projects/contracts'

const mocks = vi.hoisted(() => ({
  retrieveProject: vi.fn(),
  listIssues: vi.fn(),
  resolveOrg: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  usePathname: () => '/workspace/test-org/projects/projects/proj_test',
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn(), replace: vi.fn() }),
}))

vi.mock('@/lib/services/projects', () => ({
  projects: {
    projects: {
      retrieve: mocks.retrieveProject,
    },
    issues: {
      list: mocks.listIssues,
    },
  },
}))

vi.mock('@/features/orgs/org-data', () => ({
  resolveOrg: mocks.resolveOrg,
}))

import { ProjectDetailData } from '@/features/projects/components/project-detail-data'

const mockProject: Project = {
  object: 'projects.project',
  id: 'proj_test',
  tenantId: 'tenant_1',
  name: 'Falcon Heavy',
  key: 'FAL',
  slug: 'falcon-heavy',
  description: 'Heavy lift launch vehicle',
  leadUserId: 'user_lead',
  status: 'active',
  health: 'on-track',
  startDate: 1700000000,
  targetDate: 1720000000,
  nextIssueNumber: 1,
  customerId: null,
  defaultWorkItemTypeId: null,
  position: 1,
  archivedAt: null,
  createdAt: 1700000000,
  updatedAt: 1700000000,
  memberCount: 8,
}

afterEach(cleanup)

describe('OrganizationProjectDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resolveOrg.mockResolvedValue({
      id: 'org_123',
      slug: 'test-org',
      name: 'Test Org',
    })
    mocks.retrieveProject.mockResolvedValue({
      data: mockProject,
      error: null,
    })
    mocks.listIssues.mockResolvedValue({
      data: { object: 'list', data: [], hasMore: false, totalCount: 0 },
      error: null,
    })
  })

  it('renders project detail with name, key, lead, and status', async () => {
    const element = await ProjectDetailData({
      organizationId: 'org_123',
      base: '/workspace/test-org/projects',
      projectId: 'proj_test',
    })

    render(element)

    expect(mocks.retrieveProject).toHaveBeenCalledWith('org_123', 'proj_test')
    expect(mocks.listIssues).toHaveBeenCalledWith('org_123', {
      project: 'proj_test',
    })

    expect(
      screen.getByRole('heading', { name: 'Falcon Heavy' })
    ).toBeInTheDocument()
    expect(screen.getByText('FAL')).toBeInTheDocument()
    expect(screen.getByText('Heavy lift launch vehicle')).toBeInTheDocument()
    expect(screen.getByText('user_lead')).toBeInTheDocument()
    expect(screen.queryByText('Back to projects')).toBeNull()
  })

  it('renders AppError notice when project retrieve fails', async () => {
    mocks.retrieveProject.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/unavailable',
        message: 'Project retrieval error',
      },
    })

    const element = await ProjectDetailData({
      organizationId: 'org_123',
      base: '/workspace/test-org/projects',
      projectId: 'proj_test',
    })

    render(element)

    expect(screen.getByText('Project could not be loaded')).toBeInTheDocument()
    expect(screen.getByText('Project retrieval error')).toBeInTheDocument()
  })
})
