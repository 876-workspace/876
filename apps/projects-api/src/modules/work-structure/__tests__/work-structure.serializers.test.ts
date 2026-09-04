import { describe, expect, it } from 'vitest'

import {
  serializeCustomField,
  serializeCustomFieldValue,
  serializeMilestone,
  serializeWorkflowState,
  serializeWorkItemType,
  type CustomFieldRow,
  type CustomFieldValueRow,
  type MilestoneRow,
  type WorkflowStateRow,
  type WorkItemTypeRow,
} from '../work-structure.serializers.js'

const SECOND = 1787767200

function workItemTypeRow(
  overrides: Partial<WorkItemTypeRow> = {}
): WorkItemTypeRow {
  return {
    id: 'wit_1',
    tenantId: 'prjten_1',
    key: 'task',
    name: 'Task',
    iconKey: 'check-square',
    color: '#2563eb',
    hierarchyLevel: 1,
    description: null,
    isDefault: true,
    position: 1,
    archivedAt: null,
    createdAt: BigInt(SECOND),
    updatedAt: BigInt(SECOND),
    ...overrides,
  }
}

function workflowStateRow(
  overrides: Partial<WorkflowStateRow> = {}
): WorkflowStateRow {
  return {
    id: 'wfs_1',
    tenantId: 'prjten_1',
    key: 'in-progress',
    name: 'In progress',
    category: 'started',
    color: '#2563eb',
    description: null,
    isDefault: false,
    position: 2,
    archivedAt: null,
    createdAt: BigInt(SECOND),
    updatedAt: BigInt(SECOND),
    ...overrides,
  }
}

function milestoneRow(overrides: Partial<MilestoneRow> = {}): MilestoneRow {
  return {
    id: 'ms_1',
    tenantId: 'prjten_1',
    projectId: 'prj_1',
    key: 'v1',
    name: 'Version 1',
    description: null,
    status: 'open',
    startDate: BigInt(SECOND),
    targetDate: BigInt(SECOND + 100000),
    completedAt: null,
    position: 0,
    deletedAt: null,
    createdAt: BigInt(SECOND),
    updatedAt: BigInt(SECOND),
    ...overrides,
  }
}

function customFieldRow(
  overrides: Partial<CustomFieldRow> = {}
): CustomFieldRow {
  return {
    id: 'cf_1',
    tenantId: 'prjten_1',
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
    createdAt: BigInt(SECOND),
    updatedAt: BigInt(SECOND),
    ...overrides,
  }
}

function customFieldValueRow(
  field: CustomFieldRow,
  overrides: Partial<CustomFieldValueRow> = {}
): CustomFieldValueRow {
  return {
    id: 'cfv_1',
    tenantId: 'prjten_1',
    issueId: 'iss_1',
    fieldId: field.id,
    stringValue: null,
    integerValue: null,
    decimalValue: null,
    booleanValue: null,
    dateValue: null,
    selectKey: null,
    selectKeys: [],
    updatedBy: null,
    createdAt: BigInt(SECOND),
    updatedAt: BigInt(SECOND),
    field,
    ...overrides,
  }
}

describe('serializeWorkItemType', () => {
  it('emits the work-item-type discriminator with unix-second timestamps', () => {
    const serialized = serializeWorkItemType(workItemTypeRow())

    expect(serialized.object).toBe('projects.work-item-type')
    expect(serialized.createdAt).toBe(SECOND)
    expect(serialized.updatedAt).toBe(SECOND)
    expect(serialized.archivedAt).toBeNull()
  })

  it('carries hierarchy level, icon, color, and default flag untouched', () => {
    const serialized = serializeWorkItemType(
      workItemTypeRow({ hierarchyLevel: 0, iconKey: 'list-tree' })
    )

    expect(serialized.hierarchyLevel).toBe(0)
    expect(serialized.iconKey).toBe('list-tree')
    expect(serialized.isDefault).toBe(true)
  })

  it('converts a bigint archived timestamp to seconds', () => {
    const serialized = serializeWorkItemType(
      workItemTypeRow({ archivedAt: BigInt(SECOND + 50) })
    )

    expect(serialized.archivedAt).toBe(SECOND + 50)
  })
})

describe('serializeWorkflowState', () => {
  it('emits the workflow-state discriminator with its platform category', () => {
    const serialized = serializeWorkflowState(workflowStateRow())

    expect(serialized.object).toBe('projects.workflow-state')
    expect(serialized.key).toBe('in-progress')
    expect(serialized.category).toBe('started')
  })

  it('keeps a renamed state readable through key, name, and category', () => {
    const serialized = serializeWorkflowState(
      workflowStateRow({ key: 'in-review', name: 'Awaiting sign-off' })
    )

    expect(serialized.key).toBe('in-review')
    expect(serialized.name).toBe('Awaiting sign-off')
    expect(serialized.category).toBe('started')
  })
})

