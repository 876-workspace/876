import { describe, expect, it } from 'vitest'

import {
  createLinkBodySchema,
  createModuleBodySchema,
  createModuleFieldBodySchema,
  createModuleStatusBodySchema,
  createRecordBodySchema,
  createWidgetBodySchema,
  listRecordsQuerySchema,
  moduleReportQuerySchema,
  reorderStatusesBodySchema,
  updateModuleBodySchema,
  updateRecordBodySchema,
} from '../custom-modules.schemas.js'

describe('createModuleBodySchema', () => {
  it('accepts an org-scoped module', () => {
    const parsed = createModuleBodySchema.parse({
      scope: 'org',
      key: 'risk-log',
      singularName: 'Risk',
      pluralName: 'Risks',
    })
    expect(parsed.scope).toBe('org')
    expect(parsed.key).toBe('risk-log')
  })

  it('accepts a project-scoped module with projectId', () => {
    const parsed = createModuleBodySchema.parse({
      scope: 'project',
      projectId: 'prj_1',
      key: 'decision',
      singularName: 'Decision',
      pluralName: 'Decisions',
    })
    expect(parsed.projectId).toBe('prj_1')
  })

  it('rejects a project scope without projectId', () => {
    expect(() =>
      createModuleBodySchema.parse({ scope: 'project', key: 'k', singularName: 'S', pluralName: 'P' })
    ).toThrow()
  })

  it('rejects an org scope carrying projectId', () => {
    expect(() =>
      createModuleBodySchema.parse({ scope: 'org', projectId: 'prj_1', key: 'k', singularName: 'S', pluralName: 'P' })
    ).toThrow()
  })

  it('rejects a non-kebab key', () => {
    expect(() =>
      createModuleBodySchema.parse({ scope: 'org', key: 'Bad Key', singularName: 'S', pluralName: 'P' })
    ).toThrow()
  })

  it('accepts restrictedToRoleKeys', () => {
    const parsed = createModuleBodySchema.parse({
      scope: 'org',
      key: 'k',
      singularName: 'S',
      pluralName: 'P',
      restrictedToRoleKeys: ['admin', 'manager'],
    })
    expect(parsed.restrictedToRoleKeys).toEqual(['admin', 'manager'])
  })
})

describe('updateModuleBodySchema', () => {
  it('rejects an empty update', () => {
    expect(() => updateModuleBodySchema.parse({})).toThrow()
  })

  it('accepts a singular name change', () => {
    expect(updateModuleBodySchema.parse({ singularName: 'Idea' }).singularName).toBe('Idea')
  })

  it('accepts clearing restrictedToRoleKeys', () => {
    expect(updateModuleBodySchema.parse({ restrictedToRoleKeys: null }).restrictedToRoleKeys).toBeNull()
  })
})

describe('createModuleFieldBodySchema', () => {
  it('accepts a text field', () => {
    const parsed = createModuleFieldBodySchema.parse({ key: 'owner', label: 'Owner', fieldType: 'text' })
    expect(parsed.key).toBe('owner')
  })

  it('accepts a select field with options', () => {
    const parsed = createModuleFieldBodySchema.parse({
      key: 'severity',
      label: 'Severity',
      fieldType: 'select',
      options: [{ key: 'high', label: 'High' }],
    })
    expect(parsed.options).toHaveLength(1)
  })

  it('rejects an unknown field type', () => {
    expect(() => createModuleFieldBodySchema.parse({ key: 'x', label: 'X', fieldType: 'fax' })).toThrow()
  })
})

describe('createModuleStatusBodySchema', () => {
  it('accepts an open default status', () => {
    const parsed = createModuleStatusBodySchema.parse({ key: 'triage', label: 'Triage', category: 'open', isDefault: true })
    expect(parsed.isDefault).toBe(true)
  })

  it('rejects an unknown category', () => {
    expect(() => createModuleStatusBodySchema.parse({ key: 'x', label: 'X', category: 'archived' })).toThrow()
  })
})

describe('reorderStatusesBodySchema', () => {
  it('accepts an ordered id list', () => {
    expect(reorderStatusesBodySchema.parse({ orderedIds: ['a', 'b'] }).orderedIds).toEqual(['a', 'b'])
  })

  it('rejects an empty ordered list', () => {
    expect(() => reorderStatusesBodySchema.parse({ orderedIds: [] })).toThrow()
  })
})

describe('createRecordBodySchema', () => {
  it('accepts a title-only record', () => {
    expect(createRecordBodySchema.parse({ title: 'First risk' }).title).toBe('First risk')
  })

  it('accepts fields with typed values', () => {
    const parsed = createRecordBodySchema.parse({
      title: 'R',
      fields: [
        { key: 'owner', value: 'ada' },
        { key: 'score', value: 3 },
        { key: 'flagged', value: true },
        { key: 'tags', value: ['a', 'b'] },
        { key: 'note', value: null },
      ],
    })
    expect(parsed.fields).toHaveLength(5)
  })

  it('rejects a blank title', () => {
    expect(() => createRecordBodySchema.parse({ title: '  ' })).toThrow()
  })
})

describe('updateRecordBodySchema', () => {
  it('rejects an empty update', () => {
    expect(() => updateRecordBodySchema.parse({})).toThrow()
  })

  it('accepts a status change', () => {
    expect(updateRecordBodySchema.parse({ statusKey: 'done' }).statusKey).toBe('done')
  })
})

describe('listRecordsQuerySchema', () => {
  it('defaults to an empty filter set', () => {
    expect(listRecordsQuerySchema.parse({})).toEqual({})
  })

  it('coerces limit from a string', () => {
    expect(listRecordsQuerySchema.parse({ limit: '10' }).limit).toBe(10)
  })

  it('rejects a limit above the ceiling', () => {
    expect(() => listRecordsQuerySchema.parse({ limit: 500 })).toThrow()
  })

  it('accepts status, project, search, and field filters together', () => {
    const parsed = listRecordsQuerySchema.parse({
      status: 'open',
      projectId: 'prj_1',
      q: 'risk',
      fieldKey: 'severity',
      fieldValue: 'high',
    })
    expect(parsed.fieldKey).toBe('severity')
    expect(parsed.fieldValue).toBe('high')
  })
})

describe('createLinkBodySchema', () => {
  it('accepts every documented target type', () => {
    for (const targetType of ['record', 'work-item', 'project', 'phase'] as const) {
      expect(
        createLinkBodySchema.parse({ targetType, targetId: 'tgt_1', relation: 'relates-to' }).targetType
      ).toBe(targetType)
    }
  })

  it('rejects an unknown target type', () => {
    expect(() => createLinkBodySchema.parse({ targetType: 'sprint', targetId: 'x', relation: 'r' })).toThrow()
  })
})

describe('moduleReportQuerySchema', () => {
  it('accepts a period plus field key', () => {
    const parsed = moduleReportQuerySchema.parse({ from: 1, to: 2, fieldKey: 'severity' })
    expect(parsed.fieldKey).toBe('severity')
  })

  it('accepts csv format', () => {
    expect(moduleReportQuerySchema.parse({ format: 'csv' }).format).toBe('csv')
  })
})

describe('createWidgetBodySchema', () => {
  it('accepts every documented kind', () => {
    for (const kind of ['record-count', 'status-breakdown', 'recent-records'] as const) {
      expect(createWidgetBodySchema.parse({ kind, moduleId: 'cmod_1' }).kind).toBe(kind)
    }
  })

  it('rejects an unknown kind', () => {
    expect(() => createWidgetBodySchema.parse({ kind: 'pie', moduleId: 'cmod_1' })).toThrow()
  })
})
