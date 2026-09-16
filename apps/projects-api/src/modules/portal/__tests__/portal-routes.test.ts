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
      listMilestones: vi.fn(),
      retrieveMilestone: vi.fn(),
      listMilestoneComments: vi.fn(),
      listDiscussions: vi.fn(),
      retrieveDiscussion: vi.fn(),
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

function okList(items: unknown[] = []) {
  return { data: { items, hasMore: false, totalCount: null }, error: null }
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
  portalService.listIssues.mockResolvedValue(okList())
  portalService.retrieveIssue.mockResolvedValue({ data: { id: 'iss_1' }, error: null })
  portalService.listIssueComments.mockResolvedValue({ data: [], error: null })
  portalService.listMilestones.mockResolvedValue(okList())
  portalService.retrieveMilestone.mockResolvedValue({ data: { id: 'mls_1' }, error: null })
  portalService.listMilestoneComments.mockResolvedValue({ data: [], error: null })
  portalService.listDiscussions.mockResolvedValue(okList())
  portalService.retrieveDiscussion.mockResolvedValue({
    data: { discussion: { id: 'dsc_1' }, posts: [] },
    error: null,
  })
  portalService.listWikiPages.mockResolvedValue(okList())
  portalService.retrieveWikiPage.mockResolvedValue({ data: { id: 'wpg_1' }, error: null })
  portalService.listAttachments.mockResolvedValue(okList())
  portalService.listActivity.mockResolvedValue({
    data: { items: [], nextCursor: null, hasMore: false },
    error: null,
  })
  portalService.getTimeByPhase.mockResolvedValue({ data: [], error: null })
  portalService.listInvoices.mockResolvedValue({ data: [], error: null })
})

describe('portal guard', () => {
  it('rejects portal reads without the internal key', async () => {
    const { status, body } = await requestJson('GET', `${BASE}/issues`, undefined, {
      'x-internal-key': 'wrong-key',
    })

    expect(status).toBe(401)
    expect(body.error.code).toBe('projects/unauthorized')
    expect(portalService.listIssues).not.toHaveBeenCalled()
  })

  it('rejects portal reads without an acting user', async () => {
    const { status } = await requestJson('GET', `${BASE}/issues`, undefined, {
      'x-user-id': '',
    })

    expect(status).toBe(401)
    expect(portalService.listIssues).not.toHaveBeenCalled()
  })

  it('reads revoked grants as 404 without leaking grant existence', async () => {
    grantsRepo.resolveActiveGrant.mockResolvedValue(null)

    const { status, body } = await requestJson('GET', `${BASE}/issues`)

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/client-grant-not-found')
    expect(portalService.listIssues).not.toHaveBeenCalled()
  })

  it('reads unknown tenants as 404 before resolving grants', async () => {
    tenantsMod.resolveTenant.mockResolvedValue(null)

    const { status } = await requestJson('GET', `${BASE}/issues`)

    expect(status).toBe(404)
    expect(grantsRepo.resolveActiveGrant).not.toHaveBeenCalled()
  })

  it('reads unknown projects as 404 before resolving grants', async () => {
    projectsMod.resolveProject.mockResolvedValue(null)

    const { status } = await requestJson('GET', `${BASE}/issues`)

    expect(status).toBe(404)
    expect(grantsRepo.resolveActiveGrant).not.toHaveBeenCalled()
  })

  it('rejects strict portal query params with 400', async () => {
    const { status, body } = await requestJson(
      'GET',
      `${BASE}/issues?limit=10&injected=1`
    )

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/invalid-request')
    expect(portalService.listIssues).not.toHaveBeenCalled()
  })
})

describe.each([
  ['issues', `${BASE}/issues`, 'listIssues'],
  ['issue detail', `${BASE}/issues/ALPHA-1`, 'retrieveIssue'],
  ['issue comments', `${BASE}/issues/ALPHA-1/comments`, 'listIssueComments'],
  ['milestones', `${BASE}/milestones`, 'listMilestones'],
  ['milestone detail', `${BASE}/milestones/mls_1`, 'retrieveMilestone'],
  ['milestone comments', `${BASE}/milestones/mls_1/comments`, 'listMilestoneComments'],
  ['discussions', `${BASE}/discussions`, 'listDiscussions'],
  ['discussion detail', `${BASE}/discussions/dsc_1`, 'retrieveDiscussion'],
  ['wiki pages', `${BASE}/wiki`, 'listWikiPages'],
  ['wiki page', `${BASE}/wiki/kickoff`, 'retrieveWikiPage'],
  ['attachments', `${BASE}/attachments`, 'listAttachments'],
  ['activity', `${BASE}/activity`, 'listActivity'],
  ['time by phase', `${BASE}/time-by-phase`, 'getTimeByPhase'],
  ['invoices', `${BASE}/invoices`, 'listInvoices'],
] as Array<[string, string, keyof typeof portalService]>)(
  'portal route %s',
  (_label, path, serviceFn) => {
    it('requires the internal key', async () => {
      const { status } = await requestJson('GET', path, undefined, {
        'x-internal-key': 'wrong-key',
      })

      expect(status).toBe(401)
      expect(portalService[serviceFn]).not.toHaveBeenCalled()
    })

    it('serves granted callers', async () => {
      const { status } = await requestJson('GET', path)

      expect(status).toBe(200)
      expect(portalService[serviceFn]).toHaveBeenCalledTimes(1)
    })
  }
)
