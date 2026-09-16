import { describe, expect, it } from 'vitest'

import {
  createdPerDay,
  dayKeyForUnixSeconds,
  serializeCustomModule,
  serializeCustomRecord,
  serializeDashboardWidget,
  serializeModuleField,
  serializeModuleLink,
  serializeModuleStatus,
} from '../custom-modules.serializers.js'

const SECOND = 1787767200n

function moduleRow(overrides = {}) {
  return {
    id: 'cmod_1',
    tenantId: 'prjten_1',
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

describe('serializeCustomModule', () => {
  it('maps the row onto the public contract', () => {
    const serialized = serializeCustomModule(moduleRow())
    expect(serialized).toMatchObject({
      object: 'projects.custom-module',
      id: 'cmod_1',
      key: 'risk-log',
      scope: 'org',
      version: 1,
      createdAt: Number(SECOND),
    })
  })

  it('carries restricted role keys', () => {
    const serialized = serializeCustomModule(moduleRow({ restrictedToRoleKeys: ['admin'] }))
    expect(serialized.restrictedToRoleKeys).toEqual(['admin'])
  })
})

describe('serializeModuleField', () => {
  it('maps field rows', () => {
    const serialized = serializeModuleField({
      id: 'cmodf_1',
      tenantId: 'prjten_1',
      moduleId: 'cmod_1',
      key: 'severity',
      label: 'Severity',
      fieldType: 'select',
      options: [{ key: 'high', label: 'High' }],
      required: true,
      position: 0,
      createdAt: SECOND,
      updatedAt: SECOND,
    })
    expect(serialized).toMatchObject({ object: 'projects.custom-module-field', key: 'severity', required: true })
  })
})

describe('serializeModuleStatus', () => {
  it('maps status rows', () => {
    const serialized = serializeModuleStatus({
      id: 'cmods_1',
      tenantId: 'prjten_1',
      moduleId: 'cmod_1',
      key: 'triage',
      label: 'Triage',
      category: 'open',
      position: 0,
      isDefault: true,
      createdAt: SECOND,
      updatedAt: SECOND,
    })
    expect(serialized).toMatchObject({ object: 'projects.custom-module-status', isDefault: true, category: 'open' })
  })
})

describe('serializeCustomRecord', () => {
  function recordRow(overrides = {}) {
    return {
      id: 'cmodr_1',
      tenantId: 'prjten_1',
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

  it('reads text and select values back onto fields', () => {
    const serialized = serializeCustomRecord(recordRow(), 'risk-log', [
      {
        id: 'cmodrv_1',
        tenantId: 'prjten_1',
        recordId: 'cmodr_1',
        fieldId: 'cmodf_1',
        stringValue: 'ada',
        integerValue: null,
        decimalValue: null,
        booleanValue: null,
        dateValue: null,
        selectKey: null,
        selectKeys: [],
        updatedBy: null,
        createdAt: SECOND,
        updatedAt: SECOND,
        field: { key: 'owner', fieldType: 'text' },
      },
      {
        id: 'cmodrv_2',
        tenantId: 'prjten_1',
        recordId: 'cmodr_1',
        fieldId: 'cmodf_2',
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
        field: { key: 'severity', fieldType: 'select' },
      },
    ])
    expect(serialized.fields).toEqual({ owner: 'ada', severity: 'high' })
    expect(serialized.moduleKey).toBe('risk-log')
  })

  it('skips values without a joined field', () => {
    const serialized = serializeCustomRecord(recordRow(), 'risk-log', [
      {
        id: 'cmodrv_9',
        tenantId: 'prjten_1',
        recordId: 'cmodr_1',
        fieldId: 'cmodf_9',
        stringValue: 'x',
        integerValue: null,
        decimalValue: null,
        booleanValue: null,
        dateValue: null,
        selectKey: null,
        selectKeys: [],
        updatedBy: null,
        createdAt: SECOND,
        updatedAt: SECOND,
      },
    ])
    expect(serialized.fields).toEqual({})
  })

  it('emits an empty field map when there are no values', () => {
    expect(serializeCustomRecord(recordRow(), 'risk-log', []).fields).toEqual({})
  })
})

describe('serializeModuleLink', () => {
  it('maps link rows', () => {
    const serialized = serializeModuleLink({
      id: 'cmodl_1',
      tenantId: 'prjten_1',
      sourceRecordId: 'cmodr_1',
      targetType: 'work-item',
      targetId: 'iss_1',
      relation: 'relates-to',
      createdBy: null,
      createdAt: SECOND,
    })
    expect(serialized).toMatchObject({ object: 'projects.custom-module-link', targetType: 'work-item' })
  })
})

describe('serializeDashboardWidget', () => {
  it('maps widget rows including shared null user', () => {
    const serialized = serializeDashboardWidget({
      id: 'dshw_1',
      tenantId: 'prjten_1',
      userId: null,
      kind: 'status-breakdown',
      moduleId: 'cmod_1',
      config: {},
      position: 0,
      createdAt: SECOND,
      updatedAt: SECOND,
    })
    expect(serialized).toMatchObject({ object: 'projects.dashboard-widget', userId: null })
  })
})

describe('dayKeyForUnixSeconds', () => {
  it('buckets midnight UTC boundaries', () => {
    expect(dayKeyForUnixSeconds(0)).toBe('1970-01-01')
    expect(dayKeyForUnixSeconds(86400)).toBe('1970-01-02')
  })
})

describe('createdPerDay', () => {
  it('counts records per UTC day within the period', () => {
    expect(createdPerDay([0, 10, 86400, 86401, 9999999], 0, 200000)).toEqual([
      { day: '1970-01-01', count: 2 },
      { day: '1970-01-02', count: 2 },
    ])
  })

  it('returns days in ascending order', () => {
    expect(createdPerDay([86400, 0], 0, 100000)).toEqual([
      { day: '1970-01-01', count: 1 },
      { day: '1970-01-02', count: 1 },
    ])
  })

  it('returns an empty report when nothing falls in range', () => {
    expect(createdPerDay([9999999], 0, 10)).toEqual([])
  })
})
