import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenantsRepo, issuesRepo, repository } = vi.hoisted(() => ({
  tenantsRepo: {
    resolveTenant: vi.fn(),
  },
  issuesRepo: {
    resolveIssue: vi.fn(),
  },
  repository: {
    list: vi.fn(),
    count: vi.fn(),
    retrieve: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    softDelete: vi.fn(),
    hardDelete: vi.fn(),
  },
}))

vi.mock('../../tenants/index.js', () => tenantsRepo)
vi.mock('../../issues/index.js', () => issuesRepo)
vi.mock('../comments.repository.js', () => repository)

const service = await import('../comments.service.js')
const { createCommentsRouter } = await import('../comments.routes.js')

const tenant = {
  id: 'prjten_test_1',
  organizationId: 'org_test_1',
  triageProjectId: 'prj_triage_1',
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

const mockIssueRow = {
  id: 'iss_test_1',
  tenantId: tenant.id,
  projectId: 'prj_alpha_1',
  number: 1,
  identifier: 'CONSOLE-1',
  title: 'First issue',
  description: 'First issue description',
  status: 'todo',
  priority: 'none',
  assigneeUserId: null,
  creatorUserId: 'usr_creator_1',
  parentIssueId: null,
  estimate: null,
  dueDate: null,
  position: 0,
  startedAt: null,
  completedAt: null,
  canceledAt: null,
  deletedAt: null,
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

const mockCommentRow = {
  id: 'cmt_alpha_1',
  tenantId: tenant.id,
  issueId: mockIssueRow.id,
  authorUserId: 'usr_author_1',
  body: 'This is a test comment',
  deletedAt: null,
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use(
    '/v1/organizations/:organizationId/issues/:issueRef/comments',
    createCommentsRouter()
  )
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        'x-internal-key': 'test-internal-key',
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })

    return {
      status: response.status,
      body: await response.json(),
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsRepo.resolveTenant.mockResolvedValue(tenant)
  issuesRepo.resolveIssue.mockResolvedValue(mockIssueRow)
})

