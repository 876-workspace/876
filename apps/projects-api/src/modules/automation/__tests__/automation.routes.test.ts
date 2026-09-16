import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { workflowsService, automationService, worker } = vi.hoisted(() => ({
  workflowsService: { getBlueprint: vi.fn(), putBlueprint: vi.fn() },
  automationService: {
    listRules: vi.fn(),
    createRule: vi.fn(),
    retrieveRule: vi.fn(),
    updateRule: vi.fn(),
    removeRule: vi.fn(),
    listRuns: vi.fn(),
    testRule: vi.fn(),
    listNotifications: vi.fn(),
    readNotification: vi.fn(),
  },
  worker: { drainAutomation: vi.fn() },
}))

vi.mock('../../workflows/workflows.service.js', () => workflowsService)
vi.mock('../automation.service.js', () => automationService)
vi.mock('../../../workers/automation.js', () => worker)

const { createWorkflowsRouter } =
  await import('../../workflows/workflows.routes.js')
const { createAutomationRouter } = await import('../automation.routes.js')
const { createAutomationInternalRouter } =
  await import('../automation.internal-routes.js')

const ORG = '/v1/organizations/org_1'

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId', createWorkflowsRouter())
  app.use('/v1/organizations/:organizationId', createAutomationRouter())
  app.use('/internal', createAutomationInternalRouter())
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
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  workflowsService.getBlueprint.mockResolvedValue({
    data: {
      object: 'projects.workflow-blueprint',
      workItemTypeId: 'wit_1',
      updatedAt: null,
      transitions: [],
    },
    error: null,
  })
  workflowsService.putBlueprint.mockResolvedValue({
    data: {
      object: 'projects.workflow-blueprint',
      workItemTypeId: 'wit_1',
      updatedAt: 1000,
      transitions: [],
    },
    error: null,
  })
  automationService.listRules.mockResolvedValue({
    data: { items: [], hasMore: false, totalCount: 0 },
    error: null,
  })
  automationService.createRule.mockResolvedValue({
    data: { object: 'projects.automation-rule', id: 'arl_1' },
    error: null,
  })
  automationService.listRuns.mockResolvedValue({
    data: { items: [], hasMore: false, totalCount: 0 },
    error: null,
  })
  automationService.testRule.mockResolvedValue({
    data: { object: 'projects.automation-test', matched: true },
    error: null,
  })
  automationService.listNotifications.mockResolvedValue({
    data: { items: [], hasMore: false, totalCount: 0 },
    error: null,
  })
  automationService.readNotification.mockResolvedValue({
    data: { object: 'projects.notification', id: 'ntf_1' },
    error: null,
  })
  worker.drainAutomation.mockResolvedValue({
    claimed: 1,
    processedEvents: 1,
    succeeded: 1,
    failed: 0,
    skipped: 0,
    swept: { tenants: 1, dueApproaching: 0, budgetThreshold: 0 },
  })
})

