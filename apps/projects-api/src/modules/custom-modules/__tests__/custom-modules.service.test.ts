import { beforeEach, describe, expect, it, vi } from 'vitest'

const { repository, tenants, projects, layouts, automation } = vi.hoisted(() => ({
  repository: {
    transaction: vi.fn(),
    listModules: vi.fn(),
    retrieveModule: vi.fn(),
    retrieveModuleByKey: vi.fn(),
    createModule: vi.fn(),
    updateModule: vi.fn(),
    listModuleFields: vi.fn(),
    retrieveModuleField: vi.fn(),
    retrieveModuleFieldByKey: vi.fn(),
    createModuleField: vi.fn(),
    updateModuleField: vi.fn(),
    deleteModuleField: vi.fn(),
    listModuleStatuses: vi.fn(),
    retrieveModuleStatus: vi.fn(),
    retrieveModuleStatusByKey: vi.fn(),
    createModuleStatus: vi.fn(),
    updateModuleStatus: vi.fn(),
    updateManyModuleStatuses: vi.fn(),
    deleteModuleStatus: vi.fn(),
    countRecordsByStatus: vi.fn(),
    listRecords: vi.fn(),
    countRecords: vi.fn(),
    retrieveRecord: vi.fn(),
    retrieveRecordById: vi.fn(),
    listRecordValues: vi.fn(),
    listRecordsForReport: vi.fn(),
    listLinksForSource: vi.fn(),
    retrieveLink: vi.fn(),
    findLink: vi.fn(),
    listWidgets: vi.fn(),
    retrieveWidget: vi.fn(),
  },
  tenants: { resolveTenant: vi.fn() },
  projects: { resolveProject: vi.fn() },
  layouts: { enforceLayoutRules: vi.fn() },
  automation: { appendOutboxEvent: vi.fn() },
}))

vi.mock('../custom-modules.repository.js', () => repository)
vi.mock('../../tenants/index.js', () => tenants)
vi.mock('../../projects/index.js', () => projects)
vi.mock('../../layouts/index.js', () => layouts)
vi.mock('../../automation/index.js', () => automation)

const service = await import('../custom-modules.service.js')

const SECOND = 1787767200n
const tenant = { id: 'prjten_1', organizationId: 'org_1' }

function moduleRow(overrides = {}) {
  return {
    id: 'cmod_1',
    tenantId: tenant.id,
    scope: 'org',
    projectId: null,
    key: 'risk-log',
    singularName: 'Risk',
    pluralName: 'Risks',
    icon: null,
    version: 1,
    restrictedToRoleKeys: [],
    deletedAt: null,
    deletedBy: null,
    createdAt: SECOND,
    updatedAt: SECOND,
    ...overrides,
  }
}

function statusRow(overrides = {}) {
  return {
    id: 'cmods_1',
    tenantId: tenant.id,
    moduleId: 'cmod_1',
    key: 'triage',
    label: 'Triage',
    category: 'open',
    position: 0,
    isDefault: true,
    createdAt: SECOND,
    updatedAt: SECOND,
    ...overrides,
  }
}

function fieldRow(overrides = {}) {
  return {
    id: 'cmodf_1',
    tenantId: tenant.id,
    moduleId: 'cmod_1',
    key: 'owner',
    label: 'Owner',
    fieldType: 'text',
    options: null,
    required: false,
    position: 0,
    createdAt: SECOND,
    updatedAt: SECOND,
    ...overrides,
  }
}

function recordRow(overrides = {}) {
  return {
    id: 'cmodr_1',
    tenantId: tenant.id,
    moduleId: 'cmod_1',
    projectId: null,
    title: 'Risk one',
    statusKey: 'triage',
    createdBy: null,
    updatedBy: null,
    deletedAt: null,
    deletedBy: null,
    createdAt: SECOND,
    updatedAt: SECOND,
    ...overrides,
  }
}

