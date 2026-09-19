import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../error-handler.js'

class Unavailable extends Error {}

const { verifier, access } = vi.hoisted(() => ({
  verifier: { verifySessionToken: vi.fn() },
  access: { resolveSessionAccess: vi.fn() },
}))

vi.mock('../../platform/session-verifier.js', () => ({
  verifySessionToken: verifier.verifySessionToken,
  SessionIdentityUnavailable: Unavailable,
}))
vi.mock('../../platform/session-access.js', () => ({
  resolveSessionAccess: access.resolveSessionAccess,
}))

const { issuesService, commentsService, calendarService, automationService } =
  vi.hoisted(() => ({
    issuesService: {
      list: vi.fn(),
      create: vi.fn(),
      retrieve: vi.fn(),
      update: vi.fn(),
    },
    commentsService: { create: vi.fn() },
    calendarService: { getMyWork: vi.fn() },
    automationService: { listNotifications: vi.fn() },
  }))

vi.mock('../../modules/issues/issues.service.js', () => issuesService)
vi.mock('../../modules/comments/comments.service.js', () => commentsService)
vi.mock('../../modules/calendar/calendar.service.js', () => calendarService)
vi.mock('../../modules/automation/automation.service.js', () => automationService)

const { createIssuesRouter } = await import(
  '../../modules/issues/issues.routes.js'
)
const { createCalendarRouter } = await import(
  '../../modules/calendar/calendar.routes.js'
)
const { createAutomationRouter } = await import(
  '../../modules/automation/automation.routes.js'
)

const INTERNAL_KEY = 'test-internal-key'
const ORG = 'org_1'
const USER = 'usr_session'
const TOKEN = 'mobile-access-token'

function okList(items: unknown[] = []) {
  return { data: { items, hasMore: false, totalCount: null }, error: null }
}

function buildApp() {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId/issues', createIssuesRouter())
  app.use('/v1/organizations/:organizationId', createCalendarRouter())
  app.use('/v1/organizations/:organizationId', createAutomationRouter())
  app.use(errorHandler)
  return app
}

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = buildApp()
  const server = app.listen(0)
  await new Promise<void>((resolve) => server.once('listening', resolve))
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('No port')

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        ...(body === undefined ? {} : { 'content-type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
    return {
      status: response.status,
      json: (await response.json()) as {
        data: unknown
        error: { code: string; message: string } | null
      },
    }
  } finally {
    server.close()
  }
}

function sessionHeaders(token: string = TOKEN): Record<string, string> {
  return { authorization: `Bearer ${token}` }
}

