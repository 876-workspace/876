import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { tenantsRepo, issuesRepo, repository, collaboration } = vi.hoisted(
  () => ({
    tenantsRepo: { resolveTenant: vi.fn() },
    issuesRepo: { resolveIssue: vi.fn() },
    collaboration: {
      ensureFollows: vi.fn(),
      ensureFollowsForTenant: vi.fn(),
      notifyMentionedUsers: vi.fn(),
      mentionedUserIds: vi.fn(() => []),
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
  })
)

vi.mock('../../tenants/index.js', () => tenantsRepo)
vi.mock('../../collaboration/index.js', () => collaboration)
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
  app.use(errorHandler)
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
    return { status: response.status, body: await response.json() }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  delete process.env.DELETION_MODE
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsRepo.resolveTenant.mockResolvedValue(tenant)
  issuesRepo.resolveIssue.mockResolvedValue(mockIssueRow)
})

describe('comments module', () => {
  it('create records the supplied service-plane author and serializes the comment', async () => {
    repository.create.mockResolvedValue(mockCommentRow)

    const result = await service.create('org_test_1', mockIssueRow.id, {
      body: 'This is a test comment',
      authorUserId: 'usr_author_1',
    })

    expect(result.error).toBeNull()
    expect(result.data?.authorUserId).toBe('usr_author_1')
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        issueId: mockIssueRow.id,
        authorUserId: 'usr_author_1',
      })
    )
  })

  it('list remains issue-scoped and oldest-first repository order', async () => {
    repository.list.mockResolvedValue([mockCommentRow])
    repository.count.mockResolvedValue(1)

    const result = await service.list('org_test_1', mockIssueRow.id, {})

    expect(result.error).toBeNull()
    expect(result.data?.items[0]?.id).toBe(mockCommentRow.id)
    expect(repository.list).toHaveBeenCalledWith(mockIssueRow.id, {
      limit: 25,
      startingAfter: undefined,
      endingBefore: undefined,
    })
  })

  it('retrieve is issue-scoped for authenticated callers to verify ownership', async () => {
    repository.retrieve.mockResolvedValue(mockCommentRow)

    const result = await service.retrieve(
      'org_test_1',
      mockIssueRow.id,
      mockCommentRow.id
    )

    expect(result.error).toBeNull()
    expect(result.data?.authorUserId).toBe('usr_author_1')
    expect(repository.retrieve).toHaveBeenCalledWith(
      mockIssueRow.id,
      mockCommentRow.id
    )
  })

  it('update is privileged internal CRUD and does not accept an actor assertion', async () => {
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
      { body: 'Updated body content' }
    )

    expect(result.error).toBeNull()
    expect(result.data?.body).toBe('Updated body content')
    expect(repository.update).toHaveBeenCalledWith(
      mockCommentRow.id,
      expect.objectContaining({
        body: 'Updated body content',
        updatedAt: expect.any(BigInt),
      })
    )
  })

  it('update and remove reject unknown comments', async () => {
    repository.retrieve.mockResolvedValue(null)

    const update = await service.update(
      'org_test_1',
      mockIssueRow.id,
      'cmt_missing',
      { body: 'Updated text' }
    )
    const remove = await service.remove(
      'org_test_1',
      mockIssueRow.id,
      'cmt_missing'
    )

    expect(update.error?.code).toBe('projects/comment-not-found')
    expect(remove.error?.code).toBe('projects/comment-not-found')
    expect(repository.update).not.toHaveBeenCalled()
    expect(repository.softDelete).not.toHaveBeenCalled()
  })

  it('remove soft-deletes by default and hard-deletes in hard mode', async () => {
    repository.retrieve.mockResolvedValue(mockCommentRow)
    repository.softDelete.mockResolvedValue(mockCommentRow)

    const soft = await service.remove(
      'org_test_1',
      mockIssueRow.id,
      mockCommentRow.id
    )
    expect(soft.data?.deleted).toBe(true)
    expect(repository.softDelete).toHaveBeenCalledWith(
      mockCommentRow.id,
      expect.any(BigInt)
    )

    vi.clearAllMocks()
    tenantsRepo.resolveTenant.mockResolvedValue(tenant)
    issuesRepo.resolveIssue.mockResolvedValue(mockIssueRow)
    repository.retrieve.mockResolvedValue(mockCommentRow)
    process.env.DELETION_MODE = 'hard'

    const hard = await service.remove(
      'org_test_1',
      mockIssueRow.id,
      mockCommentRow.id
    )
    expect(hard.data?.deleted).toBe(true)
    expect(repository.hardDelete).toHaveBeenCalledWith(mockCommentRow.id)
  })

  it('unknown issues stop comment repository access', async () => {
    issuesRepo.resolveIssue.mockResolvedValue(null)

    const result = await service.create('org_test_1', 'iss_missing', {
      body: 'Comment on nonexistent issue',
    })

    expect(result.error?.code).toBe('projects/issue-not-found')
    expect(repository.create).not.toHaveBeenCalled()
  })

  it('HTTP list and retrieve return platform envelopes', async () => {
    repository.list.mockResolvedValue([mockCommentRow])
    repository.count.mockResolvedValue(1)
    repository.retrieve.mockResolvedValue(mockCommentRow)

    const listResponse = await requestJson(
      'GET',
      `/v1/organizations/org_test_1/issues/${mockIssueRow.id}/comments`
    )
    expect(listResponse.status).toBe(200)
    expect(listResponse.body.data.object).toBe('list')

    const retrieveResponse = await requestJson(
      'GET',
      `/v1/organizations/org_test_1/issues/${mockIssueRow.id}/comments/${mockCommentRow.id}`
    )
    expect(retrieveResponse.status).toBe(200)
    expect(retrieveResponse.body.data.authorUserId).toBe('usr_author_1')
  })

  it('HTTP PATCH and DELETE no longer accept or require caller actor identity', async () => {
    repository.retrieve.mockResolvedValue(mockCommentRow)
    repository.update.mockResolvedValue({
      ...mockCommentRow,
      body: 'Updated',
    })
    repository.softDelete.mockResolvedValue(mockCommentRow)

    const patch = await requestJson(
      'PATCH',
      `/v1/organizations/org_test_1/issues/${mockIssueRow.id}/comments/${mockCommentRow.id}`,
      { body: 'Updated' }
    )
    expect(patch.status).toBe(200)

    const remove = await requestJson(
      'DELETE',
      `/v1/organizations/org_test_1/issues/${mockIssueRow.id}/comments/${mockCommentRow.id}`
    )
    expect(remove.status).toBe(200)
  })

  it('rejects unauthorized HTTP requests when x-internal-key is invalid', async () => {
    const response = await requestJson(
      'GET',
      `/v1/organizations/org_test_1/issues/${mockIssueRow.id}/comments`,
      undefined,
      { 'x-internal-key': 'invalid-key' }
    )

    expect(response.status).toBe(401)
    expect(repository.list).not.toHaveBeenCalled()
  })
})