function txDouble() {
  return {
    customModuleRecord: { create: vi.fn(), update: vi.fn() },
    customModuleRecordValue: { create: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() },
    customModuleLink: { create: vi.fn(), delete: vi.fn() },
    dashboardWidget: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
    automationEvent: { create: vi.fn() },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  tenants.resolveTenant.mockResolvedValue(tenant)
  projects.resolveProject.mockResolvedValue({ id: 'prj_1' })
  layouts.enforceLayoutRules.mockResolvedValue({ data: null, error: null })
  automation.appendOutboxEvent.mockResolvedValue(undefined)
  repository.listModules.mockResolvedValue([])
  repository.retrieveModule.mockResolvedValue(null)
  repository.retrieveModuleByKey.mockResolvedValue(null)
  repository.createModule.mockImplementation(async (data) => ({ ...moduleRow(), ...data }))
  repository.updateModule.mockImplementation(async (id, data) => ({ ...moduleRow(), id, ...data }))
  repository.listModuleFields.mockResolvedValue([])
  repository.retrieveModuleField.mockResolvedValue(null)
  repository.retrieveModuleFieldByKey.mockResolvedValue(null)
  repository.createModuleField.mockImplementation(async (data) => ({ ...fieldRow(), ...data }))
  repository.updateModuleField.mockImplementation(async (id, data) => ({ ...fieldRow(), id, ...data }))
  repository.listModuleStatuses.mockResolvedValue([])
  repository.retrieveModuleStatus.mockResolvedValue(null)
  repository.retrieveModuleStatusByKey.mockResolvedValue(null)
  repository.createModuleStatus.mockImplementation(async (data) => ({ ...statusRow(), ...data }))
  repository.updateModuleStatus.mockImplementation(async (id, data) => ({ ...statusRow(), id, ...data }))
  repository.countRecordsByStatus.mockResolvedValue(0)
  repository.listRecords.mockResolvedValue([])
  repository.countRecords.mockResolvedValue(0)
  repository.retrieveRecord.mockResolvedValue(null)
  repository.retrieveRecordById.mockResolvedValue(null)
  repository.listRecordValues.mockResolvedValue([])
  repository.listRecordsForReport.mockResolvedValue([])
  repository.listLinksForSource.mockResolvedValue([])
  repository.retrieveLink.mockResolvedValue(null)
  repository.findLink.mockResolvedValue(null)
  repository.listWidgets.mockResolvedValue([])
  repository.retrieveWidget.mockResolvedValue(null)
  repository.transaction.mockImplementation(async (fn) => fn(txDouble()))
})

describe('parseRoleKeysHeader', () => {
  it('parses comma-separated keys', () => {
    expect(service.parseRoleKeysHeader('admin, manager')).toEqual(['admin', 'manager'])
  })

  it('returns an empty list when the header is missing', () => {
    expect(service.parseRoleKeysHeader(undefined)).toEqual([])
  })

  it('joins repeated headers', () => {
    expect(service.parseRoleKeysHeader(['a', 'b,c'])).toEqual(['a', 'b', 'c'])
  })

  it('drops blank entries', () => {
    expect(service.parseRoleKeysHeader('a,, ,b')).toEqual(['a', 'b'])
  })
})

describe('listModules', () => {
  it('returns serialized modules', async () => {
    repository.listModules.mockResolvedValue([moduleRow()])
    const result = await service.listModules('org_1')
    expect(result.error).toBeNull()
    expect(result.data?.[0]).toMatchObject({ object: 'projects.custom-module', key: 'risk-log' })
  })

  it('reports a missing tenant', async () => {
    tenants.resolveTenant.mockResolvedValue(null)
    const result = await service.listModules('org_9')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/tenant-not-found')
  })
})

describe('createModule', () => {
  it('creates an org module', async () => {
    const result = await service.createModule('org_1', {
      scope: 'org',
      key: 'risk-log',
      singularName: 'Risk',
      pluralName: 'Risks',
    })
    expect(result.error).toBeNull()
    expect(result.data?.key).toBe('risk-log')
    expect(repository.createModule).toHaveBeenCalledTimes(1)
  })

  it('rejects a duplicate key', async () => {
    repository.retrieveModuleByKey.mockResolvedValue(moduleRow())
    const result = await service.createModule('org_1', {
      scope: 'org',
      key: 'risk-log',
      singularName: 'Risk',
      pluralName: 'Risks',
    })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/custom-module-key-taken')
  })

  it('rejects an unknown project for project scope', async () => {
    projects.resolveProject.mockResolvedValue(null)
    const result = await service.createModule('org_1', {
      scope: 'project',
      projectId: 'prj_9',
      key: 'k',
      singularName: 'S',
      pluralName: 'P',
    })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/project-not-found')
  })
})

