import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const {
  taskListsRepo,
  cyclesRepo,
  workStructureRepo,
  tenants,
  projects,
  issues,
  milestoneDetailsRepo,
  milestoneListRepo,
} = vi.hoisted(() => ({
  taskListsRepo: {
    listTaskLists: vi.fn(),
    retrieveTaskList: vi.fn(),
    createTaskList: vi.fn(),
    updateTaskList: vi.fn(),
    softDeleteTaskList: vi.fn(),
    taskListProgress: vi.fn(),
    countProjectTaskLists: vi.fn(),
    listProjectIssuesForBreakdown: vi.fn(),
    assignIssuesToTaskList: vi.fn(),
  },
  cyclesRepo: {
    listCycles: vi.fn(),
    retrieveCycle: vi.fn(),
    retrieveCycleByNumber: vi.fn(),
    maxCycleNumber: vi.fn(),
    createCycle: vi.fn(),
    updateCycle: vi.fn(),
    softDeleteCycle: vi.fn(),
    cycleProgress: vi.fn(),
    cycleThroughput: vi.fn(),
    assignIssuesToCycle: vi.fn(),
    unassignIssueFromCycle: vi.fn(),
  },
  workStructureRepo: {
    listMilestones: vi.fn(),
    retrieveMilestone: vi.fn(),
    retrieveMilestoneByKey: vi.fn(),
    createMilestone: vi.fn(),
    updateMilestone: vi.fn(),
    deleteMilestone: vi.fn(),
    listCycles: vi.fn(),
    retrieveCycle: vi.fn(),
  },
  tenants: { resolveTenant: vi.fn() },
  projects: { resolveProject: vi.fn() },
  issues: { resolveIssue: vi.fn() },
  milestoneDetailsRepo: {
    milestoneProgress: vi.fn(),
    listMilestoneComments: vi.fn(),
    retrieveMilestoneComment: vi.fn(),
    createMilestoneComment: vi.fn(),
    updateMilestoneComment: vi.fn(),
    deleteMilestoneComment: vi.fn(),
    listMilestoneEvents: vi.fn(),
    createMilestoneEvent: vi.fn(),
    listMilestoneCustomFields: vi.fn(),
    retrieveMilestoneCustomField: vi.fn(),
    retrieveMilestoneCustomFieldByKey: vi.fn(),
    createMilestoneCustomField: vi.fn(),
    updateMilestoneCustomField: vi.fn(),
    archiveMilestoneCustomField: vi.fn(),
    listMilestoneCustomFieldValues: vi.fn(),
    upsertMilestoneCustomFieldValue: vi.fn(),
    clearMilestoneCustomFieldValue: vi.fn(),
  },
  milestoneListRepo: { listOrganizationMilestones: vi.fn() },
}))

vi.mock('../task-lists.repository.js', () => taskListsRepo)
vi.mock('../cycles.repository.js', () => cyclesRepo)
vi.mock('../work-structure.repository.js', () => workStructureRepo)
vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../projects/index.js', () => projects)
vi.mock('../../issues/index.js', () => issues)
vi.mock('../milestone-details.repository.js', () => milestoneDetailsRepo)
vi.mock('../milestone-list.repository.js', () => milestoneListRepo)

const { createWorkStructureRouter } =
  await import('../work-structure.routes.js')

const SECOND = 1787767200n
const tenant = { id: 'prjten_1', organizationId: 'org_1' }
const project = { id: 'prj_1', tenantId: tenant.id, key: 'CONSOLE' }
const milestone = {
  id: 'ms_1',
  tenantId: tenant.id,
  projectId: project.id,
  key: 'v1',
  name: 'Version 1',
  description: null,
  status: 'open',
  startDate: SECOND,
  targetDate: SECOND + 100000n,
  completedAt: null,
  position: 0,
  deletedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
}

const taskListRow = {
  id: 'tl_1',
  tenantId: tenant.id,
  projectId: project.id,
  milestoneId: null,
  name: 'Backend',
  description: null,
  ownerUserId: null,
  startDate: null,
  targetDate: null,
  position: 0,
  archivedAt: null,
  deletedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
}

const phasedTaskListRow = {
  ...taskListRow,
  id: 'tl_2',
  milestoneId: 'ms_1',
  name: 'Phased work',
  position: 1,
}

function cycleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cyc_1',
    tenantId: tenant.id,
    projectId: project.id,
    number: 1,
    name: 'Sprint 1',
    description: null,
    goal: null,
    startsAt: SECOND,
    endsAt: SECOND + 604800n,
    completedAt: null,
    deletedAt: null,
    createdAt: SECOND,
    updatedAt: SECOND,
    ...overrides,
  }
}

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId', createWorkStructureRouter())
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

const ORG = '/v1/organizations/org_1'

beforeEach(() => {
  vi.clearAllMocks()
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenants.resolveTenant.mockResolvedValue(tenant)
  projects.resolveProject.mockResolvedValue(project)
  workStructureRepo.listMilestones.mockResolvedValue([])
  workStructureRepo.retrieveMilestone.mockResolvedValue(null)
  taskListsRepo.listTaskLists.mockResolvedValue([])
  taskListsRepo.retrieveTaskList.mockResolvedValue(null)
  taskListsRepo.taskListProgress.mockResolvedValue({ total: 0, completed: 0 })
  taskListsRepo.countProjectTaskLists.mockResolvedValue(0)
  taskListsRepo.createTaskList.mockImplementation(
    async (data: Record<string, unknown>) => ({
      description: null,
      ownerUserId: null,
      startDate: null,
      targetDate: null,
      milestoneId: null,
      position: 0,
      archivedAt: null,
      deletedAt: null,
      ...data,
    })
  )
  taskListsRepo.updateTaskList.mockImplementation(
    async (_id: string, patch: Record<string, unknown>) => ({
      ...taskListRow,
      ...patch,
    })
  )
  taskListsRepo.listProjectIssuesForBreakdown.mockResolvedValue([])
  taskListsRepo.assignIssuesToTaskList.mockResolvedValue({ error: null })
  cyclesRepo.listCycles.mockResolvedValue([])
  cyclesRepo.retrieveCycle.mockResolvedValue(null)
  cyclesRepo.retrieveCycleByNumber.mockResolvedValue(null)
  cyclesRepo.maxCycleNumber.mockResolvedValue(0)
  cyclesRepo.createCycle.mockImplementation(
    async (data: Record<string, unknown>) => ({
      description: null,
      goal: null,
      projectId: null,
      completedAt: null,
      deletedAt: null,
      ...data,
    })
  )
  cyclesRepo.updateCycle.mockImplementation(
    async (_id: string, patch: Record<string, unknown>) => ({
      ...cycleRow(),
      ...patch,
    })
  )
  cyclesRepo.cycleProgress.mockResolvedValue({
    total: 0,
    completed: 0,
    estimatePoints: 0,
    completedEstimatePoints: 0,
  })
  cyclesRepo.cycleThroughput.mockResolvedValue({ completedInWindow: 0 })
  cyclesRepo.assignIssuesToCycle.mockResolvedValue({ error: null })
  cyclesRepo.unassignIssueFromCycle.mockResolvedValue({ error: null })
})

