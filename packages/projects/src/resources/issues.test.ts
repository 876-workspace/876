import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876ProjectsClient } from '../client'
import type { Issue, IssueEvent } from '../types'

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
  return new Response(JSON.stringify({ data: null, error: { code, message } }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
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

  it('list serializes status: [\'todo\',\'in-progress\'] as status=todo,in-progress', async () => {
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
      status: ['todo', 'in-progress'],
    })
    expect(result.data?.object).toBe('list')
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/issues?status=todo,in-progress',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })

  it('list omits undefined parameters entirely (assert the exact final URL)', async () => {
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

  it('retrieve accepts an identifier such as CONSOLE-12 and encodes it', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleIssue))

    const result = await client.issues.retrieve('org_1', 'CONSOLE-12')
    expect(result.data).toEqual(sampleIssue)
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

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/issues/CONSOLE%2F12',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })

  it('create POSTs the body unchanged and parses the response with issueSchema', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleIssue, 201))

    const input = {
      projectId: 'prj_1',
      title: 'Test issue',
      description: 'Issue description',
      status: 'todo' as const,
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

  it('update issues a PATCH', async () => {
    const updatedIssue = { ...sampleIssue, status: 'in-progress' as const }
    fetch.mockResolvedValueOnce(jsonResponse(updatedIssue))

    const input = { status: 'in-progress' as const }
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

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/issues/iss_1',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })

  it('a 404 response is returned as an error value, not thrown', async () => {
    fetch.mockResolvedValueOnce(
      errorResponse('projects/issue-not-found', 'The issue could not be found.', 404)
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

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/issues/CONSOLE-12/events',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })
})