describe('retrieveModule', () => {
  it('returns the module', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const result = await service.retrieveModule('org_1', 'cmod_1')
    expect(result.data?.id).toBe('cmod_1')
    expect(result.error).toBeNull()
  })

  it('reports a missing module', async () => {
    const result = await service.retrieveModule('org_1', 'cmod_9')
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/custom-module-not-found')
  })
})

describe('updateModule', () => {
  it('keeps the key immutable', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const result = await service.updateModule('org_1', 'cmod_1', { key: 'other' })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/custom-module-key-immutable')
  })

  it('applies a name change and bumps the version', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const result = await service.updateModule('org_1', 'cmod_1', { singularName: 'Hazard' })
    expect(result.error).toBeNull()
    expect(repository.updateModule).toHaveBeenCalledTimes(1)
  })

  it('rejects an org module gaining a project', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const result = await service.updateModule('org_1', 'cmod_1', { projectId: 'prj_1' })
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/invalid-request')
  })
})

describe('removeModule', () => {
  it('soft deletes the module', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const result = await service.removeModule('org_1', 'cmod_1')
    expect(result.data).toEqual({ object: 'projects.custom-module', id: 'cmod_1', deleted: true })
    expect(result.error).toBeNull()
  })

  it('reports a missing module', async () => {
    const result = await service.removeModule('org_1', 'cmod_9')
    expect(result.error?.code).toBe('projects/custom-module-not-found')
  })
})

describe('module fields', () => {
  it('lists fields', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.listModuleFields.mockResolvedValue([fieldRow()])
    const result = await service.listModuleFields('org_1', 'cmod_1')
    expect(result.data).toHaveLength(1)
    expect(result.error).toBeNull()
  })

  it('creates a text field', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const result = await service.createModuleField('org_1', 'cmod_1', {
      key: 'owner',
      label: 'Owner',
      fieldType: 'text',
    })
    expect(result.data?.key).toBe('owner')
    expect(result.error).toBeNull()
  })

  it('rejects a duplicate field key', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveModuleFieldByKey.mockResolvedValue(fieldRow())
    const result = await service.createModuleField('org_1', 'cmod_1', {
      key: 'owner',
      label: 'Owner',
      fieldType: 'text',
    })
    expect(result.error?.code).toBe('projects/custom-module-field-key-taken')
  })

  it('rejects a select field without options', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const result = await service.createModuleField('org_1', 'cmod_1', {
      key: 'severity',
      label: 'Severity',
      fieldType: 'select',
    })
    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('updates a field label', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveModuleField.mockResolvedValue(fieldRow())
    const result = await service.updateModuleField('org_1', 'cmod_1', 'cmodf_1', { label: 'Owner 2' })
    expect(result.error).toBeNull()
    expect(result.data?.label).toBe('Owner 2')
  })

  it('removes a field', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveModuleField.mockResolvedValue(fieldRow())
    const result = await service.removeModuleField('org_1', 'cmod_1', 'cmodf_1')
    expect(result.data?.deleted).toBe(true)
    expect(repository.deleteModuleField).toHaveBeenCalledTimes(1)
  })
})

describe('module statuses', () => {
  it('creates the first status as default', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const result = await service.createModuleStatus('org_1', 'cmod_1', {
      key: 'triage',
      label: 'Triage',
      category: 'open',
    })
    expect(result.error).toBeNull()
    expect(result.data?.isDefault).toBe(true)
  })

  it('rejects a default status outside open', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const result = await service.createModuleStatus('org_1', 'cmod_1', {
      key: 'done',
      label: 'Done',
      category: 'done',
      isDefault: true,
    })
    expect(result.error?.code).toBe('projects/default-custom-module-status-required')
  })

  it('rejects a duplicate status key', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveModuleStatusByKey.mockResolvedValue(statusRow())
    const result = await service.createModuleStatus('org_1', 'cmod_1', {
      key: 'triage',
      label: 'Triage',
      category: 'open',
    })
    expect(result.error?.code).toBe('projects/custom-module-status-key-taken')
  })

  it('refuses to unset the only default', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveModuleStatus.mockResolvedValue(statusRow())
    repository.listModuleStatuses.mockResolvedValue([statusRow()])
    const result = await service.updateModuleStatus('org_1', 'cmod_1', 'cmods_1', { isDefault: false })
    expect(result.error?.code).toBe('projects/default-custom-module-status-required')
  })

  it('reorders statuses by ordered ids', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.listModuleStatuses.mockResolvedValue([
      statusRow(),
      statusRow({ id: 'cmods_2', key: 'active', label: 'Active' }),
    ])
    const result = await service.reorderModuleStatuses('org_1', 'cmod_1', { orderedIds: ['cmods_2', 'cmods_1'] })
    expect(result.error).toBeNull()
    expect(repository.updateManyModuleStatuses).toHaveBeenCalledTimes(1)
  })

  it('rejects a reorder that drops a status', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.listModuleStatuses.mockResolvedValue([statusRow()])
    const result = await service.reorderModuleStatuses('org_1', 'cmod_1', { orderedIds: ['cmods_9'] })
    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('refuses to delete a status in use', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveModuleStatus.mockResolvedValue(statusRow({ isDefault: false }))
    repository.countRecordsByStatus.mockResolvedValue(2)
    const result = await service.removeModuleStatus('org_1', 'cmod_1', 'cmods_1')
    expect(result.error?.code).toBe('projects/custom-module-status-in-use')
  })

  it('refuses to delete the default status', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveModuleStatus.mockResolvedValue(statusRow())
    const result = await service.removeModuleStatus('org_1', 'cmod_1', 'cmods_1')
    expect(result.error?.code).toBe('projects/default-custom-module-status-required')
  })
})

