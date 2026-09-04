import { describe, expect, it } from 'vitest'

import {
  applyPresetBodySchema,
  createCustomFieldBodySchema,
  createMilestoneBodySchema,
  createWorkItemTypeBodySchema,
  createWorkflowStateBodySchema,
  customFieldValueInputSchema,
  milestoneListQuerySchema,
  organizationParamsSchema,
  setCustomFieldValueBodySchema,
  updateCustomFieldBodySchema,
  updateMilestoneBodySchema,
  updateWorkItemTypeBodySchema,
  updateWorkflowStateBodySchema,
} from '../work-structure.schemas.js'

describe('work-structure kebab-case keys', () => {
  it('accepts simple and multi-segment keys on work item types', () => {
    for (const key of ['task', 'bug', 'sub-task', 'epic-2']) {
      const parsed = createWorkItemTypeBodySchema.safeParse({
        key,
        name: 'Task',
        iconKey: 'check-square',
        color: '#2563eb',
      })
      expect(parsed.success).toBe(true)
    }
  })

  it('rejects uppercase, spaced, and leading-digit keys', () => {
    for (const key of [
      'Task',
      'BUG',
      'sub task',
      '1-task',
      '-task',
      'task-',
      '',
    ]) {
      const parsed = createWorkItemTypeBodySchema.safeParse({
        key,
        name: 'Task',
        iconKey: 'check-square',
        color: '#2563eb',
      })
      expect(parsed.success).toBe(false)
    }
  })
})

