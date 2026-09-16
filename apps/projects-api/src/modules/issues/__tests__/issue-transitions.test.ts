import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, projects, labels, layouts, workflows, automation, workStructure, repository, issueLinks } =
  vi.hoisted(() => {
    const tx = {
      transactionClient: { tag: 'test-transaction-client' },
      allocateIssueNumber: vi.fn(),
      createIssue: vi.fn(),
      createEvent: vi.fn(),
      setLabels: vi.fn(),
      updateIssue: vi.fn(),
    }
    return {
      tenants: { resolveTenant: vi.fn() },
      projects: { resolveProject: vi.fn() },
      labels: { resolveLabel: vi.fn() },
      layouts: { enforceLayoutRules: vi.fn() },
      workflows: { checkTransition: vi.fn() },
      automation: { appendOutboxEvent: vi.fn() },
      workStructure: {
        resolveWorkItemTypeById: vi.fn(),
        resolveWorkflowStateByKey: vi.fn(),
        resolveDefaultWorkflowState: vi.fn(),
        resolveWorkItemTypeByKey: vi.fn(),
        resolveDefaultWorkItemType: vi.fn(),
        resolveMilestoneById: vi.fn(),
        resolveTaskListById: vi.fn(),
        resolveCycleById: vi.fn(),
        listCustomFields: vi.fn(),
        validateIssueCustomFieldValues: vi.fn(),
        setCustomFieldValuesForTenant: vi.fn(),
        pruneCustomFieldValuesForWorkItemType: vi.fn(),
        getIssueStructure: vi.fn(),
        listCustomFieldValuesForTenant: vi.fn(),
      },
      repository: {
        list: vi.fn(),
        count: vi.fn(),
        retrieve: vi.fn(),
        retrieveByIdentifier: vi.fn(),
        listEvents: vi.fn(),
        getBatchEnrichment: vi.fn(),
        listIssuesDueBetween: vi.fn(),
        transaction: vi.fn(),
      },
      issueLinks: { summarizeLinks: vi.fn() },
      txMock: tx,
    }
  })

vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../projects/index.js', () => projects)
vi.mock('../../labels/index.js', () => labels)
vi.mock('../../layouts/index.js', () => layouts)
vi.mock('../../workflows/index.js', () => workflows)
vi.mock('../../automation/index.js', () => automation)
vi.mock('../../work-structure/index.js', () => workStructure)
vi.mock('../issues.repository.js', () => repository)
vi.mock('../issue-links.service.js', () => issueLinks)

const service = await import('../issues.service.js')

const tenant = {
  id: 'prjten_1',
  organizationId: 'org_1',
  triageProjectId: 'prj_1',
}

function issueRow(overrides = {}) {
  return {
    id: 'iss_1',
    tenantId: tenant.id,
    projectId: 'prj_1',
    number: 1,
    identifier: 'TST-1',
    title: 'Work',
    description: null,
    status: 'todo',
    workflowStateId: 'wfs_todo',
    typeKey: 'task',
    workItemTypeId: 'wit_1',
    milestoneId: null,
    taskListId: null,
    cycleId: null,
    priority: 'none',
    assigneeUserId: null,
    creatorUserId: null,
    parentIssueId: null,
    estimate: null,
    dueDate: null,
    plannedStartDate: null,
    plannedFinishDate: null,
    plannedDurationMinutes: null,
    position: 0,
    startedAt: null,
    completedAt: null,
    canceledAt: null,
    deletedAt: null,
    createdAt: 1n,
    updatedAt: 1n,
    project: { key: 'TST' },
    labels: [],
    ...overrides,
  }
}

let activeTx: Record<string, unknown>