describe('records', () => {
  it('lists records with pagination metadata', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.listRecords.mockResolvedValue([recordRow()])
    repository.countRecords.mockResolvedValue(1)
    const result = await service.listRecords('org_1', 'cmod_1', {})
    expect(result.error).toBeNull()
    expect(result.data?.items).toHaveLength(1)
    expect(result.data?.totalCount).toBe(1)
  })

  it('enforces restricted modules', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow({ restrictedToRoleKeys: ['admin'] }))
    const result = await service.listRecords('org_1', 'cmod_1', {}, ['viewer'])
    expect(result.data).toBeNull()
    expect(result.error?.code).toBe('projects/custom-module-forbidden')
  })

  it('creates a record and emits the created event', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.listModuleStatuses.mockResolvedValue([statusRow()])
    repository.listModuleFields.mockResolvedValue([])
    const tx = txDouble()
    tx.customModuleRecord.create.mockResolvedValue(recordRow())
    repository.transaction.mockImplementation(async (fn) => fn(tx))
    const result = await service.createRecord('org_1', 'cmod_1', { title: 'Risk one' })
    expect(result.error).toBeNull()
    expect(result.data?.title).toBe('Risk one')
    expect(automation.appendOutboxEvent).toHaveBeenCalledTimes(1)
    expect(automation.appendOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: 'custom-record.created', subjectType: 'custom-record' })
    )
  })

  it('rejects an unknown status key', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.listModuleStatuses.mockResolvedValue([statusRow()])
    const result = await service.createRecord('org_1', 'cmod_1', { title: 'R', statusKey: 'nope' })
    expect(result.error?.code).toBe('projects/custom-module-status-not-found')
  })

  it('rejects unknown field keys', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.listModuleStatuses.mockResolvedValue([statusRow()])
    repository.listModuleFields.mockResolvedValue([fieldRow()])
    const result = await service.createRecord('org_1', 'cmod_1', {
      title: 'R',
      fields: [{ key: 'nope', value: 'x' }],
    })
    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('requires required fields on create', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.listModuleStatuses.mockResolvedValue([statusRow()])
    repository.listModuleFields.mockResolvedValue([fieldRow({ required: true })])
    const result = await service.createRecord('org_1', 'cmod_1', { title: 'R' })
    expect(result.error?.code).toBe('projects/required-custom-field-missing')
  })

  it('updates a record and emits updated plus status-changed', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveRecord.mockResolvedValue(recordRow())
    repository.listModuleStatuses.mockResolvedValue([
      statusRow(),
      statusRow({ id: 'cmods_2', key: 'mitigated', label: 'Mitigated', isDefault: false }),
    ])
    repository.listModuleFields.mockResolvedValue([])
    const tx = txDouble()
    tx.customModuleRecord.update.mockResolvedValue(recordRow({ statusKey: 'mitigated' }))
    repository.transaction.mockImplementation(async (fn) => fn(tx))
    const result = await service.updateRecord('org_1', 'cmod_1', 'cmodr_1', { statusKey: 'mitigated' })
    expect(result.error).toBeNull()
    expect(automation.appendOutboxEvent).toHaveBeenCalledTimes(2)
  })

  it('retrieves a record with fields', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveRecord.mockResolvedValue(recordRow())
    const result = await service.retrieveRecord('org_1', 'cmod_1', 'cmodr_1')
    expect(result.data?.id).toBe('cmodr_1')
    expect(result.error).toBeNull()
  })

  it('reports a missing record', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const result = await service.retrieveRecord('org_1', 'cmod_1', 'cmodr_9')
    expect(result.error?.code).toBe('projects/custom-module-record-not-found')
  })
})

