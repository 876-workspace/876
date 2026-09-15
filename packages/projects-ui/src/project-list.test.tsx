// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Project } from '@876/projects/contracts'

const mocks = vi.hoisted(() => ({
  segments: [] as string[],
  searchParams: new URLSearchParams(),
}))

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
}))

vi.mock('@876/ui/list-detail-shell', () => ({
  useDetailSegments: () => mocks.segments,
}))

import { ProjectsList } from './project-list'

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
    defaultWorkItemTypeId: null,
    position: 1,
    archivedAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    memberCount: 3,
  },
  {
    object: 'projects.project',
    id: 'proj_beta',
    tenantId: 'tenant_1',
    name: 'Beta Project',
    key: 'BET',
    slug: 'beta-project',
    description: 'The second project',
    leadUserId: 'user_lead2',
    status: 'paused',
    health: 'at-risk',
    startDate: 1700000000,
    targetDate: 1710000000,
    nextIssueNumber: 1,
    customerId: null,
    defaultWorkItemTypeId: null,
    position: 2,
    archivedAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    memberCount: 1,
  },
]

describe('ProjectsList', () => {
  beforeEach(() => {
    mocks.segments = []
    mocks.searchParams = new URLSearchParams()
  })

  afterEach(cleanup)

  it('renders the full table when no record is open', () => {
    render(
      <ProjectsList
        projects={mockProjects}
        projectsHref="/projects"
        newProjectHref="/projects/new"
      />
    )

    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByText('Alpha Project')).toHaveLength(2)
    expect(screen.getAllByText('Beta Project')).toHaveLength(2)
    expect(screen.getByText('ALP')).toBeInTheDocument()
    expect(screen.getByText('BET')).toBeInTheDocument()
    expect(screen.queryByText('Projects')).not.toBeInTheDocument()
    const links = screen.getAllByRole('link', {
      name: 'View project Alpha Project',
    })
    expect(links).toHaveLength(2)
    for (const link of links)
      expect(link).toHaveAttribute('href', '/projects/proj_alpha')
  })

  it('renders the condensed pane when one is open', () => {
    mocks.segments = ['proj_alpha']

    render(
      <ProjectsList
        projects={mockProjects}
        projectsHref="/projects"
        newProjectHref="/projects/new"
      />
    )

    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getByText('Projects')).toBeInTheDocument()
    expect(screen.getByText('Alpha Project')).toBeInTheDocument()
    expect(screen.getByText('ALP')).toBeInTheDocument()
    expect(screen.getByText('Beta Project')).toBeInTheDocument()
    expect(screen.getByText('BET')).toBeInTheDocument()
  })

  it('marks the open row selected', () => {
    mocks.segments = ['proj_alpha']

    render(
      <ProjectsList
        projects={mockProjects}
        projectsHref="/projects"
        newProjectHref="/projects/new"
      />
    )

    const alphaLink = screen.getByRole('link', {
      name: 'View project Alpha Project',
    })
    const betaLink = screen.getByRole('link', {
      name: 'View project Beta Project',
    })

    expect(alphaLink).toHaveAttribute('aria-current', 'true')
    expect(alphaLink).toHaveAttribute('data-state', 'selected')
    expect(betaLink).not.toHaveAttribute('aria-current')
    expect(betaLink).not.toHaveAttribute('data-state')
  })

  it('keeps the status badge in the condensed row', () => {
    mocks.segments = ['proj_alpha']

    render(
      <ProjectsList
        projects={mockProjects}
        projectsHref="/projects"
        newProjectHref="/projects/new"
      />
    )

    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('Paused')).toBeInTheDocument()
  })

  it('preserves the query string on condensed hrefs', () => {
    mocks.segments = ['proj_alpha']
    mocks.searchParams = new URLSearchParams('tab=settings&view=compact')

    render(
      <ProjectsList
        projects={mockProjects}
        projectsHref="/projects"
        newProjectHref="/projects/new"
      />
    )

    const alphaLink = screen.getByRole('link', {
      name: 'View project Alpha Project',
    })
    expect(alphaLink).toHaveAttribute(
      'href',
      '/projects/proj_alpha?tab=settings&view=compact'
    )
  })

  it('renders the empty text with no rows', () => {
    mocks.segments = ['proj_alpha']

    render(
      <ProjectsList
        projects={[]}
        projectsHref="/projects"
        newProjectHref="/projects/new"
      />
    )

    expect(screen.getByText('No projects yet')).toBeInTheDocument()
  })
})
