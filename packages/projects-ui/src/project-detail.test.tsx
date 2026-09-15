// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { Issue, Project } from '@876/projects/contracts'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
}))

import { ProjectDetail } from './project-detail'

function makeProject(overrides?: Partial<Project>): Project {
  return {
    object: 'projects.project',
    id: 'project_1',
    tenantId: 'tenant_1',
    name: 'Website refresh',
    key: 'WEB',
    slug: 'website-refresh',
    description: 'A customer-facing visual refresh.',
    leadUserId: 'user_ana',
    status: 'active',
    health: 'on-track',
    startDate: null,
    targetDate: 1720000000,
    nextIssueNumber: 3,
    customerId: null,
    defaultWorkItemTypeId: null,
    position: 0,
    archivedAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
    memberCount: 3,
    ...overrides,
  }
}

function makeIssue(): Issue {
  return {
    object: 'projects.issue',
    id: 'issue_1',
    tenantId: 'tenant_1',
    projectId: 'project_1',
    projectKey: 'WEB',
    number: 1,
    identifier: 'WEB-1',
    title: 'Set the typography scale',
    description: null,
    status: 'todo',
    typeKey: 'task',
    type: null,
    state: null,
    milestone: null,
    customFields: [],
    priority: 'medium',
    assigneeUserId: null,
    creatorUserId: null,
    parentIssueId: null,
    estimate: null,
    dueDate: null,
    position: 0,
    labels: [],
    commentCount: 0,
    subIssueCount: 0,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
  }
}

afterEach(cleanup)

describe('ProjectDetail', () => {
  it('renders the project name as the record heading', () => {
    render(<ProjectDetail project={makeProject()} issuesHref="/issues" />)

    expect(
      screen.getByRole('heading', { name: 'Website refresh' })
    ).toBeInTheDocument()
  })

  it('renders the project key in the record header', () => {
    render(<ProjectDetail project={makeProject()} issuesHref="/issues" />)

    expect(screen.getByText('WEB')).toBeInTheDocument()
  })

  it('renders status and health badges in the header', () => {
    render(<ProjectDetail project={makeProject()} issuesHref="/issues" />)

    expect(screen.getByText('Active')).toBeInTheDocument()
    expect(screen.getByText('On track')).toBeInTheDocument()
  })

  it('renders the explicit empty description state', () => {
    render(
      <ProjectDetail
        project={makeProject({ description: null })}
        issuesHref="/issues"
      />
    )

    expect(
      screen.getByText('No project description has been added.')
    ).toBeInTheDocument()
  })

  it('renders project facts in the overview', () => {
    render(<ProjectDetail project={makeProject()} issuesHref="/issues" />)

    expect(screen.getByRole('heading', { name: 'Overview' })).toBeInTheDocument()
    expect(screen.getByText('Project lead')).toBeInTheDocument()
    expect(screen.getByText('Target date')).toBeInTheDocument()
    expect(screen.getByText('Members')).toBeInTheDocument()
    expect(screen.getByText('Customer')).toBeInTheDocument()
  })

  it('renders a resolved project lead when supplied by the host', () => {
    render(
      <ProjectDetail
        project={makeProject()}
        issuesHref="/issues"
        leadLabel="Ana Brown"
      />
    )

    expect(screen.getByText('Ana Brown')).toBeInTheDocument()
  })

  it('renders a clean empty state for an unassigned project lead', () => {
    render(
      <ProjectDetail
        project={makeProject({ leadUserId: null })}
        issuesHref="/issues"
      />
    )

    expect(screen.getByText('No lead assigned')).toBeInTheDocument()
  })

  it('renders work overview counts from a complete loaded issue set', () => {
    render(
      <ProjectDetail
        project={makeProject()}
        issues={[makeIssue()]}
        issueTotal={1}
        issuesHasMore={false}
        issuesHref="/issues"
      />
    )

    expect(
      screen.getByRole('heading', { name: 'Work overview' })
    ).toBeInTheDocument()
    expect(screen.getByText('Open')).toBeInTheDocument()
    expect(screen.getByText('Completed')).toBeInTheDocument()
  })

  it('renders the project work table under its section heading', () => {
    render(
      <ProjectDetail
        project={makeProject()}
        issues={[makeIssue()]}
        issuesHref="/issues"
      />
    )

    expect(screen.getByRole('heading', { name: 'Work' })).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
    expect(screen.getAllByText('Set the typography scale')).toHaveLength(2)
  })

  it('does not render a second back-to-projects control', () => {
    render(<ProjectDetail project={makeProject()} issuesHref="/issues" />)

    expect(screen.queryByRole('link', { name: /back to projects/i })).toBeNull()
    expect(
      screen.queryByRole('button', { name: /back to projects/i })
    ).toBeNull()
  })
})
