import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876ProjectsClient } from '../client'
import type { Issue, IssueEvent } from '../types'

const sampleType = {
  object: 'projects.work-item-type' as const,
  id: 'wit_task_1',
  tenantId: 'ten_1',
  key: 'task',
  name: 'Task',
  iconKey: 'circle-check',
  color: '#3b82f6',
  hierarchyLevel: 1,
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: 1680000000,
  updatedAt: 1680000000,
}

const sampleState = {
  object: 'projects.workflow-state' as const,
  id: 'wfs_todo_1',
  tenantId: 'ten_1',
  key: 'todo',
  name: 'Todo',
  category: 'unstarted',
  color: '#64748b',
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: 1680000000,
  updatedAt: 1680000000,
}

const sampleIssue: Issue = {
  object: 'projects.issue',
  id: 'iss_1',
  tenantId: 'ten_1',
  projectId: 'prj_1',
  projectKey: 'CONSOLE',
  number: 12,
  identifier: 'CONSOLE-12',
  title: 'Test issue',
  description: 'Issue description',
  status: 'todo',
  typeKey: 'task',
  type: sampleType,
  state: sampleState,
  milestone: null,
  taskListId: null,
  cycleId: null,
  customFields: [],
  priority: 'high',
  assigneeUserId: 'usr_1',
  creatorUserId: 'usr_2',
  parentIssueId: null,
  estimate: 3,
  dueDate: 1700000000,
  position: 100,
  labels: [],
  commentCount: 0,
  subIssueCount: 0,
  startedAt: null,
  completedAt: null,
  canceledAt: null,
  createdAt: 1690000000,
  updatedAt: 1690000000,
}

const sampleEvent: IssueEvent = {
  object: 'projects.issue-event',
  id: 'evt_1',
  issueId: 'iss_1',
  actorUserId: 'usr_1',
  type: 'created',
  fromValue: null,
  toValue: 'CONSOLE-12',
  createdAt: 1690000000,
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data, error: null }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

function errorResponse(code: string, message: string, status = 404) {
  return new Response(
    JSON.stringify({ data: null, error: { code, message } }),
    {
      status,
      headers: { 'content-type': 'application/json' },
    }
  )
}

