import { beforeEach, describe, expect, it, vi } from 'vitest'

const { tenants, projects, issues, repository, taskListsRepo, cyclesRepo } =
  vi.hoisted(() => ({
    tenants: { resolveTenant: vi.fn(), setPresetKey: vi.fn() },
    projects: { resolveProject: vi.fn() },
    issues: { resolveIssue: vi.fn() },
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
      listWorkItemTypes: vi.fn(),
      retrieveWorkItemType: vi.fn(),
      retrieveWorkItemTypeByKey: vi.fn(),
      createWorkItemType: vi.fn(),
      createDefaultWorkItemType: vi.fn(),
      updateWorkItemType: vi.fn(),
      updateDefaultWorkItemType: vi.fn(),
      archiveWorkItemType: vi.fn(),
      countIssuesForWorkItemType: vi.fn(),
      listWorkflowStates: vi.fn(),
      retrieveWorkflowState: vi.fn(),
      retrieveWorkflowStateByKey: vi.fn(),
      createWorkflowState: vi.fn(),
      createDefaultWorkflowState: vi.fn(),
      updateWorkflowState: vi.fn(),
      updateDefaultWorkflowState: vi.fn(),
      archiveWorkflowState: vi.fn(),
      countActiveWorkflowStates: vi.fn(),
      countIssuesForWorkflowState: vi.fn(),
      listMilestones: vi.fn(),
      retrieveMilestone: vi.fn(),
      retrieveMilestoneByKey: vi.fn(),
      createMilestone: vi.fn(),
      updateMilestone: vi.fn(),
      deleteMilestone: vi.fn(),
      listCustomFields: vi.fn(),
      retrieveCustomField: vi.fn(),
      retrieveCustomFieldByKey: vi.fn(),
      createCustomField: vi.fn(),
      updateCustomField: vi.fn(),
      archiveCustomField: vi.fn(),
      listCustomFieldValues: vi.fn(),
      upsertCustomFieldValue: vi.fn(),
      clearCustomFieldValue: vi.fn(),
      seedMissing: vi.fn(),
      seedPreset: vi.fn(),
    },
  }))

vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../projects/index.js', () => projects)
vi.mock('../../issues/index.js', () => issues)
vi.mock('../work-structure.repository.js', () => repository)
vi.mock('../task-lists.repository.js', () => taskListsRepo)
vi.mock('../cycles.repository.js', () => cyclesRepo)

const service = await import('../work-structure.service.js')
const serializers = await import('../work-structure.serializers.js')

const tenant = {
  id: 'prjten_a',
  organizationId: 'org_a',
  triageProjectId: 'prj_triage',
  createdAt: 1n,
  updatedAt: 1n,
}
const workItemType = {
  id: 'wit_task',
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
  createdAt: 10n,
  updatedAt: 11n,
}
const workflowState = {
  id: 'wfs_todo',
  tenantId: tenant.id,
  key: 'todo',
  name: 'To do',
  category: 'unstarted',
  color: '#64748b',
  description: null,
  isDefault: true,
  position: 0,
  archivedAt: null,
  createdAt: 10n,
  updatedAt: 11n,
}
const milestone = {
  id: 'ms_v1',
  tenantId: tenant.id,
  projectId: 'prj_a',
  key: 'v1',
  name: 'Version 1',
  description: null,
  status: 'open',
  ownerUserId: null,
  startDate: null,
  targetDate: 20n,
  completedAt: null,
  position: 0,
  deletedAt: null,
  createdAt: 10n,
  updatedAt: 11n,
}
const customField = {
  id: 'cf_budget',
  tenantId: tenant.id,
  key: 'budget',
  label: 'Budget',
  fieldType: 'decimal',
  options: null,
  required: false,
  description: null,
  position: 0,
  archivedAt: null,
  createdAt: 10n,
  updatedAt: 11n,
  types: [],
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.resolveTenant.mockResolvedValue(tenant)
  projects.resolveProject.mockResolvedValue({
    id: 'prj_a',
    tenantId: tenant.id,
  })
  repository.retrieveWorkflowState.mockResolvedValue(workflowState)
  repository.retrieveWorkItemType.mockResolvedValue(workItemType)
  repository.retrieveMilestone.mockResolvedValue(milestone)
  repository.retrieveCustomField.mockResolvedValue(customField)
  repository.listCustomFieldValues.mockResolvedValue([])
  repository.countActiveWorkflowStates.mockResolvedValue(2)
  repository.countIssuesForWorkflowState.mockResolvedValue(0)
  repository.countIssuesForWorkItemType.mockResolvedValue(0)
})

