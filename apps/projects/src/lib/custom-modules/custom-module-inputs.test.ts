import { describe, expect, it } from 'vitest'

import {
  createCustomModuleFieldInputSchema,
  createCustomModuleInputSchema,
  createCustomModuleLinkInputSchema,
  createCustomRecordInputSchema,
  createDashboardWidgetInputSchema,
  listCustomRecordsQuerySchema,
  moduleReportQuerySchema,
  replaceCustomModuleStatusesInputSchema,
  updateCustomModuleInputSchema,
  updateCustomRecordInputSchema,
  updateDashboardWidgetInputSchema,
} from '@/types/custom-modules'

describe('custom module inputs', () => {
  it('accepts a complete module definition', () => {
    expect(
      createCustomModuleInputSchema.safeParse({
        scope: 'org',
        key: 'risk-log',
        singularName: 'Risk',
        pluralName: 'Risks',
        icon: 'forms',
        restrictedToRoleKeys: ['admin'],
      }).success
    ).toBe(true)
  })

  it('rejects module keys outside kebab-case', () => {
    expect(
      createCustomModuleInputSchema.safeParse({
        scope: 'org',
        key: 'Risk Log',
        singularName: 'Risk',
        pluralName: 'Risks',
      }).success
    ).toBe(false)
  })

  it('rejects an unknown module scope', () => {
    expect(
      createCustomModuleInputSchema.safeParse({
        scope: 'team',
        key: 'risks',
        singularName: 'Risk',
        pluralName: 'Risks',
      }).success
    ).toBe(false)
  })

  it('requires at least one field on module updates', () => {
    expect(updateCustomModuleInputSchema.safeParse({}).success).toBe(false)
    expect(
      updateCustomModuleInputSchema.safeParse({ pluralName: 'Hazards' }).success
    ).toBe(true)
  })

  it('accepts a select field with options', () => {
    expect(
      createCustomModuleFieldInputSchema.safeParse({
        key: 'severity',
        label: 'Severity',
        fieldType: 'select',
        options: [{ key: 'low', label: 'Low' }],
        required: true,
      }).success
    ).toBe(true)
  })

  it('rejects an unknown field type', () => {
    expect(
      createCustomModuleFieldInputSchema.safeParse({
        key: 'severity',
        label: 'Severity',
        fieldType: 'rating',
      }).success
    ).toBe(false)
  })

  it('requires at least one status on replace', () => {
    expect(
      replaceCustomModuleStatusesInputSchema.safeParse({ statuses: [] }).success
    ).toBe(false)
    expect(
      replaceCustomModuleStatusesInputSchema.safeParse({
        statuses: [{ key: 'triage', label: 'Triage', category: 'open' }],
      }).success
    ).toBe(true)
  })

  it('accepts every status category', () => {
    for (const category of ['open', 'in-progress', 'done']) {
      expect(
        replaceCustomModuleStatusesInputSchema.safeParse({
          statuses: [{ key: 's', label: 'S', category }],
        }).success
      ).toBe(true)
    }
  })

  it('accepts a record with typed field values', () => {
    expect(
      createCustomRecordInputSchema.safeParse({
        title: 'Risk one',
        statusKey: 'triage',
        fields: [
          { key: 'severity', value: 'high' },
          { key: 'score', value: 3 },
          { key: 'confirmed', value: true },
          { key: 'tags', value: ['a', 'b'] },
          { key: 'note', value: null },
        ],
      }).success
    ).toBe(true)
  })

  it('rejects a record without a title', () => {
    expect(
      createCustomRecordInputSchema.safeParse({ title: '  ' }).success
    ).toBe(false)
  })

  it('requires at least one field on record updates', () => {
    expect(updateCustomRecordInputSchema.safeParse({}).success).toBe(false)
    expect(
      updateCustomRecordInputSchema.safeParse({ title: 'New title' }).success
    ).toBe(true)
  })

  it('accepts links to every supported target type', () => {
    for (const targetType of ['record', 'work-item', 'project', 'phase']) {
      expect(
        createCustomModuleLinkInputSchema.safeParse({
          targetType,
          targetId: 'target_1',
          relation: 'relates-to',
        }).success
      ).toBe(true)
    }
  })

  it('rejects link relations outside kebab-case', () => {
    expect(
      createCustomModuleLinkInputSchema.safeParse({
        targetType: 'record',
        targetId: 'target_1',
        relation: 'Relates To',
      }).success
    ).toBe(false)
  })

  it('parses record list filters including field filters', () => {
    const parsed = listCustomRecordsQuerySchema.safeParse({
      limit: '25',
      status: 'triage',
      q: 'risk',
      fieldKey: 'severity',
      fieldValue: 'high',
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.limit).toBe(25)
  })

  it('rejects record limits outside range', () => {
    expect(
      listCustomRecordsQuerySchema.safeParse({ limit: '500' }).success
    ).toBe(false)
  })

  it('accepts report queries with csv format', () => {
    expect(
      moduleReportQuerySchema.safeParse({ fieldKey: 'severity', format: 'csv' })
        .success
    ).toBe(true)
  })

  it('accepts every dashboard widget kind', () => {
    for (const kind of ['record-count', 'status-breakdown', 'recent-records']) {
      expect(
        createDashboardWidgetInputSchema.safeParse({ kind, moduleId: 'cmod_1' })
          .success
      ).toBe(true)
    }
  })

  it('requires at least one field on widget updates', () => {
    expect(updateDashboardWidgetInputSchema.safeParse({}).success).toBe(false)
    expect(
      updateDashboardWidgetInputSchema.safeParse({ position: 2 }).success
    ).toBe(true)
  })
})
