// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import type { Issue } from '@876/projects/contracts'

import { IssueBoard } from './issue-board'

const ISSUES_HREF = '/projects/CONSOLE/issues'

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

function makeIssue(overrides?: Partial<Issue>): Issue {
  return {
    object: 'projects.issue',
    id: 'issue_console_12',
    tenantId: 'tenant_1',
    projectId: 'proj_console',
    projectKey: 'CONSOLE',
    number: 12,
    identifier: 'CONSOLE-12',
    title: 'Triage incoming support tickets',
    description: null,
    status: 'backlog',
    typeKey: 'task',
    type: sampleType,
    state: null,
    milestone: null,
    customFields: [],
    priority: 'low',
    assigneeUserId: null,
    creatorUserId: 'user_ben',
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
    ...overrides,
  }
}

const backlogIssue = makeIssue()
const todoIssue = makeIssue({
  id: 'issue_console_13',
  number: 13,
  identifier: 'CONSOLE-13',
  title: 'Fix the auth race condition',
  status: 'todo',
  priority: 'high',
  assigneeUserId: 'user_ana',
  labels: [
    {
      object: 'projects.label',
      id: 'lbl_bug',
      tenantId: 'tenant_1',
      name: 'bug',
      color: '#e5484d',
      description: 'Crashes and broken behavior',
      createdAt: 1700000000,
      updatedAt: 1700000000,
    },
  ],
})
const progressIssueA = makeIssue({
  id: 'issue_console_14',
  number: 14,
  identifier: 'CONSOLE-14',
  title: 'Rebuild the billing webhook handler',
  status: 'in-progress',
  priority: 'urgent',
  assigneeUserId: 'user_ben',
})
const progressIssueB = makeIssue({
  id: 'issue_console_15',
  number: 15,
  identifier: 'CONSOLE-15',
  title: 'Add dark mode support',
  status: 'in-progress',
  priority: 'medium',
  assigneeUserId: null,
})
const doneIssue = makeIssue({
  id: 'issue_console_16',
  number: 16,
  identifier: 'CONSOLE-16',
  title: 'Publish the migration runbook',
  status: 'done',
  priority: 'none',
  assigneeUserId: 'user_cara',
})

const issues = [
  backlogIssue,
  todoIssue,
  progressIssueA,
  progressIssueB,
  doneIssue,
]

function columnFor(statusName: string): HTMLElement {
  const heading = screen.getByRole('heading', { name: statusName })
  const header = heading.parentElement
  const column = header?.parentElement

  if (!column) {
    throw new Error(`Missing board column for status ${statusName}`)
  }

  return column
}

function statusOf(issue: Issue): string {
  return issue.status
}

describe('IssueBoard advanced', () => {
  afterEach(cleanup)

  it('board, on render, shows all six status column headings', () => {
    render(<IssueBoard issues={issues} issuesHref={ISSUES_HREF} />)

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
  })

  it('board, with issues, groups the backlog issue under Backlog', () => {
    expect(statusOf(backlogIssue)).toBe('backlog')

    render(<IssueBoard issues={issues} issuesHref={ISSUES_HREF} />)

    const column = columnFor('Backlog')

    expect(
      within(column).getByText('Triage incoming support tickets')
    ).toBeInTheDocument()
    expect(within(column).getByText('CONSOLE-12')).toBeInTheDocument()
  })

  it('board, with issues, groups both in-progress issues under In Progress', () => {
    render(<IssueBoard issues={issues} issuesHref={ISSUES_HREF} />)

    const column = columnFor('In Progress')

    expect(
      within(column).getByText('Rebuild the billing webhook handler')
    ).toBeInTheDocument()
    expect(
      within(column).getByText('Add dark mode support')
    ).toBeInTheDocument()
    expect(within(column).getByText('CONSOLE-14')).toBeInTheDocument()
    expect(within(column).getByText('CONSOLE-15')).toBeInTheDocument()
  })

  it('board, with issues, groups the done issue under Done', () => {
    render(<IssueBoard issues={issues} issuesHref={ISSUES_HREF} />)

    const column = columnFor('Done')

    expect(
      within(column).getByText('Publish the migration runbook')
    ).toBeInTheDocument()
    expect(within(column).getByText('CONSOLE-16')).toBeInTheDocument()
  })

  it('board, with issues, shows the empty state in columns without issues', () => {
    render(<IssueBoard issues={issues} issuesHref={ISSUES_HREF} />)

    expect(screen.getAllByText('No issues')).toHaveLength(2)
    expect(
      within(columnFor('In Review')).getByText('No issues')
    ).toBeInTheDocument()
    expect(
      within(columnFor('Canceled')).getByText('No issues')
    ).toBeInTheDocument()
  })

  it('board, with issues, shows per-column counts', () => {
    render(<IssueBoard issues={issues} issuesHref={ISSUES_HREF} />)

    expect(within(columnFor('Backlog')).getByText('1')).toBeInTheDocument()
    expect(within(columnFor('Todo')).getByText('1')).toBeInTheDocument()
    expect(within(columnFor('In Progress')).getByText('2')).toBeInTheDocument()
    expect(within(columnFor('Done')).getByText('1')).toBeInTheDocument()
    expect(within(columnFor('In Review')).getByText('0')).toBeInTheDocument()
  })

  it('card, on render, shows the title and identifier', () => {
    render(<IssueBoard issues={issues} issuesHref={ISSUES_HREF} />)

    expect(screen.getByText('Fix the auth race condition')).toBeInTheDocument()
    expect(screen.getByText('CONSOLE-13')).toBeInTheDocument()
  })

  it('card, on render, links the identifier to the issue href', () => {
    render(<IssueBoard issues={issues} issuesHref={ISSUES_HREF} />)

    const identifierLinks = screen.getAllByRole('link', {
      name: 'CONSOLE-13',
    })

    expect(identifierLinks[0]).toHaveAttribute(
      'href',
      `${ISSUES_HREF}/CONSOLE-13`
    )
  })

  it('card, on render, links the title to the same issue href', () => {
    render(<IssueBoard issues={issues} issuesHref={ISSUES_HREF} />)

    const titleLink = screen.getByRole('link', {
      name: 'Fix the auth race condition',
    })

    expect(titleLink).toHaveAttribute('href', `${ISSUES_HREF}/CONSOLE-13`)
  })

  it('card, with an assignee, shows the assignee id', () => {
    render(<IssueBoard issues={issues} issuesHref={ISSUES_HREF} />)

    expect(screen.getByText('user_ana')).toBeInTheDocument()
    expect(screen.getByText('user_ben')).toBeInTheDocument()
  })

  it('card, without an assignee, shows no assignee text in its column', () => {
    render(<IssueBoard issues={issues} issuesHref={ISSUES_HREF} />)

    const column = columnFor('Backlog')

    expect(within(column).queryByText(/user_/)).toBeNull()
  })

  it('card, on render, shows the priority text', () => {
    render(<IssueBoard issues={issues} issuesHref={ISSUES_HREF} />)

    expect(screen.getByText('Urgent')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('card, on render, shows the project key badge', () => {
    render(<IssueBoard issues={issues} issuesHref={ISSUES_HREF} />)

    expect(screen.getAllByText('CONSOLE')).toHaveLength(5)
  })

  it('board, with no issues, shows six empty states and keeps every column', () => {
    render(<IssueBoard issues={[]} issuesHref={ISSUES_HREF} />)

    expect(screen.getAllByText('No issues')).toHaveLength(6)
    expect(screen.getByRole('heading', { name: 'Backlog' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Done' })).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