describe('createWorkItemTypeBodySchema', () => {
  it('fills hierarchyLevel with 1 when omitted', () => {
    const parsed = createWorkItemTypeBodySchema.safeParse({
      key: 'task',
      name: 'Task',
      iconKey: 'check-square',
      color: '#2563eb',
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.hierarchyLevel).toBe(1)
  })

  it('accepts hierarchy levels 0 through 2 for subtask, standard, and epic', () => {
    for (const hierarchyLevel of [0, 1, 2]) {
      const parsed = createWorkItemTypeBodySchema.safeParse({
        key: 'task',
        name: 'Task',
        iconKey: 'check-square',
        color: '#2563eb',
        hierarchyLevel,
      })
      expect(parsed.success).toBe(true)
    }
  })

  it('rejects hierarchy level 3 and negative levels', () => {
    for (const hierarchyLevel of [-1, 3, 99]) {
      const parsed = createWorkItemTypeBodySchema.safeParse({
        key: 'task',
        name: 'Task',
        iconKey: 'check-square',
        color: '#2563eb',
        hierarchyLevel,
      })
      expect(parsed.success).toBe(false)
    }
  })

  it('rejects unknown fields to keep the contract closed', () => {
    const parsed = createWorkItemTypeBodySchema.safeParse({
      key: 'task',
      name: 'Task',
      iconKey: 'check-square',
      color: '#2563eb',
      archived: false,
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects a blank name and an overlong name', () => {
    for (const name of ['   ', 'n'.repeat(101)]) {
      const parsed = createWorkItemTypeBodySchema.safeParse({
        key: 'task',
        name,
        iconKey: 'check-square',
        color: '#2563eb',
      })
      expect(parsed.success).toBe(false)
    }
  })
})

describe('updateWorkItemTypeBodySchema', () => {
  it('accepts a partial update with only the name', () => {
    const parsed = updateWorkItemTypeBodySchema.safeParse({ name: 'Bug' })

    expect(parsed.success).toBe(true)
  })

  it('rejects an empty update without applying create-time defaults', () => {
    expect(updateWorkItemTypeBodySchema.safeParse({}).success).toBe(false)
  })

  it('accepts an explicit hierarchy level update', () => {
    const parsed = updateWorkItemTypeBodySchema.safeParse({ hierarchyLevel: 1 })

    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data).toEqual({ hierarchyLevel: 1 })
  })

  it('rejects a key change through the update schema', () => {
    const parsed = updateWorkItemTypeBodySchema.safeParse({ key: 'bug' })

    expect(parsed.success).toBe(false)
  })
})

describe('createWorkflowStateBodySchema', () => {
  it('accepts each of the five platform categories', () => {
    for (const category of [
      'backlog',
      'unstarted',
      'started',
      'completed',
      'canceled',
    ]) {
      const parsed = createWorkflowStateBodySchema.safeParse({
        key: 'in-progress',
        name: 'In progress',
        category,
        color: '#2563eb',
      })
      expect(parsed.success).toBe(true)
    }
  })

  it('rejects a category outside the platform set', () => {
    for (const category of ['active', 'archived', 'DONE', '']) {
      const parsed = createWorkflowStateBodySchema.safeParse({
        key: 'done',
        name: 'Done',
        category,
        color: '#16a34a',
      })
      expect(parsed.success).toBe(false)
    }
  })

  it('rejects unknown fields to keep the contract closed', () => {
    const parsed = createWorkflowStateBodySchema.safeParse({
      key: 'done',
      name: 'Done',
      category: 'completed',
      color: '#16a34a',
      terminal: true,
    })

    expect(parsed.success).toBe(false)
  })
})

describe('updateWorkflowStateBodySchema', () => {
  it('accepts a category-only rename of the state meaning', () => {
    const parsed = updateWorkflowStateBodySchema.safeParse({
      category: 'started',
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects an empty update with no fields', () => {
    expect(updateWorkflowStateBodySchema.safeParse({}).success).toBe(false)
  })

  it('rejects a key change through the update schema', () => {
    const parsed = updateWorkflowStateBodySchema.safeParse({ key: 'done' })

    expect(parsed.success).toBe(false)
  })
})

describe('milestoneListQuerySchema', () => {
  it('requires the project id every milestone listing filters on', () => {
    expect(
      milestoneListQuerySchema.safeParse({ projectId: 'prj_1' }).success
    ).toBe(true)
    expect(milestoneListQuerySchema.safeParse({}).success).toBe(false)
  })

  it('accepts each milestone status filter', () => {
    for (const status of ['open', 'completed', 'canceled']) {
      expect(
        milestoneListQuerySchema.safeParse({ projectId: 'prj_1', status })
          .success
      ).toBe(true)
    }
  })

  it('rejects an unknown status filter', () => {
    expect(
      milestoneListQuerySchema.safeParse({ projectId: 'prj_1', status: 'late' })
        .success
    ).toBe(false)
  })
})

describe('createMilestoneBodySchema', () => {
  it('defaults an omitted status on the service side by accepting its absence', () => {
    const parsed = createMilestoneBodySchema.safeParse({
      projectId: 'prj_1',
      key: 'v1',
      name: 'Version 1',
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.status).toBeUndefined()
  })

  it('accepts unix-second start and target dates', () => {
    const parsed = createMilestoneBodySchema.safeParse({
      projectId: 'prj_1',
      key: 'v1',
      name: 'Version 1',
      startDate: 1787767200,
      targetDate: 1788767200,
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects fractional dates that are not unix seconds', () => {
    const parsed = createMilestoneBodySchema.safeParse({
      projectId: 'prj_1',
      key: 'v1',
      name: 'Version 1',
      targetDate: 1788767200.5,
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects unknown fields to keep the contract closed', () => {
    const parsed = createMilestoneBodySchema.safeParse({
      projectId: 'prj_1',
      key: 'v1',
      name: 'Version 1',
      owner: 'usr_1',
    })

    expect(parsed.success).toBe(false)
  })
})

describe('updateMilestoneBodySchema', () => {
  it('accepts a status-only transition to completed', () => {
    expect(
      updateMilestoneBodySchema.safeParse({ status: 'completed' }).success
    ).toBe(true)
  })

  it('rejects an empty update with no fields', () => {
    expect(updateMilestoneBodySchema.safeParse({}).success).toBe(false)
  })

  it('rejects a project change through the update schema', () => {
    expect(
      updateMilestoneBodySchema.safeParse({ projectId: 'prj_2' }).success
    ).toBe(false)
  })

  it('rejects a key change through the update schema', () => {
    expect(updateMilestoneBodySchema.safeParse({ key: 'v2' }).success).toBe(
      false
    )
  })
})

describe('createCustomFieldBodySchema', () => {
  it('accepts each non-option typed field kind', () => {
    for (const fieldType of [
      'text',
      'textarea',
      'number',
      'decimal',
      'boolean',
      'date',
      'user',
      'url',
    ]) {
      const parsed = createCustomFieldBodySchema.safeParse({
        key: 'severity',
        label: 'Severity',
        fieldType,
      })
      expect(parsed.success).toBe(true)
    }
  })

  it('requires options for select and multi-select fields', () => {
    for (const fieldType of ['select', 'multi-select']) {
      expect(
        createCustomFieldBodySchema.safeParse({
          key: 'severity',
          label: 'Severity',
          fieldType,
        }).success
      ).toBe(false)
      expect(
        createCustomFieldBodySchema.safeParse({
          key: 'severity',
          label: 'Severity',
          fieldType,
          options: [{ key: 'high', label: 'High' }],
        }).success
      ).toBe(true)
    }
  })

  it('rejects options on non-select fields', () => {
    expect(
      createCustomFieldBodySchema.safeParse({
        key: 'severity',
        label: 'Severity',
        fieldType: 'text',
        options: [{ key: 'high', label: 'High' }],
      }).success
    ).toBe(false)
  })

  it('rejects an unknown field kind', () => {
    const parsed = createCustomFieldBodySchema.safeParse({
      key: 'severity',
      label: 'Severity',
      fieldType: 'rating',
    })

    expect(parsed.success).toBe(false)
  })

  it('accepts select options with kebab-case keys', () => {
    const parsed = createCustomFieldBodySchema.safeParse({
      key: 'severity',
      label: 'Severity',
      fieldType: 'select',
      options: [
        { key: 'low', label: 'Low' },
        { key: 'high', label: 'High' },
      ],
    })

    expect(parsed.success).toBe(true)
  })

  it('rejects duplicate select option keys', () => {
    const parsed = createCustomFieldBodySchema.safeParse({
      key: 'severity',
      label: 'Severity',
      fieldType: 'select',
      options: [
        { key: 'high', label: 'High' },
        { key: 'high', label: 'Very high' },
      ],
    })

    expect(parsed.success).toBe(false)
  })

  it('rejects select options with non-kebab keys', () => {
    const parsed = createCustomFieldBodySchema.safeParse({
      key: 'severity',
      label: 'Severity',
      fieldType: 'select',
      options: [{ key: 'Very High', label: 'Very High' }],
    })

    expect(parsed.success).toBe(false)
  })
})

describe('updateCustomFieldBodySchema', () => {
  it('accepts a label-only rename', () => {
    expect(
      updateCustomFieldBodySchema.safeParse({ label: 'Impact' }).success
    ).toBe(true)
  })

  it('rejects an empty update with no fields', () => {
    expect(updateCustomFieldBodySchema.safeParse({}).success).toBe(false)
  })

  it('rejects duplicate option keys', () => {
    expect(
      updateCustomFieldBodySchema.safeParse({
        options: [
          { key: 'high', label: 'High' },
          { key: 'high', label: 'Very high' },
        ],
      }).success
    ).toBe(false)
  })

  it('rejects a key change through the update schema', () => {
    expect(
      updateCustomFieldBodySchema.safeParse({ key: 'impact' }).success
    ).toBe(false)
  })
})

describe('customFieldValueInputSchema', () => {
  it('accepts string, integer, boolean, string array, and null values', () => {
    for (const value of ['text', 3, true, ['a', 'b'], null]) {
      expect(
        customFieldValueInputSchema.safeParse({ fieldId: 'cf_1', value })
          .success
      ).toBe(true)
    }
  })

  it('rejects fractional numbers that match no typed column', () => {
    expect(
      customFieldValueInputSchema.safeParse({ fieldId: 'cf_1', value: 3.5 })
        .success
    ).toBe(false)
  })

  it('rejects blank strings inside multi-select arrays', () => {
    expect(
      customFieldValueInputSchema.safeParse({ fieldId: 'cf_1', value: [''] })
        .success
    ).toBe(false)
  })

  it('rejects a missing field id', () => {
    expect(
      customFieldValueInputSchema.safeParse({ value: 'text' }).success
    ).toBe(false)
  })
})

describe('setCustomFieldValueBodySchema', () => {
  it('accepts an optional updatedBy attribution', () => {
    const parsed = setCustomFieldValueBodySchema.safeParse({
      fieldId: 'cf_1',
      value: 'text',
      updatedBy: 'usr_1',
    })

    expect(parsed.success).toBe(true)
  })

  it('accepts a null updatedBy for system writes', () => {
    const parsed = setCustomFieldValueBodySchema.safeParse({
      fieldId: 'cf_1',
      value: 'text',
      updatedBy: null,
    })

    expect(parsed.success).toBe(true)
  })
})

describe('applyPresetBodySchema', () => {
  it('accepts each of the three catalog preset keys', () => {
    for (const key of [
      'software-development',
      'business-operations',
      'general',
    ]) {
      expect(applyPresetBodySchema.safeParse({ key }).success).toBe(true)
    }
  })

  it('rejects an unknown preset key', () => {
    expect(applyPresetBodySchema.safeParse({ key: 'marketing' }).success).toBe(
      false
    )
  })
})

describe('organizationParamsSchema', () => {
  it('rejects a blank organization id', () => {
    expect(
      organizationParamsSchema.safeParse({ organizationId: '  ' }).success
    ).toBe(false)
  })

  it('trims the organization id', () => {
    const parsed = organizationParamsSchema.safeParse({
      organizationId: '  org_1  ',
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.organizationId).toBe('org_1')
  })
})
