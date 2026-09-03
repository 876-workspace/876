import type { ToolResult } from './format'
import type {
  Comment,
  Issue,
  IssueEvent,
  Label,
  Project,
  Tenant,
} from '@876/projects/contracts'
import { create876ProjectsOperatorClient } from '@876/projects/operator'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Config } from './config'
import {
  handleIssueComment,
  handleIssueCreate,
  handleIssueEvents,
  handleIssueGet,
  handleIssuesList,
  handleIssueUpdate,
  handleLabelCreate,
  handleLabelsList,
  handleProjectCreate,
  handleProjectGet,
  handleProjectsList,
  handleProjectUpdate,
  handleWorkspaceGet,
} from './handlers'

/** Narrows the SDK's content union to the text block these tools always emit. */
function textOf(result: ToolResult, index = 0): string {
  const block = result.content[index]
  if (!block || block.type !== 'text')
    throw new Error(`expected a text content block at ${index}`)
  return block.text
}

const config: Config = {
  apiUrl: 'http://localhost:4030',
  internalKey: 'test-internal-key',
  organizationId: 'org_test_123',
}

const mockTenant: Tenant = {
  object: 'projects.tenant',
  id: 'tnt_123',
  organizationId: 'org_test_123',
  triageProjectId: 'prj_triage',
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

const mockProject: Project = {
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

const mockIssue: Issue = {
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

const mockComment: Comment = {
  object: 'projects.comment',
  id: 'cmt_123',
  tenantId: 'tnt_123',
  issueId: 'iss_123',
  authorUserId: 'usr_author',
  body: 'This is a test comment',
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

const mockLabel: Label = {
  object: 'projects.label',
  id: 'lbl_123',
  tenantId: 'tnt_123',
  name: 'bug',
  color: '#e11d48',
  description: 'Bug report',
  createdAt: 1788400000,
  updatedAt: 1788400000,
}

const mockEvent: IssueEvent = {
  object: 'projects.issue-event',
  id: 'evt_123',
  issueId: 'iss_123',
  actorUserId: 'usr_actor',
  type: 'status-changed',
  fromValue: 'todo',
  toValue: 'in-progress',
  createdAt: 1788400000,
}

describe('handlers', () => {
  const fetchMock = vi.fn<typeof globalThis.fetch>()
  const client = create876ProjectsOperatorClient({
    baseUrl: 'http://localhost:4030',
    internalKey: 'test-internal-key',
    fetch: fetchMock,
  })

  beforeEach(() => {
    fetchMock.mockReset()
    vi.restoreAllMocks()
  })

  it('issues_list calls the client with the configured organization id (assert exact args)', async () => {
    const listSpy = vi.spyOn(client.issues, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockIssue],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/issues',
      },
      error: null,
    })

    const result = await handleIssuesList(client, config, {
      project: 'CONSOLE',
      status: 'in-progress',
    })

    expect(listSpy).toHaveBeenCalledTimes(1)
    expect(listSpy).toHaveBeenCalledWith('org_test_123', {
      project: 'CONSOLE',
      status: 'in-progress',
    })
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('CONSOLE-12')
  })

  it('issues_list passes updatedSince through as seconds', async () => {
    const listSpy = vi.spyOn(client.issues, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/v1/organizations/org_test_123/issues',
      },
      error: null,
    })

    await handleIssuesList(client, config, {
      updatedSince: 1788400000,
    })

    expect(listSpy).toHaveBeenCalledWith('org_test_123', {
      updatedSince: 1788400000,
    })
  })

  it('issues_list converts an ISO-8601 updatedSince to seconds', async () => {
    const listSpy = vi.spyOn(client.issues, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/v1/organizations/org_test_123/issues',
      },
      error: null,
    })

    const isoDate = '2026-09-03T12:00:00.000Z'
    const expectedSeconds = Math.floor(Date.parse(isoDate) / 1000)

    await handleIssuesList(client, config, {
      updatedSince: isoDate,
    })

    expect(listSpy).toHaveBeenCalledWith('org_test_123', {
      updatedSince: expectedSeconds,
    })
  })

  it('issues_list rejects an unknown argument key without calling the client (not.toHaveBeenCalled())', async () => {
    const listSpy = vi.spyOn(client.issues, 'list')

    const result = await handleIssuesList(client, config, {
      unknownProperty: 'illegal',
    })

    expect(listSpy).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('Error [validation/invalid-arguments]')
  })

  it('issue_get passes an identifier such as CONSOLE-12 through unchanged', async () => {
    const retrieveSpy = vi
      .spyOn(client.issues, 'retrieve')
      .mockResolvedValueOnce({
        data: mockIssue,
        error: null,
      })

    const result = await handleIssueGet(client, config, {
      issue: 'CONSOLE-12',
    })

    expect(retrieveSpy).toHaveBeenCalledTimes(1)
    expect(retrieveSpy).toHaveBeenCalledWith('org_test_123', 'CONSOLE-12')
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('CONSOLE-12: Fix workspace detail 404s')
  })

  it("a client error result becomes isError: true carrying the error's code and message", async () => {
    vi.spyOn(client.issues, 'retrieve').mockResolvedValueOnce({
      data: null,
      error: {
        code: 'projects/issue-not-found',
        message: 'Issue CONSOLE-99 was not found',
      },
    })

    const result = await handleIssueGet(client, config, {
      issue: 'CONSOLE-99',
    })

    expect(result.isError).toBe(true)
    expect(result.content).toHaveLength(1)
    expect(textOf(result)).toBe(
      'Error [projects/issue-not-found]: Issue CONSOLE-99 was not found'
    )
  })

  it('a client error result is not rendered as an empty success', async () => {
    vi.spyOn(client.issues, 'list').mockResolvedValueOnce({
      data: null,
      error: {
        code: 'projects/tenant-not-found',
        message: 'Tenant does not exist',
      },
    })

    const result = await handleIssuesList(client, config, {})

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('projects/tenant-not-found')
    expect(textOf(result)).not.toBe('0 issues found.')
    expect(textOf(result)).not.toBe('')
  })

  it('issue_create defaults the creator to PROJECTS_DEFAULT_USER_ID', async () => {
    const createSpy = vi.spyOn(client.issues, 'create').mockResolvedValueOnce({
      data: mockIssue,
      error: null,
    })

    const configWithDefaultUser: Config = {
      ...config,
      defaultUserId: 'usr_default_agent',
    }

    await handleIssueCreate(client, configWithDefaultUser, {
      title: 'Auto-created task',
      project: 'CONSOLE',
    })

    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(createSpy).toHaveBeenCalledWith('org_test_123', {
      title: 'Auto-created task',
      projectId: 'CONSOLE',
      creatorUserId: 'usr_default_agent',
    })
  })

  it('issue_create omits the creator entirely when that variable is unset', async () => {
    const createSpy = vi.spyOn(client.issues, 'create').mockResolvedValueOnce({
      data: mockIssue,
      error: null,
    })

    const configWithoutUser: Config = {
      ...config,
      defaultUserId: undefined,
    }

    await handleIssueCreate(client, configWithoutUser, {
      title: 'Task without default author',
    })

    expect(createSpy).toHaveBeenCalledTimes(1)
    expect(createSpy).toHaveBeenCalledWith('org_test_123', {
      title: 'Task without default author',
    })
    const callArgs = createSpy.mock.calls[0][1]
    expect(callArgs).not.toHaveProperty('creatorUserId')
  })

  it('issue_comment requires a non-empty body and does not call the client without one', async () => {
    const commentSpy = vi.spyOn(client.comments, 'create')

    const emptyBodyResult = await handleIssueComment(client, config, {
      issue: 'CONSOLE-12',
      body: '',
    })
    expect(commentSpy).not.toHaveBeenCalled()
    expect(emptyBodyResult.isError).toBe(true)
    expect(textOf(emptyBodyResult)).toContain(
      'Error [validation/invalid-arguments]'
    )

    const whitespaceBodyResult = await handleIssueComment(client, config, {
      issue: 'CONSOLE-12',
      body: '   ',
    })
    expect(commentSpy).not.toHaveBeenCalled()
    expect(whitespaceBodyResult.isError).toBe(true)

    const missingBodyResult = await handleIssueComment(client, config, {
      issue: 'CONSOLE-12',
    })
    expect(commentSpy).not.toHaveBeenCalled()
    expect(missingBodyResult.isError).toBe(true)
  })

  it('issue_comment successfully creates comment with default user when configured', async () => {
    const commentSpy = vi
      .spyOn(client.comments, 'create')
      .mockResolvedValueOnce({
        data: mockComment,
        error: null,
      })

    const configWithUser: Config = {
      ...config,
      defaultUserId: 'usr_commenter',
    }

    const result = await handleIssueComment(client, configWithUser, {
      issue: 'CONSOLE-12',
      body: 'This is a test comment',
    })

    expect(commentSpy).toHaveBeenCalledWith('org_test_123', 'CONSOLE-12', {
      body: 'This is a test comment',
      authorUserId: 'usr_commenter',
    })
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('Comment on iss_123')
  })

  it('issue_update updates issue fields', async () => {
    const updateSpy = vi.spyOn(client.issues, 'update').mockResolvedValueOnce({
      data: {
        ...mockIssue,
        status: 'done',
      },
      error: null,
    })

    const result = await handleIssueUpdate(client, config, {
      issue: 'CONSOLE-12',
      status: 'done',
    })

    expect(updateSpy).toHaveBeenCalledWith('org_test_123', 'CONSOLE-12', {
      status: 'done',
    })
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('Status: done')
  })

  it('issue_events lists activity history for an issue', async () => {
    const eventsSpy = vi
      .spyOn(client.issues.events, 'list')
      .mockResolvedValueOnce({
        data: {
          object: 'list',
          data: [mockEvent],
          has_more: false,
          total_count: 1,
          url: '/v1/organizations/org_test_123/issues/CONSOLE-12/events',
        },
        error: null,
      })

    const result = await handleIssueEvents(client, config, {
      issue: 'CONSOLE-12',
    })

    expect(eventsSpy).toHaveBeenCalledWith('org_test_123', 'CONSOLE-12')
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('1 event:')
    expect(textOf(result)).toContain('status-changed')
  })

  it('workspace_get calls tenant retrieve and project list, returning orientation details', async () => {
    vi.spyOn(client.tenants, 'retrieve').mockResolvedValueOnce({
      data: mockTenant,
      error: null,
    })
    vi.spyOn(client.projects, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockProject],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/projects',
      },
      error: null,
    })
    vi.spyOn(client.issues, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: 5,
        url: '/v1/organizations/org_test_123/issues',
      },
      error: null,
    })

    const result = await handleWorkspaceGet(client, config, {})
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('Tenant: org_test_123')
    expect(textOf(result)).toContain('CONSOLE')
    expect(textOf(result)).toContain('open-issues:5')
  })

  it('projects_list calls client.projects.list with query options', async () => {
    const listSpy = vi.spyOn(client.projects, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockProject],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/projects',
      },
      error: null,
    })

    const result = await handleProjectsList(client, config, {
      status: 'active',
      limit: 10,
    })

    expect(listSpy).toHaveBeenCalledWith('org_test_123', {
      status: 'active',
      limit: 10,
    })
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('1 project:')
  })

  it('project_create calls client.projects.create with input', async () => {
    const createSpy = vi
      .spyOn(client.projects, 'create')
      .mockResolvedValueOnce({
        data: mockProject,
        error: null,
      })

    const result = await handleProjectCreate(client, config, {
      name: 'Console',
      key: 'CONSOLE',
      status: 'active',
    })

    expect(createSpy).toHaveBeenCalledWith('org_test_123', {
      name: 'Console',
      key: 'CONSOLE',
      status: 'active',
    })
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('CONSOLE: Console')
  })

  it('project_update resolves key and calls client.projects.update', async () => {
    vi.spyOn(client.projects, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockProject],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/projects',
      },
      error: null,
    })
    const updateSpy = vi
      .spyOn(client.projects, 'update')
      .mockResolvedValueOnce({
        data: {
          ...mockProject,
          health: 'at-risk',
        },
        error: null,
      })

    const result = await handleProjectUpdate(client, config, {
      project: 'CONSOLE',
      health: 'at-risk',
    })

    expect(updateSpy).toHaveBeenCalledWith('org_test_123', 'prj_console', {
      health: 'at-risk',
    })
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('Health: at-risk')
  })

  it('project_get resolves project key via projects.list before calling retrieve', async () => {
    const listSpy = vi.spyOn(client.projects, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockProject],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/projects',
      },
      error: null,
    })
    const retrieveSpy = vi
      .spyOn(client.projects, 'retrieve')
      .mockResolvedValueOnce({
        data: mockProject,
        error: null,
      })

    const result = await handleProjectGet(client, config, {
      project: 'CONSOLE',
    })
    expect(listSpy).toHaveBeenCalledWith('org_test_123', {
      limit: 100,
      includeArchived: true,
    })
    expect(retrieveSpy).toHaveBeenCalledWith('org_test_123', 'prj_console')
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('CONSOLE: Console')
  })

  it('project_get passes prj_ id directly to projects.retrieve without listing', async () => {
    const listSpy = vi.spyOn(client.projects, 'list')
    const retrieveSpy = vi
      .spyOn(client.projects, 'retrieve')
      .mockResolvedValueOnce({
        data: mockProject,
        error: null,
      })

    const result = await handleProjectGet(client, config, {
      project: 'prj_console',
    })
    expect(listSpy).not.toHaveBeenCalled()
    expect(retrieveSpy).toHaveBeenCalledWith('org_test_123', 'prj_console')
    expect(result.isError).toBeUndefined()
  })

  it('labels_list calls client.labels.list and formats output', async () => {
    vi.spyOn(client.labels, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockLabel],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/labels',
      },
      error: null,
    })

    const result = await handleLabelsList(client, config, {})
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('1 label:')
    expect(textOf(result)).toContain('bug')
    expect(textOf(result)).toContain('#e11d48')
  })

  it('label_create calls client.labels.create with provided input', async () => {
    const createSpy = vi.spyOn(client.labels, 'create').mockResolvedValueOnce({
      data: mockLabel,
      error: null,
    })

    const result = await handleLabelCreate(client, config, {
      name: 'bug',
      color: '#e11d48',
      description: 'Bug report',
    })

    expect(createSpy).toHaveBeenCalledWith('org_test_123', {
      name: 'bug',
      color: '#e11d48',
      description: 'Bug report',
    })
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('Label: bug (#e11d48)')
  })
})