describe('blueprint routes', () => {
  it('returns the blueprint for a type', async () => {
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/workflows/wit_1/blueprint`
    )

    expect(status).toBe(200)
    expect(body.data.object).toBe('projects.workflow-blueprint')
    expect(workflowsService.getBlueprint).toHaveBeenCalledWith('org_1', 'wit_1')
  })

  it('replaces the blueprint for a type', async () => {
    const { status } = await requestJson(
      'PUT',
      `${ORG}/workflows/wit_1/blueprint`,
      { transitions: [] }
    )

    expect(status).toBe(200)
    expect(workflowsService.putBlueprint).toHaveBeenCalledWith(
      'org_1',
      'wit_1',
      {
        transitions: [],
      }
    )
  })

  it('rejects blueprint calls without the internal key', async () => {
    const { status } = await requestJson(
      'GET',
      `${ORG}/workflows/wit_1/blueprint`,
      undefined,
      { 'x-internal-key': 'wrong' }
    )

    expect(status).toBe(401)
  })
})

describe('automation rule routes', () => {
  it('lists rules as a platform envelope', async () => {
    const { status, body } = await requestJson('GET', `${ORG}/automation-rules`)

    expect(status).toBe(200)
    expect(body.data.object).toBe('list')
  })

  it('creates rules', async () => {
    const { status } = await requestJson('POST', `${ORG}/automation-rules`, {
      name: 'R',
      trigger: 'work-item.created',
      actions: [{ type: 'notify', userId: 'u', title: 't' }],
    })

    expect(status).toBe(201)
  })

  it('lists runs for a rule', async () => {
    const { status } = await requestJson(
      'GET',
      `${ORG}/automation-rules/arl_1/runs`
    )

    expect(status).toBe(200)
    expect(automationService.listRuns).toHaveBeenCalledWith('org_1', 'arl_1')
  })

  it('dry-runs a rule against a subject', async () => {
    const { status } = await requestJson(
      'POST',
      `${ORG}/automation-rules/arl_1/test`,
      { subjectId: 'iss_1' }
    )

    expect(status).toBe(200)
    expect(automationService.testRule).toHaveBeenCalledWith('org_1', 'arl_1', {
      subjectId: 'iss_1',
    })
  })
})

describe('notification routes', () => {
  it('lists notifications for a user', async () => {
    const { status } = await requestJson(
      'GET',
      `${ORG}/notifications?userId=user_1`
    )

    expect(status).toBe(200)
    expect(automationService.listNotifications).toHaveBeenCalledWith(
      'org_1',
      'user_1'
    )
  })

  it('requires the user scope', async () => {
    const { status } = await requestJson('GET', `${ORG}/notifications`)

    expect(status).toBe(400)
  })

  it('marks notifications read', async () => {
    const { status } = await requestJson(
      'POST',
      `${ORG}/notifications/ntf_1/read`
    )

    expect(status).toBe(200)
    expect(automationService.readNotification).toHaveBeenCalledWith(
      'org_1',
      'ntf_1'
    )
  })
})

describe('drain route', () => {
  it('drains a bounded batch and returns counts', async () => {
    const { status, body } = await requestJson(
      'POST',
      '/internal/automation/drain',
      { limit: 10 }
    )

    expect(status).toBe(200)
    expect(worker.drainAutomation).toHaveBeenCalledWith(10)
    expect(body.data).toMatchObject({ claimed: 1, succeeded: 1 })
  })

  it('rejects drain calls without the internal key', async () => {
    const { status } = await requestJson(
      'POST',
      '/internal/automation/drain',
      {},
      { 'x-internal-key': 'wrong' }
    )

    expect(status).toBe(401)
  })

  it('drains on a Vercel cron GET carrying the cron secret', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    const { status } = await requestJson(
      'GET',
      '/internal/automation/drain',
      undefined,
      {
        'x-internal-key': '',
        authorization: 'Bearer test-cron-secret',
      }
    )

    expect(status).toBe(200)
    expect(worker.drainAutomation).toHaveBeenCalledTimes(1)
    delete process.env.CRON_SECRET
  })

  it('rejects a cron GET with the wrong bearer secret', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    const { status } = await requestJson(
      'GET',
      '/internal/automation/drain',
      undefined,
      {
        'x-internal-key': '',
        authorization: 'Bearer wrong',
      }
    )

    expect(status).toBe(401)
    expect(worker.drainAutomation).not.toHaveBeenCalled()
    delete process.env.CRON_SECRET
  })

  it('never accepts a bearer token when no cron secret is configured', async () => {
    delete process.env.CRON_SECRET
    const { status } = await requestJson(
      'GET',
      '/internal/automation/drain',
      undefined,
      {
        'x-internal-key': '',
        authorization: 'Bearer ',
      }
    )

    expect(status).toBe(401)
    expect(worker.drainAutomation).not.toHaveBeenCalled()
  })
})
