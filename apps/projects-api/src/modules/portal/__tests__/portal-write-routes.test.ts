import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { tenantsMod, projectsMod, grantsRepo, portalService } = vi.hoisted(
  () => ({
    tenantsMod: { resolveTenant: vi.fn() },
    projectsMod: { resolveProject: vi.fn() },
    grantsRepo: { resolveActiveGrant: vi.fn() },
    portalService: {
      listIssues: vi.fn(),
      retrieveIssue: vi.fn(),
      listIssueComments: vi.fn(),
      createIssueComment: vi.fn(),
      listMilestones: vi.fn(),
      retrieveMilestone: vi.fn(),
      listMilestoneComments: vi.fn(),
      createMilestoneComment: vi.fn(),
      listDiscussions: vi.fn(),
      retrieveDiscussion: vi.fn(),
      createDiscussionPost: vi.fn(),
      listWikiPages: vi.fn(),
      retrieveWikiPage: vi.fn(),
      listAttachments: vi.fn(),
      listActivity: vi.fn(),
      getTimeByPhase: vi.fn(),
      listInvoices: vi.fn(),
    },
  })
)

vi.mock('../../tenants/index.js', () => tenantsMod)
vi.mock('../../projects/index.js', () => projectsMod)
vi.mock('../client-grants.repository.js', () => grantsRepo)
vi.mock('../portal.service.js', () => portalService)

const { createPortalRouter } = await import('../portal.routes.js')

const tenant = { id: 'ten_alpha' }
const project = { id: 'prj_alpha' }
const BASE = '/portal/organizations/org_1/projects/prj_1'
const grant = {
  id: 'cgt_1',
  tenantId: tenant.id,
  projectId: project.id,
  userId: 'usr_client',
  allowComments: true,
  allowDiscussions: true,
  allowFiles: true,
  allowTime: true,
  allowInvoices: true,
  allowWiki: true,
  invitedBy: 'usr_owner',
  revokedAt: null,
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
    '/portal/organizations/:organizationId/projects/:projectId',
    createPortalRouter()
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
        'x-user-id': 'usr_client',
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
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsMod.resolveTenant.mockResolvedValue(tenant)
  projectsMod.resolveProject.mockResolvedValue(project)
  grantsRepo.resolveActiveGrant.mockResolvedValue(grant)
  portalService.createIssueComment.mockResolvedValue({
    data: {
      object: 'portal.comment',
      id: 'cmt_1',
      issueId: 'iss_1',
      authorUserId: 'usr_client',
      body: 'Hello',
      createdAt: 1787767400,
      updatedAt: 1787767400,
    },
    error: null,
  })
  portalService.createMilestoneComment.mockResolvedValue({
    data: {
      object: 'portal.milestone-comment',
      id: 'mcm_1',
      milestoneId: 'mls_1',
      authorUserId: 'usr_client',
      body: 'Phase note',
      createdAt: 1787767400,
      updatedAt: 1787767400,
    },
    error: null,
  })
  portalService.createDiscussionPost.mockResolvedValue({
    data: {
      object: 'portal.discussion-post',
      id: 'post_1',
      discussionId: 'dsc_1',
      authorUserId: 'usr_client',
      body: 'Reply',
      createdAt: 1787767400,
      updatedAt: 1787767400,
    },
    error: null,
  })
})

describe('portal write routes', () => {
  it('creates an issue comment behind the portal grant with 201', async () => {
    const { status, body } = await requestJson('POST', `${BASE}/issues/ALPHA-7/comments`, {
      body: 'Hello',
    })

    expect(status).toBe(201)
    expect(portalService.createIssueComment).toHaveBeenCalledTimes(1)
    expect(body.data.object).toBe('portal.comment')
    expect(body.data).not.toHaveProperty('tenantId')
  })

  it('rejects portal issue writes without a live grant', async () => {
    grantsRepo.resolveActiveGrant.mockResolvedValue(null)

    const { status, body } = await requestJson(
      'POST',
      `${BASE}/issues/ALPHA-7/comments`,
      { body: 'Hello' }
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/client-grant-not-found')
    expect(portalService.createIssueComment).not.toHaveBeenCalled()
  })

  it('rejects strict issue comment bodies with 400', async () => {
    const { status } = await requestJson('POST', `${BASE}/issues/ALPHA-7/comments`, {
      body: 'Hello',
      injected: true,
    })

    expect(status).toBe(400)
    expect(portalService.createIssueComment).not.toHaveBeenCalled()
  })

  it('creates a milestone comment behind the portal grant with 201', async () => {
    const { status, body } = await requestJson('POST', `${BASE}/milestones/mls_1/comments`, {
      body: 'Phase note',
    })

    expect(status).toBe(201)
    expect(portalService.createMilestoneComment).toHaveBeenCalledTimes(1)
    expect(body.data.object).toBe('portal.milestone-comment')
    expect(body.data).not.toHaveProperty('tenantId')
  })

  it('rejects portal milestone writes without a live grant', async () => {
    grantsRepo.resolveActiveGrant.mockResolvedValue(null)

    const { status } = await requestJson('POST', `${BASE}/milestones/mls_1/comments`, {
      body: 'Phase note',
    })

    expect(status).toBe(404)
    expect(portalService.createMilestoneComment).not.toHaveBeenCalled()
  })

  it('creates a discussion post behind the portal grant with 201', async () => {
    const { status, body } = await requestJson('POST', `${BASE}/discussions/dsc_1/posts`, {
      body: 'Reply',
    })

    expect(status).toBe(201)
    expect(portalService.createDiscussionPost).toHaveBeenCalledTimes(1)
    expect(body.data.object).toBe('portal.discussion-post')
    expect(body.data).not.toHaveProperty('tenantId')
    expect(body.data).not.toHaveProperty('editCount')
  })

  it('rejects portal discussion writes without a live grant', async () => {
    grantsRepo.resolveActiveGrant.mockResolvedValue(null)

    const { status } = await requestJson('POST', `${BASE}/discussions/dsc_1/posts`, {
      body: 'Reply',
    })

    expect(status).toBe(404)
    expect(portalService.createDiscussionPost).not.toHaveBeenCalled()
  })

  it('maps a locked discussion to 409 through the portal route', async () => {
    portalService.createDiscussionPost.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/discussion-locked',
        message: 'This discussion is locked and no longer accepts posts.',
        httpStatus: 409,
      },
    })

    const { status, body } = await requestJson('POST', `${BASE}/discussions/dsc_1/posts`, {
      body: 'Reply',
    })

    expect(status).toBe(409)
    expect(body.error.code).toBe('projects/discussion-locked')
  })
})