beforeEach(() => {
  tenants.resolveTenant.mockResolvedValue(tenant)
  projects.resolveProject.mockResolvedValue({
    id: 'prj_1',
    key: 'TST',
    defaultWorkItemTypeId: 'wit_1',
  })
  labels.resolveLabel.mockImplementation(async (_tenantId: string, input: string) => ({
    id: input,
  }))
  layouts.enforceLayoutRules.mockResolvedValue({ data: null, error: null })
  workflows.checkTransition.mockResolvedValue({ data: null, error: null })
  workStructure.resolveWorkflowStateByKey.mockImplementation(
    async (_tenantId: string, key: string) => ({
      id: `wfs_${key}`,
      key,
      category:
        key === 'done'
          ? 'completed'
          : key === 'canceled'
            ? 'canceled'
            : 'default',
    })
  )
  workStructure.resolveDefaultWorkflowState.mockResolvedValue({
    id: 'wfs_todo',
    key: 'todo',
    category: 'default',
  })
  workStructure.resolveWorkItemTypeById.mockResolvedValue({
    id: 'wit_1',
    key: 'task',
    hierarchyLevel: 1,
  })
  workStructure.resolveWorkItemTypeByKey.mockResolvedValue({
    id: 'wit_1',
    key: 'task',
    hierarchyLevel: 1,
  })
  workStructure.resolveDefaultWorkItemType.mockResolvedValue({
    id: 'wit_1',
    key: 'task',
    hierarchyLevel: 1,
  })
  workStructure.resolveMilestoneById.mockResolvedValue(null)
  workStructure.resolveTaskListById.mockResolvedValue(null)
  workStructure.resolveCycleById.mockResolvedValue(null)
  workStructure.listCustomFields.mockResolvedValue({ data: [], error: null })
  workStructure.validateIssueCustomFieldValues.mockResolvedValue({ error: null })
  workStructure.setCustomFieldValuesForTenant.mockResolvedValue({ error: null })
  workStructure.pruneCustomFieldValuesForWorkItemType.mockResolvedValue(null)
  workStructure.getIssueStructure.mockResolvedValue({})
  workStructure.listCustomFieldValuesForTenant.mockResolvedValue([])
  repository.retrieve.mockResolvedValue(issueRow())
  repository.retrieveByIdentifier.mockResolvedValue(issueRow())
  repository.getBatchEnrichment.mockResolvedValue(
    new Map([['iss_1', { labels: [], commentCount: 0, subIssueCount: 0 }]])
  )
  issueLinks.summarizeLinks.mockResolvedValue(
    new Map([
      ['iss_1', { blocked: false, relationCount: 0, dependencyCount: 0 }],
    ])
  )
  activeTx = {
    transactionClient: { tag: 'test-transaction-client' },
    allocateIssueNumber: vi
      .fn()
      .mockResolvedValue({ projectId: 'prj_1', key: 'TST', number: 7 }),
    createIssue: vi
      .fn()
      .mockImplementation(async (params: Record<string, unknown>) =>
        issueRow({ ...params, id: 'iss_1' })
      ),
    createEvent: vi.fn().mockResolvedValue({}),
    setLabels: vi.fn().mockResolvedValue(undefined),
    updateIssue: vi
      .fn()
      .mockImplementation(async (id: string, params: Record<string, unknown>) =>
        issueRow({ id, ...params })
      ),
  }
  repository.transaction.mockImplementation(
    async (callback: (tx: unknown) => Promise<unknown>) => callback(activeTx)
  )
})

describe('issue create outbox', () => {
  it('appends work-item.created inside the same transaction', async () => {
    const result = await service.create('org_1', { title: 'New' })

    expect(result.error).toBeNull()
    expect(automation.appendOutboxEvent).toHaveBeenCalledWith(
      activeTx.transactionClient,
      expect.objectContaining({
        tenantId: tenant.id,
        type: 'work-item.created',
        subjectType: 'work-item',
        subjectId: 'iss_1',
      })
    )
    const payload = (
      automation.appendOutboxEvent as unknown as {
        mock: { calls: Array<[unknown, Record<string, Record<string, unknown>>]> }
      }
    ).mock.calls[0][1].payload as Record<string, unknown>
    expect(payload.organizationId).toBe('org_1')
  })

  it('carries the automation actor and causation depth forward', async () => {
    await service.create('org_1', { title: 'New' }, {
      automationRuleId: 'arl_1',
      causationDepth: 2,
    })

    const createEvent = activeTx.createEvent as unknown as {
      mock: { calls: Array<{ 0: Record<string, unknown> }> }
    }
    expect(createEvent.mock.calls[0][0].actorUserId).toBe('automation:arl_1')
    expect(automation.appendOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ causationDepth: 2 })
    )
  })

  it('writes no outbox row when the transaction rolls back', async () => {
    repository.transaction.mockRejectedValue(new Error('db down'))

    await expect(service.create('org_1', { title: 'New' })).rejects.toThrow(
      'db down'
    )
    expect(automation.appendOutboxEvent).not.toHaveBeenCalled()
  })
})

