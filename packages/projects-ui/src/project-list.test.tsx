import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Project } from '@876/projects/contracts'

import { ProjectsTable } from './project-list'

const mockProjects: Project[] = [
  {
    object: 'projects.project',
    id: 'proj_alpha',
    tenantId: 'tenant_1',
    name: 'Alpha Project',
    key: 'ALP',
    slug: 'alpha-project',
    description: 'The first project',
    leadUserId: 'user_lead1',
    status: 'active',
    health: 'on-track',
    startDate: 1700000000,
    targetDate: 1710000000,
    nextIssueNumber: 1,
    customerId: null,
    position: 1,
    archivedAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    memberCount: 3,
  },
]

describe('ProjectsTable', () => {
  it('renders table columns and project rows with links', () => {
    render(
      <ProjectsTable
        projects={mockProjects}
        projectsHref="/orgs/test-org/workspace/projects/projects"
      />
    )

    expect(screen.getByText('Project')).toBeInTheDocument()
    expect(screen.getByText('Key')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Health')).toBeInTheDocument()
    expect(screen.getByText('Alpha Project')).toBeInTheDocument()
    expect(screen.getByText('ALP')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('On track')).toBeInTheDocument()

    const link = screen.getByRole('link', { name: 'View project Alpha Project' })
    expect(link).toHaveAttribute(
      'href',
      '/orgs/test-org/workspace/projects/projects/proj_alpha'
    )
  })

  it('renders empty state when there are no projects', () => {
    render(
      <ProjectsTable
        projects={[]}
        projectsHref="/orgs/test-org/workspace/projects/projects"
        newProjectHref="/orgs/test-org/workspace/projects/projects/new"
      />
    )

    expect(screen.getByText('No projects yet')).toBeInTheDocument()
    const addLink = screen.getByRole('link', { name: /Add/ })
    expect(addLink).toHaveAttribute(
      'href',
      '/orgs/test-org/workspace/projects/projects/new'
    )
  })
})
