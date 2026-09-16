// @vitest-environment jsdom
import type { Layout } from '@876/projects/layout-rules'
import { describe, expect, it } from 'vitest'

import {
  customFieldDescriptor,
  customFieldInputValue,
  customFieldToLayoutValue,
  descriptorLabel,
  isLayoutRuleError,
  issueLayoutDescriptors,
  issueToLayoutValues,
  layoutDateInput,
  layoutDateTimestamp,
  layoutRuleErrorTitle,
  missingLayoutFields,
  phaseLayoutDescriptors,
  phaseToLayoutValues,
  projectLayoutDescriptors,
  projectToLayoutValues,
  readLayoutFormValues,
  splitLayoutCustomValues,
} from './layout-form-helpers'

const layout: Layout = {
  object: 'projects.layout',
  id: 'layout_1',
  entity: 'work-item',
  workItemTypeId: null,
  name: 'Default',
  version: 1,
  isDefault: true,
  builtIn: false,
  sections: [
    {
      key: 'section-1',
      title: 'Details',
      columns: 1,
      fields: [
        { fieldKey: 'title', width: 1, visible: true },
        { fieldKey: 'priority', width: 1, visible: true },
        { fieldKey: 'cf:environment', width: 1, visible: true },
      ],
    },
  ],
  rules: [
    {
      key: 'rule-1',
      when: [{ fieldKey: 'priority', op: 'equals', value: 'urgent' }],
      then: [{ fieldKey: 'cf:environment', effect: 'require' }],
    },
  ],
}

describe('isLayoutRuleError', () => {
  it('matches the required-fields code', () => {
    expect(isLayoutRuleError('projects/layout-required-fields')).toBe(true)
  })

  it('matches the field-disabled code', () => {
    expect(isLayoutRuleError('projects/layout-field-disabled')).toBe(true)
  })

  it('rejects other codes', () => {
    expect(isLayoutRuleError('projects/create-failed')).toBe(false)
    expect(isLayoutRuleError(undefined)).toBe(false)
  })
})

describe('layoutRuleErrorTitle', () => {
  it('titles the disabled-field error', () => {
    expect(layoutRuleErrorTitle('projects/layout-field-disabled')).toContain(
      'does not allow'
    )
  })

  it('titles the required-fields error by default', () => {
    expect(layoutRuleErrorTitle('projects/layout-required-fields')).toContain(
      'requires'
    )
    expect(layoutRuleErrorTitle(undefined)).toContain('requires')
  })
})

describe('customFieldDescriptor', () => {
  it('maps select fields to select controls', () => {
    const descriptor = customFieldDescriptor({
      key: 'environment',
      label: 'Environment',
      fieldType: 'select',
      options: [{ key: 'production', label: 'Production' }],
    })
    expect(descriptor.fieldKey).toBe('cf:environment')
    expect(descriptor.control).toEqual({
      kind: 'select',
      options: [{ value: 'production', label: 'Production' }],
    })
  })

  it('maps booleans, dates, and numbers', () => {
    expect(
      customFieldDescriptor({
        key: 'flag',
        label: 'Flag',
        fieldType: 'boolean',
        options: [],
      }).control.kind
    ).toBe('boolean')
    expect(
      customFieldDescriptor({
        key: 'day',
        label: 'Day',
        fieldType: 'date',
        options: [],
      }).control.kind
    ).toBe('date')
    expect(
      customFieldDescriptor({
        key: 'amount',
        label: 'Amount',
        fieldType: 'number',
        options: [],
      }).control.kind
    ).toBe('number')
  })

  it('falls back to text', () => {
    expect(
      customFieldDescriptor({
        key: 'note',
        label: 'Note',
        fieldType: 'text',
        options: [],
      }).control.kind
    ).toBe('text')
  })
})

