import type { CustomModuleField } from '@876/projects/contracts'
import { describe, expect, it } from 'vitest'

import {
  fallbackRecordLayout,
  moduleReportCsvHref,
  recordInitialValues,
  toLayoutFieldDescriptors,
  toRecordFieldInputs,
  toUiModule,
  toUiRecord,
  toWidgetViews,
  widgetDataFor,
} from './record-form-helpers'

function makeField(overrides: Partial<CustomModuleField> = {}): CustomModuleField {
  return {
    object: 'projects.custom-module-field' as const,
    id: 'cmodf_1',
    moduleId: 'cmod_1',
    key: 'severity',
    label: 'Severity',
    fieldType: 'select',
    options: [
      { key: 'low', label: 'Low' },
      { key: 'high', label: 'High' },
    ],
    required: false,
    position: 0,
    createdAt: 1,
    updatedAt: 2,
    ...overrides,
  }
}

describe('layout field descriptors', () => {
  it('starts with the title field', () => {
    const descriptors = toLayoutFieldDescriptors([makeField()])
    expect(descriptors[0]).toMatchObject({ fieldKey: 'title', label: 'Title' })
  })

  it('prefixes module fields with cf: and maps select controls', () => {
    const descriptors = toLayoutFieldDescriptors([makeField()])
    expect(descriptors[1]).toMatchObject({
      fieldKey: 'cf:severity',
      label: 'Severity',
      control: {
        kind: 'select',
        options: [
          { value: 'low', label: 'Low' },
          { value: 'high', label: 'High' },
        ],
      },
    })
  })

  it('maps textarea, number, date, multi-select, and boolean controls', () => {
    const descriptors = toLayoutFieldDescriptors([
      makeField({ id: 'cmodf_1', key: 'a', label: 'A', fieldType: 'textarea', options: null }),
      makeField({ id: 'cmodf_2', key: 'b', label: 'B', fieldType: 'number', options: null }),
      makeField({ id: 'cmodf_3', key: 'c', label: 'C', fieldType: 'boolean', options: null }),
      makeField({ id: 'cmodf_4', key: 'd', label: 'D', fieldType: 'multi-select', options: [{ key: 'x', label: 'X' }] }),
    ])
    expect(descriptors.map((field) => field.control.kind)).toEqual([
      'text',
      'textarea',
      'number',
      'boolean',
      'multi-select',
    ])
  })

  it('sorts fields by position', () => {
    const descriptors = toLayoutFieldDescriptors([
      makeField({ id: 'cmodf_2', key: 'b', label: 'B', fieldType: 'text', options: null, position: 2 }),
      makeField({ id: 'cmodf_1', key: 'a', label: 'A', fieldType: 'text', options: null, position: 0 }),
    ])
    expect(descriptors.map((field) => field.fieldKey)).toEqual(['title', 'cf:a', 'cf:b'])
  })

  it('builds a fallback layout entity for the module key', () => {
    const layout = fallbackRecordLayout('risks', ['title', 'cf:severity'])
    expect(layout.entity).toBe('custom-module:risks')
    expect(layout.sections[0]?.fields.map((field) => field.fieldKey)).toEqual([
      'title',
      'cf:severity',
    ])
  })
})

describe('record values', () => {
  it('maps service fields to cf: initial values', () => {
    expect(
      recordInitialValues({
        object: 'projects.custom-record',
        id: 'cmodr_1',
        moduleId: 'cmod_1',
        moduleKey: 'risks',
        projectId: null,
        title: 'Risk one',
        statusKey: 'triage',
        fields: { severity: 'high', score: 3, confirmed: true, note: null },
        createdBy: null,
        updatedBy: null,
        createdAt: 1,
        updatedAt: 2,
      })
    ).toEqual({
      title: 'Risk one',
      'cf:severity': 'high',
      'cf:score': '3',
      'cf:confirmed': 'true',
      'cf:note': null,
    })
  })

  it('splits submitted layout values into title plus field inputs', () => {
    expect(
      toRecordFieldInputs({ title: 'Risk one', 'cf:severity': 'high', 'cf:tags': ['a', 'b'] })
    ).toEqual({
      title: 'Risk one',
      fields: [
        { key: 'severity', value: 'high' },
        { key: 'tags', value: ['a', 'b'] },
      ],
    })
  })

  it('normalizes empty submitted values to null', () => {
    expect(toRecordFieldInputs({ title: 'Risk one', 'cf:note': '' })).toEqual({
      title: 'Risk one',
      fields: [{ key: 'note', value: null }],
    })
  })
})

