import type { Issue, IssueList, Project } from '@876/projects/contracts'
import { describe, expect, it } from 'vitest'

import {
  formatDate,
  formatIssue,
  formatIssueLine,
  formatIssueList,
  formatProject,
  toolError,
  type ToolResult,
} from './format'

/** Narrows the SDK's content union to the text block these tools always emit. */
function textOf(result: ToolResult, index = 0): string {
  const block = result.content[index]
  if (!block || block.type !== 'text')
    throw new Error(`expected a text content block at ${index}`)
  return block.text
}

const sampleType = {
  object: 'projects.work-item-type' as const,
  id: 'wit_task',
  tenantId: 'tnt_123',
  key: 'task',
  name: 'Task',
  iconKey: 'circle-check',
  color: '#3b82f6',
  hierarchyLevel: 1,
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

const sampleState = {
  object: 'projects.workflow-state' as const,
  id: 'wfs_progress',
  tenantId: 'tnt_123',
  key: 'in-progress',
  name: 'In Progress',
  category: 'started',
  color: '#3b82f6',
  description: null,
  isDefault: false,
  position: 2,
  archivedAt: null,
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

const sampleIssue: Issue = {
  object: 'projects.issue',
  id: 'iss_123',
  tenantId: 'tnt_123',
  projectId: 'prj_123',
  projectKey: 'CONSOLE',
  number: 12,
  identifier: 'CONSOLE-12',
  title: 'Fix workspace detail 404s',
  description: 'Detailed description here',
  status: 'in-progress',
  typeKey: 'task',
  type: sampleType,
  state: sampleState,
  milestone: null,
  taskListId: null,
  cycleId: null,
  customFields: [],
  priority: 'high',
  assigneeUserId: 'user_2kL9',
  creatorUserId: 'user_creator',
  parentIssueId: null,
  estimate: 3,
  dueDate: 1788480000,
  plannedStartDate: null,
  plannedFinishDate: null,
  plannedDurationMinutes: null,
  blocked: false,
  relationCount: 0,
  dependencyCount: 0,
  position: 1,
  labels: [
    {
      object: 'projects.label',
      id: 'lbl_1',
      tenantId: 'tnt_123',
      name: 'bug',
      color: '#e11d48',
      description: null,
      createdAt: 1788400000,
      updatedAt: 1788400000,
    },
  ],
  commentCount: 4,
  subIssueCount: 0,
  startedAt: 1788400000,
  completedAt: null,
  canceledAt: null,
  createdAt: 1788400000,
  updatedAt: 1788450000,
}

describe('format', () => {
  it('an issue line contains the identifier, status, priority and title', () => {
    const line = formatIssueLine(sampleIssue)
    expect(line).toContain('CONSOLE-12')
    expect(line).toContain('in-progress')
    expect(line).toContain('high')
    expect(line).toContain('Fix workspace detail 404s')
    expect(line).toContain('@user_2kL9')
    expect(line).toContain('#bug')
  })

  it('a list with has_more: true says more results are available', () => {
    const issueList: IssueList = {
      object: 'list',
      data: [sampleIssue],
      has_more: true,
      total_count: 42,
      url: '/v1/organizations/org_test/issues',
    }
    const output = formatIssueList(issueList)
    expect(output).toContain(
      '1 issue (more available — raise limit or narrow the filter):'
    )
    expect(output).toContain('CONSOLE-12')
  })

  it('a null/absent field is omitted rather than printed as null', () => {
    const minimalIssue: Issue = {
      object: 'projects.issue',
      id: 'iss_min',
      tenantId: 'tnt_123',
      projectId: 'prj_123',
      projectKey: 'CONSOLE',
      number: 1,
      identifier: 'CONSOLE-1',
      title: 'Minimal issue',
      description: null,
      status: 'ready-for-qa',
      typeKey: 'task',
      type: sampleType,
      state: {
        ...sampleState,
        id: 'wfs_ready',
        key: 'ready-for-qa',
        name: 'Ready for QA',
      },
      milestone: null,
      taskListId: null,
      cycleId: null,
      customFields: [],
      priority: 'none',
      assigneeUserId: null,
      creatorUserId: null,
      parentIssueId: null,
      estimate: null,
      dueDate: null,
      plannedStartDate: null,
      plannedFinishDate: null,
      plannedDurationMinutes: null,
      blocked: false,
      relationCount: 0,
      dependencyCount: 0,
      position: 0,
      labels: [],
      commentCount: 0,
      subIssueCount: 0,
      startedAt: null,
      completedAt: null,
      canceledAt: null,
      createdAt: 1788400000,
      updatedAt: 1788400000,
    }

    const output = formatIssue(minimalIssue)
    expect(output).not.toContain('null')
    expect(output).not.toContain('Assignee:')
    expect(output).not.toContain('Creator:')
    expect(output).not.toContain('Parent:')
    expect(output).not.toContain('Estimate:')
    expect(output).not.toContain('Due Date:')
    expect(output).not.toContain('Description:')
    expect(output).toContain('CONSOLE-1: Minimal issue')
    expect(output).toContain('Status: ready-for-qa')
    expect(output).toContain('Priority: none')
    expect(output).toContain('Comments: 0')
  })

  it('a Unix-seconds timestamp renders as an ISO date', () => {
    const isoDate = formatDate(1788480000)
    expect(isoDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(isoDate).toBe('2026-09-04')

    const issueOutput = formatIssue(sampleIssue)
    expect(issueOutput).toContain('Due Date: 2026-09-04')
    expect(issueOutput).not.toContain('1788480000')
  })

  it('toolError produces isError: true carrying code and message', () => {
    const result = toolError(
      'projects/issue-not-found',
      'Issue CONSOLE-99 was not found'
    )
    expect(result.isError).toBe(true)
    expect(result.content).toHaveLength(1)
    expect(textOf(result)).toBe(
      'Error [projects/issue-not-found]: Issue CONSOLE-99 was not found'
    )
  })

  it('formatProject omits null fields and renders dates as ISO dates', () => {
    const project: Project = {
      object: 'projects.project',
      id: 'prj_1',
      tenantId: 'tnt_1',
      name: 'Console App',
      key: 'CONSOLE',
      slug: 'console-app',
      description: null,
      leadUserId: null,
      status: 'active',
      health: 'on-track',
      startDate: null,
      targetDate: 1788480000,
      nextIssueNumber: 13,
      customerId: null,
      defaultWorkItemTypeId: 'wit_task',
      position: 0,
      archivedAt: null,
      createdAt: 1788400000,
      updatedAt: 1788400000,
      memberCount: 5,
      customFields: [],
    }

    const output = formatProject(project)
    expect(output).not.toContain('null')
    expect(output).not.toContain('Lead:')
    expect(output).not.toContain('Start Date:')
    expect(output).toContain('CONSOLE: Console App')
    expect(output).toContain('Status: active')
    expect(output).toContain('Health: on-track')
    expect(output).toContain('Target Date: 2026-09-04')
    expect(output).toContain('Members: 5')
    expect(output).toContain('Next Issue Number: 13')
  })
})