describe('entity descriptors', () => {
  it('builds project descriptors with custom fields', () => {
    const descriptors = projectLayoutDescriptors([
      {
        object: 'projects.project-custom-field',
        id: 'field_1',
        tenantId: 'tenant_1',
        key: 'business-unit',
        label: 'Business unit',
        fieldType: 'text',
        options: [],
        required: false,
        description: null,
        position: 0,
        archivedAt: null,
        createdAt: 1,
        updatedAt: 1,
      },
    ])
    expect(descriptors.map((entry) => entry.fieldKey)).toEqual([
      'title',
      'description',
      'cf:business-unit',
    ])
  })

  it('builds phase descriptors with owner options', () => {
    const descriptors = phaseLayoutDescriptors([], [
      { userId: 'user_1', label: 'Ada' },
    ])
    const owner = descriptors.find((entry) => entry.fieldKey === 'assignee')
    expect(owner?.label).toBe('Owner')
    expect(owner?.control).toEqual({
      kind: 'select',
      options: [{ value: 'user_1', label: 'Ada' }],
    })
  })

  it('builds work-item descriptors with system and custom fields', () => {
    const descriptors = issueLayoutDescriptors({
      customFields: [],
      workflowStates: [{ key: 'triage', name: 'Triage' }],
      milestones: [],
      taskLists: [],
      labels: [],
      members: [],
    })
    const keys = descriptors.map((entry) => entry.fieldKey)
    expect(keys).toContain('title')
    expect(keys).toContain('state')
    expect(keys).toContain('priority')
    expect(keys).toContain('labels')
  })

  it('falls back to the field key for unknown labels', () => {
    expect(descriptorLabel([], 'cf:mystery')).toBe('cf:mystery')
    expect(
      descriptorLabel([{ fieldKey: 'title', label: 'Title', control: { kind: 'text' } }], 'title')
    ).toBe('Title')
  })
})

describe('readLayoutFormValues', () => {
  function buildForm() {
    const form = document.createElement('form')
    form.innerHTML = `
      <input name="title" value="Ship it" />
      <input name="priority" value="urgent" />
      <input name="cf:environment" value="production" />
    `
    document.body.appendChild(form)
    return form
  }

  it('reads named inputs keyed by layout field', () => {
    const form = buildForm()
    try {
      expect(readLayoutFormValues(form, layout)).toMatchObject({
        title: 'Ship it',
        priority: 'urgent',
        'cf:environment': 'production',
      })
    } finally {
      form.remove()
    }
  })

  it('reads missing inputs as null', () => {
    const form = document.createElement('form')
    document.body.appendChild(form)
    try {
      expect(readLayoutFormValues(form, layout).title).toBeNull()
    } finally {
      form.remove()
    }
  })

  it('collects repeated names into arrays', () => {
    const form = document.createElement('form')
    form.innerHTML = `
      <input type="checkbox" name="title" value="a" checked />
      <input type="checkbox" name="title" value="b" checked />
    `
    document.body.appendChild(form)
    try {
      const single: Layout = {
        ...layout,
        sections: [
          {
            key: 'section-1',
            title: 'Details',
            columns: 1,
            fields: [{ fieldKey: 'title', width: 1, visible: true }],
          },
        ],
        rules: [],
      }
      expect(readLayoutFormValues(form, single).title).toEqual(['a', 'b'])
    } finally {
      form.remove()
    }
  })
})

describe('missingLayoutFields', () => {
  it('lists required-but-empty fields', () => {
    expect(
      missingLayoutFields(layout, { priority: 'urgent', 'cf:environment': null })
    ).toEqual(['cf:environment'])
  })

  it('ignores the rule when the condition does not match', () => {
    expect(
      missingLayoutFields(layout, { priority: 'low', 'cf:environment': null })
    ).toEqual([])
  })

  it('passes when the required field has a value', () => {
    expect(
      missingLayoutFields(layout, {
        priority: 'urgent',
        'cf:environment': 'production',
      })
    ).toEqual([])
  })
})

