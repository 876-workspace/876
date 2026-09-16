import express from 'express'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  layoutsRepo,
  projectCustomFieldsRepo,
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
  ganttRepo,
  baselinesRepo,
  automation,
  workflows,
  collaboration,
} = vi.hoisted(() => {
  const transactionClient = { transaction: 'projects-test-transaction' }
  const tx = {
    transactionClient,
    allocateIssueNumber: vi.fn(),
    createIssue: vi.fn(),
    createEvent: vi.fn(),
    setLabels: vi.fn(),
    updateIssue: vi.fn(),
  }
  return {
    layoutsRepo: {
      listLayouts: vi.fn(),
      retrieveLayout: vi.fn(),
      createLayout: vi.fn(),
      updateLayout: vi.fn(),
      softDeleteLayout: vi.fn(),
      clearDefaultInScope: vi.fn(),
    },
    projectCustomFieldsRepo: {
      listProjectCustomFields: vi.fn(),
      retrieveProjectCustomField: vi.fn(),
      retrieveProjectCustomFieldByKey: vi.fn(),
      createProjectCustomField: vi.fn(),
      updateProjectCustomField: vi.fn(),
      archiveProjectCustomField: vi.fn(),
      listProjectCustomFieldValues: vi.fn(),
      listProjectCustomFieldValuesForProjects: vi.fn(),
      upsertProjectCustomFieldValue: vi.fn(),
      clearProjectCustomFieldValue: vi.fn(),
    },
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
    // Phase-2 added milestone detail/list repositories that connect to the DB
    // pool at module-eval time via `work-structure/index.js`. Mock them here
    // so importing `issues.service.js` does not require `PROJECTS_DATABASE_URL`.
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
    automation: { appendOutboxEvent: vi.fn() },
    workflows: { checkTransition: vi.fn() },
    collaboration: {
      ensureFollows: vi.fn(),
      ensureFollowsForTenant: vi.fn(),
      notifyMentionedUsers: vi.fn(),
      mentionedUserIds: vi.fn(() => []),
    },
    txMock: tx,
    ganttRepo: {
      listGanttMilestones: vi.fn(),
      listGanttTaskLists: vi.fn(),
      listGanttIssues: vi.fn(),
      listGanttDependencies: vi.fn(),
    },
    baselinesRepo: {
      listBaselines: vi.fn(),
      retrieveBaseline: vi.fn(),
      countBaselineItems: vi.fn(),
      countBaselineItemsMany: vi.fn(),
      listBaselineItems: vi.fn(),
      createBaseline: vi.fn(),
      createBaselineItems: vi.fn(),
      deleteBaseline: vi.fn(),
    },
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
vi.mock('../../automation/index.js', () => automation)
vi.mock('../../workflows/index.js', () => workflows)
vi.mock('../../collaboration/index.js', () => collaboration)

vi.mock('../../projects/gantt.repository.js', () => ganttRepo)
vi.mock('../../projects/baselines.repository.js', () => baselinesRepo)
vi.mock('../../layouts/layouts.repository.js', () => layoutsRepo)
vi.mock(
  '../../custom-fields/project-custom-fields.repository.js',
  () => projectCustomFieldsRepo
)
const service = await import('../issues.service.js')
const { createIssuesRouter } = await import('../issues.routes.js')

const tenant = {
  id: 'prjten_test_1',
  organizationId: 'org_test_1',
  triageProjectId: 'prj_triage_1',
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

const mockProjectRow = {
  id: 'prj_alpha_1',
  tenantId: tenant.id,
  name: 'Console Platform',
  key: 'CONSOLE',
  slug: 'console-platform',
  description: 'Main console UI project',
  leadUserId: 'usr_lead_1',
  status: 'planned',
  health: 'on-track',
  startDate: 1787767200n,
  targetDate: 1788767200n,
  nextIssueNumber: 1,
  customerId: null,
  defaultWorkItemTypeId: null,
  position: 0,
  archivedAt: null,
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
}

const mockTriageProject = {
  ...mockProjectRow,
  id: 'prj_triage_1',
  name: 'Triage',
  key: 'TRI',
  slug: 'triage',
  description: null,
  leadUserId: null,
  status: 'active',
  startDate: null,
  targetDate: null,
  nextIssueNumber: 5,
}

const mockIssueRow = {
  id: 'iss_test_1',
  tenantId: tenant.id,
  projectId: mockProjectRow.id,
  number: 1,
  identifier: 'CONSOLE-1',
  title: 'Test issue title',
  description: 'Test issue description',
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
  position: 0,
  startedAt: null,
  completedAt: null,
  canceledAt: null,
  deletedAt: null,
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
  project: { key: 'CONSOLE' },
  labels: [],
}

const mockIssueEventRow = {
  id: 'isev_test_1',
  tenantId: tenant.id,
  issueId: mockIssueRow.id,
  actorUserId: 'usr_creator_1',
  type: 'created',
  fromValue: null,
  toValue: 'CONSOLE-1',
  createdAt: 1787767200n,
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
  createdAt: 1787767200n,
  updatedAt: 1787767200n,
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
  app.use('/v1/organizations/:organizationId/issues', createIssuesRouter())
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
  layoutsRepo.listLayouts.mockResolvedValue([])
  projectCustomFieldsRepo.listProjectCustomFields.mockResolvedValue([])
  projectCustomFieldsRepo.listProjectCustomFieldValues.mockResolvedValue([])
  projectCustomFieldsRepo.listProjectCustomFieldValuesForProjects.mockResolvedValue([])
  vi.clearAllMocks()
  workflows.checkTransition.mockResolvedValue({ data: null, error: null })
  delete process.env.DELETION_MODE
  process.env.PROJECTS_INTERNAL_KEY = 'test-internal-key'
  issueLinksRepo.listRelations.mockResolvedValue([])
  issueLinksRepo.findRelation.mockResolvedValue(null)
  issueLinksRepo.findRelationBetween.mockResolvedValue(null)
  issueLinksRepo.findUnorderedRelation.mockResolvedValue(null)
  issueLinksRepo.listPredecessorLinks.mockResolvedValue([])
  issueLinksRepo.listSuccessorLinks.mockResolvedValue([])
  issueLinksRepo.listSuccessorDependencies.mockResolvedValue([])
  issueLinksRepo.findDependency.mockResolvedValue(null)
  issueLinksRepo.findDependencyBetween.mockResolvedValue(null)
  issueLinksRepo.listSuccessorIds.mockResolvedValue([])
  issueLinksRepo.listRelationsForIssues.mockResolvedValue([])
  issueLinksRepo.listDependenciesForIssues.mockResolvedValue([])
  issueLinksRepo.listIssueStatuses.mockResolvedValue(new Map())
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
  repository.getBatchEnrichment.mockImplementation(
    async (issueIds: string[]) => {
      const map = new Map()
      for (const id of issueIds)
        map.set(id, { labels: [], commentCount: 0, subIssueCount: 0 })
      return map
    }
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
  repository.transaction.mockImplementation(
    async (callback: (tx: typeof txMock) => unknown) => callback(txMock)
  )
  txMock.allocateIssueNumber.mockResolvedValue({
    projectId: mockProjectRow.id,
    key: mockProjectRow.key,
    number: mockProjectRow.nextIssueNumber,
  })
  txMock.createIssue.mockImplementation(
    async (params: typeof mockIssueRow) => ({ ...mockIssueRow, ...params })
  )
  txMock.createEvent.mockResolvedValue(mockIssueEventRow)
  txMock.setLabels.mockResolvedValue(undefined)
  txMock.updateIssue.mockImplementation(
    async (_id: string, params: Partial<typeof mockIssueRow>) => ({
      ...mockIssueRow,
      ...params,
    })
  )
})

describe('issues module', () => {
  it('create allocates identifier as KEY-N from the projects nextIssueNumber', async () => {
    const result = await service.create('org_test_1', {
      projectId: mockProjectRow.id,
      title: 'First issue identifier test',
    })

    expect(result.error).toBeNull()
    expect(result.data?.identifier).toBe('CONSOLE-1')
    expect(result.data?.number).toBe(1)
    expect(result.data?.projectKey).toBe('CONSOLE')
  })

  it('create increments nextIssueNumber and does both inside one transaction (assert the transaction callback was used, not two loose calls)', async () => {
    const result = await service.create('org_test_1', {
      projectId: mockProjectRow.id,
      title: 'Transaction callback test',
    })

    expect(result.error).toBeNull()
    expect(repository.transaction).toHaveBeenCalledWith(expect.any(Function))
    expect(repository.transaction).toHaveBeenCalledTimes(1)
    expect(txMock.allocateIssueNumber).toHaveBeenCalledWith(mockProjectRow.id)
    expect(txMock.allocateIssueNumber).toHaveBeenCalledTimes(1)
    expect(txMock.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: mockProjectRow.id,
        number: 1,
        identifier: 'CONSOLE-1',
      })
    )
  })

  it('takes the issue number from the allocation, never from a project row read outside the transaction', async () => {
    txMock.allocateIssueNumber.mockResolvedValueOnce({
      projectId: mockProjectRow.id,
      key: mockProjectRow.key,
      number: 7,
    })

    const result = await service.create('org_test_1', {
      projectId: mockProjectRow.id,
      title: 'Allocation is the source of truth',
    })

    expect(result.error).toBeNull()
    expect(result.data?.identifier).toBe('CONSOLE-7')
    expect(result.data?.number).toBe(7)
    expect(txMock.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ number: 7, identifier: 'CONSOLE-7' })
    )
  })

  it('create falls back to the tenants Triage project when projectId is absent', async () => {
    txMock.allocateIssueNumber.mockResolvedValueOnce({
      projectId: mockTriageProject.id,
      key: mockTriageProject.key,
      number: mockTriageProject.nextIssueNumber,
    })

    const result = await service.create('org_test_1', {
      title: 'Triage fallback test',
    })

    expect(result.error).toBeNull()
    expect(projectsRepo.retrieve).toHaveBeenCalledWith(
      tenant.id,
      tenant.triageProjectId
    )
    expect(txMock.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: tenant.triageProjectId,
        identifier: 'TRI-5',
        number: 5,
      })
    )
  })

  it('create accepts a project key as well as a project id', async () => {
    const result = await service.create('org_test_1', {
      projectId: 'console',
      title: 'Project key test',
    })

    expect(result.error).toBeNull()
    expect(projectsRepo.retrieveByKey).toHaveBeenCalledWith(
      tenant.id,
      'CONSOLE'
    )
    expect(txMock.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        projectId: mockProjectRow.id,
        identifier: 'CONSOLE-1',
      })
    )
  })

  it('create writes a created IssueEvent', async () => {
    const result = await service.create('org_test_1', {
      projectId: mockProjectRow.id,
      title: 'Issue event test',
      creatorUserId: 'usr_creator_1',
    })

    expect(result.error).toBeNull()
    expect(txMock.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        actorUserId: 'usr_creator_1',
        type: 'created',
        fromValue: null,
        toValue: 'CONSOLE-1',
        createdAt: expect.any(BigInt),
      })
    )
  })

  it('create uses configured tenant defaults and priority none', async () => {
    const triageState = { ...todoState, id: 'wfs_triage', key: 'triage' }
    const bugType = { ...taskType, id: 'wit_bug', key: 'bug', name: 'Bug' }
    workStructureRepo.retrieveDefaultWorkflowState.mockResolvedValueOnce(
      triageState
    )
    workStructureRepo.retrieveDefaultWorkItemType.mockResolvedValueOnce(bugType)

    const result = await service.create('org_test_1', {
      projectId: mockProjectRow.id,
      title: 'Configured defaults test',
    })

    expect(result.error).toBeNull()
    expect(txMock.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'triage',
        workflowStateId: 'wfs_triage',
        typeKey: 'bug',
        workItemTypeId: 'wit_bug',
        priority: 'none',
      })
    )
  })

  it('create prefers a project default work item type over the tenant default', async () => {
    const projectDefault = {
      ...taskType,
      id: 'wit_project_bug',
      key: 'bug',
      name: 'Bug',
    }
    projectsRepo.retrieve.mockResolvedValueOnce({
      ...mockProjectRow,
      defaultWorkItemTypeId: projectDefault.id,
    })
    workStructureRepo.retrieveWorkItemType.mockResolvedValueOnce(projectDefault)

    const result = await service.create('org_test_1', {
      projectId: mockProjectRow.id,
      title: 'Project type default',
    })

    expect(result.error).toBeNull()
    expect(workStructureRepo.retrieveWorkItemType).toHaveBeenCalledWith(
      tenant.id,
      projectDefault.id
    )
    expect(workStructureRepo.retrieveDefaultWorkItemType).not.toHaveBeenCalled()
    expect(txMock.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({
        typeKey: 'bug',
        workItemTypeId: projectDefault.id,
      })
    )
  })

  it('create enforces required applicable custom fields before opening a transaction', async () => {
    workStructureRepo.listCustomFields.mockResolvedValueOnce([
      {
        id: 'cf_environment',
        tenantId: tenant.id,
        key: 'environment',
        label: 'Environment',
        fieldType: 'text',
        options: null,
        required: true,
        description: null,
        position: 0,
        archivedAt: null,
        createdAt: 1787767200n,
        updatedAt: 1787767200n,
        types: [{ typeId: taskType.id }],
      },
    ])

    const result = await service.create('org_test_1', {
      projectId: mockProjectRow.id,
      title: 'Missing required field',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/required-custom-field-missing',
      message: 'Complete all required custom fields.',
      httpStatus: 400,
      param: 'environment',
    })
    expect(repository.transaction).not.toHaveBeenCalled()
  })

  it('create persists custom field values through the same issue transaction', async () => {
    const field = {
      id: 'cf_environment',
      tenantId: tenant.id,
      key: 'environment',
      label: 'Environment',
      fieldType: 'text',
      options: null,
      required: false,
      description: null,
      position: 0,
      archivedAt: null,
      createdAt: 1787767200n,
      updatedAt: 1787767200n,
      types: [{ typeId: taskType.id }],
    }
    workStructureRepo.listCustomFields.mockResolvedValue([field])
    workStructureRepo.retrieveCustomField.mockResolvedValue(field)
    workStructureRepo.upsertCustomFieldValue.mockResolvedValue({
      id: 'cfv_environment',
      tenantId: tenant.id,
      issueId: mockIssueRow.id,
      fieldId: field.id,
      stringValue: 'Production',
      integerValue: null,
      decimalValue: null,
      booleanValue: null,
      dateValue: null,
      selectKey: null,
      selectKeys: [],
      updatedBy: 'usr_creator_1',
      createdAt: 1787767200n,
      updatedAt: 1787767200n,
      field,
    })

    const result = await service.create('org_test_1', {
      projectId: mockProjectRow.id,
      title: 'Atomic field write',
      creatorUserId: 'usr_creator_1',
      customFields: [{ fieldId: field.id, value: 'Production' }],
    })

    expect(result.error).toBeNull()
    expect(workStructureRepo.retrieveCustomField).toHaveBeenCalledWith(
      tenant.id,
      field.id,
      txMock.transactionClient
    )
    expect(workStructureRepo.upsertCustomFieldValue).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        fieldId: field.id,
        stringValue: 'Production',
      }),
      txMock.transactionClient
    )
  })

  it('create returns projects/project-not-found for an unknown project', async () => {
    projectsRepo.retrieve.mockResolvedValue(null)
    projectsRepo.retrieveByKey.mockResolvedValue(null)

    const result = await service.create('org_test_1', {
      projectId: 'prj_nonexistent',
      title: 'Missing project issue',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/project-not-found',
      message: 'The project could not be found.',
      httpStatus: 404,
    })
    expect(repository.transaction).not.toHaveBeenCalled()
  })

  it('retrieve resolves an iss_-prefixed ref by id', async () => {
    repository.retrieve.mockResolvedValue(mockIssueRow)

    const result = await service.retrieve('org_test_1', 'iss_test_1')

    expect(result.error).toBeNull()
    expect(result.data?.id).toBe('iss_test_1')
    expect(repository.retrieve).toHaveBeenCalledWith(tenant.id, 'iss_test_1')
    expect(repository.retrieveByIdentifier).not.toHaveBeenCalled()
  })

  it('retrieve resolves CONSOLE-12 by identifier, case-insensitively', async () => {
    repository.retrieveByIdentifier.mockResolvedValue({
      ...mockIssueRow,
      identifier: 'CONSOLE-12',
    })

    const result = await service.retrieve('org_test_1', 'console-12')

    expect(result.error).toBeNull()
    expect(result.data?.identifier).toBe('CONSOLE-12')
    expect(repository.retrieveByIdentifier).toHaveBeenCalledWith(
      tenant.id,
      'CONSOLE-12'
    )
    expect(repository.retrieve).not.toHaveBeenCalled()
  })

  it('retrieve returns projects/issue-not-found for an issue in another tenant (assert the complete error object)', async () => {
    repository.retrieve.mockResolvedValue(null)

    const result = await service.retrieve('org_test_1', 'iss_other_tenant')

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/issue-not-found',
      message: 'The issue could not be found.',
      httpStatus: 404,
    })
    expect(repository.retrieve).toHaveBeenCalledWith(
      tenant.id,
      'iss_other_tenant'
    )
  })

  it('list defaults order to updated and limit to 25', async () => {
    repository.list.mockResolvedValue([])
    repository.count.mockResolvedValue(0)

    const result = await service.list('org_test_1', {})

    expect(result.error).toBeNull()
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ order: 'updated', limit: 25 })
    )
  })

  it('list caps limit at 100', async () => {
    repository.list.mockResolvedValue([])
    repository.count.mockResolvedValue(0)

    const result = await service.list('org_test_1', { limit: 500 })

    expect(result.error).toBeNull()
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ limit: 100 })
    )
  })

  it('list applies updated_since as updatedAt >= value', async () => {
    repository.list.mockResolvedValue([])
    repository.count.mockResolvedValue(0)

    const result = await service.list('org_test_1', {
      updated_since: 1787767200,
    })

    expect(result.error).toBeNull()
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ updatedSince: 1787767200 })
    )
  })

  it('list parses a comma-separated status into an in filter', async () => {
    repository.list.mockResolvedValue([])
    repository.count.mockResolvedValue(0)

    const result = await service.list('org_test_1', {
      status: 'todo,in-progress',
    })

    expect(result.error).toBeNull()
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ status: ['todo', 'in-progress'] })
    )
  })

  it('list treats assignee=none as "no assignee"', async () => {
    repository.list.mockResolvedValue([])
    repository.count.mockResolvedValue(0)

    const result = await service.list('org_test_1', { assignee: 'none' })

    expect(result.error).toBeNull()
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ assignee: 'none' })
    )
  })

  it('list treats parent=none as "top level only"', async () => {
    repository.list.mockResolvedValue([])
    repository.count.mockResolvedValue(0)

    const result = await service.list('org_test_1', { parent: 'none' })

    expect(result.error).toBeNull()
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ parent: 'none' })
    )
  })

  it('list excludes soft-deleted issues by default', async () => {
    repository.list.mockResolvedValue([])
    repository.count.mockResolvedValue(0)

    const result = await service.list('org_test_1', {})

    expect(result.error).toBeNull()
    expect(repository.list).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ includeDeleted: false })
    )
  })

  it('list scopes by tenantId (assert the exact repository call arguments)', async () => {
    repository.list.mockResolvedValue([mockIssueRow])
    repository.count.mockResolvedValue(1)

    const result = await service.list('org_test_1', {})

    expect(result.error).toBeNull()
    expect(repository.list).toHaveBeenCalledWith(tenant.id, {
      project: undefined,
      milestoneId: undefined,
      typeKey: undefined,
      status: undefined,
      priority: undefined,
      assignee: undefined,
      label: undefined,
      parent: undefined,
      q: undefined,
      updatedSince: undefined,
      includeDeleted: false,
      order: 'updated',
      limit: 25,
      startingAfter: undefined,
      endingBefore: undefined,
    })
  })

  it('update to in-progress sets startedAt only when it was null', async () => {
    repository.retrieve.mockResolvedValue({
      ...mockIssueRow,
      status: 'todo',
      startedAt: null,
    })

    const resultNull = await service.update('org_test_1', mockIssueRow.id, {
      status: 'in-progress',
    })

    expect(resultNull.error).toBeNull()
    expect(txMock.updateIssue).toHaveBeenCalledWith(
      mockIssueRow.id,
      expect.objectContaining({
        status: 'in-progress',
        startedAt: expect.any(BigInt),
      })
    )

    txMock.updateIssue.mockClear()
    repository.retrieve.mockResolvedValue({
      ...mockIssueRow,
      status: 'todo',
      startedAt: 1787767200n,
    })

    const resultNotNull = await service.update('org_test_1', mockIssueRow.id, {
      status: 'in-progress',
    })

    expect(resultNotNull.error).toBeNull()
    expect(txMock.updateIssue.mock.calls[0][1].startedAt).toBeUndefined()
  })

  it('update to done sets completedAt and clears canceledAt', async () => {
    repository.retrieve.mockResolvedValue({
      ...mockIssueRow,
      status: 'in-progress',
      canceledAt: 1787767200n,
      completedAt: null,
    })

    const result = await service.update('org_test_1', mockIssueRow.id, {
      status: 'done',
    })

    expect(result.error).toBeNull()
    expect(txMock.updateIssue).toHaveBeenCalledWith(
      mockIssueRow.id,
      expect.objectContaining({
        status: 'done',
        completedAt: expect.any(BigInt),
        canceledAt: null,
      })
    )
  })

  it('update writes one event per changed field and no events when nothing changed', async () => {
    repository.retrieve.mockResolvedValue(mockIssueRow)

    const resultWithChanges = await service.update(
      'org_test_1',
      mockIssueRow.id,
      { status: 'in-review', priority: 'high' }
    )

    expect(resultWithChanges.error).toBeNull()
    expect(txMock.createEvent).toHaveBeenCalledTimes(2)
    expect(txMock.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'status-changed',
        fromValue: 'todo',
        toValue: 'in-review',
      })
    )
    expect(txMock.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'priority-changed',
        fromValue: 'none',
        toValue: 'high',
      })
    )

    txMock.createEvent.mockClear()
    repository.retrieve.mockResolvedValue(mockIssueRow)

    const resultNoChanges = await service.update(
      'org_test_1',
      mockIssueRow.id,
      { status: 'todo', title: 'Same status new title' }
    )

    expect(resultNoChanges.error).toBeNull()
    expect(txMock.createEvent).not.toHaveBeenCalled()
  })

  it('update persists custom field values through the same transaction', async () => {
    repository.retrieve.mockResolvedValue(mockIssueRow)
    const field = {
      id: 'cf_environment',
      tenantId: tenant.id,
      key: 'environment',
      label: 'Environment',
      fieldType: 'text',
      options: null,
      required: false,
      description: null,
      position: 0,
      archivedAt: null,
      createdAt: 1787767200n,
      updatedAt: 1787767200n,
      types: [{ typeId: taskType.id }],
    }
    workStructureRepo.listCustomFields.mockResolvedValue([field])
    workStructureRepo.retrieveCustomField.mockResolvedValue(field)
    workStructureRepo.upsertCustomFieldValue.mockResolvedValue({
      id: 'cfv_environment',
      tenantId: tenant.id,
      issueId: mockIssueRow.id,
      fieldId: field.id,
      stringValue: 'Staging',
      integerValue: null,
      decimalValue: null,
      booleanValue: null,
      dateValue: null,
      selectKey: null,
      selectKeys: [],
      updatedBy: 'usr_editor',
      createdAt: 1787767200n,
      updatedAt: 1787767200n,
      field,
    })

    const result = await service.update('org_test_1', mockIssueRow.id, {
      actorUserId: 'usr_editor',
      customFields: [{ fieldId: field.id, value: 'Staging' }],
    })

    expect(result.error).toBeNull()
    expect(workStructureRepo.upsertCustomFieldValue).toHaveBeenCalledWith(
      expect.objectContaining({
        issueId: mockIssueRow.id,
        stringValue: 'Staging',
      }),
      txMock.transactionClient
    )
  })

  it('moving an issue to another project leaves identifier unchanged', async () => {
    const targetProject2 = {
      ...mockProjectRow,
      id: 'prj_beta_2',
      key: 'BETA',
      name: 'Beta Project',
    }
    projectsRepo.retrieve.mockImplementation(
      async (_tenantId: string, id: string) =>
        id === targetProject2.id ? targetProject2 : mockProjectRow
    )
    repository.retrieve.mockResolvedValue(mockIssueRow)

    const result = await service.update('org_test_1', mockIssueRow.id, {
      projectId: targetProject2.id,
    })

    expect(result.error).toBeNull()
    expect(result.data?.identifier).toBe('CONSOLE-1')
    expect(txMock.updateIssue).toHaveBeenCalledWith(
      mockIssueRow.id,
      expect.objectContaining({ projectId: targetProject2.id })
    )
    const updateCallArgs = txMock.updateIssue.mock.calls[0][1]
    expect(updateCallArgs.identifier).toBeUndefined()
    expect(updateCallArgs.number).toBeUndefined()
  })

  it('delete soft-deletes by default and hard-deletes when DELETION_MODE === "hard"', async () => {
    repository.retrieve.mockResolvedValue(mockIssueRow)

    const resultSoft = await service.remove('org_test_1', mockIssueRow.id)

    expect(resultSoft.error).toBeNull()
    expect(resultSoft.data).toEqual({
      object: 'projects.issue',
      id: mockIssueRow.id,
      deleted: true,
    })
    expect(repository.softDelete).toHaveBeenCalledWith(
      tenant.id,
      mockIssueRow.id,
      expect.any(BigInt)
    )
    expect(repository.hardDelete).not.toHaveBeenCalled()

    process.env.DELETION_MODE = 'hard'
    repository.softDelete.mockClear()
    repository.hardDelete.mockClear()

    const resultHard = await service.remove('org_test_1', mockIssueRow.id)

    expect(resultHard.error).toBeNull()
    expect(resultHard.data).toEqual({
      object: 'projects.issue',
      id: mockIssueRow.id,
      deleted: true,
    })
    expect(repository.hardDelete).toHaveBeenCalledWith(
      tenant.id,
      mockIssueRow.id
    )
    expect(repository.softDelete).not.toHaveBeenCalled()
  })

  it('update of an unknown issue returns projects/issue-not-found', async () => {
    repository.retrieve.mockResolvedValue(null)

    const result = await service.update('org_test_1', 'iss_missing', {
      title: 'New title',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/issue-not-found',
      message: 'The issue could not be found.',
      httpStatus: 404,
    })
    expect(repository.transaction).not.toHaveBeenCalled()
  })

  it('list events returns issue events newest first', async () => {
    repository.retrieve.mockResolvedValue(mockIssueRow)
    repository.listEvents.mockResolvedValue([mockIssueEventRow])

    const result = await service.listEvents('org_test_1', mockIssueRow.id)

    expect(result.error).toBeNull()
    expect(result.data).toEqual([
      {
        object: 'projects.issue-event',
        id: mockIssueEventRow.id,
        issueId: mockIssueRow.id,
        actorUserId: 'usr_creator_1',
        type: 'created',
        fromValue: null,
        toValue: 'CONSOLE-1',
        createdAt: 1787767200,
      },
    ])
    expect(repository.listEvents).toHaveBeenCalledWith(
      tenant.id,
      mockIssueRow.id
    )
  })

  it('GET /v1/organizations/:organizationId/issues returns platform list envelope', async () => {
    repository.list.mockResolvedValue([mockIssueRow])
    repository.count.mockResolvedValue(1)

    const response = await requestJson(
      'GET',
      '/v1/organizations/org_test_1/issues'
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'list',
        data: [
          {
            object: 'projects.issue',
            id: mockIssueRow.id,
            tenantId: tenant.id,
            projectId: mockProjectRow.id,
            projectKey: 'CONSOLE',
            number: 1,
            identifier: 'CONSOLE-1',
            title: 'Test issue title',
            description: 'Test issue description',
            status: 'todo',
            typeKey: 'task',
            type: {
              object: 'projects.work-item-type',
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
              createdAt: 1787767200,
              updatedAt: 1787767200,
            },
            state: {
              object: 'projects.workflow-state',
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
              createdAt: 1787767200,
              updatedAt: 1787767200,
            },
            milestone: null,
            taskListId: null,
            cycleId: null,
            customFields: [],
            priority: 'none',
            assigneeUserId: null,
            creatorUserId: 'usr_creator_1',
            parentIssueId: null,
            estimate: null,
            dueDate: null,
            plannedStartDate: null,
            plannedFinishDate: null,
            plannedDurationMinutes: null,
            blocked: false,
            relationCount: 0,
            dependencyCount: 0,
            position: 0,
            labels: [],
            commentCount: 0,
            subIssueCount: 0,
            startedAt: null,
            completedAt: null,
            canceledAt: null,
            createdAt: 1787767200,
            updatedAt: 1787767200,
          },
        ],
        has_more: false,
        total_count: 1,
        url: '/v1/organizations/org_test_1/issues',
      },
      error: null,
    })
  })

  it('DELETE /v1/organizations/:organizationId/issues/:issueRef soft deletes and returns tombstone via HTTP', async () => {
    repository.retrieve.mockResolvedValue(mockIssueRow)

    const response = await requestJson(
      'DELETE',
      `/v1/organizations/org_test_1/issues/${mockIssueRow.id}`
    )

    expect(response.status).toBe(200)
    expect(response.body).toEqual({
      data: {
        object: 'projects.issue',
        id: mockIssueRow.id,
        deleted: true,
      },
      error: null,
    })
  })

  it('rejects unauthorized HTTP requests when x-internal-key is missing or invalid', async () => {
    const response = await requestJson(
      'GET',
      '/v1/organizations/org_test_1/issues',
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

  it('create persists cycleId when the cycle belongs to the target project', async () => {
    cyclesRepo.retrieveCycle.mockResolvedValue({
      id: 'cyc_1',
      tenantId: tenant.id,
      projectId: mockProjectRow.id,
    })

    const result = await service.create('org_test_1', {
      projectId: mockProjectRow.id,
      title: 'Cycle scoped issue',
      cycleId: 'cyc_1',
    })

    expect(result.error).toBeNull()
    expect(result.data?.cycleId).toBe('cyc_1')
    expect(txMock.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ cycleId: 'cyc_1' })
    )
  })

  it('create treats an explicit null cycleId as unassigned', async () => {
    cyclesRepo.retrieveCycle.mockResolvedValue(null)

    const result = await service.create('org_test_1', {
      projectId: mockProjectRow.id,
      title: 'Unassigned cycle issue',
      cycleId: null,
    })

    expect(result.error).toBeNull()
    expect(result.data?.cycleId).toBeNull()
    expect(txMock.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ cycleId: null })
    )
    expect(cyclesRepo.retrieveCycle).not.toHaveBeenCalled()
  })

  it('create returns projects/cycle-not-found for an unknown cycle', async () => {
    cyclesRepo.retrieveCycle.mockResolvedValue(null)

    const result = await service.create('org_test_1', {
      projectId: mockProjectRow.id,
      title: 'Unknown cycle issue',
      cycleId: 'cyc_missing',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/cycle-not-found',
      message: 'The cycle could not be found.',
      httpStatus: 404,
    })
    expect(repository.transaction).not.toHaveBeenCalled()
  })

  it('create returns projects/cycle-not-found when the cycle belongs to another project', async () => {
    cyclesRepo.retrieveCycle.mockResolvedValue({
      id: 'cyc_other',
      tenantId: tenant.id,
      projectId: 'prj_beta_2',
    })

    const result = await service.create('org_test_1', {
      projectId: mockProjectRow.id,
      title: 'Wrong project cycle issue',
      cycleId: 'cyc_other',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/cycle-not-found',
      message: 'The cycle could not be found.',
      httpStatus: 404,
    })
    expect(repository.transaction).not.toHaveBeenCalled()
  })

  it('create accepts a global cycle with no project for any project', async () => {
    cyclesRepo.retrieveCycle.mockResolvedValue({
      id: 'cyc_global',
      tenantId: tenant.id,
      projectId: null,
    })

    const result = await service.create('org_test_1', {
      projectId: mockProjectRow.id,
      title: 'Global cycle issue',
      cycleId: 'cyc_global',
    })

    expect(result.error).toBeNull()
    expect(result.data?.cycleId).toBe('cyc_global')
    expect(txMock.createIssue).toHaveBeenCalledWith(
      expect.objectContaining({ cycleId: 'cyc_global' })
    )
  })

  it('update sets the cycle and persists the new cycleId', async () => {
    repository.retrieve.mockResolvedValue({ ...mockIssueRow, cycleId: null })
    cyclesRepo.retrieveCycle.mockResolvedValue({
      id: 'cyc_1',
      tenantId: tenant.id,
      projectId: mockProjectRow.id,
    })

    const result = await service.update('org_test_1', mockIssueRow.id, {
      cycleId: 'cyc_1',
    })

    expect(result.error).toBeNull()
    expect(result.data?.cycleId).toBe('cyc_1')
    expect(txMock.updateIssue).toHaveBeenCalledWith(
      mockIssueRow.id,
      expect.objectContaining({ cycleId: 'cyc_1' })
    )
  })

  it('update clears the cycle when cycleId is null', async () => {
    repository.retrieve.mockResolvedValue({ ...mockIssueRow, cycleId: 'cyc_9' })
    cyclesRepo.retrieveCycle.mockResolvedValue(null)

    const result = await service.update('org_test_1', mockIssueRow.id, {
      cycleId: null,
    })

    expect(result.error).toBeNull()
    expect(result.data?.cycleId).toBeNull()
    expect(txMock.updateIssue).toHaveBeenCalledWith(
      mockIssueRow.id,
      expect.objectContaining({ cycleId: null })
    )
    expect(cyclesRepo.retrieveCycle).not.toHaveBeenCalled()
  })

  it('update returns projects/cycle-not-found for an unknown cycle', async () => {
    repository.retrieve.mockResolvedValue(mockIssueRow)
    cyclesRepo.retrieveCycle.mockResolvedValue(null)

    const result = await service.update('org_test_1', mockIssueRow.id, {
      cycleId: 'cyc_missing',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/cycle-not-found',
      message: 'The cycle could not be found.',
      httpStatus: 404,
    })
    expect(repository.transaction).not.toHaveBeenCalled()
  })

  it('update returns projects/cycle-not-found when the cycle belongs to another project', async () => {
    repository.retrieve.mockResolvedValue(mockIssueRow)
    cyclesRepo.retrieveCycle.mockResolvedValue({
      id: 'cyc_other',
      tenantId: tenant.id,
      projectId: 'prj_beta_2',
    })

    const result = await service.update('org_test_1', mockIssueRow.id, {
      cycleId: 'cyc_other',
    })

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/cycle-not-found',
      message: 'The cycle could not be found.',
      httpStatus: 404,
    })
    expect(repository.transaction).not.toHaveBeenCalled()
  })

  it('update writes a cycle-changed event when the cycle changes', async () => {
    repository.retrieve.mockResolvedValue({ ...mockIssueRow, cycleId: null })
    cyclesRepo.retrieveCycle.mockResolvedValue({
      id: 'cyc_1',
      tenantId: tenant.id,
      projectId: mockProjectRow.id,
    })

    const result = await service.update('org_test_1', mockIssueRow.id, {
      cycleId: 'cyc_1',
    })

    expect(result.error).toBeNull()
    expect(txMock.createEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'cycle-changed',
        fromValue: null,
        toValue: 'cyc_1',
      })
    )
  })

  it('update writes no cycle-changed event when the cycle is unchanged', async () => {
    repository.retrieve.mockResolvedValue({ ...mockIssueRow, cycleId: 'cyc_1' })
    cyclesRepo.retrieveCycle.mockResolvedValue({
      id: 'cyc_1',
      tenantId: tenant.id,
      projectId: mockProjectRow.id,
    })

    const result = await service.update('org_test_1', mockIssueRow.id, {
      cycleId: 'cyc_1',
    })

    expect(result.error).toBeNull()
    expect(txMock.createEvent).not.toHaveBeenCalled()
  })

  it('POST /v1/organizations/:organizationId/issues accepts cycleId and exposes it in the serializer', async () => {
    cyclesRepo.retrieveCycle.mockResolvedValue({
      id: 'cyc_1',
      tenantId: tenant.id,
      projectId: mockProjectRow.id,
    })

    const response = await requestJson(
      'POST',
      '/v1/organizations/org_test_1/issues',
      {
        projectId: mockProjectRow.id,
        title: 'HTTP cycle issue',
        cycleId: 'cyc_1',
      }
    )

    expect(response.status).toBe(201)
    expect(response.body.error).toBeNull()
    expect(response.body.data.object).toBe('projects.issue')
    expect(response.body.data.cycleId).toBe('cyc_1')
    expect(response.body.data.taskListId).toBeNull()
  })
})