describe('links', () => {
  it('lists links for a record', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveRecord.mockResolvedValue(recordRow())
    repository.listLinksForSource.mockResolvedValue([])
    const result = await service.listLinks('org_1', 'cmod_1', 'cmodr_1')
    expect(result.data).toEqual([])
    expect(result.error).toBeNull()
  })

  it('creates a work-item link', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveRecord.mockResolvedValue(recordRow())
    const tx = txDouble()
    tx.customModuleLink.create.mockResolvedValue({
      id: 'cmodl_1',
      tenantId: tenant.id,
      sourceRecordId: 'cmodr_1',
      targetType: 'work-item',
      targetId: 'iss_1',
      relation: 'relates-to',
      createdBy: null,
      createdAt: SECOND,
    })
    repository.transaction.mockImplementation(async (fn) => fn(tx))
    const result = await service.createLink('org_1', 'cmod_1', 'cmodr_1', {
      targetType: 'work-item',
      targetId: 'iss_1',
      relation: 'relates-to',
    })
    expect(result.error).toBeNull()
    expect(result.data?.targetId).toBe('iss_1')
  })

  it('rejects self links', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveRecord.mockResolvedValue(recordRow())
    const result = await service.createLink('org_1', 'cmod_1', 'cmodr_1', {
      targetType: 'record',
      targetId: 'cmodr_1',
      relation: 'relates-to',
    })
    expect(result.error?.code).toBe('projects/custom-module-link-invalid')
  })

  it('rejects duplicate links', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveRecord.mockResolvedValue(recordRow())
    repository.findLink.mockResolvedValue({ id: 'cmodl_1' })
    const result = await service.createLink('org_1', 'cmod_1', 'cmodr_1', {
      targetType: 'work-item',
      targetId: 'iss_1',
      relation: 'relates-to',
    })
    expect(result.error?.code).toBe('projects/custom-module-link-exists')
  })

  it('removes a link', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveRecord.mockResolvedValue(recordRow())
    repository.retrieveLink.mockResolvedValue({ id: 'cmodl_1' })
    const result = await service.removeLink('org_1', 'cmod_1', 'cmodr_1', 'cmodl_1')
    expect(result.data?.deleted).toBe(true)
    expect(result.error).toBeNull()
  })
})

describe('reports', () => {
  it('counts records by status', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.listRecordsForReport.mockResolvedValue([recordRow(), recordRow({ id: 'cmodr_2' })])
    repository.listModuleStatuses.mockResolvedValue([statusRow()])
    const result = await service.getStatusReport('org_1', 'cmod_1', {})
    expect(result.error).toBeNull()
    expect(result.data?.report.total).toBe(2)
    expect(result.data?.report.byStatus).toEqual([{ key: 'triage', label: 'Triage', count: 2 }])
    expect(result.data?.csv).toContain('triage')
  })

  it('requires a field key for field reports', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const result = await service.getFieldReport('org_1', 'cmod_1', {})
    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('rejects non-select fields for field reports', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveModuleFieldByKey.mockResolvedValue(fieldRow())
    const result = await service.getFieldReport('org_1', 'cmod_1', { fieldKey: 'owner' })
    expect(result.error?.code).toBe('projects/invalid-request')
  })

  it('counts select values for field reports', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveModuleFieldByKey.mockResolvedValue(
      fieldRow({ key: 'severity', fieldType: 'select', options: [{ key: 'high', label: 'High' }] })
    )
    repository.listRecordsForReport.mockResolvedValue([recordRow()])
    repository.listRecordValues.mockResolvedValue([
      {
        id: 'cmodrv_1',
        tenantId: tenant.id,
        recordId: 'cmodr_1',
        fieldId: 'cmodf_1',
        stringValue: null,
        integerValue: null,
        decimalValue: null,
        booleanValue: null,
        dateValue: null,
        selectKey: 'high',
        selectKeys: [],
        updatedBy: null,
        createdAt: SECOND,
        updatedAt: SECOND,
      },
    ])
    const result = await service.getFieldReport('org_1', 'cmod_1', { fieldKey: 'severity' })
    expect(result.error).toBeNull()
    expect(result.data?.report.byValue).toEqual([{ key: 'high', label: 'High', count: 1 }])
  })

  it('rejects an invalid period for created reports', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const result = await service.getCreatedReport('org_1', 'cmod_1', { from: 5, to: 5 })
    expect(result.error?.code).toBe('projects/invalid-period')
  })

  it('buckets creations per day', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.listRecordsForReport.mockResolvedValue([recordRow({ createdAt: 10n })])
    const result = await service.getCreatedReport('org_1', 'cmod_1', { from: 0, to: 100 })
    expect(result.error).toBeNull()
    expect(result.data?.report.perDay).toEqual([{ day: '1970-01-01', count: 1 }])
  })
})