describe('issue state-change transitions', () => {
  it('checks the blueprint on status change with layout values, comment, and permissions', async () => {
    const result = await service.update(
      'org_1',
      'iss_1',
      { status: 'in-progress', comment: 'starting now' },
      { permissions: ['issues:ship'] }
    )

    expect(result.error).toBeNull()
    expect(workflows.checkTransition).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        workItemTypeId: 'wit_1',
        fromStateKey: 'todo',
        toStateKey: 'in-progress',
        comment: 'starting now',
        permissions: ['issues:ship'],
      })
    )
    const fieldValues = (
      workflows.checkTransition as unknown as {
        mock: { calls: Array<{ 0: Record<string, Record<string, unknown>> }> }
      }
    ).mock.calls[0][0].fieldValues as Record<string, unknown>
    expect(fieldValues.state).toBe('in-progress')
    expect(fieldValues.title).toBe('Work')
  })

  it('appends updated and state-changed events in the same transaction', async () => {
    await service.update('org_1', 'iss_1', { status: 'in-progress' })

    expect(automation.appendOutboxEvent).toHaveBeenCalledWith(
      activeTx.transactionClient,
      expect.objectContaining({ type: 'work-item.updated' })
    )
    expect(automation.appendOutboxEvent).toHaveBeenCalledWith(
      activeTx.transactionClient,
      expect.objectContaining({
        type: 'work-item.state-changed',
        subjectId: 'iss_1',
      })
    )
  })

  it('aborts the mutation when the transition is not allowed', async () => {
    workflows.checkTransition.mockResolvedValue({
      data: null,
      error: { code: 'projects/transition-not-allowed' },
    })

    const result = await service.update('org_1', 'iss_1', {
      status: 'done',
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/transition-not-allowed')
    expect(repository.transaction).not.toHaveBeenCalled()
  })

  it('surfaces unmet transition requirements', async () => {
    workflows.checkTransition.mockResolvedValue({
      data: null,
      error: {
        code: 'projects/transition-requirements-unmet',
        param: 'assignee,comment',
      },
    })

    const result = await service.update('org_1', 'iss_1', {
      status: 'in-progress',
    })

    expect(result.error?.code).toBe('projects/transition-requirements-unmet')
    expect(repository.transaction).not.toHaveBeenCalled()
  })

  it('skips the blueprint check when the status does not change', async () => {
    const result = await service.update('org_1', 'iss_1', { title: 'Renamed' })

    expect(result.error).toBeNull()
    expect(workflows.checkTransition).not.toHaveBeenCalled()
    expect(automation.appendOutboxEvent).toHaveBeenCalledTimes(1)
    expect(automation.appendOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'work-item.updated' })
    )
  })
})

describe('listDueSoon', () => {
  it('returns issues due inside the window', async () => {
    repository.listIssuesDueBetween.mockResolvedValue([
      {
        id: 'iss_1',
        tenantId: tenant.id,
        projectId: 'prj_1',
        status: 'todo',
        dueDate: 1500n,
      },
      {
        id: 'iss_2',
        tenantId: tenant.id,
        projectId: 'prj_1',
        status: 'todo',
        dueDate: null,
      },
    ])

    const result = await service.listDueSoon('org_1', 1000, 2000)

    expect(result.error).toBeNull()
    expect(repository.listIssuesDueBetween).toHaveBeenCalledWith(
      tenant.id,
      1000n,
      2000n
    )
    expect(result.data).toEqual([
      { id: 'iss_1', projectId: 'prj_1', status: 'todo', dueDate: 1500 },
      { id: 'iss_2', projectId: 'prj_1', status: 'todo', dueDate: null },
    ])
  })

  it('fails when the tenant is unknown', async () => {
    tenants.resolveTenant.mockResolvedValue(null)

    const result = await service.listDueSoon('org_1', 1000, 2000)

    expect(result.error?.code).toBe('projects/tenant-not-found')
  })
})
