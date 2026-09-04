import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, tenants, projects, issues } = vi.hoisted(() => ({
  repository: {
    retrieveDefaultWorkflowState: vi.fn(),
    retrieveDefaultWorkItemType: vi.fn(),
    retrieveWorkItemType: vi.fn(),
    listCustomFields: vi.fn(),
    listCustomFieldValues: vi.fn(),
  },
  tenants: { resolveTenant: vi.fn(), setPresetKey: vi.fn() },
  projects: { resolveProject: vi.fn() },
  issues: { resolveIssue: vi.fn() },
}))

vi.mock('../work-structure.repository.js', () => repository)
vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../projects/index.js', () => projects)
vi.mock('../../issues/index.js', () => issues)

const service = await import('../work-structure.service.js')

const typeId = 'wit_bug_1'
const otherTypeId = 'wit_task_1'
const baseField = {
  id: 'cf_environment',
  tenantId: 'tenant_1',
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
  types: [{ typeId }],
}

beforeEach(() => {
  vi.clearAllMocks()
  repository.listCustomFields.mockResolvedValue([])
  repository.listCustomFieldValues.mockResolvedValue([])
})

describe('issue work structure policy', () => {
  it('resolves configured defaults without assuming task or todo keys', async () => {
    const state = { id: 'wfs_triage', key: 'triage', isDefault: true }
    const type = { id: 'wit_bug', key: 'bug', isDefault: true }
    repository.retrieveDefaultWorkflowState.mockResolvedValue(state)
    repository.retrieveDefaultWorkItemType.mockResolvedValue(type)

    await expect(
      service.resolveDefaultWorkflowState('tenant_1')
    ).resolves.toEqual(state)
    await expect(service.resolveDefaultWorkItemType('tenant_1')).resolves.toEqual(
      type
    )
    expect(repository.retrieveDefaultWorkflowState).toHaveBeenCalledWith(
      'tenant_1'
    )
    expect(repository.retrieveDefaultWorkItemType).toHaveBeenCalledWith(
      'tenant_1'
    )
  })

  it('rejects a missing required field that applies to the selected type', async () => {
    repository.listCustomFields.mockResolvedValue([baseField])

    const result = await service.validateIssueCustomFieldValues(
      'tenant_1',
      typeId,
      []
    )

    expect(result.data).toBeNull()
    expect(result.error).toEqual({
      code: 'projects/required-custom-field-missing',
      message: 'Complete all required custom fields.',
      httpStatus: 400,
      param: 'environment',
    })
  })

  it('does not require a field scoped to a different work item type', async () => {
    repository.listCustomFields.mockResolvedValue([baseField])

    const result = await service.validateIssueCustomFieldValues(
      'tenant_1',
      otherTypeId,
      []
    )

    expect(result).toEqual({ data: null, error: null })
  })

  it('rejects a supplied field that is not applicable to the selected type', async () => {
    repository.listCustomFields.mockResolvedValue([baseField])

    const result = await service.validateIssueCustomFieldValues(
      'tenant_1',
      otherTypeId,
      [{ fieldId: baseField.id, value: 'Production' }]
    )

    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('counts an existing persisted value when validating an issue update', async () => {
    repository.listCustomFields.mockResolvedValue([baseField])
    repository.listCustomFieldValues.mockResolvedValue([
      {
        id: 'cfv_1',
        tenantId: 'tenant_1',
        issueId: 'iss_1',
        fieldId: baseField.id,
        field: baseField,
      },
    ])

    const result = await service.validateIssueCustomFieldValues(
      'tenant_1',
      typeId,
      [],
      'iss_1'
    )

    expect(result).toEqual({ data: null, error: null })
  })

  it('does not allow an update to clear a required persisted value', async () => {
    repository.listCustomFields.mockResolvedValue([baseField])
    repository.listCustomFieldValues.mockResolvedValue([
      {
        id: 'cfv_1',
        tenantId: 'tenant_1',
        issueId: 'iss_1',
        fieldId: baseField.id,
        field: baseField,
      },
    ])

    const result = await service.validateIssueCustomFieldValues(
      'tenant_1',
      typeId,
      [{ fieldId: baseField.id, value: null }],
      'iss_1'
    )

    expect(result.error?.code).toBe('projects/required-custom-field-missing')
  })
})
