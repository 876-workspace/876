import { describe, expect, it } from 'vitest'

import {
  automationTriggerSchema,
  customModuleCreatedReportSchema,
  customModuleFieldReportSchema,
  customModuleFieldSchema,
  customModuleLinkSchema,
  customModuleSchema,
  customModuleStatusReportSchema,
  customModuleStatusSchema,
  customRecordSchema,
  dashboardWidgetSchema,
  isCustomModuleLayoutEntity,
  customModuleKeyFromLayoutEntity,
  layoutEntitySchema,
} from './types'

describe('custom module layout entities', () => {
  it('accepts custom-module entity keys', () => {
    expect(layoutEntitySchema.parse('custom-module:risk-log')).toBe('custom-module:risk-log')
  })

  it('rejects malformed custom module entities', () => {
    expect(() => layoutEntitySchema.parse('custom-module:Bad')).toThrow()
  })

  it('detects custom module entities', () => {
    expect(isCustomModuleLayoutEntity('custom-module:risk-log')).toBe(true)
    expect(isCustomModuleLayoutEntity('project')).toBe(false)
  })

  it('extracts the module key', () => {
    expect(customModuleKeyFromLayoutEntity('custom-module:risk-log')).toBe('risk-log')
    expect(customModuleKeyFromLayoutEntity('phase')).toBeNull()
  })
})

describe('custom module contracts', () => {
  it('parses a custom module', () => {
    const parsed = customModuleSchema.parse({
      object: 'projects.custom-module',
      id: 'cmod_1',
      scope: 'org',
      projectId: null,
      key: 'risk-log',
      singularName: 'Risk',
      pluralName: 'Risks',
      icon: null,
      version: 1,
      restrictedToRoleKeys: [],
      createdAt: 1,
      updatedAt: 1,
    })
    expect(parsed.key).toBe('risk-log')
  })

  it('rejects an unknown module scope', () => {
    expect(() =>
      customModuleSchema.parse({
        object: 'projects.custom-module',
        id: 'cmod_1',
        scope: 'team',
        projectId: null,
        key: 'k',
        singularName: 'S',
        pluralName: 'P',
        icon: null,
        version: 1,
        restrictedToRoleKeys: [],
        createdAt: 1,
        updatedAt: 1,
      })
    ).toThrow()
  })

  it('parses a module field', () => {
    expect(
      customModuleFieldSchema.parse({
        object: 'projects.custom-module-field',
        id: 'cmodf_1',
        moduleId: 'cmod_1',
        key: 'owner',
        label: 'Owner',
        fieldType: 'text',
        options: null,
        required: false,
        position: 0,
        createdAt: 1,
        updatedAt: 1,
      }).key
    ).toBe('owner')
  })

  it('parses a module status with category', () => {
    expect(
      customModuleStatusSchema.parse({
        object: 'projects.custom-module-status',
        id: 'cmods_1',
        moduleId: 'cmod_1',
        key: 'triage',
        label: 'Triage',
        category: 'open',
        position: 0,
        isDefault: true,
        createdAt: 1,
        updatedAt: 1,
      }).isDefault
    ).toBe(true)
  })

  it('rejects an unknown status category', () => {
    expect(() =>
      customModuleStatusSchema.parse({
        object: 'projects.custom-module-status',
        id: 'cmods_1',
        moduleId: 'cmod_1',
        key: 'x',
        label: 'X',
        category: 'archived',
        position: 0,
        isDefault: false,
        createdAt: 1,
        updatedAt: 1,
      })
    ).toThrow()
  })

  it('parses a custom record with typed fields', () => {
    const parsed = customRecordSchema.parse({
      object: 'projects.custom-record',
      id: 'cmodr_1',
      moduleId: 'cmod_1',
      moduleKey: 'risk-log',
      projectId: null,
      title: 'Risk one',
      statusKey: 'triage',
      fields: { owner: 'ada', score: 3, flagged: true, tags: ['a'], note: null },
      createdBy: null,
      updatedBy: null,
      createdAt: 1,
      updatedAt: 1,
    })
    expect(parsed.fields).toMatchObject({ owner: 'ada', score: 3 })
  })

  it('parses a module link', () => {
    expect(
      customModuleLinkSchema.parse({
        object: 'projects.custom-module-link',
        id: 'cmodl_1',
        sourceRecordId: 'cmodr_1',
        targetType: 'work-item',
        targetId: 'iss_1',
        relation: 'relates-to',
        createdBy: null,
        createdAt: 1,
      }).targetType
    ).toBe('work-item')
  })

  it('parses status, field, and created reports', () => {
    expect(
      customModuleStatusReportSchema.parse({
        object: 'projects.custom-module-status-report',
        moduleId: 'cmod_1',
        moduleKey: 'risk-log',
        total: 1,
        byStatus: [{ key: 'triage', label: 'Triage', count: 1 }],
      }).total
    ).toBe(1)
    expect(
      customModuleFieldReportSchema.parse({
        object: 'projects.custom-module-field-report',
        moduleId: 'cmod_1',
        moduleKey: 'risk-log',
        fieldKey: 'severity',
        total: 1,
        byValue: [],
      }).fieldKey
    ).toBe('severity')
    expect(
      customModuleCreatedReportSchema.parse({
        object: 'projects.custom-module-created-report',
        moduleId: 'cmod_1',
        moduleKey: 'risk-log',
        from: 0,
        to: 10,
        total: 0,
        perDay: [],
      }).total
    ).toBe(0)
  })

  it('parses a dashboard widget', () => {
    expect(
      dashboardWidgetSchema.parse({
        object: 'projects.dashboard-widget',
        id: 'dshw_1',
        userId: null,
        kind: 'status-breakdown',
        moduleId: 'cmod_1',
        config: {},
        position: 0,
        createdAt: 1,
        updatedAt: 1,
      }).kind
    ).toBe('status-breakdown')
  })

  it('accepts custom record automation triggers', () => {
    for (const trigger of ['custom-record.created', 'custom-record.updated', 'custom-record.status-changed'] as const) {
      expect(automationTriggerSchema.parse(trigger)).toBe(trigger)
    }
  })
})