describe('customFieldInputValue', () => {
  it('converts booleans and numbers', () => {
    expect(customFieldInputValue('boolean', 'true')).toBe(true)
    expect(customFieldInputValue('number', '42')).toBe(42)
  })

  it('passes arrays through and nulls blanks', () => {
    expect(customFieldInputValue('multi-select', ['a'])).toEqual(['a'])
    expect(customFieldInputValue('text', '')).toBeNull()
    expect(customFieldInputValue('text', null)).toBeNull()
  })

  it('keeps text as text', () => {
    expect(customFieldInputValue('text', 'Retail')).toBe('Retail')
  })
})

describe('customFieldToLayoutValue', () => {
  it('stringifies booleans and numbers', () => {
    expect(customFieldToLayoutValue('boolean', true)).toBe('true')
    expect(customFieldToLayoutValue('number', 3)).toBe('3')
  })

  it('nulls empty values', () => {
    expect(customFieldToLayoutValue('text', null)).toBeNull()
    expect(customFieldToLayoutValue('text', '')).toBeNull()
  })
})

describe('entity value seeds', () => {
  it('seeds work-item values from an issue', () => {
    const values = issueToLayoutValues({
      title: 'Fix login',
      description: null,
      status: 'triage',
      priority: 'high',
      assigneeUserId: null,
      dueDate: null,
      plannedStartDate: null,
      estimate: 3,
      labels: [{ id: 'label_1' }],
      milestone: { id: 'milestone_1' },
      taskListId: null,
      customFields: [
        {
          fieldId: 'field_1',
          fieldKey: 'environment',
          fieldType: 'select',
          value: 'production',
        },
      ],
    })
    expect(values.title).toBe('Fix login')
    expect(values.state).toBe('triage')
    expect(values.estimate).toBe('3')
    expect(values.labels).toEqual(['label_1'])
    expect(values.phase).toBe('milestone_1')
    expect(values['cf:environment']).toBe('production')
  })

  it('seeds empty values without an issue', () => {
    expect(issueToLayoutValues()).toEqual({})
    expect(phaseToLayoutValues()).toEqual({})
    expect(projectToLayoutValues()).toEqual({})
  })

  it('seeds phase dates and owner', () => {
    const values = phaseToLayoutValues({
      name: 'Launch',
      description: null,
      status: 'open',
      ownerUserId: 'user_1',
      startDate: 1_700_000_000,
      targetDate: null,
      customFields: [],
    })
    expect(values.title).toBe('Launch')
    expect(values.assignee).toBe('user_1')
    expect(values.startDate).toBe(layoutDateInput(1_700_000_000))
  })

  it('seeds project values with custom fields', () => {
    const values = projectToLayoutValues({
      name: 'Console',
      description: 'Revamp',
      customFields: [
        { fieldKey: 'business-unit', fieldType: 'text', value: 'Retail' },
      ],
    })
    expect(values).toMatchObject({
      title: 'Console',
      description: 'Revamp',
      'cf:business-unit': 'Retail',
    })
  })
})

describe('splitLayoutCustomValues', () => {
  const fieldByKey = new Map([
    ['environment', { id: 'field_1', key: 'environment', fieldType: 'select' }],
  ])

  it('maps cf keys to field writes', () => {
    expect(
      splitLayoutCustomValues({ 'cf:environment': 'production' }, fieldByKey, false)
    ).toEqual([{ fieldId: 'field_1', value: 'production' }])
  })

  it('skips empty values for creates', () => {
    expect(
      splitLayoutCustomValues({ 'cf:environment': '' }, fieldByKey, false)
    ).toEqual([])
  })

  it('includes empty values for edits', () => {
    expect(
      splitLayoutCustomValues({ 'cf:environment': '' }, fieldByKey, true)
    ).toEqual([{ fieldId: 'field_1', value: null }])
  })
})

describe('layout dates', () => {
  it('round-trips timestamps through date inputs', () => {
    const input = layoutDateInput(1_700_000_000)
    expect(input).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(layoutDateTimestamp(input)).toBe(1_700_000_000 - (1_700_000_000 % 86_400))
  })

  it('nulls blank dates', () => {
    expect(layoutDateInput(null)).toBe('')
    expect(layoutDateTimestamp('')).toBeNull()
    expect(layoutDateTimestamp(null)).toBeNull()
  })
})