describe('resources — issues', () => {
  const fetch = vi.fn<typeof globalThis.fetch>()
  const client = create876ProjectsClient({
    baseUrl: 'http://projects.test',
    internalKey: 'test-key',
    fetch,
  })

  beforeEach(() => {
    fetch.mockReset()
  })

  it('list builds /v1/organizations/:org/issues with the org id encoded', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        object: 'list',
        data: [sampleIssue],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org%20special%2F1/issues',
      })
    )

    const result = await client.issues.list('org special/1')
    expect(result.data).toEqual({
      object: 'list',
      data: [sampleIssue],
      has_more: false,
      total_count: 1,
      url: '/v1/organizations/org%20special%2F1/issues',
    })
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org%20special%2F1/issues',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })

  it('list maps updatedSince → updated_since and startingAfter → starting_after', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        object: 'list',
        data: [sampleIssue],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/issues',
      })
    )

    const result = await client.issues.list('org_1', {
      updatedSince: 1700000000,
      startingAfter: 'iss_start_1',
    })
    expect(result.data?.object).toBe('list')
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/issues?updated_since=1700000000&starting_after=iss_start_1',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })

  it('list serializes configured status keys without a fixed enum', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        object: 'list',
        data: [sampleIssue],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/issues',
      })
    )

    const result = await client.issues.list('org_1', {
      status: ['todo', 'ready-for-qa'],
    })
    expect(result.data?.object).toBe('list')
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/issues?status=todo,ready-for-qa',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })

  it('list omits undefined parameters entirely', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        object: 'list',
        data: [sampleIssue],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/issues',
      })
    )

    const result = await client.issues.list('org_1', {
      project: 'prj_1',
      assignee: undefined,
      status: undefined,
      q: undefined,
      limit: 25,
    })
    expect(result.data?.object).toBe('list')
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/issues?project=prj_1&limit=25',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })

  it('retrieve preserves enriched work-structure fields', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleIssue))

    const result = await client.issues.retrieve('org_1', 'CONSOLE-12')
    expect(result.data).toEqual(sampleIssue)
    expect(result.data?.typeKey).toBe('task')
    expect(result.data?.type?.id).toBe('wit_task_1')
    expect(result.data?.state?.key).toBe('todo')
    expect(result.data?.customFields).toEqual([])
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/issues/CONSOLE-12',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )

    fetch.mockResolvedValueOnce(jsonResponse(sampleIssue))
    const encodedResult = await client.issues.retrieve('org_1', 'CONSOLE/12')
    expect(encodedResult.data).toEqual(sampleIssue)
    expect(encodedResult.error).toBeNull()
  })

  it('accepts tenant-defined workflow-state keys in issue responses', async () => {
    const customState = {
      ...sampleState,
      id: 'wfs_ready_1',
      key: 'ready-for-qa',
      name: 'Ready for QA',
      category: 'started',
      isDefault: false,
    }
    const customStatusIssue = {
      ...sampleIssue,
      status: 'ready-for-qa',
      state: customState,
    }
    fetch.mockResolvedValueOnce(jsonResponse(customStatusIssue))

    const result = await client.issues.retrieve('org_1', 'CONSOLE-12')
    expect(result.error).toBeNull()
    expect(result.data?.status).toBe('ready-for-qa')
    expect(result.data?.state?.key).toBe('ready-for-qa')
  })

  it('create POSTs configurable structure fields unchanged', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleIssue, 201))

    const input = {
      projectId: 'prj_1',
      title: 'Test issue',
      description: 'Issue description',
      status: 'todo',
      typeKey: 'task',
      customFields: [{ fieldId: 'cf_severity', value: 'high' }],
      priority: 'high' as const,
    }

    const result = await client.issues.create('org_1', input)
    expect(result.data).toEqual(sampleIssue)
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/issues',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
        body: JSON.stringify(input),
      }
    )
  })

  it('update accepts a tenant-defined status key', async () => {
    const customState = {
      ...sampleState,
      key: 'ready-for-qa',
      name: 'Ready for QA',
      category: 'started',
    }
    const updatedIssue = {
      ...sampleIssue,
      status: 'ready-for-qa',
      state: customState,
    }
    fetch.mockResolvedValueOnce(jsonResponse(updatedIssue))

    const input = { status: 'ready-for-qa' }
    const result = await client.issues.update('org_1', 'CONSOLE-12', input)
    expect(result.data).toEqual(updatedIssue)
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/issues/CONSOLE-12',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
        body: JSON.stringify(input),
      }
    )
  })

  it('delete issues a DELETE and parses the tombstone', async () => {
    const tombstone = {
      object: 'projects.issue',
      id: 'iss_1',
      deleted: true as const,
    }
    fetch.mockResolvedValueOnce(jsonResponse(tombstone))

    const result = await client.issues.delete('org_1', 'iss_1')
    expect(result.data).toEqual(tombstone)
    expect(result.error).toBeNull()
  })

  it('a 404 response is returned as an error value, not thrown', async () => {
    fetch.mockResolvedValueOnce(
      errorResponse(
        'projects/issue-not-found',
        'The issue could not be found.',
        404
      )
    )

    const result = await client.issues.retrieve('org_1', 'nonexistent')
    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/issue-not-found',
      message: 'The issue could not be found.',
    })
    expect('httpStatus' in (result.error ?? {})).toBe(false)
  })

  it('a response failing schema validation is returned as an error value, not thrown', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        object: 'projects.issue',
        id: 'iss_1',
        invalidField: true,
      })
    )

    const result = await client.issues.retrieve('org_1', 'iss_1')
    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/invalid-response',
      message: 'The Projects service returned an invalid response.',
    })
  })

  it('events.list targets /issues/:ref/events', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        object: 'list',
        data: [sampleEvent],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/issues/CONSOLE-12/events',
      })
    )

    const result = await client.issues.events.list('org_1', 'CONSOLE-12')
    expect(result.data).toEqual({
      object: 'list',
      data: [sampleEvent],
      has_more: false,
      total_count: 1,
      url: '/v1/organizations/org_1/issues/CONSOLE-12/events',
    })
    expect(result.error).toBeNull()
  })
})
