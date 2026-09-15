import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { errorHandler } from '../../../http/error-handler.js'

const {
  tenantsRepo,
  projectsRepo,
  labelsRepo,
  commentsRepo,
  workStructureRepo,
  milestoneDetailsRepo,
  milestoneListRepo,
  taskListsRepo,
  cyclesRepo,
  repository,
  issueLinksRepo,
  txMock,
} = vi.hoisted(() => {
  const transactionClient = { transaction: 'projects-issue-links-transaction' }
  const tx = {
    transactionClient,
    allocateIssueNumber: vi.fn(),
    createIssue: vi.fn(),
    createEvent: vi.fn(),
    setLabels: vi.fn(),
    updateIssue: vi.fn(),
  }
  return {
    tenantsRepo: {
      retrieveByOrganization: vi.fn(),
    },
    projectsRepo: {
      retrieve: vi.fn(),
      retrieveByKey: vi.fn(),
    },
    labelsRepo: {
      retrieve: vi.fn(),
      retrieveByName: vi.fn(),
      create: vi.fn(),
    },
    commentsRepo: {
      list: vi.fn(),
      count: vi.fn(),
      retrieve: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      softDelete: vi.fn(),
      hardDelete: vi.fn(),
    },
    workStructureRepo: {
      retrieveWorkflowState: vi.fn(),
      retrieveWorkflowStateByKey: vi.fn(),
      retrieveDefaultWorkflowState: vi.fn(),
      retrieveWorkItemType: vi.fn(),
      retrieveWorkItemTypeByKey: vi.fn(),
      retrieveDefaultWorkItemType: vi.fn(),
      retrieveMilestone: vi.fn(),
      listCustomFields: vi.fn(),
      listCustomFieldValues: vi.fn(),
      retrieveCustomField: vi.fn(),
      upsertCustomFieldValue: vi.fn(),
      clearCustomFieldValue: vi.fn(),
    },
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
    repository: {
      list: vi.fn(),
      count: vi.fn(),
      retrieve: vi.fn(),
      retrieveByIdentifier: vi.fn(),
      retrieveByRef: vi.fn(),
      listEvents: vi.fn(),
      softDelete: vi.fn(),
      hardDelete: vi.fn(),
      getBatchEnrichment: vi.fn(),
      transaction: vi.fn(),
    },
    issueLinksRepo: {
      listRelations: vi.fn(),
      findRelation: vi.fn(),
      findRelationBetween: vi.fn(),
      findUnorderedRelation: vi.fn(),
      createRelation: vi.fn(),
      deleteRelation: vi.fn(),
      listPredecessorLinks: vi.fn(),
      listSuccessorLinks: vi.fn(),
      listSuccessorDependencies: vi.fn(),
      findDependency: vi.fn(),
      findDependencyBetween: vi.fn(),
      createDependency: vi.fn(),
      updateDependency: vi.fn(),
      deleteDependency: vi.fn(),
      listSuccessorIds: vi.fn(),
      listRelationsForIssues: vi.fn(),
      listDependenciesForIssues: vi.fn(),
      listIssueStatuses: vi.fn(),
    },
    txMock: tx,
  }
})

vi.mock('../../tenants/tenants.repository.js', () => tenantsRepo)
vi.mock('../../projects/projects.repository.js', () => projectsRepo)
vi.mock('../../labels/labels.repository.js', () => labelsRepo)
vi.mock('../../comments/comments.repository.js', () => commentsRepo)
vi.mock(
  '../../work-structure/work-structure.repository.js',
  () => workStructureRepo
)
vi.mock(
  '../../work-structure/milestone-details.repository.js',
  () => milestoneDetailsRepo
)
vi.mock(
  '../../work-structure/milestone-list.repository.js',
  () => milestoneListRepo
)
vi.mock('../../work-structure/task-lists.repository.js', () => taskListsRepo)
vi.mock('../../work-structure/cycles.repository.js', () => cyclesRepo)
vi.mock('../issues.repository.js', () => repository)
vi.mock('../issue-links.repository.js', () => issueLinksRepo)

const service = await import('../issue-links.service.js')
const issuesService = await import('../issues.service.js')
const { createIssuesRouter } = await import('../issues.routes.js')

const SECOND = 1787767200n

const tenant = {
  id: 'prjten_links_1',
  organizationId: 'org_links_1',
  triageProjectId: 'prj_triage_links',
  createdAt: SECOND,
  updatedAt: SECOND,
}

const mockProjectRow = {
  id: 'prj_links_1',
  tenantId: tenant.id,
  name: 'Console Platform',
  key: 'CONSOLE',
  slug: 'console-platform',
  description: null,
  leadUserId: null,
  status: 'active',
  health: 'on-track',
  startDate: null,
  targetDate: null,
  nextIssueNumber: 101,
  customerId: null,
  defaultWorkItemTypeId: null,
  position: 0,
  archivedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
}

const mockTriageProject = {
  ...mockProjectRow,
  id: 'prj_triage_links',
  name: 'Triage',
  key: 'TRI',
  slug: 'triage',
}

function issueRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'iss_phase4_a',
    tenantId: tenant.id,
    projectId: mockProjectRow.id,
    number: 101,
    identifier: 'CONSOLE-101',
    title: 'Phase four anchor',
    description: null,
    status: 'todo',
    workflowStateId: 'wfs_todo_1',
    typeKey: 'task',
    workItemTypeId: 'wit_task_1',
    milestoneId: null,
    taskListId: null,
    cycleId: null,
    priority: 'none',
    assigneeUserId: null,
    creatorUserId: 'usr_creator_1',
    parentIssueId: null,
    estimate: null,
    dueDate: null,
    plannedStartDate: 1788000000n,
    plannedFinishDate: 1788086400n,
    plannedDurationMinutes: 1440,
    position: 0,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    deletedAt: null,
    createdAt: SECOND,
    updatedAt: SECOND,
    project: { key: 'CONSOLE' },
    labels: [],
    ...overrides,
  }
}

const issueA = issueRow()
const issueB = issueRow({
  id: 'iss_phase4_b',
  number: 102,
  identifier: 'CONSOLE-102',
  title: 'Phase four blocker',
  status: 'in-progress',
  plannedStartDate: 1787900000n,
  plannedFinishDate: 1787950000n,
  plannedDurationMinutes: 800,
})
const issueC = issueRow({
  id: 'iss_phase4_c',
  projectId: mockTriageProject.id,
  number: 1,
  identifier: 'TRI-1',
  title: 'Triage issue',
  project: { key: 'TRI' },
})
const doneIssue = issueRow({
  id: 'iss_phase4_done',
  number: 103,
  identifier: 'CONSOLE-103',
  title: 'Finished issue',
  status: 'done',
})

const schedIssue = issueRow({
  id: 'iss_phase4_sched',
  number: 104,
  identifier: 'CONSOLE-104',
  title: 'Scheduled successor',
  plannedStartDate: 1788000000n,
  plannedFinishDate: 1788086400n,
  plannedDurationMinutes: 60,
})

