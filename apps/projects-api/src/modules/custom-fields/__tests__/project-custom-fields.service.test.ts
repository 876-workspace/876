import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, tenants, projects } = vi.hoisted(() => ({
  repository: {
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
  tenants: { resolveTenant: vi.fn() },
  projects: { resolveProject: vi.fn() },
}))

vi.mock('../project-custom-fields.repository.js', () => repository)
vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../projects/index.js', () => projects)

const service = await import('../project-custom-fields.service.js')

const SECOND = 1787767200n

const tenant = { id: 'prjten_1', organizationId: 'org_1' }
const project = { id: 'prj_1', tenantId: tenant.id, key: 'CONSOLE' }

const textField = {
  id: 'pcf_1',
  tenantId: tenant.id,
  key: 'team',
  label: 'Team',
  fieldType: 'text',
  options: null,
  required: false,
  description: null,
  position: 0,
  archivedAt: null,
  createdAt: SECOND,
  updatedAt: SECOND,
}

function valueRow(overrides = {}) {
  return {
    id: 'pcfv_1',
    tenantId: tenant.id,
    projectId: project.id,
    fieldId: textField.id,
    stringValue: 'platform',
    integerValue: null,
    decimalValue: null,
    booleanValue: null,
    dateValue: null,
    selectKey: null,
    selectKeys: [],
    updatedBy: null,
    createdAt: SECOND,
    updatedAt: SECOND,
    field: { key: textField.key, fieldType: textField.fieldType },
    ...overrides,
  }
}

beforeEach(() => {
  tenants.resolveTenant.mockResolvedValue(tenant)
  projects.resolveProject.mockResolvedValue(project)
  repository.listProjectCustomFields.mockResolvedValue([textField])
  repository.retrieveProjectCustomField.mockResolvedValue(textField)
  repository.retrieveProjectCustomFieldByKey.mockResolvedValue(null)
  repository.createProjectCustomField.mockImplementation(async (data) => data)
  repository.updateProjectCustomField.mockImplementation(
    async (_id, data) => ({ ...textField, ...data })
  )
  repository.listProjectCustomFieldValues.mockResolvedValue([])
  repository.listProjectCustomFieldValuesForProjects.mockResolvedValue([])
})

describe('project custom fields service', () => {
  it('lists tenant fields as serialized resources', async () => {
    const result = await service.listCustomFields('org_1')

    expect(result.error).toBeNull()
    expect(result.data).toMatchObject([
      { object: 'projects.project-custom-field', key: 'team' },
    ])
  })

  it('reports tenant-not-found when the workspace is missing', async () => {
    tenants.resolveTenant.mockResolvedValue(null)

    const result = await service.listCustomFields('org_missing')

    expect(result.error?.code).toBe('projects/tenant-not-found')
  })

  it('creates a field with generated identity and timestamps', async () => {
    const result = await service.createCustomField('org_1', {
      key: 'team',
      label: 'Team',
      fieldType: 'text',
    })

    expect(result.error).toBeNull()
    expect(repository.createProjectCustomField).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        key: 'team',
        required: false,
        position: 0,
      })
    )
  })

  it('rejects a duplicate field key', async () => {
    repository.retrieveProjectCustomFieldByKey.mockResolvedValue(textField)

    const result = await service.createCustomField('org_1', {
      key: 'team',
      label: 'Team',
      fieldType: 'text',
    })

    expect(result.error?.code).toBe('projects/custom-field-key-taken')
  })

  it('rejects select fields without options', async () => {
    const result = await service.createCustomField('org_1', {
      key: 'tier',
      label: 'Tier',
      fieldType: 'select',
    })

    expect(result.error?.code).toBe('projects/invalid-request')
    expect(repository.createProjectCustomField).not.toHaveBeenCalled()
  })

  it('updates a field label', async () => {
    const result = await service.updateCustomField('org_1', 'pcf_1', {
      label: 'Squad',
    })

    expect(result.error).toBeNull()
    expect(repository.updateProjectCustomField).toHaveBeenCalledWith(
      'pcf_1',
      expect.objectContaining({ label: 'Squad' })
    )
  })

  it('reports custom-field-not-found for unknown fields', async () => {
    repository.retrieveProjectCustomField.mockResolvedValue(null)

    const result = await service.updateCustomField('org_1', 'pcf_missing', {
      label: 'Squad',
    })

    expect(result.error?.code).toBe('projects/custom-field-not-found')
  })

  it('rejects options on non-option field types', async () => {
    const result = await service.updateCustomField('org_1', 'pcf_1', {
      options: [{ key: 'a', label: 'A' }],
    })

    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('archives fields on delete and returns a tombstone', async () => {
    const result = await service.deleteCustomField('org_1', 'pcf_1')

    expect(result.error).toBeNull()
    expect(repository.archiveProjectCustomField).toHaveBeenCalledWith(
      'pcf_1',
      expect.any(BigInt)
    )
    expect(result.data).toEqual({
      object: 'projects.project-custom-field',
      id: 'pcf_1',
      deleted: true,
    })
  })

  it('reports project-not-found for values on a missing project', async () => {
    projects.resolveProject.mockResolvedValue(null)

    const result = await service.listCustomFieldValues('org_1', 'prj_missing')

    expect(result.error?.code).toBe('projects/project-not-found')
  })

  it('sets values and returns the refreshed list', async () => {
    repository.upsertProjectCustomFieldValue.mockResolvedValue(valueRow())
    repository.listProjectCustomFieldValues.mockResolvedValue([valueRow()])

    const result = await service.setCustomFieldValues('org_1', 'prj_1', {
      customFields: [{ fieldId: 'pcf_1', value: 'platform' }],
    })

    expect(result.error).toBeNull()
    expect(repository.upsertProjectCustomFieldValue).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: tenant.id,
        projectId: project.id,
        fieldId: 'pcf_1',
        stringValue: 'platform',
      })
    )
    expect(result.data).toMatchObject([
      {
        object: 'projects.project-custom-field-value',
        fieldKey: 'team',
        value: 'platform',
      },
    ])
  })

  it('rejects duplicate value inputs', async () => {
    const result = await service.setCustomFieldValues('org_1', 'prj_1', {
      customFields: [
        { fieldId: 'pcf_1', value: 'a' },
        { fieldId: 'pcf_1', value: 'b' },
      ],
    })

    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('rejects values for unknown fields', async () => {
    const result = await service.setCustomFieldValues('org_1', 'prj_1', {
      customFields: [{ fieldId: 'pcf_missing', value: 'a' }],
    })

    expect(result.error?.code).toBe('projects/custom-field-not-found')
  })

  it('rejects mistyped values', async () => {
    const result = await service.setCustomFieldValues('org_1', 'prj_1', {
      customFields: [{ fieldId: 'pcf_1', value: 42 }],
    })

    expect(result.error?.code).toBe('projects/custom-field-value-invalid')
  })

  it('requires required fields on set', async () => {
    repository.listProjectCustomFields.mockResolvedValue([
      { ...textField, required: true },
    ])

    const result = await service.setCustomFieldValues('org_1', 'prj_1', {
      customFields: [],
    })

    expect(result.error?.code).toBe('projects/required-custom-field-missing')
    expect(result.error?.param).toBe('team')
  })

  it('clears stored values for empty inputs', async () => {
    repository.listProjectCustomFieldValues.mockResolvedValue([])

    const result = await service.setCustomFieldValues('org_1', 'prj_1', {
      customFields: [{ fieldId: 'pcf_1', value: null }],
    })

    expect(result.error).toBeNull()
    expect(repository.clearProjectCustomFieldValue).toHaveBeenCalledWith(
      tenant.id,
      project.id,
      'pcf_1'
    )
    expect(repository.upsertProjectCustomFieldValue).not.toHaveBeenCalled()
  })

  it('groups tenant values by project', async () => {
    repository.listProjectCustomFieldValuesForProjects.mockResolvedValue([
      valueRow(),
    ])

    const grouped = await service.listCustomFieldValuesForProjects(tenant.id, [
      'prj_1',
    ])

    expect(grouped.get('prj_1')).toHaveLength(1)
    expect(grouped.get('prj_1')?.[0].fieldKey).toBe('team')
  })
})