describe('work structure service', () => {
  it('rejects an unknown workflow category at the service boundary', async () => {
    const result = await service.createWorkflowState('org_a', {
      key: 'waiting',
      name: 'Waiting',
      category: 'waiting' as unknown as 'backlog',
      color: '#111827',
    })
    expect(result).toEqual({
      data: null,
      error: {
        code: 'projects/invalid-request',
        message: 'The request could not be processed.',
        httpStatus: 400,
      },
    })
    expect(repository.createWorkflowState).not.toHaveBeenCalled()
  })

  it('rejects deleting the default workflow state', async () => {
    const result = await service.removeWorkflowState('org_a', workflowState.id)
    expect(result.error?.code).toBe('projects/default-workflow-state-required')
    expect(repository.archiveWorkflowState).not.toHaveBeenCalled()
  })

  it('rejects deleting the last active workflow state', async () => {
    repository.retrieveWorkflowState.mockResolvedValue({
      ...workflowState,
      isDefault: false,
    })
    repository.countActiveWorkflowStates.mockResolvedValue(1)
    const result = await service.removeWorkflowState('org_a', workflowState.id)
    expect(result.error?.code).toBe('projects/workflow-state-required')
    expect(repository.countIssuesForWorkflowState).not.toHaveBeenCalled()
  })

  it('rejects deleting a workflow state referenced by a live issue', async () => {
    repository.retrieveWorkflowState.mockResolvedValue({
      ...workflowState,
      isDefault: false,
    })
    repository.countIssuesForWorkflowState.mockResolvedValue(1)
    const result = await service.removeWorkflowState('org_a', workflowState.id)
    expect(result.error?.code).toBe('projects/workflow-state-in-use')
    expect(repository.archiveWorkflowState).not.toHaveBeenCalled()
  })

  it('rejects deleting a work item type referenced by a live issue', async () => {
    repository.retrieveWorkItemType.mockResolvedValue({
      ...workItemType,
      isDefault: false,
    })
    repository.countIssuesForWorkItemType.mockResolvedValue(1)
    const result = await service.removeWorkItemType('org_a', workItemType.id)
    expect(result.error?.code).toBe('projects/work-item-type-in-use')
    expect(repository.archiveWorkItemType).not.toHaveBeenCalled()
  })

  it('rejects a custom field value that uses the wrong typed column', async () => {
    const result = await service.setCustomFieldValueForTenant(
      tenant.id,
      'iss_a',
      { fieldId: customField.id, value: 12 }
    )
    expect(result.error?.code).toBe('projects/custom-field-value-invalid')
    expect(repository.upsertCustomFieldValue).not.toHaveBeenCalled()
  })

  it('rejects a select value outside declared option keys', async () => {
    repository.retrieveCustomField.mockResolvedValue({
      ...customField,
      fieldType: 'select',
      options: [{ key: 'small', label: 'Small' }],
    })
    const result = await service.setCustomFieldValueForTenant(
      tenant.id,
      'iss_a',
      { fieldId: customField.id, value: 'large' }
    )
    expect(result.error?.code).toBe('projects/custom-field-option-invalid')
    expect(repository.upsertCustomFieldValue).not.toHaveBeenCalled()
  })

  it('keeps decimal custom field values as strings', async () => {
    repository.upsertCustomFieldValue.mockImplementation(
      async (data: Record<string, unknown>) => ({
        ...data,
        decimalValue: { toString: () => '12.340000' },
        field: customField,
      })
    )
    const result = await service.setCustomFieldValueForTenant(
      tenant.id,
      'iss_a',
      { fieldId: customField.id, value: '12.340000' }
    )
    expect(result.data?.value).toBe('12.340000')
    expect(repository.upsertCustomFieldValue).toHaveBeenCalledWith(
      expect.objectContaining({ decimalValue: '12.340000' }),
      undefined
    )
  })

  it('clears an empty custom field value by deleting its row', async () => {
    const result = await service.setCustomFieldValueForTenant(
      tenant.id,
      'iss_a',
      { fieldId: customField.id, value: '' }
    )
    expect(result).toEqual({ data: null, error: null })
    expect(repository.clearCustomFieldValue).toHaveBeenCalledWith(
      tenant.id,
      'iss_a',
      customField.id,
      undefined
    )
    expect(repository.upsertCustomFieldValue).not.toHaveBeenCalled()
  })

  it('seeds a preset idempotently through missing-row upserts', async () => {
    const first = await service.seedPreset(tenant.id, 'software-development')
    const second = await service.seedPreset(tenant.id, 'software-development')
    expect(first).toEqual({ data: null, error: null })
    expect(second).toEqual({ data: null, error: null })
    expect(repository.seedPreset).toHaveBeenCalledTimes(2)
    expect(repository.seedPreset).toHaveBeenNthCalledWith(
      1,
      tenant.id,
      expect.objectContaining({
        key: 'software-development',
        workItemTypes: expect.arrayContaining([
          expect.objectContaining({ key: 'task' }),
        ]),
        workflowStates: expect.arrayContaining([
          expect.objectContaining({ key: 'todo' }),
        ]),
      })
    )
  })

  it('serializes every new resource with its full discriminator shape', () => {
    expect(serializers.serializeWorkItemType(workItemType)).toEqual({
      object: 'projects.work-item-type',
      id: 'wit_task',
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
      createdAt: 10,
      updatedAt: 11,
    })
    expect(serializers.serializeWorkflowState(workflowState)).toEqual({
      object: 'projects.workflow-state',
      id: 'wfs_todo',
      tenantId: tenant.id,
      key: 'todo',
      name: 'To do',
      category: 'unstarted',
      color: '#64748b',
      description: null,
      isDefault: true,
      position: 0,
      archivedAt: null,
      createdAt: 10,
      updatedAt: 11,
    })
    expect(serializers.serializeMilestone(milestone)).toEqual({
      object: 'projects.milestone',
      id: 'ms_v1',
      tenantId: tenant.id,
      projectId: 'prj_a',
      key: 'v1',
      name: 'Version 1',
      description: null,
      status: 'open',
      ownerUserId: null,
      startDate: null,
      targetDate: 20,
      completedAt: null,
      position: 0,
      createdAt: 10,
      updatedAt: 11,
    })
    expect(
      serializers.serializeCustomFieldValue({
        id: 'cfv_a',
        tenantId: tenant.id,
        issueId: 'iss_a',
        fieldId: customField.id,
        stringValue: null,
        integerValue: null,
        decimalValue: { toString: () => '12.340000' },
        booleanValue: null,
        dateValue: null,
        selectKey: null,
        selectKeys: [],
        updatedBy: null,
        createdAt: 10n,
        updatedAt: 11n,
        field: customField,
      })
    ).toEqual({
      object: 'projects.custom-field-value',
      id: 'cfv_a',
      tenantId: tenant.id,
      issueId: 'iss_a',
      fieldId: customField.id,
      fieldKey: 'budget',
      fieldType: 'decimal',
      value: '12.340000',
      updatedBy: null,
      createdAt: 10,
      updatedAt: 11,
    })
  })
})