describe('serializeMilestone', () => {
  it('emits the milestone discriminator with nullable dates as seconds', () => {
    const serialized = serializeMilestone(milestoneRow())

    expect(serialized.object).toBe('projects.milestone')
    expect(serialized.startDate).toBe(SECOND)
    expect(serialized.targetDate).toBe(SECOND + 100000)
    expect(serialized.completedAt).toBeNull()
  })

  it('renders an undated milestone with null dates', () => {
    const serialized = serializeMilestone(
      milestoneRow({ startDate: null, targetDate: null })
    )

    expect(serialized.startDate).toBeNull()
    expect(serialized.targetDate).toBeNull()
  })

  it('renders a completed milestone with its completion second', () => {
    const serialized = serializeMilestone(
      milestoneRow({ status: 'completed', completedAt: BigInt(SECOND + 200) })
    )

    expect(serialized.status).toBe('completed')
    expect(serialized.completedAt).toBe(SECOND + 200)
  })
})

describe('serializeCustomField', () => {
  it('emits the custom-field discriminator with type ids from the join', () => {
    const serialized = serializeCustomField(
      customFieldRow({ types: [{ typeId: 'wit_1' }, { typeId: 'wit_2' }] })
    )

    expect(serialized.object).toBe('projects.custom-field')
    expect(serialized.typeIds).toEqual(['wit_1', 'wit_2'])
  })

  it('defaults type ids to an empty list when unscoped', () => {
    const serialized = serializeCustomField(
      customFieldRow({ types: undefined })
    )

    expect(serialized.typeIds).toEqual([])
  })

  it('passes select options through verbatim', () => {
    const options = [{ key: 'low', label: 'Low' }]

    const serialized = serializeCustomField(customFieldRow({ options }))

    expect(serialized.options).toEqual(options)
  })
})

describe('serializeCustomFieldValue', () => {
  it('reads text kinds from the string column', () => {
    for (const fieldType of ['text', 'textarea', 'user', 'url']) {
      const field = customFieldRow({ fieldType })
      const serialized = serializeCustomFieldValue(
        customFieldValueRow(field, { stringValue: 'hello' })
      )

      expect(serialized.value).toBe('hello')
      expect(serialized.fieldType).toBe(fieldType)
    }
  })

  it('reads numbers from the integer column', () => {
    const field = customFieldRow({ fieldType: 'number' })

    const serialized = serializeCustomFieldValue(
      customFieldValueRow(field, { integerValue: 3 })
    )

    expect(serialized.value).toBe(3)
  })

  it('carries decimals as strings end to end', () => {
    const field = customFieldRow({ fieldType: 'decimal' })

    const serialized = serializeCustomFieldValue(
      customFieldValueRow(field, { decimalValue: { toString: () => '3.14' } })
    )

    expect(serialized.value).toBe('3.14')
  })

  it('renders an unset decimal as null rather than zero', () => {
    const field = customFieldRow({ fieldType: 'decimal' })

    const serialized = serializeCustomFieldValue(customFieldValueRow(field))

    expect(serialized.value).toBeNull()
  })

  it('reads booleans from the boolean column', () => {
    const field = customFieldRow({ fieldType: 'boolean' })

    expect(
      serializeCustomFieldValue(
        customFieldValueRow(field, { booleanValue: true })
      ).value
    ).toBe(true)
    expect(
      serializeCustomFieldValue(
        customFieldValueRow(field, { booleanValue: false })
      ).value
    ).toBe(false)
  })

  it('converts date columns to unix seconds', () => {
    const field = customFieldRow({ fieldType: 'date' })

    const serialized = serializeCustomFieldValue(
      customFieldValueRow(field, { dateValue: BigInt(SECOND) })
    )

    expect(serialized.value).toBe(SECOND)
  })

  it('reads single selects from the select key', () => {
    const field = customFieldRow({ fieldType: 'select' })

    const serialized = serializeCustomFieldValue(
      customFieldValueRow(field, { selectKey: 'high' })
    )

    expect(serialized.value).toBe('high')
  })

  it('reads multi-selects as the key array', () => {
    const field = customFieldRow({ fieldType: 'multi-select' })

    const serialized = serializeCustomFieldValue(
      customFieldValueRow(field, { selectKeys: ['low', 'high'] })
    )

    expect(serialized.value).toEqual(['low', 'high'])
  })

  it('emits field identity, attribution, and unix-second timestamps', () => {
    const field = customFieldRow({ key: 'severity', fieldType: 'select' })

    const serialized = serializeCustomFieldValue(
      customFieldValueRow(field, {
        selectKey: 'high',
        updatedBy: 'usr_1',
      })
    )

    expect(serialized.object).toBe('projects.custom-field-value')
    expect(serialized.fieldKey).toBe('severity')
    expect(serialized.fieldType).toBe('select')
    expect(serialized.updatedBy).toBe('usr_1')
    expect(serialized.createdAt).toBe(SECOND)
  })
})
