import type { ToolResult } from './format'
import type {
  Comment,
  Issue,
  IssueEvent,
  Label,
  Milestone,
  Project,
  Tenant,
  WorkflowState,
  WorkItemType,
} from '@876/projects/contracts'
import { create876ProjectsOperatorClient } from '@876/projects/operator'
import { vi } from 'vitest'

import type { Config } from './config'

export const config: Config = {
  apiUrl: 'http://localhost:4030',
  internalKey: 'test-internal-key',
  organizationId: 'org_test_123',
}

export function createClient() {
  const fetchMock = vi.fn<typeof globalThis.fetch>()
  const client = create876ProjectsOperatorClient({
    baseUrl: 'http://localhost:4030',
    internalKey: 'test-internal-key',
    fetch: fetchMock,
  })

  return { client, fetchMock }
}

export function textOf(result: ToolResult, index = 0): string {
  const block = result.content[index]
  if (!block || block.type !== 'text')
    throw new Error(`expected a text content block at ${index}`)
  return block.text
}

export const mockTenant: Tenant = {
  object: 'projects.tenant',
  id: 'tnt_123',
  organizationId: 'org_test_123',
  triageProjectId: 'prj_triage',
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

export const mockProject: Project = {
  object: 'projects.project',
  id: 'prj_console',
  tenantId: 'tnt_123',
  name: 'Console',
  key: 'CONSOLE',
  slug: 'console',
  description: 'Console product',
  leadUserId: 'usr_lead',
  status: 'active',
  health: 'on-track',
  startDate: 1788400000,
  targetDate: 1788500000,
  nextIssueNumber: 2,
  customerId: null,
  position: 0,
  archivedAt: null,
  createdAt: 1788400000,
  updatedAt: 1788400000,
  memberCount: 3,
}

export const mockIssue: Issue = {
  object: 'projects.issue',
  id: 'iss_123',
  tenantId: 'tnt_123',
  projectId: 'prj_console',
  projectKey: 'CONSOLE',
  number: 12,
  identifier: 'CONSOLE-12',
  title: 'Fix workspace detail 404s',
  description: 'Test description',
  status: 'in-progress',
  priority: 'high',
  assigneeUserId: 'usr_assignee',
  creatorUserId: 'usr_creator',
  parentIssueId: null,
  estimate: 2,
  dueDate: 1788500000,
  position: 0,
  labels: [],
  commentCount: 1,
  subIssueCount: 0,
  startedAt: 1788400000,
  completedAt: null,
  canceledAt: null,
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

export const mockComment: Comment = {
  object: 'projects.comment',
  id: 'cmt_123',
  tenantId: 'tnt_123',
  issueId: 'iss_123',
  authorUserId: 'usr_author',
  body: 'This is a test comment',
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

export const mockLabel: Label = {
  object: 'projects.label',
  id: 'lbl_123',
  tenantId: 'tnt_123',
  name: 'bug',
  color: '#e11d48',
  description: 'Bug report',
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

export const mockWorkItemType: WorkItemType = {
  object: 'projects.work-item-type',
  id: 'wit_task',
  tenantId: 'tnt_123',
  key: 'task',
  name: 'Task',
  iconKey: 'check-square',
  color: '#2563eb',
  hierarchyLevel: 1,
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

export const mockWorkflowState: WorkflowState = {
  object: 'projects.workflow-state',
  id: 'wfs_todo',
  tenantId: 'tnt_123',
  key: 'todo',
  name: 'To do',
  category: 'unstarted',
  color: '#64748b',
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

export const mockMilestone: Milestone = {
  object: 'projects.milestone',
  id: 'ms_v1',
  tenantId: 'tnt_123',
  projectId: 'prj_console',
  key: 'v1',
  name: 'Version 1',
  description: null,
  status: 'open',
  startDate: null,
  targetDate: 1788500000,
  completedAt: null,
  position: 0,
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

export const mockEvent: IssueEvent = {
  object: 'projects.issue-event',
  id: 'evt_123',
  issueId: 'iss_123',
  actorUserId: 'usr_actor',
  type: 'status-changed',
  fromValue: 'todo',
  toValue: 'in-progress',
  createdAt: 1788400000,
}
