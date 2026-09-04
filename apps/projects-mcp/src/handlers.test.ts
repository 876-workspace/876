import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Config } from './config'
import {
  config,
  createClient,
  mockComment,
  mockEvent,
  mockIssue,
  mockLabel,
  mockProject,
  mockTenant,
  textOf,
} from './handlers.test-fixtures'
import {
  handleIssueComment,
  handleIssueComments,
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

describe('handlers', () => {
  const { client, fetchMock } = createClient()

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
      includeComments: false,
    })

    expect(retrieveSpy).toHaveBeenCalledTimes(1)
    expect(retrieveSpy).toHaveBeenCalledWith('org_test_123', 'CONSOLE-12')
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('CONSOLE-12: Fix workspace detail 404s')
  })

  it('issue_get includes the comment thread by default', async () => {
    vi.spyOn(client.issues, 'retrieve').mockResolvedValueOnce({
      data: mockIssue,
      error: null,
    })
    const listSpy = vi.spyOn(client.comments, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockComment],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/issues/CONSOLE-12/comments',
      },
      error: null,
    })

    const result = await handleIssueGet(client, config, {
      issue: 'CONSOLE-12',
    })

    expect(listSpy).toHaveBeenCalledWith('org_test_123', 'CONSOLE-12')
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('CONSOLE-12: Fix workspace detail 404s')
    expect(textOf(result)).toContain('This is a test comment')
  })

  it('issue_get with includeComments skips the comments client entirely', async () => {
    vi.spyOn(client.issues, 'retrieve').mockResolvedValueOnce({
      data: mockIssue,
      error: null,
    })
    const listSpy = vi.spyOn(client.comments, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/v1/organizations/org_test_123/issues/CONSOLE-12/comments',
      },
      error: null,
    })

    const result = await handleIssueGet(client, config, {
      issue: 'CONSOLE-12',
      includeComments: false,
    })

    expect(listSpy).not.toHaveBeenCalled()
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('Comments: 1')
    expect(textOf(result)).not.toContain('This is a test comment')
  })

  it('issue_get surfaces a comments failure instead of partial issue text', async () => {
    vi.spyOn(client.issues, 'retrieve').mockResolvedValueOnce({
      data: mockIssue,
      error: null,
    })
    vi.spyOn(client.comments, 'list').mockResolvedValueOnce({
      data: null,
      error: { code: 'projects/issue-not-found', message: 'Gone.' },
    })

    const result = await handleIssueGet(client, config, {
      issue: 'CONSOLE-12',
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('projects/issue-not-found')
  })

  it('issue_get still reports the issue error before touching comments', async () => {
    const retrieveSpy = vi
      .spyOn(client.issues, 'retrieve')
      .mockResolvedValueOnce({
        data: null,
        error: { code: 'projects/issue-not-found', message: 'Gone.' },
      })
    const listSpy = vi.spyOn(client.comments, 'list')

    const result = await handleIssueGet(client, config, {
      issue: 'CONSOLE-12',
    })

    expect(retrieveSpy).toHaveBeenCalledTimes(1)
    expect(listSpy).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
  })

  it('issue_comments rejects a missing issue without calling the client', async () => {
    const listSpy = vi.spyOn(client.comments, 'list')

    const result = await handleIssueComments(client, config, {})

    expect(listSpy).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('validation/invalid-arguments')
  })

  it('issue_comments rejects a limit of zero without calling the client', async () => {
    const listSpy = vi.spyOn(client.comments, 'list')

    const result = await handleIssueComments(client, config, {
      issue: 'CONSOLE-12',
      limit: 0,
    })

    expect(listSpy).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
  })

  it('issue_comments rejects a limit above 100 without calling the client', async () => {
    const listSpy = vi.spyOn(client.comments, 'list')

    const result = await handleIssueComments(client, config, {
      issue: 'CONSOLE-12',
      limit: 101,
    })

    expect(listSpy).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
  })

  it('issue_comments rejects unknown keys without calling the client', async () => {
    const listSpy = vi.spyOn(client.comments, 'list')

    const result = await handleIssueComments(client, config, {
      issue: 'CONSOLE-12',
      since: '2026-01-01',
    })

    expect(listSpy).not.toHaveBeenCalled()
    expect(result.isError).toBe(true)
  })

  it('issue_comments renders an empty thread as zero comments', async () => {
    vi.spyOn(client.comments, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: 0,
        url: '/v1/organizations/org_test_123/issues/CONSOLE-12/comments',
      },
      error: null,
    })

    const result = await handleIssueComments(client, config, {
      issue: 'CONSOLE-12',
    })

    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('0 comments recorded.')
  })

  it('issue_comments preserves oldest-first order across the thread', async () => {
    const older = { ...mockComment, id: 'cmt_old', body: 'First thought' }
    const newer = { ...mockComment, id: 'cmt_new', body: 'Second thought' }
    vi.spyOn(client.comments, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [older, newer],
        has_more: false,
        total_count: 2,
        url: '/v1/organizations/org_test_123/issues/CONSOLE-12/comments',
      },
      error: null,
    })

    const result = await handleIssueComments(client, config, {
      issue: 'CONSOLE-12',
    })

    const text = textOf(result)
    expect(text.indexOf('First thought')).toBeLessThan(
      text.indexOf('Second thought')
    )
  })

  it('issue_comments omits the limit param when the caller passes none', async () => {
    const listSpy = vi.spyOn(client.comments, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockComment],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/issues/CONSOLE-12/comments',
      },
      error: null,
    })

    await handleIssueComments(client, config, { issue: 'CONSOLE-12' })

    expect(listSpy).toHaveBeenCalledWith('org_test_123', 'CONSOLE-12', {})
  })

  it('issue_comments passes an explicit limit through to the client', async () => {
    const listSpy = vi.spyOn(client.comments, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockComment],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_123/issues/CONSOLE-12/comments',
      },
      error: null,
    })

    const result = await handleIssueComments(client, config, {
      issue: 'CONSOLE-12',
      limit: 20,
    })

    expect(listSpy).toHaveBeenCalledWith('org_test_123', 'CONSOLE-12', {
      limit: 20,
    })
    expect(result.isError).toBeUndefined()
    expect(textOf(result)).toContain('This is a test comment')
  })

  it('issue_comments surfaces a client error with its code', async () => {
    vi.spyOn(client.comments, 'list').mockResolvedValueOnce({
      data: null,
      error: { code: 'projects/issue-not-found', message: 'Gone.' },
    })

    const result = await handleIssueComments(client, config, {
      issue: 'CONSOLE-12',
    })

    expect(result.isError).toBe(true)
    expect(textOf(result)).toContain('projects/issue-not-found')
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
