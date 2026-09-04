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
  mockWorkflowState,
  mockWorkItemType,
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

  it('issues_list forwards tenant-configured workflow-state keys', async () => {
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
      status: 'ready-for-qa',
    })

    expect(listSpy).toHaveBeenCalledWith('org_test_123', {
      project: 'CONSOLE',
      status: 'ready-for-qa',
    })
    expect(result.isError).toBeUndefined()
  })

  it('issues_list converts ISO updatedSince to seconds and rejects unknown keys', async () => {
    const listSpy = vi.spyOn(client.issues, 'list').mockResolvedValue({
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

    await handleIssuesList(client, config, { updatedSince: isoDate })
    expect(listSpy).toHaveBeenCalledWith('org_test_123', {
      updatedSince: Math.floor(Date.parse(isoDate) / 1000),
    })

    listSpy.mockClear()
    const invalid = await handleIssuesList(client, config, { nope: true })
    expect(listSpy).not.toHaveBeenCalled()
    expect(invalid.isError).toBe(true)
  })

  it('issue_get includes comments by default and can skip them', async () => {
    const retrieveSpy = vi.spyOn(client.issues, 'retrieve').mockResolvedValue({
      data: mockIssue,
      error: null,
    })
    const commentsSpy = vi.spyOn(client.comments, 'list').mockResolvedValue({
      data: {
        object: 'list',
        data: [mockComment],
        has_more: false,
        total_count: 1,
        url: '/comments',
      },
      error: null,
    })

    const withComments = await handleIssueGet(client, config, {
      issue: 'CONSOLE-12',
    })
    expect(retrieveSpy).toHaveBeenCalledWith('org_test_123', 'CONSOLE-12')
    expect(textOf(withComments)).toContain('This is a test comment')

    commentsSpy.mockClear()
    const withoutComments = await handleIssueGet(client, config, {
      issue: 'CONSOLE-12',
      includeComments: false,
    })
    expect(commentsSpy).not.toHaveBeenCalled()
    expect(textOf(withoutComments)).toContain('CONSOLE-12')
  })

  it('issue_create forwards configured type, milestone, custom fields and creator', async () => {
    const createSpy = vi.spyOn(client.issues, 'create').mockResolvedValueOnce({
      data: mockIssue,
      error: null,
    })
    const configWithDefaultUser: Config = {
      ...config,
      defaultUserId: 'usr_default_agent',
    }

    await handleIssueCreate(client, configWithDefaultUser, {
      title: 'Configurable issue',
      project: 'CONSOLE',
      status: 'ready-for-qa',
      typeKey: 'task',
      milestoneId: 'ms_v1',
      customFields: [{ fieldId: 'cf_severity', value: 'high' }],
    })

    expect(createSpy).toHaveBeenCalledWith('org_test_123', {
      title: 'Configurable issue',
      projectId: 'CONSOLE',
      status: 'ready-for-qa',
      typeKey: 'task',
      milestoneId: 'ms_v1',
      customFields: [{ fieldId: 'cf_severity', value: 'high' }],
      creatorUserId: 'usr_default_agent',
    })
  })

  it('issue_update forwards configured structure changes', async () => {
    const updated = {
      ...mockIssue,
      status: 'ready-for-qa',
      state: {
        ...mockWorkflowState,
        key: 'ready-for-qa',
        name: 'Ready for QA',
        category: 'started',
      },
    }
    const updateSpy = vi.spyOn(client.issues, 'update').mockResolvedValueOnce({
      data: updated,
      error: null,
    })

    await handleIssueUpdate(client, config, {
      issue: 'CONSOLE-12',
      status: 'ready-for-qa',
      typeKey: 'task',
      milestoneId: null,
      customFields: [{ fieldId: 'cf_severity', value: 'high' }],
    })

    expect(updateSpy).toHaveBeenCalledWith('org_test_123', 'CONSOLE-12', {
      status: 'ready-for-qa',
      typeKey: 'task',
      milestoneId: null,
      customFields: [{ fieldId: 'cf_severity', value: 'high' }],
    })
  })

  it('issue_comment requires a default user so created comments remain owned', async () => {
    const commentSpy = vi.spyOn(client.comments, 'create')
    const missingAuthor = await handleIssueComment(client, config, {
      issue: 'CONSOLE-12',
      body: 'A comment',
    })
    expect(commentSpy).not.toHaveBeenCalled()
    expect(missingAuthor.isError).toBe(true)
    expect(textOf(missingAuthor)).toContain('projects/comment-author-required')

    commentSpy.mockResolvedValueOnce({ data: mockComment, error: null })
    const withUser: Config = { ...config, defaultUserId: 'usr_commenter' }
    const result = await handleIssueComment(client, withUser, {
      issue: 'CONSOLE-12',
      body: 'A comment',
    })
    expect(commentSpy).toHaveBeenCalledWith('org_test_123', 'CONSOLE-12', {
      body: 'A comment',
      authorUserId: 'usr_commenter',
    })
    expect(result.isError).toBeUndefined()
  })

  it('issue_comments preserves thread order and validates limits', async () => {
    const older = { ...mockComment, id: 'cmt_old', body: 'First thought' }
    const newer = { ...mockComment, id: 'cmt_new', body: 'Second thought' }
    const listSpy = vi.spyOn(client.comments, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [older, newer],
        has_more: false,
        total_count: 2,
        url: '/comments',
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
    const text = textOf(result)
    expect(text.indexOf('First thought')).toBeLessThan(
      text.indexOf('Second thought')
    )

    listSpy.mockClear()
    const invalid = await handleIssueComments(client, config, {
      issue: 'CONSOLE-12',
      limit: 101,
    })
    expect(listSpy).not.toHaveBeenCalled()
    expect(invalid.isError).toBe(true)
  })

  it('workspace_get derives open issue filters from configured state categories', async () => {
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
        url: '/projects',
      },
      error: null,
    })
    vi.spyOn(client.workflowStates, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [
          mockWorkflowState,
          {
            ...mockWorkflowState,
            id: 'wfs_qa',
            key: 'ready-for-qa',
            name: 'Ready for QA',
            category: 'started',
            isDefault: false,
          },
          {
            ...mockWorkflowState,
            id: 'wfs_done',
            key: 'shipped',
            name: 'Shipped',
            category: 'completed',
            isDefault: false,
          },
        ],
        has_more: false,
        total_count: 3,
        url: '/workflow-states',
      },
      error: null,
    })
    const issueListSpy = vi.spyOn(client.issues, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [],
        has_more: false,
        total_count: 5,
        url: '/issues',
      },
      error: null,
    })

    const result = await handleWorkspaceGet(client, config, {})
    expect(issueListSpy).toHaveBeenCalledWith('org_test_123', {
      project: 'prj_console',
      status: ['todo', 'ready-for-qa'],
      limit: 1,
    })
    expect(textOf(result)).toContain('open-issues:5')
  })

  it('project_create and project_update forward project default work item type', async () => {
    const createSpy = vi.spyOn(client.projects, 'create').mockResolvedValueOnce({
      data: mockProject,
      error: null,
    })
    await handleProjectCreate(client, config, {
      name: 'Console',
      defaultWorkItemTypeId: mockWorkItemType.id,
    })
    expect(createSpy).toHaveBeenCalledWith('org_test_123', {
      name: 'Console',
      defaultWorkItemTypeId: mockWorkItemType.id,
    })

    const listSpy = vi.spyOn(client.projects, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockProject],
        has_more: false,
        total_count: 1,
        url: '/projects',
      },
      error: null,
    })
    const updateSpy = vi.spyOn(client.projects, 'update').mockResolvedValueOnce({
      data: { ...mockProject, defaultWorkItemTypeId: null },
      error: null,
    })
    await handleProjectUpdate(client, config, {
      project: 'CONSOLE',
      defaultWorkItemTypeId: null,
    })
    expect(listSpy).toHaveBeenCalled()
    expect(updateSpy).toHaveBeenCalledWith('org_test_123', 'prj_console', {
      defaultWorkItemTypeId: null,
    })
  })

  it('project_get resolves a project key before retrieval', async () => {
    vi.spyOn(client.projects, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockProject],
        has_more: false,
        total_count: 1,
        url: '/projects',
      },
      error: null,
    })
    const retrieveSpy = vi
      .spyOn(client.projects, 'retrieve')
      .mockResolvedValueOnce({ data: mockProject, error: null })

    const result = await handleProjectGet(client, config, { project: 'CONSOLE' })
    expect(retrieveSpy).toHaveBeenCalledWith('org_test_123', 'prj_console')
    expect(result.isError).toBeUndefined()
  })

  it('projects_list forwards project filters', async () => {
    const listSpy = vi.spyOn(client.projects, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockProject],
        has_more: false,
        total_count: 1,
        url: '/projects',
      },
      error: null,
    })
    await handleProjectsList(client, config, { status: 'active', limit: 10 })
    expect(listSpy).toHaveBeenCalledWith('org_test_123', {
      status: 'active',
      limit: 10,
    })
  })

  it('labels and events handlers forward to their owning resources', async () => {
    vi.spyOn(client.labels, 'list').mockResolvedValueOnce({
      data: {
        object: 'list',
        data: [mockLabel],
        has_more: false,
        total_count: 1,
        url: '/labels',
      },
      error: null,
    })
    const labelsResult = await handleLabelsList(client, config, {})
    expect(textOf(labelsResult)).toContain('bug')

    const labelCreateSpy = vi
      .spyOn(client.labels, 'create')
      .mockResolvedValueOnce({ data: mockLabel, error: null })
    await handleLabelCreate(client, config, {
      name: 'bug',
      color: '#e11d48',
    })
    expect(labelCreateSpy).toHaveBeenCalled()

    const eventsSpy = vi
      .spyOn(client.issues.events, 'list')
      .mockResolvedValueOnce({
        data: {
          object: 'list',
          data: [mockEvent],
          has_more: false,
          total_count: 1,
          url: '/events',
        },
        error: null,
      })
    await handleIssueEvents(client, config, { issue: 'CONSOLE-12' })
    expect(eventsSpy).toHaveBeenCalledWith('org_test_123', 'CONSOLE-12')
  })
})
