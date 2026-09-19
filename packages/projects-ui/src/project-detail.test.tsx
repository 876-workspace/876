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
    customFields: [],
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
    taskListId: null,
    cycleId: null,
    plannedStartDate: null,
    plannedFinishDate: null,
    plannedDurationMinutes: null,
    blocked: false,
    relationCount: 0,
    dependencyCount: 0,
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
      screen.getAllByRole('heading', { name: 'Website refresh' })
    ).toHaveLength(2)
  })

  it('renders the project key in the record header', () => {
    render(<ProjectDetail project={makeProject()} issuesHref="/issues" />)

    expect(screen.getAllByText('WEB')).toHaveLength(2)
  })

  it('renders status and health badges in the header', () => {
    render(<ProjectDetail project={makeProject()} issuesHref="/issues" />)

    expect(screen.getAllByText('Active')).toHaveLength(2)
    expect(screen.getAllByText('On track')).toHaveLength(2)
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

    expect(
      screen.getByRole('heading', { name: 'Overview' })
    ).toBeInTheDocument()
    expect(screen.getAllByText('Project lead')).toHaveLength(2)
    expect(screen.getAllByText('Target date')).toHaveLength(2)
    expect(screen.getAllByText('Members')).toHaveLength(2)
    expect(screen.getAllByText('Customer')).toHaveLength(2)
  })

  it('renders a resolved project lead when supplied by the host', () => {
    render(
      <ProjectDetail
        project={makeProject()}
        issuesHref="/issues"
        leadLabel="Ana Brown"
      />
    )

    expect(screen.getAllByText('Ana Brown')).toHaveLength(2)
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

  it('renders the phone title and key as plain header metadata', () => {
    const { container } = render(
      <ProjectDetail project={makeProject()} issuesHref="/issues" />
    )

    expect(screen.getAllByText('Website refresh')[0]).toHaveClass('text-[2rem]')
    expect(container.querySelector('.font-mono')?.textContent).toBe('WEB')
  })

  it('renders status and health on the phone metadata line', () => {
    const { container } = render(
      <ProjectDetail project={makeProject()} issuesHref="/issues" />
    )

    const metadata = container.querySelector(
      'header.sm\\:hidden .text-muted-foreground'
    )
    expect(metadata).toHaveTextContent('WEB·Active·On track')
  })

  it('keeps the folder icon tile desktop-only', () => {
    render(<ProjectDetail project={makeProject()} issuesHref="/issues" />)

    expect(screen.getByTestId('project-folder-icon')).toHaveClass(
      'hidden',
      'sm:flex'
    )
  })

  it('renders one phone fact row for every project fact', () => {
    render(<ProjectDetail project={makeProject()} issuesHref="/issues" />)

    expect(screen.getByTestId('mobile-fact-list').children).toHaveLength(6)
  })

  it('renders Follow in the phone header action row', () => {
    render(
      <ProjectDetail
        project={makeProject()}
        issuesHref="/issues"
        mobileActions={<button type="button">Follow</button>}
      />
    )

    expect(screen.getByTestId('project-mobile-actions')).toHaveTextContent(
      'Follow'
    )
  })

  it('keeps template and clone actions out of the phone action row', () => {
    render(
      <ProjectDetail
        project={makeProject()}
        issuesHref="/issues"
        mobileActions={<button type="button">Follow</button>}
      />
    )

    expect(screen.getByTestId('project-mobile-actions')).not.toHaveTextContent(
      'Save as template'
    )
    expect(screen.getByTestId('project-mobile-actions')).not.toHaveTextContent(
      'Clone'
    )
  })

  it('renders phone work overview statistics with tabular numerals', () => {
    const { container } = render(
      <ProjectDetail project={makeProject()} issuesHref="/issues" />
    )

    expect(
      screen.getByTestId('mobile-work-overview').querySelector('.tabular-nums')
    ).toHaveTextContent('0items0open0in progress0done0overdue')
  })
})