const issuesById: Record<string, ReturnType<typeof issueRow>> = {
  [issueA.id]: issueA,
  [issueB.id]: issueB,
  [issueC.id]: issueC,
  [doneIssue.id]: doneIssue,
  [schedIssue.id]: schedIssue,
}

function relationRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'isr_1',
    tenantId: tenant.id,
    sourceIssueId: issueA.id,
    targetIssueId: issueB.id,
    type: 'blocks',
    createdBy: null,
    createdAt: SECOND,
    ...overrides,
  }
}

function dependencyRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'isd_1',
    tenantId: tenant.id,
    predecessorIssueId: issueB.id,
    successorIssueId: issueA.id,
    type: 'finish-to-start',
    lagMinutes: 0,
    createdBy: null,
    createdAt: SECOND,
    ...overrides,
  }
}

const taskType = {
  id: 'wit_task_1',
  tenantId: tenant.id,
  key: 'task',
  name: 'Task',
  iconKey: 'check-square',
  color: '#2563eb',
  hierarchyLevel: 1,
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
}

const todoState = {
  id: 'wfs_todo_1',
  tenantId: tenant.id,
  key: 'todo',
  name: 'To do',
  category: 'unstarted',
  color: '#64748b',
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
}

async function requestJson(
  method: string,
  path: string,
  body?: unknown,
  headers: Record<string, string> = {}
) {
  const app = express()
  app.use(express.json())
  app.use('/v1/organizations/:organizationId/issues', createIssuesRouter())
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

    return {
      status: response.status,
      body: await response.json(),
    }
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()))
  }
}

beforeEach(() => {
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  tenantsRepo.retrieveByOrganization.mockResolvedValue(tenant)
  projectsRepo.retrieve.mockImplementation(
    async (_tenantId: string, id: string) => {
      if (id === mockProjectRow.id) return mockProjectRow
      if (id === mockTriageProject.id) return mockTriageProject
      return null
    }
  )
  projectsRepo.retrieveByKey.mockImplementation(
    async (_tenantId: string, key: string) => {
      if (key === 'CONSOLE') return mockProjectRow
      if (key === 'TRI') return mockTriageProject
      return null
    }
  )
  repository.retrieve.mockImplementation(
    async (_tenantId: string, id: string) => issuesById[id] ?? null
  )
  repository.retrieveByIdentifier.mockImplementation(
    async (_tenantId: string, identifier: string) =>
      Object.values(issuesById).find(
        (issue) => issue.identifier === identifier
      ) ?? null
  )
  repository.getBatchEnrichment.mockImplementation(
    async (issueIds: string[]) => {
      const map = new Map()
      for (const id of issueIds)
        map.set(id, { labels: [], commentCount: 0, subIssueCount: 0 })
      return map
    }
  )
  repository.transaction.mockImplementation(
    async (callback: (tx: typeof txMock) => unknown) => callback(txMock)
  )
  txMock.allocateIssueNumber.mockResolvedValue({
    projectId: mockProjectRow.id,
    key: mockProjectRow.key,
    number: mockProjectRow.nextIssueNumber,
  })
  txMock.createIssue.mockImplementation(
    async (params: Record<string, unknown>) => ({ ...issueA, ...params })
  )
  txMock.createEvent.mockResolvedValue({ id: 'isev_1' })
  txMock.setLabels.mockResolvedValue(undefined)
  txMock.updateIssue.mockImplementation(
    async (_id: string, params: Record<string, unknown>) => ({
      ...issueA,
      ...params,
    })
  )
  workStructureRepo.retrieveWorkflowState.mockResolvedValue(todoState)
  workStructureRepo.retrieveWorkflowStateByKey.mockImplementation(
    async (_tenantId: string, key: string) =>
      key === 'todo'
        ? todoState
        : {
            ...todoState,
            key,
            category:
              key === 'done'
                ? 'completed'
                : key === 'canceled'
                  ? 'canceled'
                  : key === 'in-progress' || key === 'in-review'
                    ? 'started'
                    : 'unstarted',
          }
  )
  workStructureRepo.retrieveDefaultWorkflowState.mockResolvedValue(todoState)
  workStructureRepo.retrieveWorkItemType.mockResolvedValue(taskType)
  workStructureRepo.retrieveWorkItemTypeByKey.mockImplementation(
    async (_tenantId: string, key: string) => ({ ...taskType, key })
  )
  workStructureRepo.retrieveDefaultWorkItemType.mockResolvedValue(taskType)
  workStructureRepo.retrieveMilestone.mockResolvedValue(null)
  workStructureRepo.listCustomFields.mockResolvedValue([])
  workStructureRepo.listCustomFieldValues.mockResolvedValue([])

  issueLinksRepo.listRelations.mockResolvedValue([])
  issueLinksRepo.findRelation.mockResolvedValue(null)
  issueLinksRepo.findRelationBetween.mockResolvedValue(null)
  issueLinksRepo.findUnorderedRelation.mockResolvedValue(null)
  issueLinksRepo.createRelation.mockImplementation(
    async (params: Record<string, unknown>) => ({ ...params })
  )
  issueLinksRepo.deleteRelation.mockResolvedValue(undefined)
  issueLinksRepo.listPredecessorLinks.mockResolvedValue([])
  issueLinksRepo.listSuccessorLinks.mockResolvedValue([])
  issueLinksRepo.listSuccessorDependencies.mockResolvedValue([])
  issueLinksRepo.findDependency.mockResolvedValue(null)
  issueLinksRepo.findDependencyBetween.mockResolvedValue(null)
  issueLinksRepo.createDependency.mockImplementation(
    async (params: Record<string, unknown>) => ({ ...params })
  )
  issueLinksRepo.updateDependency.mockImplementation(
    async (_id: string, params: Record<string, unknown>) => ({
      ...dependencyRow(),
      ...params,
    })
  )
  issueLinksRepo.deleteDependency.mockResolvedValue(undefined)
  issueLinksRepo.listSuccessorIds.mockResolvedValue([])
  issueLinksRepo.listRelationsForIssues.mockResolvedValue([])
  issueLinksRepo.listDependenciesForIssues.mockResolvedValue([])
  issueLinksRepo.listIssueStatuses.mockResolvedValue(new Map())
})

