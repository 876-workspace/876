import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, defaultsRepository, tenants, projects, issues } = vi.hoisted(
  () => ({
    repository: {
      listWorkItemTypes: vi.fn(),
      retrieveWorkItemType: vi.fn(),
      retrieveWorkItemTypeByKey: vi.fn(),
      retrieveDefaultWorkItemType: vi.fn(),
      createWorkItemType: vi.fn(),
      updateWorkItemType: vi.fn(),
      clearDefaultWorkItemType: vi.fn(),
      archiveWorkItemType: vi.fn(),
      countIssuesForWorkItemType: vi.fn(),
      listWorkflowStates: vi.fn(),
      retrieveWorkflowState: vi.fn(),
      retrieveWorkflowStateByKey: vi.fn(),
      retrieveDefaultWorkflowState: vi.fn(),
      createWorkflowState: vi.fn(),
      updateWorkflowState: vi.fn(),
      clearDefaultWorkflowState: vi.fn(),
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
    defaultsRepository: {
      createDefaultWorkItemType: vi.fn(),
      updateDefaultWorkItemType: vi.fn(),
      createDefaultWorkflowState: vi.fn(),
      updateDefaultWorkflowState: vi.fn(),
    },
    tenants: { resolveTenant: vi.fn(), setPresetKey: vi.fn() },
    projects: { resolveProject: vi.fn() },
    issues: { resolveIssue: vi.fn() },
  })
)

vi.mock('../work-structure.repository.js', () => repository)
vi.mock('../work-structure-defaults.repository.js', () => defaultsRepository)
vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../projects/index.js', () => projects)
vi.mock('../../issues/index.js', () => issues)

const service = await import('../work-structure.service.js')

const SECOND = 1787767200n

const tenant = {
  id: 'prjten_1',
  organizationId: 'org_1',
  presetKey: 'software-development',
}

const project = { id: 'prj_1', tenantId: tenant.id, key: 'CONSOLE' }

const typeRow = {
  id: 'wit_task_1',
  tenantId: tenant.id,
  key: 'task',
  name: 'Task',
  iconKey: 'check-square',
  color: '#2563eb',
  hierarchyLevel: 1,
  description: null,
  isDefault: true,
  position: 1,
  archivedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
}

const stateRow = {
  id: 'wfs_todo_1',
  tenantId: tenant.id,
  key: 'todo',
  name: 'To do',
  category: 'unstarted',
  color: '#64748b',
  description: null,
  isDefault: true,
  position: 1,
  archivedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
}

const milestoneRow = {
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

const fieldRow = {
  id: 'cf_1',
  tenantId: tenant.id,
  key: 'severity',
  label: 'Severity',
  fieldType: 'select',
  options: [
    { key: 'low', label: 'Low' },
    { key: 'high', label: 'High' },
  ],
  required: false,
  description: null,
  position: 0,
  archivedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
  types: [],
}

function resetRepositoryDefaults() {
  repository.listWorkItemTypes.mockResolvedValue([])
  repository.retrieveWorkItemType.mockResolvedValue(null)
  repository.retrieveWorkItemTypeByKey.mockResolvedValue(null)
  repository.retrieveDefaultWorkItemType.mockResolvedValue(typeRow)
  repository.createWorkItemType.mockImplementation(async (data) => ({
    description: null,
    archivedAt: null,
    position: 0,
    isDefault: false,
    hierarchyLevel: 1,
    ...data,
  }))
  repository.updateWorkItemType.mockImplementation(
    async (_tenantId, _id, patch) => ({ ...typeRow, ...patch })
  )
  defaultsRepository.createDefaultWorkItemType.mockImplementation(
    async (_tenantId, data) => ({ ...typeRow, ...data, isDefault: true })
  )
  defaultsRepository.updateDefaultWorkItemType.mockImplementation(
    async (_tenantId, _id, patch) => ({ ...typeRow, ...patch, isDefault: true })
  )
  repository.countIssuesForWorkItemType.mockResolvedValue(0)
  repository.listWorkflowStates.mockResolvedValue([])
  repository.retrieveWorkflowState.mockResolvedValue(null)
  repository.retrieveWorkflowStateByKey.mockResolvedValue(null)
  repository.retrieveDefaultWorkflowState.mockResolvedValue(stateRow)
  repository.createWorkflowState.mockImplementation(async (data) => ({
    description: null,
    archivedAt: null,
    position: 0,
    isDefault: false,
    ...data,
  }))
  repository.updateWorkflowState.mockImplementation(
    async (_tenantId, _id, patch) => ({ ...stateRow, ...patch })
  )
  defaultsRepository.createDefaultWorkflowState.mockImplementation(
    async (_tenantId, data) => ({ ...stateRow, ...data, isDefault: true })
  )
  defaultsRepository.updateDefaultWorkflowState.mockImplementation(
    async (_tenantId, _id, patch) => ({ ...stateRow, ...patch, isDefault: true })
  )
  repository.countActiveWorkflowStates.mockResolvedValue(3)
  repository.countIssuesForWorkflowState.mockResolvedValue(0)
  repository.listMilestones.mockResolvedValue([])
  repository.retrieveMilestone.mockResolvedValue(null)
  repository.retrieveMilestoneByKey.mockResolvedValue(null)
  repository.createMilestone.mockImplementation(async (data) => ({
    description: null,
    status: 'open',
    startDate: null,
    targetDate: null,
    completedAt: null,
    position: 0,
    deletedAt: null,
    ...data,
  }))
  repository.updateMilestone.mockImplementation(
    async (_tenantId, _id, patch) => ({ ...milestoneRow, ...patch })
  )
  repository.listCustomFields.mockResolvedValue([])
  repository.retrieveCustomField.mockResolvedValue(null)
  repository.retrieveCustomFieldByKey.mockResolvedValue(null)
  repository.createCustomField.mockImplementation(async (data) => ({
    options: undefined,
    required: false,
    description: null,
    position: 0,
    archivedAt: null,
    types: [],
    ...data,
  }))
  repository.updateCustomField.mockImplementation(
    async (_tenantId, _id, patch) => ({ ...fieldRow, ...patch })
  )
  repository.listCustomFieldValues.mockResolvedValue([])
  repository.upsertCustomFieldValue.mockImplementation(async (data) => ({
    ...data,
    field: await repository.retrieveCustomField(data.tenantId, data.fieldId),
  }))
  repository.seedMissing.mockResolvedValue(undefined)
}

beforeEach(() => {
  vi.clearAllMocks()
  resetRepositoryDefaults()
  tenants.resolveTenant.mockResolvedValue(tenant)
  tenants.setPresetKey.mockResolvedValue(undefined)
  projects.resolveProject.mockResolvedValue(project)
  issues.resolveIssue.mockResolvedValue({ id: 'iss_1', deletedAt: null })
})

describe('listWorkItemTypes', () => {
  it('serializes every type with its discriminator', async () => {
    repository.listWorkItemTypes.mockResolvedValue([typeRow])

    const result = await service.listWorkItemTypes('org_1')

    expect(result.error).toBeNull()
    expect(result.data).toHaveLength(1)
    expect(result.data?.[0]).toMatchObject({
      object: 'projects.work-item-type',
      key: 'task',
    })
  })

  it('reports tenant-not-found for an unprovisioned organization', async () => {
    tenants.resolveTenant.mockResolvedValue(null)

    const result = await service.listWorkItemTypes('org_missing')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })
})

describe('createWorkItemType', () => {
  it('mints a wit_ id for the new type', async () => {
    const result = await service.createWorkItemType('org_1', {
      key: 'bug',
      name: 'Bug',
      iconKey: 'bug',
      color: '#dc2626',
      hierarchyLevel: 1,
    })

    expect(result.error).toBeNull()
    expect(result.data?.id.startsWith('wit_')).toBe(true)
    expect(result.data?.key).toBe('bug')
  })

  it('rejects a duplicate key with work-item-type-key-taken', async () => {
    repository.retrieveWorkItemTypeByKey.mockResolvedValue(typeRow)

    const result = await service.createWorkItemType('org_1', {
      key: 'task',
      name: 'Task',
      iconKey: 'check-square',
      color: '#2563eb',
      hierarchyLevel: 1,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/work-item-type-key-taken')
  })

  it('promotes a requested default through the atomic repository', async () => {
    await service.createWorkItemType('org_1', {
      key: 'bug',
      name: 'Bug',
      iconKey: 'bug',
      color: '#dc2626',
      hierarchyLevel: 1,
      isDefault: true,
    })

    expect(defaultsRepository.createDefaultWorkItemType).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({ key: 'bug', isDefault: true }),
      expect.any(BigInt)
    )
    expect(repository.createWorkItemType).not.toHaveBeenCalled()
  })

  it('automatically makes the first work item type the default', async () => {
    repository.retrieveDefaultWorkItemType.mockResolvedValue(null)

    const result = await service.createWorkItemType('org_1', {
      key: 'task',
      name: 'Task',
      iconKey: 'check-square',
      color: '#2563eb',
      hierarchyLevel: 1,
    })

    expect(result.data?.isDefault).toBe(true)
    expect(defaultsRepository.createDefaultWorkItemType).toHaveBeenCalled()
  })

  it('leaves the configured default alone for a non-default type', async () => {
    await service.createWorkItemType('org_1', {
      key: 'bug',
      name: 'Bug',
      iconKey: 'bug',
      color: '#dc2626',
      hierarchyLevel: 1,
    })

    expect(defaultsRepository.createDefaultWorkItemType).not.toHaveBeenCalled()
    expect(repository.createWorkItemType).toHaveBeenCalled()
  })
})

describe('retrieveWorkItemType', () => {
  it('returns the serialized type by id', async () => {
    repository.retrieveWorkItemType.mockResolvedValue(typeRow)

    const result = await service.retrieveWorkItemType('org_1', 'wit_task_1')

    expect(result.data?.id).toBe('wit_task_1')
  })

  it('reports work-item-type-not-found for an unknown id', async () => {
    const result = await service.retrieveWorkItemType('org_1', 'wit_missing')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/work-item-type-not-found')
  })
})

describe('updateWorkItemType', () => {
  it('applies a rename to the existing type', async () => {
    repository.retrieveWorkItemType.mockResolvedValue(typeRow)

    const result = await service.updateWorkItemType('org_1', 'wit_task_1', {
      name: 'Chore',
    })

    expect(result.data?.name).toBe('Chore')
  })

  it('promotes a replacement default atomically', async () => {
    repository.retrieveWorkItemType.mockResolvedValue({
      ...typeRow,
      id: 'wit_bug_1',
      key: 'bug',
      isDefault: false,
    })

    const result = await service.updateWorkItemType('org_1', 'wit_bug_1', {
      isDefault: true,
    })

    expect(result.error).toBeNull()
    expect(defaultsRepository.updateDefaultWorkItemType).toHaveBeenCalledWith(
      tenant.id,
      'wit_bug_1',
      expect.objectContaining({ isDefault: true }),
      expect.any(BigInt)
    )
  })

  it('refuses to unset the current default work item type', async () => {
    repository.retrieveWorkItemType.mockResolvedValue(typeRow)

    const result = await service.updateWorkItemType('org_1', 'wit_task_1', {
      isDefault: false,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/default-work-item-type-required')
    expect(repository.updateWorkItemType).not.toHaveBeenCalled()
  })

  it('reports work-item-type-not-found for an unknown id', async () => {
    const result = await service.updateWorkItemType('org_1', 'wit_missing', {
      name: 'Chore',
    })

    expect(result.error?.code).toBe('projects/work-item-type-not-found')
  })
})

describe('removeWorkItemType', () => {
  it('archives a replaceable type and reports the deletion envelope', async () => {
    repository.retrieveWorkItemType.mockResolvedValue({
      ...typeRow,
      isDefault: false,
    })

    const result = await service.removeWorkItemType('org_1', 'wit_task_1')

    expect(repository.archiveWorkItemType).toHaveBeenCalledWith(
      tenant.id,
      'wit_task_1',
      expect.any(BigInt)
    )
    expect(result.data).toEqual({
      object: 'projects.work-item-type',
      id: 'wit_task_1',
      deleted: true,
    })
  })

  it('refuses to archive the default work item type', async () => {
    repository.retrieveWorkItemType.mockResolvedValue(typeRow)

    const result = await service.removeWorkItemType('org_1', 'wit_task_1')

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/default-work-item-type-required')
    expect(repository.archiveWorkItemType).not.toHaveBeenCalled()
  })

  it('reports work-item-type-not-found for an unknown id', async () => {
    const result = await service.removeWorkItemType('org_1', 'wit_missing')

    expect(result.error?.code).toBe('projects/work-item-type-not-found')
  })

  it('refuses to remove a type still used by an issue', async () => {
    repository.retrieveWorkItemType.mockResolvedValue({
      ...typeRow,
      isDefault: false,
    })
    repository.countIssuesForWorkItemType.mockResolvedValue(2)

    const result = await service.removeWorkItemType('org_1', 'wit_task_1')

    expect(result.error?.code).toBe('projects/work-item-type-in-use')
    expect(repository.archiveWorkItemType).not.toHaveBeenCalled()
  })
})

describe('workflow states', () => {
  it('lists serialized states for the tenant', async () => {
    repository.listWorkflowStates.mockResolvedValue([stateRow])

    const result = await service.listWorkflowStates('org_1')

    expect(result.data?.[0]).toMatchObject({
      object: 'projects.workflow-state',
      key: 'todo',
      category: 'unstarted',
    })
  })

  it('mints a wfs_ id for a new state', async () => {
    const result = await service.createWorkflowState('org_1', {
      key: 'in-review',
      name: 'In review',
      category: 'started',
      color: '#d97706',
    })

    expect(result.data?.id.startsWith('wfs_')).toBe(true)
  })

  it('automatically makes the first workflow state the default', async () => {
    repository.retrieveDefaultWorkflowState.mockResolvedValue(null)

    const result = await service.createWorkflowState('org_1', {
      key: 'todo',
      name: 'To do',
      category: 'unstarted',
      color: '#64748b',
    })

    expect(result.data?.isDefault).toBe(true)
    expect(defaultsRepository.createDefaultWorkflowState).toHaveBeenCalled()
  })

  it('promotes a replacement workflow default atomically', async () => {
    repository.retrieveWorkflowState.mockResolvedValue({
      ...stateRow,
      id: 'wfs_review_1',
      key: 'in-review',
      isDefault: false,
    })

    const result = await service.updateWorkflowState('org_1', 'wfs_review_1', {
      isDefault: true,
    })

    expect(result.error).toBeNull()
    expect(defaultsRepository.updateDefaultWorkflowState).toHaveBeenCalledWith(
      tenant.id,
      'wfs_review_1',
      expect.objectContaining({ isDefault: true }),
      expect.any(BigInt)
    )
  })

  it('refuses to unset the current default workflow state', async () => {
    repository.retrieveWorkflowState.mockResolvedValue(stateRow)

    const result = await service.updateWorkflowState('org_1', 'wfs_todo_1', {
      isDefault: false,
    })

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/default-workflow-state-required')
    expect(repository.updateWorkflowState).not.toHaveBeenCalled()
  })

  it('rejects a duplicate state key', async () => {
    repository.retrieveWorkflowStateByKey.mockResolvedValue(stateRow)

    const result = await service.createWorkflowState('org_1', {
      key: 'todo',
      name: 'To do',
      category: 'unstarted',
      color: '#64748b',
    })

    expect(result.error?.code).toBe('projects/workflow-state-key-taken')
  })

  it('refuses to delete the default state', async () => {
    repository.retrieveWorkflowState.mockResolvedValue({
      ...stateRow,
      isDefault: true,
    })

    const result = await service.removeWorkflowState('org_1', 'wfs_todo_1')

    expect(result.error?.code).toBe('projects/default-workflow-state-required')
    expect(repository.archiveWorkflowState).not.toHaveBeenCalled()
  })

  it('refuses to delete the last remaining state', async () => {
    repository.retrieveWorkflowState.mockResolvedValue({
      ...stateRow,
      isDefault: false,
    })
    repository.countActiveWorkflowStates.mockResolvedValue(1)

    const result = await service.removeWorkflowState('org_1', 'wfs_todo_1')

    expect(result.error?.code).toBe('projects/workflow-state-required')
  })

  it('refuses to delete a state still used by an issue', async () => {
    repository.retrieveWorkflowState.mockResolvedValue({
      ...stateRow,
      isDefault: false,
    })
    repository.countIssuesForWorkflowState.mockResolvedValue(1)

    const result = await service.removeWorkflowState('org_1', 'wfs_todo_1')

    expect(result.error?.code).toBe('projects/workflow-state-in-use')
  })

  it('deletes a replaceable unused state', async () => {
    repository.retrieveWorkflowState.mockResolvedValue({
      ...stateRow,
      isDefault: false,
    })

    const result = await service.removeWorkflowState('org_1', 'wfs_todo_1')

    expect(result.data).toEqual({
      object: 'projects.workflow-state',
      id: 'wfs_todo_1',
      deleted: true,
    })
  })
})

describe('milestones', () => {
  it('lists milestones scoped to the project', async () => {
    repository.listMilestones.mockResolvedValue([milestoneRow])

    const result = await service.listMilestones('org_1', 'prj_1')

    expect(repository.listMilestones).toHaveBeenCalledWith(
      tenant.id,
      project.id,
      undefined
    )
    expect(result.data?.[0]).toMatchObject({
      object: 'projects.milestone',
      key: 'v1',
    })
  })

  it('reports project-not-found for an unknown project', async () => {
    projects.resolveProject.mockResolvedValue(null)

    const result = await service.listMilestones('org_1', 'prj_missing')

    expect(result.error?.code).toBe('projects/project-not-found')
  })

  it('mints an ms_ id for a new milestone', async () => {
    const result = await service.createMilestone('org_1', {
      projectId: 'prj_1',
      key: 'v2',
      name: 'Version 2',
    })

    expect(result.data?.id.startsWith('ms_')).toBe(true)
  })

  it('rejects a duplicate milestone key within the project', async () => {
    repository.retrieveMilestoneByKey.mockResolvedValue(milestoneRow)

    const result = await service.createMilestone('org_1', {
      projectId: 'prj_1',
      key: 'v1',
      name: 'Version 1 again',
    })

    expect(result.error?.code).toBe('projects/milestone-key-taken')
  })

  it('stamps completion when a milestone transitions to completed', async () => {
    repository.retrieveMilestone.mockResolvedValue(milestoneRow)

    await service.updateMilestone('org_1', 'ms_1', { status: 'completed' })

    const patch = repository.updateMilestone.mock.calls[0]?.[2] as
      | Record<string, unknown>
      | undefined
    expect(typeof patch?.completedAt).toBe('bigint')
  })

  it('clears completion when a milestone reopens', async () => {
    repository.retrieveMilestone.mockResolvedValue({
      ...milestoneRow,
      status: 'completed',
    })

    await service.updateMilestone('org_1', 'ms_1', { status: 'open' })

    const patch = repository.updateMilestone.mock.calls[0]?.[2] as
      | Record<string, unknown>
      | undefined
    expect(patch?.completedAt).toBeNull()
  })

  it('reports milestone-not-found for an unknown id', async () => {
    const result = await service.retrieveMilestone('org_1', 'ms_missing')

    expect(result.error?.code).toBe('projects/milestone-not-found')
  })

  it('deletes an existing milestone', async () => {
    repository.retrieveMilestone.mockResolvedValue(milestoneRow)

    const result = await service.removeMilestone('org_1', 'ms_1')

    expect(repository.deleteMilestone).toHaveBeenCalledWith(
      tenant.id,
      'ms_1',
      expect.any(BigInt)
    )
    expect(result.data?.deleted).toBe(true)
  })
})

describe('custom fields', () => {
  it('mints a cf_ id for a new field', async () => {
    const result = await service.createCustomField('org_1', {
      key: 'impact',
      label: 'Impact',
      fieldType: 'number',
    })

    expect(result.data?.id.startsWith('cf_')).toBe(true)
  })

  it('rejects a duplicate field key', async () => {
    repository.retrieveCustomFieldByKey.mockResolvedValue(fieldRow)

    const result = await service.createCustomField('org_1', {
      key: 'severity',
      label: 'Severity',
      fieldType: 'select',
    })

    expect(result.error?.code).toBe('projects/custom-field-key-taken')
  })

  it('reports custom-field-not-found for an unknown id', async () => {
    const result = await service.retrieveCustomField('org_1', 'cf_missing')

    expect(result.error?.code).toBe('projects/custom-field-not-found')
  })

  it('deletes an existing field', async () => {
    repository.retrieveCustomField.mockResolvedValue(fieldRow)

    const result = await service.removeCustomField('org_1', 'cf_1')

    expect(repository.archiveCustomField).toHaveBeenCalled()
    expect(result.data?.deleted).toBe(true)
  })
})

describe('setCustomFieldValue', () => {
  it('reports custom-field-not-found for an unknown field', async () => {
    const result = await service.setCustomFieldValue('org_1', 'CONSOLE-12', {
      fieldId: 'cf_missing',
      value: 'high',
    })

    expect(result.error?.code).toBe('projects/custom-field-not-found')
  })

  it('stores a select value in the select column', async () => {
    repository.retrieveCustomField.mockResolvedValue(fieldRow)

    const result = await service.setCustomFieldValue('org_1', 'CONSOLE-12', {
      fieldId: 'cf_1',
      value: 'high',
    })

    expect(repository.upsertCustomFieldValue).toHaveBeenCalledWith(
      expect.objectContaining({ selectKey: 'high' }),
      undefined
    )
    expect(result.error).toBeNull()
  })

  it('rejects a select value outside the configured options', async () => {
    repository.retrieveCustomField.mockResolvedValue(fieldRow)

    const result = await service.setCustomFieldValue('org_1', 'CONSOLE-12', {
      fieldId: 'cf_1',
      value: 'critical',
    })

    expect(result.error?.code).toBe('projects/custom-field-option-invalid')
    expect(repository.upsertCustomFieldValue).not.toHaveBeenCalled()
  })

  it('stores an integer in the integer column for number fields', async () => {
    repository.retrieveCustomField.mockResolvedValue({
      ...fieldRow,
      fieldType: 'number',
      options: null,
    })

    const result = await service.setCustomFieldValue('org_1', 'CONSOLE-12', {
      fieldId: 'cf_1',
      value: 3,
    })

    expect(repository.upsertCustomFieldValue).toHaveBeenCalledWith(
      expect.objectContaining({ integerValue: 3 }),
      undefined
    )
    expect(result.error).toBeNull()
  })

  it('carries a decimal string through without float conversion', async () => {
    repository.retrieveCustomField.mockResolvedValue({
      ...fieldRow,
      fieldType: 'decimal',
      options: null,
    })

    await service.setCustomFieldValue('org_1', 'CONSOLE-12', {
      fieldId: 'cf_1',
      value: '3.14',
    })

    expect(repository.upsertCustomFieldValue).toHaveBeenCalledWith(
      expect.objectContaining({ decimalValue: '3.14' }),
      undefined
    )
  })

  it('rejects a malformed decimal string', async () => {
    repository.retrieveCustomField.mockResolvedValue({
      ...fieldRow,
      fieldType: 'decimal',
      options: null,
    })

    const result = await service.setCustomFieldValue('org_1', 'CONSOLE-12', {
      fieldId: 'cf_1',
      value: '3.14159265',
    })

    expect(result.error?.code).toBe('projects/custom-field-value-invalid')
  })

  it('stores booleans in the boolean column', async () => {
    repository.retrieveCustomField.mockResolvedValue({
      ...fieldRow,
      fieldType: 'boolean',
      options: null,
    })

    await service.setCustomFieldValue('org_1', 'CONSOLE-12', {
      fieldId: 'cf_1',
      value: true,
    })

    expect(repository.upsertCustomFieldValue).toHaveBeenCalledWith(
      expect.objectContaining({ booleanValue: true }),
      undefined
    )
  })

  it('stores dates as bigint seconds in the date column', async () => {
    repository.retrieveCustomField.mockResolvedValue({
      ...fieldRow,
      fieldType: 'date',
      options: null,
    })

    await service.setCustomFieldValue('org_1', 'CONSOLE-12', {
      fieldId: 'cf_1',
      value: 1787767200,
    })

    expect(repository.upsertCustomFieldValue).toHaveBeenCalledWith(
      expect.objectContaining({ dateValue: 1787767200n }),
      undefined
    )
  })

  it('clears the stored value for an empty input without upserting', async () => {
    repository.retrieveCustomField.mockResolvedValue({
      ...fieldRow,
      fieldType: 'text',
      options: null,
    })

    const result = await service.setCustomFieldValue('org_1', 'CONSOLE-12', {
      fieldId: 'cf_1',
      value: '',
    })

    expect(repository.clearCustomFieldValue).toHaveBeenCalledWith(
      tenant.id,
      'iss_1',
      'cf_1',
      undefined
    )
    expect(repository.upsertCustomFieldValue).not.toHaveBeenCalled()
    expect(result.data).toBeNull()
    expect(result.error).toBeNull()
  })

  it('rejects a mistyped value for the field kind', async () => {
    repository.retrieveCustomField.mockResolvedValue({
      ...fieldRow,
      fieldType: 'number',
      options: null,
    })

    const result = await service.setCustomFieldValue('org_1', 'CONSOLE-12', {
      fieldId: 'cf_1',
      value: 'high',
    })

    expect(result.error?.code).toBe('projects/custom-field-value-invalid')
  })

  it('reports issue-not-found for a deleted issue', async () => {
    repository.retrieveCustomField.mockResolvedValue(fieldRow)
    issues.resolveIssue.mockResolvedValue({ id: 'iss_1', deletedAt: 1n })

    const result = await service.setCustomFieldValue('org_1', 'CONSOLE-12', {
      fieldId: 'cf_1',
      value: 'high',
    })

    expect(result.error?.code).toBe('projects/issue-not-found')
  })
})

describe('validateCustomFieldValues', () => {
  it('accepts a batch of valid values', async () => {
    repository.retrieveCustomField.mockResolvedValue({
      ...fieldRow,
      fieldType: 'text',
      options: null,
    })

    const result = await service.validateCustomFieldValues('prjten_1', [
      { fieldId: 'cf_1', value: 'note' },
    ])

    expect(result.error).toBeNull()
  })

  it('rejects a batch naming an unknown field', async () => {
    repository.retrieveCustomField.mockResolvedValue(null)

    const result = await service.validateCustomFieldValues('prjten_1', [
      { fieldId: 'cf_missing', value: 'note' },
    ])

    expect(result.error?.code).toBe('projects/custom-field-not-found')
  })
})

describe('validateIssueCustomFieldValues', () => {
  it('rejects creation when an applicable required field is missing', async () => {
    repository.listCustomFields.mockResolvedValue([
      { ...fieldRow, required: true, fieldType: 'text', options: null },
    ])

    const result = await service.validateIssueCustomFieldValues(
      tenant.id,
      typeRow.id,
      []
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/required-custom-field-missing')
    expect(result.error?.param).toBe(fieldRow.key)
  })

  it('rejects a value for a field scoped to a different work item type', async () => {
    repository.listCustomFields.mockResolvedValue([
      {
        ...fieldRow,
        types: [{ typeId: 'wit_bug_1' }],
      },
    ])

    const result = await service.validateIssueCustomFieldValues(
      tenant.id,
      typeRow.id,
      [{ fieldId: fieldRow.id, value: 'high' }]
    )

    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('keeps an existing required value valid when an update omits it', async () => {
    repository.listCustomFields.mockResolvedValue([
      { ...fieldRow, required: true, fieldType: 'text', options: null },
    ])
    repository.listCustomFieldValues.mockResolvedValue([
      { fieldId: fieldRow.id },
    ])

    const result = await service.validateIssueCustomFieldValues(
      tenant.id,
      typeRow.id,
      [],
      'iss_1'
    )

    expect(result.error).toBeNull()
  })
})

describe('getIssueStructure', () => {
  it('resolves state, type, milestone, and values by id', async () => {
    repository.retrieveWorkflowState.mockResolvedValue(stateRow)
    repository.retrieveWorkItemType.mockResolvedValue(typeRow)
    repository.retrieveMilestone.mockResolvedValue(milestoneRow)
    repository.listCustomFieldValues.mockResolvedValue([])

    const structure = await service.getIssueStructure(tenant.id, {
      status: 'todo',
      workflowStateId: 'wfs_todo_1',
      typeKey: 'task',
      workItemTypeId: 'wit_task_1',
      milestoneId: 'ms_1',
      id: 'iss_1',
    })

    expect(structure.state?.key).toBe('todo')
    expect(structure.type?.key).toBe('task')
    expect(structure.milestone?.key).toBe('v1')
    expect(structure.customFields).toEqual([])
  })

  it('falls back to status and type keys when ids are absent', async () => {
    repository.retrieveWorkflowStateByKey.mockResolvedValue(stateRow)
    repository.retrieveWorkItemTypeByKey.mockResolvedValue(typeRow)
    repository.listCustomFieldValues.mockResolvedValue([])

    const structure = await service.getIssueStructure(tenant.id, {
      status: 'todo',
      workflowStateId: null,
      typeKey: 'task',
      workItemTypeId: null,
      milestoneId: null,
      id: 'iss_1',
    })

    expect(repository.retrieveWorkflowStateByKey).toHaveBeenCalledWith(
      tenant.id,
      'todo'
    )
    expect(structure.milestone).toBeNull()
  })
})

describe('presets', () => {
  it('lists the three catalog presets', () => {
    const presets = service.listPresets()

    expect(presets.map((preset) => preset.key)).toEqual([
      'software-development',
      'business-operations',
      'general',
    ])
  })

  it('reports preset-not-found for an unknown key', async () => {
    const result = await service.applyPreset('org_1', 'marketing')

    expect(result.error?.code).toBe('projects/preset-not-found')
    expect(repository.seedPreset).not.toHaveBeenCalled()
  })

  it('seeds missing rows and records the preset key on apply', async () => {
    const result = await service.applyPreset('org_1', 'general')

    expect(result.error).toBeNull()
    expect(repository.seedPreset).toHaveBeenCalledWith(
      tenant.id,
      expect.objectContaining({
        key: 'general',
        workItemTypes: expect.any(Array),
        workflowStates: expect.any(Array),
        customFields: expect.any(Array),
      })
    )
    expect(tenants.setPresetKey).toHaveBeenCalledWith(tenant.id, 'general')
  })
})