describe('ui mappers', () => {
  it('maps service modules with icon fallback and counts', () => {
    const ui = toUiModule(
      {
        id: 'cmod_1',
        key: 'risks',
        scope: 'org',
        projectId: null,
        singularName: 'Risk',
        pluralName: 'Risks',
        icon: null,
        version: 1,
        updatedAt: 2,
      },
      { fieldCount: 3, recordCount: 7 }
    )
    expect(ui).toMatchObject({
      object: 'projects.custom-module',
      icon: 'forms',
      fieldCount: 3,
      recordCount: 7,
    })
  })

  it('maps service records to list values', () => {
    const ui = toUiRecord({
      id: 'cmodr_1',
      moduleId: 'cmod_1',
      projectId: null,
      title: 'Risk one',
      statusKey: 'triage',
      fields: { severity: 'high' },
      createdAt: 1,
      updatedAt: 2,
    })
    expect(ui).toMatchObject({
      object: 'projects.custom-module-record',
      title: 'Risk one',
      values: { severity: 'high' },
    })
  })
})

describe('widgets', () => {
  it('orders widget views by position with resolved titles', () => {
    const views = toWidgetViews(
      [
        {
          object: 'projects.dashboard-widget',
          id: 'dshw_2',
          userId: null,
          kind: 'recent-records',
          moduleId: 'cmod_1',
          config: null,
          position: 1,
          createdAt: 1,
          updatedAt: 2,
        },
        {
          object: 'projects.dashboard-widget',
          id: 'dshw_1',
          userId: null,
          kind: 'record-count',
          moduleId: 'cmod_1',
          config: { title: 'Open risks' },
          position: 0,
          createdAt: 1,
          updatedAt: 2,
        },
      ],
      { cmod_1: 'Risks' }
    )
    expect(views.map((view) => view.id)).toEqual(['dshw_1', 'dshw_2'])
    expect(views[0]?.title).toBe('Open risks')
    expect(views[1]?.title).toBe('Recent Risks')
  })

  it('builds record-count widget data', () => {
    const data = widgetDataFor(
      {
        object: 'projects.dashboard-widget',
        id: 'dshw_1',
        kind: 'record-count',
        moduleId: 'cmod_1',
        title: 'Risks',
        position: 0,
      },
      { total: 4, byStatus: [], recent: [] }
    )
    expect(data).toEqual({ kind: 'record-count', count: 4 })
  })

  it('builds status-breakdown widget data', () => {
    const data = widgetDataFor(
      {
        object: 'projects.dashboard-widget',
        id: 'dshw_1',
        kind: 'status-breakdown',
        moduleId: 'cmod_1',
        title: 'Risks',
        position: 0,
      },
      {
        total: 2,
        byStatus: [{ statusKey: 'triage', label: 'Triage', count: 2 }],
        recent: [],
      }
    )
    expect(data).toEqual({
      kind: 'status-breakdown',
      rows: [{ statusKey: 'triage', label: 'Triage', count: 2 }],
    })
  })

  it('builds recent-records widget data', () => {
    const data = widgetDataFor(
      {
        object: 'projects.dashboard-widget',
        id: 'dshw_1',
        kind: 'recent-records',
        moduleId: 'cmod_1',
        title: 'Risks',
        position: 0,
      },
      {
        total: 1,
        byStatus: [],
        recent: [{ id: 'cmodr_1', title: 'Risk one', statusKey: 'triage', updatedAt: 2 }],
      }
    )
    expect(data).toEqual({
      kind: 'recent-records',
      records: [{ id: 'cmodr_1', title: 'Risk one', statusKey: 'triage', updatedAt: 2 }],
    })
  })
})

describe('report csv hrefs', () => {
  it('builds csv download hrefs for module reports', () => {
    expect(moduleReportCsvHref('cmod_1', 'by-status')).toBe(
      '/api/custom-modules/cmod_1/reports/by-status?format=csv'
    )
  })
})
