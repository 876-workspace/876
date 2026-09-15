import '@testing-library/jest-dom/vitest'
import { render, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { Issue } from '@876/projects/contracts'

import { IssueBoard } from './issue-board'

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

const mockIssues: Issue[] = [
  {
    object: 'projects.issue',
    id: 'issue_1',
    tenantId: 'tenant_1',
    projectId: 'proj_1',
    projectKey: 'ALP',
    number: 1,
    identifier: 'ALP-1',
    title: 'Backlog item',
    description: null,
    status: 'backlog',
    typeKey: 'task',
    type: sampleType,
    state: null,
    milestone: null,
    customFields: [],
    priority: 'low',
    assigneeUserId: null,
    creatorUserId: 'user_1',
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
    id: 'issue_2',
    tenantId: 'tenant_1',
    projectId: 'proj_1',
    projectKey: 'ALP',
    number: 2,
    identifier: 'ALP-2',
    title: 'In progress item',
    description: null,
    status: 'in-progress',
    typeKey: 'task',
    type: sampleType,
    state: null,
    milestone: null,
    customFields: [],
    priority: 'urgent',
    assigneeUserId: 'user_dev',
    creatorUserId: 'user_1',
    parentIssueId: null,
    taskListId: null,
    cycleId: null,
    plannedStartDate: null,
    plannedFinishDate: null,
    plannedDurationMinutes: null,
    blocked: false,
    relationCount: 0,
    dependencyCount: 0,
    estimate: 5,
    dueDate: null,
    position: 2,
    labels: [],
    commentCount: 1,
    subIssueCount: 0,
    startedAt: 1700000000,
    completedAt: null,
    canceledAt: null,
    createdAt: 1700000000,
    updatedAt: 1700000000,
  },
]

describe('IssueBoard', () => {
  it('renders all 6 status columns and places issues in the correct columns', () => {
    const { container } = render(
      <IssueBoard
        issues={mockIssues}
        issuesHref="/orgs/test-org/workspace/projects/issues"
      />
    )
    const board = within(container.querySelector('.sm\\:grid') as HTMLElement)

    expect(board.getByText('Backlog')).toBeInTheDocument()
    expect(board.getByText('Todo')).toBeInTheDocument()
    expect(board.getByText('In Progress')).toBeInTheDocument()
    expect(board.getByText('In Review')).toBeInTheDocument()
    expect(board.getByText('Done')).toBeInTheDocument()
    expect(board.getByText('Canceled')).toBeInTheDocument()

    expect(board.getByText('ALP-1')).toBeInTheDocument()
    expect(board.getByText('Backlog item')).toBeInTheDocument()
    expect(board.getByText('ALP-2')).toBeInTheDocument()
    expect(board.getByText('In progress item')).toBeInTheDocument()
    expect(board.getByText('Urgent')).toBeInTheDocument()
  })
})