describe('issue relations', () => {
  it('creates a blocks link that keeps the requested direction', async () => {
    // ARRANGE — anchor blocks the target
    // ACT
    const result = await service.createRelation(
      tenant.organizationId,
      issueA.id,
      {
        targetIssueId: issueB.id,
        type: 'blocks',
      }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'issue-relation',
      id: expect.any(String),
      tenantId: tenant.id,
      sourceIssueId: issueA.id,
      targetIssueId: issueB.id,
      type: 'blocks',
      createdBy: null,
      createdAt: expect.any(Number),
    })
    expect(issueLinksRepo.createRelation).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        sourceIssueId: issueA.id,
        targetIssueId: issueB.id,
        type: 'blocks',
      })
    )
  })

  it('stores relates-to links in canonical id order', async () => {
    // ARRANGE — anchor id sorts after the target id
    const first = issueRow({ id: 'iss_aaa_1' })
    const second = issueRow({ id: 'iss_zzz_9' })
    issuesById[first.id] = first
    issuesById[second.id] = second

    // ACT
    const result = await service.createRelation(
      tenant.organizationId,
      second.id,
      { targetIssueId: first.id, type: 'relates-to' }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.sourceIssueId).toBe(first.id)
    expect(result.data?.targetIssueId).toBe(second.id)
    delete issuesById[first.id]
    delete issuesById[second.id]
  })

  it('rejects a self-link without writing anything', async () => {
    // ACT
    const result = await service.createRelation(
      tenant.organizationId,
      issueA.id,
      {
        targetIssueId: issueA.id,
        type: 'blocks',
      }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/issue-self-link',
      message: 'An issue cannot be linked to itself.',
      httpStatus: 400,
    })
    expect(issueLinksRepo.createRelation).not.toHaveBeenCalled()
  })

  it('rejects a relation for an unknown anchor issue', async () => {
    // ACT
    const result = await service.createRelation(
      tenant.organizationId,
      'iss_missing',
      { targetIssueId: issueB.id, type: 'relates-to' }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/issue-not-found',
      message: 'The issue could not be found.',
      httpStatus: 404,
    })
    expect(issueLinksRepo.createRelation).not.toHaveBeenCalled()
  })

  it('rejects a relation with an unknown target issue', async () => {
    // ACT
    const result = await service.createRelation(
      tenant.organizationId,
      issueA.id,
      {
        targetIssueId: 'iss_missing',
        type: 'relates-to',
      }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/issue-not-found',
      message: 'The issue could not be found.',
      httpStatus: 404,
    })
    expect(issueLinksRepo.createRelation).not.toHaveBeenCalled()
  })

  it('rejects a duplicate blocks link in the same direction', async () => {
    // ARRANGE — the exact link already exists
    issueLinksRepo.findRelationBetween.mockResolvedValue(relationRow())

    // ACT
    const result = await service.createRelation(
      tenant.organizationId,
      issueA.id,
      {
        targetIssueId: issueB.id,
        type: 'blocks',
      }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/issue-relation-exists',
      message: 'These issues are already linked with that relation type.',
      httpStatus: 409,
    })
    expect(issueLinksRepo.createRelation).not.toHaveBeenCalled()
  })

  it('rejects a duplicate relates-to link requested in reverse order', async () => {
    // ARRANGE — stored canonically, requested reversed
    issueLinksRepo.findUnorderedRelation.mockResolvedValue(
      relationRow({ id: 'isr_existing', type: 'relates-to' })
    )

    // ACT
    const result = await service.createRelation(
      tenant.organizationId,
      issueB.id,
      {
        targetIssueId: issueA.id,
        type: 'relates-to',
      }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-relation-exists')
    expect(issueLinksRepo.createRelation).not.toHaveBeenCalled()
  })

  it('allows a blocks link in the opposite direction of an existing one', async () => {
    // ARRANGE — A blocks B exists; B blocking A is a different fact
    issueLinksRepo.findRelationBetween.mockResolvedValue(null)

    // ACT
    const result = await service.createRelation(
      tenant.organizationId,
      issueB.id,
      {
        targetIssueId: issueA.id,
        type: 'blocks',
      }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(issueLinksRepo.createRelation).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceIssueId: issueB.id,
        targetIssueId: issueA.id,
      })
    )
  })

  it('allows the same pair to carry two different relation types', async () => {
    // ARRANGE — relates-to exists, blocks does not
    issueLinksRepo.findRelationBetween.mockResolvedValue(null)

    // ACT
    const result = await service.createRelation(
      tenant.organizationId,
      issueA.id,
      {
        targetIssueId: issueB.id,
        type: 'blocks',
      }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.type).toBe('blocks')
  })

  it('allows cross-project links', async () => {
    // ACT — TRI-1 lives in the triage project
    const result = await service.createRelation(
      tenant.organizationId,
      issueA.id,
      {
        targetIssueId: issueC.id,
        type: 'relates-to',
      }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(issueLinksRepo.createRelation).toHaveBeenCalledWith(
      expect.objectContaining({ targetIssueId: issueC.id })
    )
  })

  it('scopes duplicate checks to the requesting tenant', async () => {
    // ACT
    await service.createRelation(tenant.organizationId, issueA.id, {
      targetIssueId: issueB.id,
      type: 'relates-to',
    })

    // ASSERT
    expect(issueLinksRepo.findUnorderedRelation).toHaveBeenCalledWith(
      tenant.id,
      issueA.id,
      issueB.id,
      'relates-to'
    )
  })

  it('lists relations where the issue is either endpoint', async () => {
    // ARRANGE — one outgoing, one incoming
    const outgoing = relationRow({ id: 'isr_out' })
    const incoming = relationRow({
      id: 'isr_in',
      sourceIssueId: issueC.id,
      targetIssueId: issueA.id,
      type: 'relates-to',
    })
    issueLinksRepo.listRelations.mockResolvedValue([outgoing, incoming])

    // ACT
    const result = await service.listRelations(tenant.organizationId, issueA.id)

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.map((row) => row.id)).toEqual(['isr_out', 'isr_in'])
    expect(issueLinksRepo.listRelations).toHaveBeenCalledWith(
      tenant.id,
      issueA.id
    )
  })

  it('resolves the anchor issue by identifier as well as id', async () => {
    // ACT
    const result = await service.listRelations(
      tenant.organizationId,
      'console-101'
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(repository.retrieveByIdentifier).toHaveBeenCalledWith(
      tenant.id,
      'CONSOLE-101'
    )
  })

  it('rejects listing relations for an unknown issue', async () => {
    // ACT
    const result = await service.listRelations(
      tenant.organizationId,
      'iss_missing'
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-not-found')
  })

  it('deletes only the named link and returns a tombstone', async () => {
    // ARRANGE — two links exist on the anchor
    const first = relationRow({ id: 'isr_keep' })
    const second = relationRow({ id: 'isr_drop', type: 'relates-to' })
    issueLinksRepo.findRelation.mockImplementation(
      async (_tenantId: string, id: string) =>
        id === 'isr_drop' ? second : id === 'isr_keep' ? first : null
    )

    // ACT
    const result = await service.removeRelation(
      tenant.organizationId,
      issueA.id,
      'isr_drop'
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'issue-relation',
      id: 'isr_drop',
      deleted: true,
    })
    expect(issueLinksRepo.deleteRelation).toHaveBeenCalledWith('isr_drop')
    expect(issueLinksRepo.deleteRelation).toHaveBeenCalledTimes(1)
  })

  it('rejects deleting an unknown relation', async () => {
    // ACT
    const result = await service.removeRelation(
      tenant.organizationId,
      issueA.id,
      'isr_missing'
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-relation-not-found')
    expect(issueLinksRepo.deleteRelation).not.toHaveBeenCalled()
  })

  it('rejects deleting a relation attached to a different issue', async () => {
    // ARRANGE — the link connects two other issues
    issueLinksRepo.findRelation.mockResolvedValue(
      relationRow({
        id: 'isr_other',
        sourceIssueId: issueB.id,
        targetIssueId: issueC.id,
      })
    )

    // ACT
    const result = await service.removeRelation(
      tenant.organizationId,
      issueA.id,
      'isr_other'
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-relation-not-found')
    expect(issueLinksRepo.deleteRelation).not.toHaveBeenCalled()
  })

  it('keeps tenants isolated when removing a relation', async () => {
    // ARRANGE — the repository scopes by tenant, so a foreign link is missing
    issueLinksRepo.findRelation.mockImplementation(async (tenantId: string) =>
      tenantId === tenant.id ? relationRow() : null
    )

    // ACT
    const result = await service.removeRelation(
      tenant.organizationId,
      issueA.id,
      'isr_1'
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(issueLinksRepo.findRelation).toHaveBeenCalledWith(tenant.id, 'isr_1')
  })

  it('POST /issues/:issueRef/relations returns 201 with the serialized link', async () => {
    // ACT
    const response = await requestJson(
      'POST',
      `/v1/organizations/${tenant.organizationId}/issues/${issueA.id}/relations`,
      { targetIssueId: issueB.id, type: 'blocks' }
    )

    // ASSERT
    expect(response.status).toBe(201)
    expect(response.body.error).toBeNull()
    expect(response.body.data).toEqual(
      expect.objectContaining({
        object: 'issue-relation',
        sourceIssueId: issueA.id,
        targetIssueId: issueB.id,
        type: 'blocks',
      })
    )
  })

  it('POST /issues/:issueRef/relations rejects an unknown relation type', async () => {
    // ACT
    const response = await requestJson(
      'POST',
      `/v1/organizations/${tenant.organizationId}/issues/${issueA.id}/relations`,
      { targetIssueId: issueB.id, type: 'friends-with' }
    )

    // ASSERT
    expect(response.status).toBe(400)
    expect(response.body).toEqual({
      data: null,
      error: {
        code: 'projects/invalid-request',
        message: 'The request could not be processed.',
      },
    })
    expect(issueLinksRepo.createRelation).not.toHaveBeenCalled()
  })

  it('rejects unauthenticated relation requests', async () => {
    // ACT
    const response = await requestJson(
      'GET',
      `/v1/organizations/${tenant.organizationId}/issues/${issueA.id}/relations`,
      undefined,
      { 'x-internal-key': 'wrong-key' }
    )

    // ASSERT
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('projects/unauthorized')
  })

  it('GET /issues/:issueRef/relations for an unknown issue returns 404', async () => {
    // ACT
    const response = await requestJson(
      'GET',
      `/v1/organizations/${tenant.organizationId}/issues/iss_missing/relations`
    )

    // ASSERT
    expect(response.status).toBe(404)
    expect(response.body.error.code).toBe('projects/issue-not-found')
  })
})

describe('issue dependencies', () => {
  it('creates a finish-to-start dependency by default', async () => {
    // ACT — no type or lag supplied
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      { predecessorIssueId: issueB.id, successorIssueId: issueA.id }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'issue-dependency',
      id: expect.any(String),
      tenantId: tenant.id,
      predecessorIssueId: issueB.id,
      successorIssueId: issueA.id,
      type: 'finish-to-start',
      lagMinutes: 0,
      createdBy: null,
      createdAt: expect.any(Number),
    })
    expect(issueLinksRepo.createDependency).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'finish-to-start', lagMinutes: 0 })
    )
  })

  it('creates a start-to-start dependency when requested', async () => {
    // ACT
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      {
        predecessorIssueId: issueB.id,
        successorIssueId: issueA.id,
        type: 'start-to-start',
      }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.type).toBe('start-to-start')
  })

  it('creates a finish-to-finish dependency when requested', async () => {
    // ACT
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      {
        predecessorIssueId: issueB.id,
        successorIssueId: issueA.id,
        type: 'finish-to-finish',
      }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.type).toBe('finish-to-finish')
  })

  it('creates a start-to-finish dependency when requested', async () => {
    // ACT
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      {
        predecessorIssueId: issueB.id,
        successorIssueId: issueA.id,
        type: 'start-to-finish',
      }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.type).toBe('start-to-finish')
  })

  it('stores a negative lag as scheduling lead time', async () => {
    // ACT
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      {
        predecessorIssueId: issueB.id,
        successorIssueId: issueA.id,
        type: 'finish-to-start',
        lagMinutes: -120,
      }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.lagMinutes).toBe(-120)
  })

  it('rejects a dependency from an issue to itself', async () => {
    // ACT
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      { predecessorIssueId: issueA.id, successorIssueId: issueA.id }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/issue-self-link',
      message: 'An issue cannot be linked to itself.',
      httpStatus: 400,
    })
    expect(issueLinksRepo.createDependency).not.toHaveBeenCalled()
  })

  it('rejects a dependency with an unknown predecessor', async () => {
    // ACT
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      { predecessorIssueId: 'iss_missing', successorIssueId: issueA.id }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-not-found')
    expect(issueLinksRepo.createDependency).not.toHaveBeenCalled()
  })

  it('rejects a dependency with an unknown successor', async () => {
    // ACT
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      { predecessorIssueId: issueA.id, successorIssueId: 'iss_missing' }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-not-found')
    expect(issueLinksRepo.createDependency).not.toHaveBeenCalled()
  })

  it('rejects a dependency that does not touch the anchor issue', async () => {
    // ACT — anchor is A but the edge is B -> done
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      { predecessorIssueId: issueB.id, successorIssueId: doneIssue.id }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-request')
    expect(issueLinksRepo.createDependency).not.toHaveBeenCalled()
  })

  it('rejects a duplicate dependency', async () => {
    // ARRANGE — B -> A already exists
    issueLinksRepo.findDependencyBetween.mockResolvedValue(dependencyRow())

    // ACT
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      { predecessorIssueId: issueB.id, successorIssueId: issueA.id }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/issue-dependency-exists',
      message: 'This dependency already exists.',
      httpStatus: 409,
    })
    expect(issueLinksRepo.createDependency).not.toHaveBeenCalled()
  })

  it('allows cross-project dependencies', async () => {
    // ACT — predecessor lives in the triage project
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      { predecessorIssueId: issueC.id, successorIssueId: issueA.id }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(issueLinksRepo.createDependency).toHaveBeenCalledWith(
      expect.objectContaining({
        predecessorIssueId: issueC.id,
        successorIssueId: issueA.id,
      })
    )
  })

  it('rejects a direct cycle A -> B -> A', async () => {
    // ARRANGE — A -> B exists; requesting B -> A must fail
    issueLinksRepo.listSuccessorIds.mockImplementation(
      async (_tenantId: string, ids: string[]) =>
        ids.includes(issueA.id) ? [issueB.id] : []
    )

    // ACT
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      { predecessorIssueId: issueB.id, successorIssueId: issueA.id }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/issue-dependency-cycle',
      message: 'This dependency would create a scheduling cycle.',
      httpStatus: 422,
    })
    expect(issueLinksRepo.createDependency).not.toHaveBeenCalled()
  })

  it('rejects an indirect cycle A -> B -> C -> A', async () => {
    // ARRANGE — A -> B and B -> C exist; requesting C -> A must fail
    const edges: Record<string, string[]> = {
      [issueA.id]: [issueB.id],
      [issueB.id]: [issueC.id],
      [issueC.id]: [],
    }
    issueLinksRepo.listSuccessorIds.mockImplementation(
      async (_tenantId: string, ids: string[]) =>
        ids.flatMap((id) => edges[id] ?? [])
    )

    // ACT
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      { predecessorIssueId: issueC.id, successorIssueId: issueA.id }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-dependency-cycle')
    expect(issueLinksRepo.createDependency).not.toHaveBeenCalled()
  })

  it('allows a diamond that converges without cycling', async () => {
    // ARRANGE — A -> B, A -> C, B -> D, C -> D; requesting B -> C is acyclic
    const issueD = issueRow({ id: 'iss_phase4_d', identifier: 'CONSOLE-104' })
    issuesById[issueD.id] = issueD
    const edges: Record<string, string[]> = {
      [issueA.id]: [issueB.id, issueC.id],
      [issueB.id]: [issueD.id],
      [issueC.id]: [issueD.id],
      [issueD.id]: [],
    }
    issueLinksRepo.listSuccessorIds.mockImplementation(
      async (_tenantId: string, ids: string[]) =>
        ids.flatMap((id) => edges[id] ?? [])
    )

    // ACT
    const result = await service.createDependency(
      tenant.organizationId,
      issueB.id,
      { predecessorIssueId: issueB.id, successorIssueId: issueC.id }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(issueLinksRepo.createDependency).toHaveBeenCalled()
    delete issuesById[issueD.id]
  })

  it('stops the cycle traversal on revisit instead of looping', async () => {
    // ARRANGE — a cyclic graph fragment that never reaches the predecessor
    issueLinksRepo.listSuccessorIds.mockImplementation(
      async (_tenantId: string, ids: string[]) => ids
    )

    // ACT — traversal revisits A forever unless the visited set stops it
    const result = await service.createDependency(
      tenant.organizationId,
      issueA.id,
      { predecessorIssueId: issueC.id, successorIssueId: issueA.id }
    )

    // ASSERT — terminates and allows the edge (C is unreachable from A)
    expect(result.error).toBeNull()
    expect(issueLinksRepo.listSuccessorIds).toHaveBeenCalled()
  })

  it('updates a dependency type and lag', async () => {
    // ARRANGE
    issueLinksRepo.findDependency.mockResolvedValue(dependencyRow())

    // ACT
    const result = await service.updateDependency(
      tenant.organizationId,
      issueA.id,
      'isd_1',
      { type: 'start-to-start', lagMinutes: 45 }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(issueLinksRepo.updateDependency).toHaveBeenCalledWith('isd_1', {
      type: 'start-to-start',
      lagMinutes: 45,
    })
    expect(result.data?.type).toBe('start-to-start')
    expect(result.data?.lagMinutes).toBe(45)
  })

  it('updates only the fields the caller sends', async () => {
    // ARRANGE
    issueLinksRepo.findDependency.mockResolvedValue(dependencyRow())

    // ACT
    const result = await service.updateDependency(
      tenant.organizationId,
      issueA.id,
      'isd_1',
      { lagMinutes: -30 }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(issueLinksRepo.updateDependency).toHaveBeenCalledWith('isd_1', {
      lagMinutes: -30,
    })
  })

  it('rejects updating an unknown dependency', async () => {
    // ACT
    const result = await service.updateDependency(
      tenant.organizationId,
      issueA.id,
      'isd_missing',
      { lagMinutes: 10 }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-dependency-not-found')
    expect(issueLinksRepo.updateDependency).not.toHaveBeenCalled()
  })

  it('rejects updating a dependency attached to a different issue', async () => {
    // ARRANGE — the edge connects C and done, not the anchor A
    issueLinksRepo.findDependency.mockResolvedValue(
      dependencyRow({
        id: 'isd_other',
        predecessorIssueId: issueC.id,
        successorIssueId: doneIssue.id,
      })
    )

    // ACT
    const result = await service.updateDependency(
      tenant.organizationId,
      issueA.id,
      'isd_other',
      { lagMinutes: 10 }
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-dependency-not-found')
    expect(issueLinksRepo.updateDependency).not.toHaveBeenCalled()
  })

  it('deletes a dependency and returns a tombstone', async () => {
    // ARRANGE
    issueLinksRepo.findDependency.mockResolvedValue(dependencyRow())

    // ACT
    const result = await service.removeDependency(
      tenant.organizationId,
      issueA.id,
      'isd_1'
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      object: 'issue-dependency',
      id: 'isd_1',
      deleted: true,
    })
    expect(issueLinksRepo.deleteDependency).toHaveBeenCalledWith('isd_1')
  })

  it('rejects deleting an unknown dependency', async () => {
    // ACT
    const result = await service.removeDependency(
      tenant.organizationId,
      issueA.id,
      'isd_missing'
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-dependency-not-found')
    expect(issueLinksRepo.deleteDependency).not.toHaveBeenCalled()
  })

  it('returns predecessors and successors grouped for an issue', async () => {
    // ARRANGE
    const incoming = dependencyRow({ id: 'isd_in' })
    const outgoing = dependencyRow({
      id: 'isd_out',
      predecessorIssueId: issueA.id,
      successorIssueId: issueC.id,
    })
    issueLinksRepo.listPredecessorLinks.mockResolvedValue([incoming])
    issueLinksRepo.listSuccessorLinks.mockResolvedValue([outgoing])

    // ACT
    const result = await service.listDependencies(
      tenant.organizationId,
      issueA.id
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.predecessors.map((row) => row.id)).toEqual(['isd_in'])
    expect(result.data?.successors.map((row) => row.id)).toEqual(['isd_out'])
  })

  it('rejects listing dependencies for an unknown issue', async () => {
    // ACT
    const result = await service.listDependencies(
      tenant.organizationId,
      'iss_missing'
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-not-found')
  })

  it('POST /issues/:issueRef/dependencies persists a dependency', async () => {
    // ACT
    const response = await requestJson(
      'POST',
      `/v1/organizations/${tenant.organizationId}/issues/${issueA.id}/dependencies`,
      {
        predecessorIssueId: issueB.id,
        successorIssueId: issueA.id,
        type: 'finish-to-start',
        lagMinutes: 60,
      }
    )

    // ASSERT
    expect(response.status).toBe(201)
    expect(response.body.error).toBeNull()
    expect(response.body.data).toEqual(
      expect.objectContaining({
        object: 'issue-dependency',
        predecessorIssueId: issueB.id,
        successorIssueId: issueA.id,
        lagMinutes: 60,
      })
    )
  })

  it('PATCH /issues/:issueRef/dependencies/:id with no fields is rejected', async () => {
    // ACT
    const response = await requestJson(
      'PATCH',
      `/v1/organizations/${tenant.organizationId}/issues/${issueA.id}/dependencies/isd_1`,
      {}
    )

    // ASSERT
    expect(response.status).toBe(400)
    expect(response.body.error.code).toBe('projects/invalid-request')
    expect(issueLinksRepo.updateDependency).not.toHaveBeenCalled()
  })

  it('DELETE /issues/:issueRef/dependencies/:id removes the link', async () => {
    // ARRANGE
    issueLinksRepo.findDependency.mockResolvedValue(dependencyRow())

    // ACT
    const response = await requestJson(
      'DELETE',
      `/v1/organizations/${tenant.organizationId}/issues/${issueA.id}/dependencies/isd_1`
    )

    // ASSERT
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: { object: 'issue-dependency', id: 'isd_1', deleted: true },
      error: null,
    })
  })
})

describe('dependency schedule suggestions', () => {
  function successorLink(
    overrides: Record<string, unknown> = {},
    predecessor: Record<string, unknown> = {}
  ) {
    return {
      ...dependencyRow(overrides),
      predecessor: {
        id: issueB.id,
        identifier: issueB.identifier,
        plannedStartDate: 1000n,
        plannedFinishDate: 2000n,
        ...predecessor,
      },
    }
  }

  it('applies finish-to-start from the predecessor finish plus lag', async () => {
    // ARRANGE — predecessor finishes at 2000, lag 60 minutes, duration 60 minutes
    issueLinksRepo.listSuccessorDependencies.mockResolvedValue([
      successorLink({ type: 'finish-to-start', lagMinutes: 60 }),
    ])

    // ACT
    const result = await service.suggestSchedule(
      tenant.organizationId,
      schedIssue.id
    )

    // ASSERT — start 2000 + 3600 = 5600, finish 5600 + 3600 = 9200
    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      earliestStart: 5600,
      earliestFinish: 9200,
      constrainedBy: [
        {
          issueId: issueB.id,
          identifier: issueB.identifier,
          type: 'finish-to-start',
          lagMinutes: 60,
        },
      ],
    })
  })

  it('applies start-to-start from the predecessor start plus lag', async () => {
    // ARRANGE — predecessor starts at 1000, lag 30 minutes
    issueLinksRepo.listSuccessorDependencies.mockResolvedValue([
      successorLink({ type: 'start-to-start', lagMinutes: 30 }),
    ])

    // ACT
    const result = await service.suggestSchedule(
      tenant.organizationId,
      schedIssue.id
    )

    // ASSERT — start 1000 + 1800 = 2800, finish 2800 + 3600 = 6400
    expect(result.error).toBeNull()
    expect(result.data?.earliestStart).toBe(2800)
    expect(result.data?.earliestFinish).toBe(6400)
    expect(result.data?.constrainedBy).toHaveLength(1)
  })

  it('applies finish-to-finish against the successor duration', async () => {
    // ARRANGE — predecessor finishes at 2000, no lag, duration 60 minutes
    issueLinksRepo.listSuccessorDependencies.mockResolvedValue([
      successorLink({ type: 'finish-to-finish', lagMinutes: 0 }),
    ])

    // ACT
    const result = await service.suggestSchedule(
      tenant.organizationId,
      schedIssue.id
    )

    // ASSERT — finish must reach 2000, so start is 2000 - 3600
    expect(result.error).toBeNull()
    expect(result.data?.earliestStart).toBe(-1600)
    expect(result.data?.earliestFinish).toBe(2000)
  })

  it('applies start-to-finish against the successor duration', async () => {
    // ARRANGE — predecessor starts at 1000, lag 60 minutes
    issueLinksRepo.listSuccessorDependencies.mockResolvedValue([
      successorLink({ type: 'start-to-finish', lagMinutes: 60 }),
    ])

    // ACT
    const result = await service.suggestSchedule(
      tenant.organizationId,
      schedIssue.id
    )

    // ASSERT — finish must reach 1000 + 3600 = 4600, start 4600 - 3600
    expect(result.error).toBeNull()
    expect(result.data?.earliestStart).toBe(1000)
    expect(result.data?.earliestFinish).toBe(4600)
  })

  it('treats negative lag as lead time that pulls dates earlier', async () => {
    // ARRANGE — predecessor finishes at 2000 with two hours of lead
    issueLinksRepo.listSuccessorDependencies.mockResolvedValue([
      successorLink({ type: 'finish-to-start', lagMinutes: -120 }),
    ])

    // ACT
    const result = await service.suggestSchedule(
      tenant.organizationId,
      schedIssue.id
    )

    // ASSERT — start 2000 - 7200, finish start + 3600
    expect(result.error).toBeNull()
    expect(result.data?.earliestStart).toBe(-5200)
    expect(result.data?.earliestFinish).toBe(-1600)
  })

  it('lets the latest predecessor win and names it in constrainedBy', async () => {
    // ARRANGE — two finish-to-start predecessors, different finishes
    issueLinksRepo.listSuccessorDependencies.mockResolvedValue([
      {
        ...dependencyRow({ id: 'isd_early' }),
        predecessor: {
          id: issueB.id,
          identifier: issueB.identifier,
          plannedStartDate: 0n,
          plannedFinishDate: 2000n,
        },
      },
      {
        ...dependencyRow({ id: 'isd_late' }),
        predecessor: {
          id: issueC.id,
          identifier: issueC.identifier,
          plannedStartDate: 0n,
          plannedFinishDate: 5000n,
        },
      },
    ])

    // ACT
    const result = await service.suggestSchedule(
      tenant.organizationId,
      schedIssue.id
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.earliestStart).toBe(5000)
    expect(result.data?.earliestFinish).toBe(8600)
    expect(result.data?.constrainedBy).toEqual([
      {
        issueId: issueC.id,
        identifier: issueC.identifier,
        type: 'finish-to-start',
        lagMinutes: 0,
      },
    ])
  })

  it('names every predecessor tied for the latest bound', async () => {
    // ARRANGE — two predecessors finishing at the same time
    const twin = (id: string, predecessorId: string) => ({
      ...dependencyRow({ id }),
      predecessor: {
        id: predecessorId,
        identifier: predecessorId === issueB.id ? issueB.identifier : 'TRI-1',
        plannedStartDate: 0n,
        plannedFinishDate: 2000n,
      },
    })
    issueLinksRepo.listSuccessorDependencies.mockResolvedValue([
      twin('isd_one', issueB.id),
      twin('isd_two', issueC.id),
    ])

    // ACT
    const result = await service.suggestSchedule(
      tenant.organizationId,
      schedIssue.id
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.earliestStart).toBe(2000)
    expect(
      result.data?.constrainedBy.map((entry) => entry.issueId).sort()
    ).toEqual([issueB.id, issueC.id].sort())
  })

  it('ignores predecessors that carry no usable planned dates', async () => {
    // ARRANGE — predecessor has no planned finish for a finish-to-start edge
    issueLinksRepo.listSuccessorDependencies.mockResolvedValue([
      successorLink({}, { plannedStartDate: null, plannedFinishDate: null }),
    ])

    // ACT
    const result = await service.suggestSchedule(
      tenant.organizationId,
      schedIssue.id
    )

    // ASSERT — falls back to the successor's own planned dates
    expect(result.error).toBeNull()
    expect(result.data?.earliestStart).toBe(1788000000)
    expect(result.data?.earliestFinish).toBe(1788003600)
    expect(result.data?.constrainedBy).toEqual([])
  })

  it('falls back to the successor plan when nothing constrains it', async () => {
    // ACT — no predecessors at all
    const result = await service.suggestSchedule(
      tenant.organizationId,
      schedIssue.id
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data).toEqual({
      earliestStart: 1788000000,
      earliestFinish: 1788003600,
      constrainedBy: [],
    })
  })

  it('derives only the start when the duration is unknown', async () => {
    // ARRANGE — successor without a duration, one finish-to-start edge
    const undated = issueRow({
      id: 'iss_phase4_nostart',
      identifier: 'CONSOLE-105',
      plannedDurationMinutes: null,
    })
    issuesById[undated.id] = undated
    issueLinksRepo.listSuccessorDependencies.mockResolvedValue([
      successorLink(),
    ])

    // ACT
    const result = await service.suggestSchedule(
      tenant.organizationId,
      undated.id
    )

    // ASSERT — start from the edge, finish from the successor plan
    expect(result.error).toBeNull()
    expect(result.data?.earliestStart).toBe(2000)
    expect(result.data?.earliestFinish).toBe(1788086400)
    expect(result.data?.constrainedBy).toHaveLength(1)
    delete issuesById[undated.id]
  })

  it('derives only the finish for finish-to-finish without a duration', async () => {
    // ARRANGE — successor without a duration, one finish-to-finish edge
    const undated = issueRow({
      id: 'iss_phase4_nodur',
      plannedDurationMinutes: null,
    })
    issuesById[undated.id] = undated
    issueLinksRepo.listSuccessorDependencies.mockResolvedValue([
      successorLink({ type: 'finish-to-finish' }),
    ])

    // ACT
    const result = await service.suggestSchedule(
      tenant.organizationId,
      undated.id
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.earliestStart).toBe(1788000000)
    expect(result.data?.earliestFinish).toBe(2000)
    delete issuesById[undated.id]
  })

  it('writes nothing while computing a suggestion', async () => {
    // ARRANGE
    issueLinksRepo.listSuccessorDependencies.mockResolvedValue([
      successorLink(),
    ])

    // ACT
    const result = await service.suggestSchedule(
      tenant.organizationId,
      schedIssue.id
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(issueLinksRepo.createDependency).not.toHaveBeenCalled()
    expect(issueLinksRepo.updateDependency).not.toHaveBeenCalled()
    expect(issueLinksRepo.deleteDependency).not.toHaveBeenCalled()
    expect(issueLinksRepo.createRelation).not.toHaveBeenCalled()
    expect(issueLinksRepo.deleteRelation).not.toHaveBeenCalled()
  })

  it('rejects a suggestion for an unknown issue', async () => {
    // ACT
    const result = await service.suggestSchedule(
      tenant.organizationId,
      'iss_missing'
    )

    // ASSERT
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/issue-not-found')
  })

  it('POST schedule-suggestion returns the advisory payload over HTTP', async () => {
    // ARRANGE
    issueLinksRepo.listSuccessorDependencies.mockResolvedValue([
      successorLink(),
    ])

    // ACT
    const response = await requestJson(
      'POST',
      `/v1/organizations/${tenant.organizationId}/issues/${schedIssue.id}/dependencies/schedule-suggestion`,
      {}
    )

    // ASSERT
    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        earliestStart: 2000,
        earliestFinish: 5600,
        constrainedBy: [
          {
            issueId: issueB.id,
            identifier: issueB.identifier,
            type: 'finish-to-start',
            lagMinutes: 0,
          },
        ],
      },
      error: null,
    })
  })
})