describe('task-list routes', () => {
  it('rejects task-list reads without the internal key', async () => {
    const { status } = await requestJson(
      'GET',
      `${ORG}/projects/prj_1/task-lists`,
      undefined,
      { 'x-internal-key': 'wrong-key' }
    )
    expect(status).toBe(401)
  })

  it('lists task lists as a platform envelope with task-list discriminators', async () => {
    taskListsRepo.listTaskLists.mockResolvedValue([taskListRow])
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/projects/prj_1/task-lists`
    )
    expect(status).toBe(200)
    expect(body.data.object).toBe('list')
    expect(body.data.data[0]).toMatchObject({
      object: 'task-list',
      id: 'tl_1',
      projectId: 'prj_1',
      progress: { total: 0, completed: 0 },
    })
    expect(body.error).toBeNull()
  })

  it('returns tenant-not-found when the organization has no workspace', async () => {
    tenants.resolveTenant.mockResolvedValue(null)
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/projects/prj_1/task-lists`
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/tenant-not-found')
  })

  it('returns project-not-found for an unknown project', async () => {
    projects.resolveProject.mockResolvedValue(null)
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/projects/missing/task-lists`
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/project-not-found')
  })

  it('hides archived lists from default reads', async () => {
    await requestJson('GET', `${ORG}/projects/prj_1/task-lists`)
    expect(taskListsRepo.listTaskLists).toHaveBeenCalledWith(
      tenant.id,
      project.id,
      false
    )
  })

  it('shows archived lists when includeArchived=true', async () => {
    await requestJson(
      'GET',
      `${ORG}/projects/prj_1/task-lists?includeArchived=true`
    )
    expect(taskListsRepo.listTaskLists).toHaveBeenCalledWith(
      tenant.id,
      project.id,
      true
    )
  })

  it('creates a task list with 201 and camelCase Unix-second fields', async () => {
    const { status, body } = await requestJson(
      'POST',
      `${ORG}/projects/prj_1/task-lists`,
      { name: 'Backend' }
    )
    expect(status).toBe(201)
    expect(body.data).toMatchObject({
      object: 'task-list',
      name: 'Backend',
      projectId: 'prj_1',
    })
    expect(typeof body.data.createdAt).toBe('number')
    expect(body.data.id.startsWith('tl_')).toBe(true)
  })

  it('rejects a task-list create with an empty name', async () => {
    const { status } = await requestJson(
      'POST',
      `${ORG}/projects/prj_1/task-lists`,
      { name: '' }
    )
    expect(status).toBe(400)
    expect(taskListsRepo.createTaskList).not.toHaveBeenCalled()
  })

  it('rejects a task-list create when the phase belongs to another project', async () => {
    workStructureRepo.retrieveMilestone.mockResolvedValue({
      ...milestone,
      projectId: 'prj_other',
    })
    const { status, body } = await requestJson(
      'POST',
      `${ORG}/projects/prj_1/task-lists`,
      { name: 'Bad phase', milestoneId: 'ms_1' }
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/milestone-not-found')
  })

  it('returns tenant-not-found when creating under an unknown org', async () => {
    tenants.resolveTenant.mockResolvedValue(null)
    const { status, body } = await requestJson(
      'POST',
      `${ORG}/projects/prj_1/task-lists`,
      { name: 'Backend' }
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/tenant-not-found')
  })

  it('retrieves a task list with derived progress', async () => {
    taskListsRepo.retrieveTaskList.mockResolvedValue(taskListRow)
    taskListsRepo.taskListProgress.mockResolvedValue({
      total: 4,
      completed: 1,
    })
    const { status, body } = await requestJson('GET', `${ORG}/task-lists/tl_1`)
    expect(status).toBe(200)
    expect(body.data).toMatchObject({
      object: 'task-list',
      progress: { total: 4, completed: 1 },
    })
  })

  it('maps an unknown task-list id to 404', async () => {
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/task-lists/missing`
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/task-list-not-found')
  })

  it('isolates task-list retrieve by tenant', async () => {
    tenants.resolveTenant.mockResolvedValueOnce({
      id: 'prjten_other',
      organizationId: 'org_other',
    })
    taskListsRepo.retrieveTaskList.mockResolvedValue(null)
    const { status } = await requestJson('GET', `${ORG}/task-lists/tl_1`)
    expect(status).toBe(404)
    expect(taskListsRepo.retrieveTaskList).toHaveBeenCalledWith(
      'prjten_other',
      'tl_1'
    )
  })

  it('updates a task-list name', async () => {
    taskListsRepo.retrieveTaskList.mockResolvedValue(taskListRow)
    const { status, body } = await requestJson(
      'PATCH',
      `${ORG}/task-lists/tl_1`,
      {
        name: 'Frontend',
      }
    )
    expect(status).toBe(200)
    expect(body.data.name).toBe('Frontend')
  })

  it('rejects an empty task-list update', async () => {
    const { status } = await requestJson('PATCH', `${ORG}/task-lists/tl_1`, {})
    expect(status).toBe(400)
  })

  it('maps an unknown task-list update to 404', async () => {
    const { status, body } = await requestJson(
      'PATCH',
      `${ORG}/task-lists/missing`,
      {
        name: 'Nope',
      }
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/task-list-not-found')
  })

  it('soft-deletes a task list and returns a task-list tombstone', async () => {
    taskListsRepo.retrieveTaskList.mockResolvedValue(taskListRow)
    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/task-lists/tl_1`
    )
    expect(status).toBe(200)
    expect(body.data).toEqual({
      object: 'task-list',
      id: 'tl_1',
      deleted: true,
    })
    expect(taskListsRepo.softDeleteTaskList).toHaveBeenCalled()
  })

  it('maps an unknown task-list delete to 404', async () => {
    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/task-lists/missing`
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/task-list-not-found')
  })

  it('archives a task list', async () => {
    taskListsRepo.retrieveTaskList.mockResolvedValue(taskListRow)
    taskListsRepo.updateTaskList.mockResolvedValueOnce({
      ...taskListRow,
      archivedAt: SECOND,
    })
    const { status, body } = await requestJson(
      'POST',
      `${ORG}/task-lists/tl_1/archive`,
      {}
    )
    expect(status).toBe(200)
    expect(body.data.archivedAt).toBe(Number(SECOND))
  })

  it('restores an archived task list', async () => {
    taskListsRepo.retrieveTaskList.mockResolvedValue({
      ...taskListRow,
      archivedAt: SECOND,
    })
    const { status, body } = await requestJson(
      'POST',
      `${ORG}/task-lists/tl_1/restore`,
      {}
    )
    expect(status).toBe(200)
    expect(body.data.archivedAt).toBeNull()
  })

  it('reorders task lists by ordered ids', async () => {
    taskListsRepo.retrieveTaskList
      .mockResolvedValueOnce(taskListRow)
      .mockResolvedValueOnce(phasedTaskListRow)
    taskListsRepo.listTaskLists.mockResolvedValue([
      taskListRow,
      phasedTaskListRow,
    ])
    const { status, body } = await requestJson(
      'PUT',
      `${ORG}/projects/prj_1/task-lists/order`,
      { orderedIds: ['tl_2', 'tl_1'] }
    )
    expect(status).toBe(200)
    expect(taskListsRepo.updateTaskList).toHaveBeenCalledWith(
      'tl_2',
      expect.objectContaining({ position: 0 })
    )
    expect(taskListsRepo.updateTaskList).toHaveBeenCalledWith(
      'tl_1',
      expect.objectContaining({ position: 1 })
    )
    expect(body.data.object).toBe('list')
  })

  it('rejects reorder with duplicate ids', async () => {
    const { status } = await requestJson(
      'PUT',
      `${ORG}/projects/prj_1/task-lists/order`,
      { orderedIds: ['tl_1', 'tl_1'] }
    )
    expect(status).toBe(400)
  })

  it('maps reorder with an unknown id to 404', async () => {
    taskListsRepo.retrieveTaskList
      .mockResolvedValueOnce(taskListRow)
      .mockResolvedValueOnce(null)
    const { status, body } = await requestJson(
      'PUT',
      `${ORG}/projects/prj_1/task-lists/order`,
      { orderedIds: ['tl_1', 'missing'] }
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/task-list-not-found')
  })

  it('moves issues into a task list and applies the phase rule', async () => {
    taskListsRepo.retrieveTaskList.mockResolvedValue(phasedTaskListRow)
    const { status, body } = await requestJson(
      'POST',
      `${ORG}/task-lists/tl_2/issues`,
      { issueIds: ['iss_1', 'iss_2'] }
    )
    expect(status).toBe(200)
    expect(taskListsRepo.assignIssuesToTaskList).toHaveBeenCalledWith(
      tenant.id,
      phasedTaskListRow,
      ['iss_1', 'iss_2'],
      null,
      expect.any(BigInt)
    )
    expect(body.data.milestoneId).toBe('ms_1')
  })

  it('maps move-issues with an unknown list to 404', async () => {
    const { status, body } = await requestJson(
      'POST',
      `${ORG}/task-lists/missing/issues`,
      { issueIds: ['iss_1'] }
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/task-list-not-found')
  })

  it('returns a work breakdown with phases, unphased lists, and unlisted items', async () => {
    workStructureRepo.listMilestones.mockResolvedValue([milestone])
    taskListsRepo.listTaskLists.mockResolvedValue([
      taskListRow,
      phasedTaskListRow,
    ])
    taskListsRepo.listProjectIssuesForBreakdown.mockResolvedValue([
      {
        id: 'iss_1',
        identifier: 'CONSOLE-1',
        title: 'Root in phased list',
        status: 'todo',
        taskListId: 'tl_2',
        milestoneId: 'ms_1',
        parentIssueId: null,
      },
      {
        id: 'iss_2',
        identifier: 'CONSOLE-2',
        title: 'Child of iss_1',
        status: 'todo',
        taskListId: 'tl_2',
        milestoneId: 'ms_1',
        parentIssueId: 'iss_1',
      },
      {
        id: 'iss_3',
        identifier: 'CONSOLE-3',
        title: 'Unlisted root',
        status: 'todo',
        taskListId: null,
        milestoneId: null,
        parentIssueId: null,
      },
    ])
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/projects/prj_1/work-breakdown`
    )
    expect(status).toBe(200)
    expect(body.data.object).toBe('work-breakdown')
    expect(body.data.projectId).toBe('prj_1')
    expect(body.data.phases).toHaveLength(1)
    expect(body.data.phases[0].taskLists).toHaveLength(1)
    expect(body.data.phases[0].taskLists[0].issues[0]).toMatchObject({
      id: 'iss_1',
      subIssueCount: 1,
    })
    expect(body.data.unphasedTaskLists).toHaveLength(1)
    expect(body.data.unlistedIssues).toHaveLength(1)
  })
})

describe('cycle routes', () => {
  it('lists cycles as a platform envelope with cycle discriminators', async () => {
    cyclesRepo.listCycles.mockResolvedValue([cycleRow()])
    const { status, body } = await requestJson('GET', `${ORG}/cycles`)
    expect(status).toBe(200)
    expect(body.data.object).toBe('list')
    expect(body.data.data[0]).toMatchObject({
      object: 'cycle',
      id: 'cyc_1',
      status: expect.any(String),
      progress: expect.objectContaining({ total: expect.any(Number) }),
      throughput: expect.objectContaining({
        completedInWindow: expect.any(Number),
      }),
    })
  })

  it('filters cycles by projectId', async () => {
    await requestJson('GET', `${ORG}/cycles?projectId=prj_1`)
    expect(projects.resolveProject).toHaveBeenCalledWith(tenant.id, 'prj_1')
    expect(cyclesRepo.listCycles).toHaveBeenCalledWith(tenant.id, 'prj_1')
  })

  it('filters cycles by derived status', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    cyclesRepo.listCycles.mockResolvedValue([
      cycleRow({
        id: 'cyc_upcoming',
        startsAt: BigInt(nowSeconds + 100000),
        endsAt: BigInt(nowSeconds + 200000),
        completedAt: null,
      }),
      cycleRow({
        id: 'cyc_active',
        startsAt: BigInt(nowSeconds - 1000),
        endsAt: BigInt(nowSeconds + 100000),
        completedAt: null,
      }),
    ])
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/cycles?status=active`
    )
    expect(status).toBe(200)
    expect(body.data.data.map((cycle: { id: string }) => cycle.id)).toEqual([
      'cyc_active',
    ])
  })

  it('returns tenant-not-found for cycle listing without a workspace', async () => {
    tenants.resolveTenant.mockResolvedValue(null)
    const { status, body } = await requestJson('GET', `${ORG}/cycles`)
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/tenant-not-found')
  })

  it('returns project-not-found when filtering cycles by an unknown project', async () => {
    projects.resolveProject.mockResolvedValue(null)
    const { status, body } = await requestJson(
      'GET',
      `${ORG}/cycles?projectId=missing`
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/project-not-found')
  })

  it('creates a cycle with 201 and derived active status', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    const { status, body } = await requestJson('POST', `${ORG}/cycles`, {
      name: 'Sprint 1',
      startsAt: nowSeconds - 100,
      endsAt: nowSeconds + 100000,
    })
    expect(status).toBe(201)
    expect(body.data).toMatchObject({ object: 'cycle', name: 'Sprint 1' })
    expect(body.data.status).toBe('active')
    expect(body.data.id.startsWith('cyc_')).toBe(true)
  })

  it('rejects a cycle create when endsAt is not after startsAt', async () => {
    const { status } = await requestJson('POST', `${ORG}/cycles`, {
      name: 'Bad',
      startsAt: 200,
      endsAt: 100,
    })
    expect(status).toBe(400)
    expect(cyclesRepo.createCycle).not.toHaveBeenCalled()
  })

  it('rejects a cycle create for an unknown project', async () => {
    projects.resolveProject.mockResolvedValue(null)
    const { status, body } = await requestJson('POST', `${ORG}/cycles`, {
      name: 'Bad project',
      projectId: 'missing',
      startsAt: 100,
      endsAt: 200,
    })
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/project-not-found')
  })

  it('retrieves a cycle with progress and throughput', async () => {
    cyclesRepo.retrieveCycle.mockResolvedValue(cycleRow())
    cyclesRepo.cycleProgress.mockResolvedValue({
      total: 5,
      completed: 2,
      estimatePoints: 8,
      completedEstimatePoints: 3,
    })
    cyclesRepo.cycleThroughput.mockResolvedValue({ completedInWindow: 2 })
    const { status, body } = await requestJson('GET', `${ORG}/cycles/cyc_1`)
    expect(status).toBe(200)
    expect(body.data).toMatchObject({
      object: 'cycle',
      progress: {
        total: 5,
        completed: 2,
        estimatePoints: 8,
        completedEstimatePoints: 3,
      },
      throughput: expect.objectContaining({ completedInWindow: 2 }),
    })
  })

  it('maps an unknown cycle retrieve to 404', async () => {
    const { status, body } = await requestJson('GET', `${ORG}/cycles/missing`)
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/cycle-not-found')
  })

  it('derives upcoming status for a future cycle', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    cyclesRepo.retrieveCycle.mockResolvedValue(
      cycleRow({
        startsAt: BigInt(nowSeconds + 50000),
        endsAt: BigInt(nowSeconds + 100000),
        completedAt: null,
      })
    )
    const { body } = await requestJson('GET', `${ORG}/cycles/cyc_1`)
    expect(body.data.status).toBe('upcoming')
  })

  it('derives completed status for a past cycle', async () => {
    const nowSeconds = Math.floor(Date.now() / 1000)
    cyclesRepo.retrieveCycle.mockResolvedValue(
      cycleRow({
        startsAt: BigInt(nowSeconds - 200000),
        endsAt: BigInt(nowSeconds - 100000),
        completedAt: null,
      })
    )
    const { body } = await requestJson('GET', `${ORG}/cycles/cyc_1`)
    expect(body.data.status).toBe('completed')
  })

  it('updates a cycle name', async () => {
    cyclesRepo.retrieveCycle.mockResolvedValue(cycleRow())
    const { status, body } = await requestJson('PATCH', `${ORG}/cycles/cyc_1`, {
      name: 'Sprint 2',
    })
    expect(status).toBe(200)
    expect(body.data.name).toBe('Sprint 2')
  })

  it('rejects an empty cycle update', async () => {
    const { status } = await requestJson('PATCH', `${ORG}/cycles/cyc_1`, {})
    expect(status).toBe(400)
  })

  it('rejects a cycle update with an invalid window', async () => {
    cyclesRepo.retrieveCycle.mockResolvedValue(cycleRow())
    const { status } = await requestJson('PATCH', `${ORG}/cycles/cyc_1`, {
      startsAt: 300,
      endsAt: 200,
    })
    expect(status).toBe(400)
  })

  it('maps an unknown cycle update to 404', async () => {
    const { status, body } = await requestJson(
      'PATCH',
      `${ORG}/cycles/missing`,
      {
        name: 'Nope',
      }
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/cycle-not-found')
  })

  it('soft-deletes a cycle and returns a cycle tombstone', async () => {
    cyclesRepo.retrieveCycle.mockResolvedValue(cycleRow())
    const { status, body } = await requestJson('DELETE', `${ORG}/cycles/cyc_1`)
    expect(status).toBe(200)
    expect(body.data).toEqual({ object: 'cycle', id: 'cyc_1', deleted: true })
    expect(cyclesRepo.softDeleteCycle).toHaveBeenCalled()
  })

  it('maps an unknown cycle delete to 404', async () => {
    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/cycles/missing`
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/cycle-not-found')
  })

  it('assigns issues to a cycle', async () => {
    cyclesRepo.retrieveCycle.mockResolvedValue(cycleRow())
    const { status } = await requestJson('POST', `${ORG}/cycles/cyc_1/issues`, {
      issueIds: ['iss_1'],
    })
    expect(status).toBe(200)
    expect(cyclesRepo.assignIssuesToCycle).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ id: 'cyc_1' }),
      ['iss_1'],
      null,
      expect.any(BigInt)
    )
  })

  it('maps assign-issues with an unknown cycle to 404', async () => {
    const { status, body } = await requestJson(
      'POST',
      `${ORG}/cycles/missing/issues`,
      {
        issueIds: ['iss_1'],
      }
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/cycle-not-found')
  })

  it('unassigns an issue from a cycle', async () => {
    cyclesRepo.retrieveCycle.mockResolvedValue(cycleRow())
    const { status } = await requestJson(
      'DELETE',
      `${ORG}/cycles/cyc_1/issues/iss_1`
    )
    expect(status).toBe(200)
    expect(cyclesRepo.unassignIssueFromCycle).toHaveBeenCalledWith(
      tenant.id,
      'cyc_1',
      'iss_1',
      null,
      expect.any(BigInt)
    )
  })

  it('maps unassign with an unknown cycle to 404', async () => {
    const { status, body } = await requestJson(
      'DELETE',
      `${ORG}/cycles/missing/issues/iss_1`
    )
    expect(status).toBe(404)
    expect(body.error.code).toBe('projects/cycle-not-found')
  })
})