describe('comments module', () => {
  it('create attaches to the resolved issue and returns the complete serialized shape', async () => {
    repository.create.mockResolvedValue(mockCommentRow)

    const result = await service.create('org_test_1', mockIssueRow.id, {
      body: 'This is a test comment',
      authorUserId: 'usr_author_1',
    })

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.comment',
      id: mockCommentRow.id,
      tenantId: tenant.id,
      issueId: mockIssueRow.id,
      authorUserId: 'usr_author_1',
      body: 'This is a test comment',
      createdAt: 1787767200,
      updatedAt: 1787767200,
    })
    expect(issuesRepo.resolveIssue).toHaveBeenCalledWith(
      tenant.id,
      mockIssueRow.id
    )
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        issueId: mockIssueRow.id,
        authorUserId: 'usr_author_1',
        body: 'This is a test comment',
        createdAt: expect.any(BigInt),
        updatedAt: expect.any(BigInt),
      })
    )
  })

  it('create against an unknown issue returns projects/issue-not-found and does not call the comment repository (not.toHaveBeenCalled())', async () => {
    issuesRepo.resolveIssue.mockResolvedValue(null)

    const result = await service.create('org_test_1', 'iss_missing', {
      body: 'Comment on nonexistent issue',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/issue-not-found',
      message: 'The issue could not be found.',
      httpStatus: 404,
    })
    expect(issuesRepo.resolveIssue).toHaveBeenCalledWith(
      tenant.id,
      'iss_missing'
    )
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('list is issue-scoped, oldest first', async () => {
    repository.list.mockResolvedValue([mockCommentRow])
    repository.count.mockResolvedValue(1)

    const result = await service.list('org_test_1', mockIssueRow.id, {})

    expect(result.error).toBeNull()
    expect(result.data?.items).toEqual([
      {
        object: 'projects.comment',
        id: mockCommentRow.id,
        tenantId: tenant.id,
        issueId: mockIssueRow.id,
        authorUserId: 'usr_author_1',
        body: 'This is a test comment',
        createdAt: 1787767200,
        updatedAt: 1787767200,
      },
    ])
    expect(issuesRepo.resolveIssue).toHaveBeenCalledWith(
      tenant.id,
      mockIssueRow.id
    )
    expect(repository.list).toHaveBeenCalledWith(mockIssueRow.id, {
      limit: 25,
      startingAfter: undefined,
      endingBefore: undefined,
    })
    expect(repository.count).toHaveBeenCalledWith(mockIssueRow.id)
  })

  it('update of an unknown comment returns projects/comment-not-found', async () => {
    repository.retrieve.mockResolvedValue(null)

    const result = await service.update(
      'org_test_1',
      mockIssueRow.id,
      'cmt_missing',
      {
        body: 'Updated text',
      }
    )

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/comment-not-found',
      message: 'The comment could not be found.',
      httpStatus: 404,
    })
    expect(issuesRepo.resolveIssue).toHaveBeenCalledWith(
      tenant.id,
      mockIssueRow.id
    )
    expect(repository.retrieve).toHaveBeenCalledWith(
      mockIssueRow.id,
      'cmt_missing'
    )
    expect(repository.update).not.toHaveBeenCalled()
  })

  it('delete soft-deletes', async () => {
    repository.retrieve.mockResolvedValue(mockCommentRow)
    repository.softDelete.mockResolvedValue({
      ...mockCommentRow,
      deletedAt: 1787823000n,
    })

    const result = await service.remove(
      'org_test_1',
      mockIssueRow.id,
      mockCommentRow.id
    )

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.comment',
      id: mockCommentRow.id,
      deleted: true,
    })
    expect(issuesRepo.resolveIssue).toHaveBeenCalledWith(
      tenant.id,
      mockIssueRow.id
    )
    expect(repository.retrieve).toHaveBeenCalledWith(
      mockIssueRow.id,
      mockCommentRow.id
    )
    expect(repository.softDelete).toHaveBeenCalledWith(
      mockCommentRow.id,
      expect.any(BigInt)
    )
    expect(repository.hardDelete).not.toHaveBeenCalled()
  })

  it('a soft-deleted comment does not appear in the list', async () => {
    repository.list.mockResolvedValue([])
    repository.count.mockResolvedValue(0)

    const result = await service.list('org_test_1', mockIssueRow.id, {})

    expect(result.error).toBeNull()
    expect(result.data?.items).toHaveLength(0)
    expect(repository.list).toHaveBeenCalledWith(mockIssueRow.id, {
      limit: 25,
      startingAfter: undefined,
      endingBefore: undefined,
    })
  })

  it('update applies supplied body and returns serialized comment', async () => {
    repository.retrieve.mockResolvedValue(mockCommentRow)
    repository.update.mockResolvedValue({
      ...mockCommentRow,
      body: 'Updated body content',
      updatedAt: 1787823000n,
    })

    const result = await service.update(
      'org_test_1',
      mockIssueRow.id,
      mockCommentRow.id,
      {
        body: 'Updated body content',
      }
    )

    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'projects.comment',
      id: mockCommentRow.id,
      tenantId: tenant.id,
      issueId: mockIssueRow.id,
      authorUserId: 'usr_author_1',
      body: 'Updated body content',
      createdAt: 1787767200,
      updatedAt: 1787823000,
    })
    expect(repository.update).toHaveBeenCalledWith(
      mockCommentRow.id,
      expect.objectContaining({
        body: 'Updated body content',
        updatedAt: expect.any(BigInt),
      })
    )
  })

  it('remove of an unknown comment returns projects/comment-not-found', async () => {
    repository.retrieve.mockResolvedValue(null)

    const result = await service.remove(
      'org_test_1',
      mockIssueRow.id,
      'cmt_missing'
    )

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/comment-not-found',
      message: 'The comment could not be found.',
      httpStatus: 404,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(
      mockIssueRow.id,
      'cmt_missing'
    )
    expect(repository.softDelete).not.toHaveBeenCalled()
    expect(repository.hardDelete).not.toHaveBeenCalled()
  })

  it('GET /v1/organizations/:organizationId/issues/:issueRef/comments returns platform list envelope', async () => {
    repository.list.mockResolvedValue([mockCommentRow])
    repository.count.mockResolvedValue(1)

    const response = await requestJson(
      'GET',
      `/v1/organizations/org_test_1/issues/${mockIssueRow.id}/comments`
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'projects.comment',
            id: mockCommentRow.id,
            tenantId: tenant.id,
            issueId: mockIssueRow.id,
            authorUserId: 'usr_author_1',
            body: 'This is a test comment',
            createdAt: 1787767200,
            updatedAt: 1787767200,
          },
        ],
        has_more: false,
        total_count: 1,
        url: `/v1/organizations/org_test_1/issues/${mockIssueRow.id}/comments`,
      },
      error: null,
    })
  })

  it('rejects unauthorized HTTP requests when x-internal-key is missing or invalid', async () => {
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_test_1/issues/${mockIssueRow.id}/comments`,
      undefined,
      { 'x-internal-key': 'invalid-key' }
    )

    expect(response.status).toBe(401)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'projects/unauthorized',
        message: 'This request is missing valid credentials.',
      },
    })
    expect(repository.list).not.toHaveBeenCalled()
  })
})
