import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const { tenantsMod, projectsMod, issuesMod, workStructureMod, automationMod, activityRepo, followersRepo } =
  vi.hoisted(() => ({
    tenantsMod: { resolveTenant: vi.fn() },
    projectsMod: { resolveProject: vi.fn() },
    issuesMod: { resolveIssue: vi.fn() },
    workStructureMod: { resolveMilestoneById: vi.fn() },
    automationMod: { createNotificationRecord: vi.fn() },
    activityRepo: { listActivity: vi.fn() },
    followersRepo: {
      upsertFollows: vi.fn(),
      upsertTenantFollows: vi.fn(),
      followOne: vi.fn(),
      removeFollow: vi.fn(),
      listForSubject: vi.fn(),
    },
  }))

vi.mock('../../tenants/index.js', () => tenantsMod)
vi.mock('../../projects/index.js', () => projectsMod)
vi.mock('../../issues/index.js', () => issuesMod)
vi.mock('../../work-structure/index.js', () => workStructureMod)
vi.mock('../../automation/index.js', () => automationMod)
vi.mock('../activity.repository.js', () => activityRepo)
vi.mock('../followers.repository.js', () => followersRepo)

const { createActivityRouter } = await import('../activity.routes.js')
const { createFollowersRouter } = await import('../followers.routes.js')

const tenant = { id: 'ten_alpha' }
const project = { id: 'prj_alpha' }
const ORG = '/v1/organizations/org_1'

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId/followers', createFollowersRouter())
  app.use('/v1/organizations/:organizationId/projects', createActivityRouter())
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

function activityRow(id: string, createdAt: bigint) {
  return {
    id,
    kind: 'issue-event',
    subjectType: 'work-item',
    subjectId: 'iss_1',
    actorUserId: 'usr_ada',
    type: 'status-changed',
    fromValue: 'todo',
    toValue: 'doing',
    createdAt,
  }
}

const followerRow = {
  id: 'flw_1',
  tenantId: tenant.id,
  subjectType: 'project',
  subjectId: project.id,
  userId: 'usr_ada',
  createdAt: 1787767200n,
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsMod.resolveTenant.mockResolvedValue(tenant)
  projectsMod.resolveProject.mockResolvedValue(project)
  activityRepo.listActivity.mockResolvedValue([])
  followersRepo.listForSubject.mockResolvedValue([])
  followersRepo.followOne.mockResolvedValue(followerRow)
  followersRepo.removeFollow.mockResolvedValue(true)
})

describe('activity routes', () => {
  it('rejects activity reads without the internal key', async () => {
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/projects/prj_alpha/activity`,
      undefined,
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(body.data).toBeNull()
    expect(body.error.code).toBe('projects/unauthorized')
    expect(activityRepo.listActivity).not.toHaveBeenCalled()
  })

  it('reads activity for an unknown tenant as 404', async () => {
    tenantsMod.resolveTenant.mockResolvedValue(null)

    const { status, body } = await requestJson(
      'GET',
      `${ORG}/projects/prj_alpha/activity`
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/tenant-not-found')
    expect(activityRepo.listActivity).not.toHaveBeenCalled()
  })

  it('reads activity for an unknown project as 404', async () => {
    projectsMod.resolveProject.mockResolvedValue(null)

    const { status, body } = await requestJson(
      'GET',
      `${ORG}/projects/prj_missing/activity`
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/project-not-found')
  })

  it('rejects unknown activity query params with 400', async () => {
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/projects/prj_alpha/activity?limit=5&unknown_param=1`
    )

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/invalid-request')
    expect(activityRepo.listActivity).not.toHaveBeenCalled()
  })

  it('rejects out-of-range activity limits with 400', async () => {
    const { status } = await requestJson(
      'GET',
      `${ORG}/projects/prj_alpha/activity?limit=500`
    )

    expect(status).toBe(400)
    expect(activityRepo.listActivity).not.toHaveBeenCalled()
  })

  it('lists activity newest-first over HTTP', async () => {
    activityRepo.listActivity.mockResolvedValue([
      activityRow('evt_2', 1787767250n),
      activityRow('evt_1', 1787767200n),
    ])

    const { status, body } = await requestJson(
      'GET',
      `${ORG}/projects/prj_alpha/activity?limit=25`
    )

    expect(status).toBe(200)
    expect(body.data.object).toBe('projects.activity-feed')
    expect(body.data.items.map((item: { id: string }) => item.id)).toEqual([
      'evt_2',
      'evt_1',
    ])
    expect(body.error).toBeNull()
  })
})

describe('followers routes', () => {
  it('rejects follower reads without the internal key', async () => {
    const { status } = await requestJson(
      'GET',
      `${ORG}/followers?subjectType=project&subjectId=prj_alpha`,
      undefined,
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(followersRepo.listForSubject).not.toHaveBeenCalled()
  })

  it('rejects follows without the internal key', async () => {
    const { status } = await requestJson(
      'POST',
      `${ORG}/followers`,
      { subjectType: 'project', subjectId: 'prj_alpha', userId: 'usr_ada' },
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(followersRepo.followOne).not.toHaveBeenCalled()
  })

  it('rejects unfollows without the internal key', async () => {
    const { status } = await requestJson(
      'DELETE',
      `${ORG}/followers?subjectType=project&subjectId=prj_alpha&userId=usr_ada`,
      undefined,
      { 'x-internal-key': 'wrong-key' }
    )

    expect(status).toBe(401)
    expect(followersRepo.removeFollow).not.toHaveBeenCalled()
  })

  it('reads followers for an unknown tenant as 404', async () => {
    tenantsMod.resolveTenant.mockResolvedValue(null)

    const { status, body } = await requestJson(
      'GET',
      `${ORG}/followers?subjectType=project&subjectId=prj_alpha`
    )

    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/tenant-not-found')
  })

  it('rejects strict follow bodies with unknown fields', async () => {
    const { status, body } = await requestJson('POST', `${ORG}/followers`, {
      subjectType: 'project',
      subjectId: 'prj_alpha',
      userId: 'usr_ada',
      injected: true,
    })

    expect(status).toBe(400)
    expect(body.error.code).toBe('projects/invalid-request')
    expect(followersRepo.followOne).not.toHaveBeenCalled()
  })

  it('rejects unfollows missing the user scope with 400', async () => {
    const { status } = await requestJson(
      'DELETE',
      `${ORG}/followers?subjectType=project&subjectId=prj_alpha`
    )

    expect(status).toBe(400)
    expect(followersRepo.removeFollow).not.toHaveBeenCalled()
  })

  it('follows a project over HTTP with a 201 envelope', async () => {
    const { status, body } = await requestJson('POST', `${ORG}/followers`, {
      subjectType: 'project',
      subjectId: 'prj_alpha',
      userId: 'usr_ada',
    })

    expect(status).toBe(201)
    expect(body.data).toMatchObject({
      object: 'projects.follower',
      userId: 'usr_ada',
    })
    expect(followersRepo.followOne).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ subjectId: 'prj_alpha', userId: 'usr_ada' })
    )
  })

  it('lists followers over HTTP as a platform envelope', async () => {
    followersRepo.listForSubject.mockResolvedValue([followerRow])

    const { status, body } = await requestJson(
      'GET',
      `${ORG}/followers?subjectType=project&subjectId=prj_alpha`
    )

    expect(status).toBe(200)
    expect(body.data.object).toBe('list')
    expect(body.data.data).toHaveLength(1)
  })
})