describe('blocked derivation and link counts on issues', () => {
  it('marks an issue blocked while a blocks source is still open', async () => {
    // ARRANGE — B (in-progress) blocks A
    issueLinksRepo.listRelationsForIssues.mockResolvedValue([
      relationRow({ sourceIssueId: issueB.id, targetIssueId: issueA.id }),
    ])
    issueLinksRepo.listIssueStatuses.mockResolvedValue(
      new Map([[issueB.id, 'in-progress']])
    )

    // ACT
    const result = await issuesService.retrieve(
      tenant.organizationId,
      issueA.id
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.blocked).toBe(true)
    expect(result.data?.relationCount).toBe(1)
  })

  it('clears blocked once the blocking source is done', async () => {
    // ARRANGE — B blocks A but B is done
    issueLinksRepo.listRelationsForIssues.mockResolvedValue([
      relationRow({ sourceIssueId: doneIssue.id, targetIssueId: issueA.id }),
    ])
    issueLinksRepo.listIssueStatuses.mockResolvedValue(
      new Map([[doneIssue.id, 'done']])
    )

    // ACT
    const result = await issuesService.retrieve(
      tenant.organizationId,
      issueA.id
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.blocked).toBe(false)
  })

  it('clears blocked once the blocking source is canceled', async () => {
    // ARRANGE
    issueLinksRepo.listRelationsForIssues.mockResolvedValue([
      relationRow({ sourceIssueId: issueB.id, targetIssueId: issueA.id }),
    ])
    issueLinksRepo.listIssueStatuses.mockResolvedValue(
      new Map([[issueB.id, 'canceled']])
    )

    // ACT
    const result = await issuesService.retrieve(
      tenant.organizationId,
      issueA.id
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.blocked).toBe(false)
  })

  it('treats a custom completed-category state as unblocking', async () => {
    // ARRANGE — tenant state "shipped" lives in the completed category
    workStructureRepo.retrieveWorkflowStateByKey.mockResolvedValueOnce({
      ...todoState,
      key: 'shipped',
      category: 'completed',
    })
    issueLinksRepo.listRelationsForIssues.mockResolvedValue([
      relationRow({ sourceIssueId: issueB.id, targetIssueId: issueA.id }),
    ])
    issueLinksRepo.listIssueStatuses.mockResolvedValue(
      new Map([[issueB.id, 'shipped']])
    )

    // ACT
    const result = await issuesService.retrieve(
      tenant.organizationId,
      issueA.id
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.blocked).toBe(false)
  })

  it('marks an issue blocked while a dependency predecessor is open', async () => {
    // ARRANGE — B precedes A and is still in progress
    issueLinksRepo.listDependenciesForIssues.mockResolvedValue([
      dependencyRow({
        predecessorIssueId: issueB.id,
        successorIssueId: issueA.id,
      }),
    ])
    issueLinksRepo.listIssueStatuses.mockResolvedValue(
      new Map([[issueB.id, 'in-progress']])
    )

    // ACT
    const result = await issuesService.retrieve(
      tenant.organizationId,
      issueA.id
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.blocked).toBe(true)
    expect(result.data?.dependencyCount).toBe(1)
  })

  it('clears blocked once every predecessor is done', async () => {
    // ARRANGE
    issueLinksRepo.listDependenciesForIssues.mockResolvedValue([
      dependencyRow({
        predecessorIssueId: doneIssue.id,
        successorIssueId: issueA.id,
      }),
    ])
    issueLinksRepo.listIssueStatuses.mockResolvedValue(
      new Map([[doneIssue.id, 'done']])
    )

    // ACT
    const result = await issuesService.retrieve(
      tenant.organizationId,
      issueA.id
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.blocked).toBe(false)
  })

  it('counts relations and dependencies on both sides of each link', async () => {
    // ARRANGE — A sources one relation, targets another; same for dependencies
    issueLinksRepo.listRelationsForIssues.mockResolvedValue([
      relationRow({ id: 'isr_a' }),
      relationRow({
        id: 'isr_b',
        sourceIssueId: issueC.id,
        targetIssueId: issueA.id,
        type: 'relates-to',
      }),
    ])
    issueLinksRepo.listDependenciesForIssues.mockResolvedValue([
      dependencyRow({ id: 'isd_a' }),
      dependencyRow({
        id: 'isd_b',
        predecessorIssueId: issueA.id,
        successorIssueId: issueC.id,
      }),
    ])
    issueLinksRepo.listIssueStatuses.mockResolvedValue(
      new Map([
        [issueB.id, 'done'],
        [issueA.id, 'todo'],
      ])
    )

    // ACT
    const result = await issuesService.retrieve(
      tenant.organizationId,
      issueA.id
    )

    // ASSERT — A blocks B but B is done, so nothing blocks A
    expect(result.error).toBeNull()
    expect(result.data?.relationCount).toBe(2)
    expect(result.data?.dependencyCount).toBe(2)
    expect(result.data?.blocked).toBe(false)
  })

  it('reports zero counts and unblocked when no links exist', async () => {
    // ACT
    const result = await issuesService.retrieve(
      tenant.organizationId,
      issueA.id
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(result.data?.blocked).toBe(false)
    expect(result.data?.relationCount).toBe(0)
    expect(result.data?.dependencyCount).toBe(0)
  })

  it('enriches every listed issue with its own blocked state', async () => {
    // ARRANGE — B blocks A; B itself has no incoming links
    repository.list.mockResolvedValue([issueA, issueB])
    repository.count.mockResolvedValue(2)
    issueLinksRepo.listRelationsForIssues.mockResolvedValue([
      relationRow({ sourceIssueId: issueB.id, targetIssueId: issueA.id }),
    ])
    issueLinksRepo.listIssueStatuses.mockResolvedValue(
      new Map([[issueB.id, 'in-progress']])
    )

    // ACT
    const result = await issuesService.list(tenant.organizationId, {})

    // ASSERT
    expect(result.error).toBeNull()
    const byId = new Map(
      (result.data?.items ?? []).map((item) => [item.id, item])
    )
    expect(byId.get(issueA.id)?.blocked).toBe(true)
    expect(byId.get(issueB.id)?.blocked).toBe(false)
    expect(byId.get(issueA.id)?.relationCount).toBe(1)
    expect(byId.get(issueB.id)?.relationCount).toBe(1)
  })
})

describe('planned schedule fields on issues', () => {
  it('persists planned fields on create', async () => {
    // ACT
    const result = await issuesService.create(tenant.organizationId, {
      projectId: mockProjectRow.id,
      title: 'Planned work',
      plannedStartDate: 1788100000,
      plannedFinishDate: 1788186400,
      plannedDurationMinutes: 1440,
    })

    // ASSERT
    expect(result.error).toBeNull()
    expect(txMock.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        plannedStartDate: 1788100000n,
        plannedFinishDate: 1788186400n,
        plannedDurationMinutes: 1440,
      })
    )
    expect(result.data?.plannedStartDate).toBe(1788100000)
    expect(result.data?.plannedFinishDate).toBe(1788186400)
    expect(result.data?.plannedDurationMinutes).toBe(1440)
  })

  it('persists planned fields on update', async () => {
    // ARRANGE
    repository.retrieve.mockResolvedValue(issueA)

    // ACT
    const result = await issuesService.update(
      tenant.organizationId,
      issueA.id,
      {
        plannedStartDate: 1788200000,
        plannedDurationMinutes: 60,
      }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(txMock.updateIssue).toHaveBeenCalledWith(
      issueA.id,
      expect.objectContaining({
        plannedStartDate: 1788200000n,
        plannedDurationMinutes: 60,
      })
    )
    expect(result.data?.plannedStartDate).toBe(1788200000)
    expect(result.data?.plannedDurationMinutes).toBe(60)
  })

  it('clears a planned date when the caller sends null', async () => {
    // ARRANGE
    repository.retrieve.mockResolvedValue(issueA)

    // ACT
    const result = await issuesService.update(
      tenant.organizationId,
      issueA.id,
      {
        plannedFinishDate: null,
      }
    )

    // ASSERT
    expect(result.error).toBeNull()
    expect(txMock.updateIssue).toHaveBeenCalledWith(
      issueA.id,
      expect.objectContaining({ plannedFinishDate: null })
    )
    expect(result.data?.plannedFinishDate).toBeNull()
  })

  it('exposes planned fields, blocked, and counts over HTTP', async () => {
    // ARRANGE
    repository.retrieve.mockResolvedValue(issueA)
    issueLinksRepo.listRelationsForIssues.mockResolvedValue([
      relationRow({ sourceIssueId: issueB.id, targetIssueId: issueA.id }),
    ])
    issueLinksRepo.listIssueStatuses.mockResolvedValue(
      new Map([[issueB.id, 'in-progress']])
    )

    // ACT
    const response = await requestJson(
      'GET',
      `/v1/organizations/${tenant.organizationId}/issues/${issueA.id}`
    )

    // ASSERT
    expect(response.status).toBe(200)
    expect(response.body.data).toEqual(
      expect.objectContaining({
        plannedStartDate: 1788000000,
        plannedFinishDate: 1788086400,
        plannedDurationMinutes: 1440,
        blocked: true,
        relationCount: 1,
        dependencyCount: 0,
      })
    )
  })
})
