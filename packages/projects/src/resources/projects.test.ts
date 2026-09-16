import { beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('server-only', () => ({}))

import { create876ProjectsClient } from '../client'
import type { Comment, Label, Project, ProjectMember } from '../types'

const sampleProject: Project = {
  object: 'projects.project',
  id: 'prj_1',
  tenantId: 'ten_1',
  name: 'Console App',
  key: 'CONSOLE',
  slug: 'console-app',
  description: 'Console application project',
  leadUserId: 'usr_lead',
  status: 'active',
  health: 'on-track',
  startDate: 1680000000,
  targetDate: 1700000000,
  nextIssueNumber: 13,
  customerId: null,
  defaultWorkItemTypeId: 'wit_task_1',
  position: 0,
  archivedAt: null,
  createdAt: 1680000000,
  updatedAt: 1690000000,
  memberCount: 2,
  customFields: [],
}

const sampleMember: ProjectMember = {
  object: 'projects.project-member',
  id: 'pm_1',
  projectId: 'prj_1',
  userId: 'usr_1',
  role: 'member',
  createdAt: 1680000000,
}

const sampleLabel: Label = {
  object: 'projects.label',
  id: 'lbl_1',
  tenantId: 'ten_1',
  name: 'frontend',
  color: '#3b82f6',
  description: 'Frontend work',
  createdAt: 1680000000,
  updatedAt: 1680000000,
}

const sampleComment: Comment = {
  object: 'projects.comment',
  id: 'cmt_1',
  tenantId: 'ten_1',
  issueId: 'iss_1',
  authorUserId: 'usr_1',
  body: 'Sample comment body',
  createdAt: 1680000000,
  updatedAt: 1680000000,
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify({ data, error: null }), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}

describe('resources — projects', () => {
  const fetch = vi.fn<typeof globalThis.fetch>()
  const client = create876ProjectsClient({
    baseUrl: 'http://projects.test',
    internalKey: 'test-key',
    fetch,
  })

  beforeEach(() => {
    fetch.mockReset()
  })

  it('list maps includeArchived → include_archived', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        object: 'list',
        data: [sampleProject],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/projects?include_archived=true',
      })
    )

    const result = await client.projects.list('org_1', {
      includeArchived: true,
    })
    expect(result.data).toEqual({
      object: 'list',
      data: [sampleProject],
      has_more: false,
      total_count: 1,
      url: '/v1/organizations/org_1/projects?include_archived=true',
    })
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/projects?include_archived=true',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })

  it('members.create targets /projects/:id/members', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleMember, 201))

    const input = { userId: 'usr_1', role: 'member' as const }
    const result = await client.projects.members.create('org_1', 'prj_1', input)
    expect(result.data).toEqual(sampleMember)
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/projects/prj_1/members',
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

  it('members.delete targets /projects/:id/members/:userId with the user id encoded', async () => {
    const tombstone = {
      object: 'projects.project-member',
      id: 'pm_1',
      deleted: true as const,
    }
    fetch.mockResolvedValueOnce(jsonResponse(tombstone))

    const result = await client.projects.members.delete(
      'org_1',
      'prj_1',
      'user special/1'
    )
    expect(result.data).toEqual(tombstone)
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/projects/prj_1/members/user%20special%2F1',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })

  it('delete parses the tombstone shape', async () => {
    const tombstone = {
      object: 'projects.project',
      id: 'prj_1',
      deleted: true as const,
    }
    fetch.mockResolvedValueOnce(jsonResponse(tombstone))

    const result = await client.projects.delete('org_1', 'prj_1')
    expect(result.data).toEqual(tombstone)
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/projects/prj_1',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })

  it('create forwards a project-level default work item type', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleProject, 201))

    const input = {
      name: 'Console App',
      key: 'CONSOLE',
      description: 'Console application project',
      status: 'active' as const,
      health: 'on-track' as const,
      defaultWorkItemTypeId: 'wit_task_1',
    }

    const result = await client.projects.create('org_1', input)
    expect(result.data).toEqual(sampleProject)
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/projects',
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

  it('retrieve preserves the project-level default work item type', async () => {
    fetch.mockResolvedValueOnce(jsonResponse(sampleProject))

    const result = await client.projects.retrieve('org_1', 'prj 1')
    expect(result.data).toEqual(sampleProject)
    expect(result.data?.defaultWorkItemTypeId).toBe('wit_task_1')
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/projects/prj%201',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })

  it('update can clear a project-level default work item type', async () => {
    const updated = {
      ...sampleProject,
      status: 'paused' as const,
      defaultWorkItemTypeId: null,
    }
    fetch.mockResolvedValueOnce(jsonResponse(updated))

    const input = {
      status: 'paused' as const,
      defaultWorkItemTypeId: null,
    }
    const result = await client.projects.update('org_1', 'prj_1', input)
    expect(result.data).toEqual(updated)
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/projects/prj_1',
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

  it('members.list sends GET /v1/organizations/:org/projects/:id/members', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        object: 'list',
        data: [sampleMember],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/projects/prj_1/members',
      })
    )

    const result = await client.projects.members.list('org_1', 'prj_1')
    expect(result.data).toEqual({
      object: 'list',
      data: [sampleMember],
      has_more: false,
      total_count: 1,
      url: '/v1/organizations/org_1/projects/prj_1/members',
    })
    expect(result.error).toBeNull()

    expect(fetch).toHaveBeenCalledWith(
      'http://projects.test/v1/organizations/org_1/projects/prj_1/members',
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })

  it('labels resource performs CRUD operations against label endpoints', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        object: 'list',
        data: [sampleLabel],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/labels',
      })
    )

    const listResult = await client.labels.list('org_1')
    expect(listResult.data?.data).toEqual([sampleLabel])
    expect(listResult.error).toBeNull()

    fetch.mockResolvedValueOnce(jsonResponse(sampleLabel, 201))
    const createResult = await client.labels.create('org_1', {
      name: 'frontend',
      color: '#3b82f6',
    })
    expect(createResult.data).toEqual(sampleLabel)
    expect(createResult.error).toBeNull()

    fetch.mockResolvedValueOnce(
      jsonResponse({ object: 'projects.label', id: 'lbl_1', deleted: true })
    )
    const deleteResult = await client.labels.delete('org_1', 'lbl_1')
    expect(deleteResult.data?.deleted).toBe(true)
    expect(deleteResult.error).toBeNull()
  })

  it('comments resource uses privileged internal comment endpoints without actor identity parameters', async () => {
    fetch.mockResolvedValueOnce(
      jsonResponse({
        object: 'list',
        data: [sampleComment],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_1/issues/CONSOLE-12/comments?limit=10',
      })
    )

    const listResult = await client.comments.list('org_1', 'CONSOLE-12', {
      limit: 10,
    })
    expect(listResult.data?.data).toEqual([sampleComment])
    expect(listResult.error).toBeNull()

    fetch.mockResolvedValueOnce(jsonResponse(sampleComment))
    const retrieveResult = await client.comments.retrieve(
      'org_1',
      'CONSOLE-12',
      'cmt_1'
    )
    expect(retrieveResult.data).toEqual(sampleComment)

    fetch.mockResolvedValueOnce(jsonResponse(sampleComment, 201))
    const createResult = await client.comments.create('org_1', 'CONSOLE-12', {
      body: 'Sample comment body',
      authorUserId: 'usr_1',
    })
    expect(createResult.data).toEqual(sampleComment)
    expect(createResult.error).toBeNull()

    const updatedComment = { ...sampleComment, body: 'Updated body' }
    fetch.mockResolvedValueOnce(jsonResponse(updatedComment))
    const updateResult = await client.comments.update(
      'org_1',
      'CONSOLE-12',
      'cmt_1',
      { body: 'Updated body' }
    )
    expect(updateResult.data).toEqual(updatedComment)
    expect(fetch).toHaveBeenLastCalledWith(
      'http://projects.test/v1/organizations/org_1/issues/CONSOLE-12/comments/cmt_1',
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
        body: JSON.stringify({ body: 'Updated body' }),
      }
    )

    fetch.mockResolvedValueOnce(
      jsonResponse({ object: 'projects.comment', id: 'cmt_1', deleted: true })
    )
    const deleteResult = await client.comments.delete(
      'org_1',
      'CONSOLE-12',
      'cmt_1'
    )
    expect(deleteResult.data?.deleted).toBe(true)
    expect(deleteResult.error).toBeNull()
    expect(fetch).toHaveBeenLastCalledWith(
      'http://projects.test/v1/organizations/org_1/issues/CONSOLE-12/comments/cmt_1',
      {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-internal-key': 'test-key',
        },
      }
    )
  })
})