describe('widgets', () => {
  it('lists widgets', async () => {
    repository.listWidgets.mockResolvedValue([])
    const result = await service.listWidgets('org_1', {})
    expect(result.data).toEqual([])
    expect(result.error).toBeNull()
  })

  it('creates a widget bound to a module', async () => {
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const tx = txDouble()
    tx.dashboardWidget.create.mockResolvedValue({
      id: 'dshw_1',
      tenantId: tenant.id,
      userId: null,
      kind: 'record-count',
      moduleId: 'cmod_1',
      config: {},
      position: 0,
      createdAt: SECOND,
      updatedAt: SECOND,
    })
    repository.transaction.mockImplementation(async (fn) => fn(tx))
    const result = await service.createWidget('org_1', { kind: 'record-count', moduleId: 'cmod_1' })
    expect(result.error).toBeNull()
    expect(result.data?.kind).toBe('record-count')
  })

  it('rejects widgets for unknown modules', async () => {
    const result = await service.createWidget('org_1', { kind: 'record-count', moduleId: 'cmod_9' })
    expect(result.error?.code).toBe('projects/custom-module-not-found')
  })

  it('updates a widget', async () => {
    repository.retrieveWidget.mockResolvedValue({ id: 'dshw_1' })
    const tx = txDouble()
    tx.dashboardWidget.update.mockResolvedValue({
      id: 'dshw_1',
      tenantId: tenant.id,
      userId: null,
      kind: 'record-count',
      moduleId: 'cmod_1',
      config: {},
      position: 2,
      createdAt: SECOND,
      updatedAt: SECOND,
    })
    repository.transaction.mockImplementation(async (fn) => fn(tx))
    const result = await service.updateWidget('org_1', 'dshw_1', { position: 2 })
    expect(result.error).toBeNull()
    expect(result.data?.position).toBe(2)
  })

  it('reports a missing widget on remove', async () => {
    const result = await service.removeWidget('org_1', 'dshw_9')
    expect(result.error?.code).toBe('projects/dashboard-widget-not-found')
  })
})

describe('automation integration', () => {
  it('exposes records for automation snapshots', async () => {
    repository.retrieveRecordById.mockResolvedValue(recordRow())
    repository.retrieveModule.mockResolvedValue(moduleRow())
    const result = await service.retrieveRecordForAutomation('org_1', 'cmodr_1')
    expect(result.error).toBeNull()
    expect(result.data?.moduleKey).toBe('risk-log')
  })

  it('reports missing automation subjects', async () => {
    const result = await service.retrieveRecordForAutomation('org_1', 'cmodr_9')
    expect(result.error?.code).toBe('projects/automation-subject-not-found')
  })

  it('applies automation updates with depth tracking', async () => {
    repository.retrieveRecordById.mockResolvedValue(recordRow())
    repository.retrieveModule.mockResolvedValue(moduleRow())
    repository.retrieveRecord.mockResolvedValue(recordRow())
    repository.listModuleStatuses.mockResolvedValue([statusRow()])
    repository.listModuleFields.mockResolvedValue([])
    const tx = txDouble()
    tx.customModuleRecord.update.mockResolvedValue(recordRow({ title: 'Auto' }))
    repository.transaction.mockImplementation(async (fn) => fn(tx))
    const result = await service.updateRecordFromAutomation(
      'org_1',
      'cmodr_1',
      { title: 'Auto' },
      { automationRuleId: 'arl_1', causationDepth: 0 }
    )
    expect(result.error).toBeNull()
    expect(automation.appendOutboxEvent).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ causationDepth: 1 })
    )
  })
})