function allowSession(
  permissions: string[] = ['issues.view', 'issues.create', 'issues.edit'],
  modules: string[] = ['issues']
) {
  verifier.verifySessionToken.mockResolvedValue({
    userId: USER,
    organizationId: ORG,
    realm: 'enterprise',
  })
  access.resolveSessionAccess.mockResolvedValue({
    status: 'ok',
    access: {
      userId: USER,
      organizationId: ORG,
      appId: 'app_projects',
      modules,
      permissions,
    },
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = INTERNAL_KEY
  issuesService.list.mockResolvedValue(okList())
  issuesService.create.mockResolvedValue({
    data: { object: 'projects.issue', id: 'iss_1' },
    error: null,
  })
  issuesService.update.mockResolvedValue({
    data: { object: 'projects.issue', id: 'iss_1' },
    error: null,
  })
  commentsService.create.mockResolvedValue({
    data: { object: 'projects.comment', id: 'cmt_1' },
    error: null,
  })
  calendarService.getMyWork.mockResolvedValue({
    data: { userId: USER, items: [] },
    error: null,
  })
  automationService.listNotifications.mockResolvedValue(okList())
})

describe('session tier', () => {
  it('rejects requests with no credential', async () => {
    const response = await requestJson('GET', `/v1/organizations/${ORG}/issues`)
    expect(response.status).toBe(401)
    expect(response.json.error?.code).toBe('projects/unauthorized')
    expect(issuesService.list).not.toHaveBeenCalled()
  })

  it('rejects an invalid internal key without trying the session', async () => {
    const response = await requestJson(
      'GET',
      `/v1/organizations/${ORG}/issues`,
      undefined,
      { 'x-internal-key': 'wrong' }
    )
    expect(response.status).toBe(401)
    expect(verifier.verifySessionToken).not.toHaveBeenCalled()
  })

  it('keeps serving the internal key without touching session verification', async () => {
    const response = await requestJson(
      'GET',
      `/v1/organizations/${ORG}/issues`,
      undefined,
      { 'x-internal-key': INTERNAL_KEY }
    )
    expect(response.status).toBe(200)
    expect(verifier.verifySessionToken).not.toHaveBeenCalled()
    expect(access.resolveSessionAccess).not.toHaveBeenCalled()
    expect(issuesService.list).toHaveBeenCalled()
  })

  it('rejects a forged bearer', async () => {
    verifier.verifySessionToken.mockResolvedValue(null)
    const response = await requestJson(
      'GET',
      `/v1/organizations/${ORG}/issues`,
      undefined,
      sessionHeaders()
    )
    expect(response.status).toBe(401)
    expect(response.json.error?.code).toBe('projects/unauthorized')
    expect(issuesService.list).not.toHaveBeenCalled()
  })

  it('rejects a token minted for another organization', async () => {
    verifier.verifySessionToken.mockResolvedValue({
      userId: USER,
      organizationId: 'org_other',
      realm: 'enterprise',
    })
    const response = await requestJson(
      'GET',
      `/v1/organizations/${ORG}/issues`,
      undefined,
      sessionHeaders()
    )
    expect(response.status).toBe(403)
    expect(response.json.error?.code).toBe('projects/forbidden')
    expect(access.resolveSessionAccess).not.toHaveBeenCalled()
  })

  it('rejects a caller without the route permission', async () => {
    allowSession(['issues.view'], ['issues'])
    const response = await requestJson(
      'POST',
      `/v1/organizations/${ORG}/issues`,
      { title: 'Nope' },
      sessionHeaders()
    )
    expect(response.status).toBe(403)
    expect(issuesService.create).not.toHaveBeenCalled()
  })

  it('rejects a caller without the route module', async () => {
    allowSession(['issues.create'], ['projects'])
    const response = await requestJson(
      'POST',
      `/v1/organizations/${ORG}/issues`,
      { title: 'Nope' },
      sessionHeaders()
    )
    expect(response.status).toBe(403)
    expect(issuesService.create).not.toHaveBeenCalled()
  })

  it('rejects a revoked caller as forbidden', async () => {
    verifier.verifySessionToken.mockResolvedValue({
      userId: USER,
      organizationId: ORG,
      realm: 'enterprise',
    })
    access.resolveSessionAccess.mockResolvedValue({ status: 'denied' })
    const response = await requestJson(
      'GET',
      `/v1/organizations/${ORG}/issues`,
      undefined,
      sessionHeaders()
    )
    expect(response.status).toBe(403)
    expect(issuesService.list).not.toHaveBeenCalled()
  })

  it('reports an identity outage as unavailable, not as a denial', async () => {
    verifier.verifySessionToken.mockRejectedValue(new Unavailable())
    const response = await requestJson(
      'GET',
      `/v1/organizations/${ORG}/issues`,
      undefined,
      sessionHeaders()
    )
    expect(response.status).toBe(503)
    expect(response.json.error?.code).toBe('projects/identity-unavailable')
  })

  it('serves a fully authorized session caller', async () => {
    allowSession()
    const response = await requestJson(
      'GET',
      `/v1/organizations/${ORG}/issues`,
      undefined,
      sessionHeaders()
    )
    expect(response.status).toBe(200)
    expect(issuesService.list).toHaveBeenCalled()
  })

  it('binds issue authorship to the token subject, not the request body', async () => {
    allowSession()
    const response = await requestJson(
      'POST',
      `/v1/organizations/${ORG}/issues`,
      { title: 'Session issue', creatorUserId: 'usr_impostor' },
      sessionHeaders()
    )
    expect(response.status).toBe(201)
    expect(issuesService.create).toHaveBeenCalledWith(
      ORG,
      expect.objectContaining({ creatorUserId: USER }),
      expect.objectContaining({
        permissions: expect.arrayContaining(['issues.create']),
      })
    )
  })

  it('binds issue edits to the token subject', async () => {
    allowSession()
    const response = await requestJson(
      'PATCH',
      `/v1/organizations/${ORG}/issues/ISS-1`,
      { title: 'Edited', actorUserId: 'usr_impostor' },
      sessionHeaders()
    )
    expect(response.status).toBe(200)
    expect(issuesService.update).toHaveBeenCalledWith(
      ORG,
      'ISS-1',
      expect.objectContaining({ actorUserId: USER }),
      expect.anything()
    )
  })

  it('binds comment authorship to the token subject', async () => {
    allowSession(['comments.create', 'comments.view'], ['issues'])
    const response = await requestJson(
      'POST',
      `/v1/organizations/${ORG}/issues/ISS-1/comments`,
      { body: 'Session comment', authorUserId: 'usr_impostor' },
      sessionHeaders()
    )
    expect(response.status).toBe(201)
    expect(commentsService.create).toHaveBeenCalledWith(
      ORG,
      'ISS-1',
      expect.objectContaining({ authorUserId: USER })
    )
  })

  it('keeps my-work scoped to the session caller', async () => {
    allowSession(['issues.view'], ['issues'])
    const forbidden = await requestJson(
      'GET',
      `/v1/organizations/${ORG}/my-work?userId=usr_other`,
      undefined,
      sessionHeaders()
    )
    expect(forbidden.status).toBe(403)
    expect(calendarService.getMyWork).not.toHaveBeenCalled()

    const allowed = await requestJson(
      'GET',
      `/v1/organizations/${ORG}/my-work?userId=${USER}`,
      undefined,
      sessionHeaders()
    )
    expect(allowed.status).toBe(200)
    expect(calendarService.getMyWork).toHaveBeenCalledWith(ORG, USER)
  })

  it('keeps notifications scoped to the session caller', async () => {
    allowSession(['projects.view'], ['projects'])
    const forbidden = await requestJson(
      'GET',
      `/v1/organizations/${ORG}/notifications?userId=usr_other`,
      undefined,
      sessionHeaders()
    )
    expect(forbidden.status).toBe(403)
    expect(automationService.listNotifications).not.toHaveBeenCalled()

    const allowed = await requestJson(
      'GET',
      `/v1/organizations/${ORG}/notifications?userId=${USER}`,
      undefined,
      sessionHeaders()
    )
    expect(allowed.status).toBe(200)
    expect(automationService.listNotifications).toHaveBeenCalledWith(ORG, USER)
  })
})
