import { describe, expect, it } from 'vitest'

import {
  anchorStartFor,
  captureDefinition,
  offsetDays,
  type CaptureInputs,
} from '../templates.capture.js'
import { DAY_SECONDS, templateDefinitionSchema } from '../templates.schemas.js'

const DAY = DAY_SECONDS
const ANCHOR = Date.UTC(2026, 8, 1) / 1000

function baseInputs(): CaptureInputs {
  return {
    project: {
      description: 'Source project',
      status: 'active',
      health: 'on-track',
      startDate: ANCHOR,
      targetDate: ANCHOR + 30 * DAY,
      billingMethod: 'time-and-materials',
      billingCurrency: 'USD',
      billingFixedFeeAmount: null,
    },
    phases: [
      {
        id: 'ms_1',
        key: 'foundations',
        name: 'Foundations',
        description: null,
        startDate: ANCHOR,
        targetDate: ANCHOR + 14 * DAY,
        position: 0,
      },
    ],
    taskLists: [
      {
        id: 'tl_1',
        milestoneId: 'ms_1',
        name: 'Build',
        description: null,
        startDate: ANCHOR + DAY,
        targetDate: ANCHOR + 7 * DAY,
        position: 0,
      },
    ],
    issues: [
      {
        id: 'iss_1',
        identifier: 'SRC-1',
        title: 'First',
        description: 'Do the thing',
        stateKey: 'todo',
        typeKey: 'task',
        priority: 'high',
        estimate: 3,
        labelNames: ['backend', 'frontend'],
        milestoneId: 'ms_1',
        taskListId: 'tl_1',
        parentIssueId: null,
        plannedStartDate: ANCHOR + DAY,
        plannedFinishDate: ANCHOR + 3 * DAY,
        plannedDurationMinutes: null,
        dueDate: ANCHOR + 5 * DAY,
        customFieldKeys: ['severity'],
      },
      {
        id: 'iss_2',
        identifier: 'SRC-2',
        title: 'Second',
        description: null,
        stateKey: 'in-progress',
        typeKey: 'subtask',
        priority: 'none',
        estimate: null,
        labelNames: [],
        milestoneId: null,
        taskListId: null,
        parentIssueId: 'iss_1',
        plannedStartDate: null,
        plannedFinishDate: null,
        plannedDurationMinutes: 2880,
        dueDate: null,
        customFieldKeys: [],
      },
    ],
    dependencies: [
      {
        predecessorIssueId: 'iss_1',
        successorIssueId: 'iss_2',
        type: 'finish-to-start',
        lagMinutes: 2880,
      },
    ],
    budgets: [
      {
        scope: 'project',
        milestoneId: null,
        amountMinor: 50000,
        hours: null,
        thresholdPercent: 80,
        periodStart: ANCHOR,
        periodEnd: ANCHOR + 30 * DAY,
      },
      {
        scope: 'milestone',
        milestoneId: 'ms_1',
        amountMinor: null,
        hours: 40,
        thresholdPercent: 90,
        periodStart: null,
        periodEnd: null,
      },
      {
        scope: 'user',
        milestoneId: null,
        amountMinor: null,
        hours: 10,
        thresholdPercent: 80,
        periodStart: null,
        periodEnd: null,
      },
    ],
    customFields: [
      {
        key: 'severity',
        label: 'Severity',
        fieldType: 'select',
        options: [{ key: 'high', label: 'High' }],
        required: false,
        description: null,
        typeKeys: ['task'],
      },
      {
        key: 'unused',
        label: 'Unused',
        fieldType: 'text',
        options: [],
        required: false,
        description: null,
        typeKeys: [],
      },
    ],
  }
}

describe('anchorStartFor', () => {
  it('prefers the project start date', () => {
    const inputs = baseInputs()
    expect(
      anchorStartFor(
        inputs.project,
        inputs.phases,
        inputs.taskLists,
        inputs.issues,
        inputs.budgets,
      ),
    ).toBe(ANCHOR)
  })

  it('falls back to the earliest row date without a project start', () => {
    const inputs = baseInputs()
    inputs.project.startDate = null
    expect(
      anchorStartFor(
        inputs.project,
        inputs.phases,
        inputs.taskLists,
        inputs.issues,
        inputs.budgets,
      ),
    ).toBe(ANCHOR)
  })

  it('falls back to now when nothing carries a date', () => {
    const inputs = baseInputs()
    inputs.project.startDate = null
    inputs.phases = []
    inputs.taskLists = []
    inputs.issues = []
    inputs.budgets = []
    expect(
      anchorStartFor(
        inputs.project,
        inputs.phases,
        inputs.taskLists,
        inputs.issues,
        inputs.budgets,
        999,
      ),
    ).toBe(999)
  })
})

describe('offsetDays', () => {
  it('spans a month boundary in whole days', () => {
    const anchor = Date.UTC(2026, 0, 31) / 1000
    expect(offsetDays(anchor, Date.UTC(2026, 1, 2) / 1000)).toBe(2)
  })
})

describe('captureDefinition', () => {
  it('produces a definition that validates against the v1 schema', () => {
    const parsed = templateDefinitionSchema.safeParse(
      captureDefinition(baseInputs()),
    )
    expect(parsed.success).toBe(true)
  })

  it('computes relative offsets from the anchor', () => {
    const definition = captureDefinition(baseInputs())
    expect(definition.phases?.[0]).toMatchObject({
      ref: 'phase-foundations',
      key: 'foundations',
      startOffsetDays: 0,
      durationDays: 14,
    })
    expect(definition.taskLists?.[0]).toMatchObject({
      phaseRef: 'phase-foundations',
      startOffsetDays: 1,
      durationDays: 6,
    })
    expect(definition.workItems?.[0]).toMatchObject({
      startOffsetDays: 1,
      dueOffsetDays: 5,
      durationDays: 2,
    })
  })

  it('derives duration days from planned minutes when present', () => {
    const definition = captureDefinition(baseInputs())
    expect(definition.workItems?.[1]?.durationDays).toBe(2)
  })

  it('maps milestone, task list, and parent ids to local refs', () => {
    const definition = captureDefinition(baseInputs())
    const first = definition.workItems?.[0]
    const second = definition.workItems?.[1]
    expect(first?.phaseRef).toBe('phase-foundations')
    expect(first?.taskListRef).toBe('task-list-1')
    expect(second?.parentRef).toBe(first?.ref)
  })

  it('sorts work-item labels by name', () => {
    const definition = captureDefinition(baseInputs())
    expect(definition.workItems?.[0]?.labels).toEqual([
      'backend',
      'frontend',
    ])
  })

  it('never captures user ids, comments, attachments, or time', () => {
    const definition = captureDefinition(baseInputs())
    const serialized = JSON.stringify(definition)
    expect(serialized).not.toContain('assignee')
    expect(serialized).not.toContain('creator')
    expect(serialized).not.toContain('ownerUserId')
    expect(serialized).not.toContain('authorUserId')
    expect(serialized).not.toContain('comment')
    expect(serialized).not.toContain('attachment')
    expect(serialized).not.toContain('timeEntry')
    expect(serialized).not.toContain('usr_')
  })

  it('keeps only dependencies inside the captured project', () => {
    const inputs = baseInputs()
    inputs.dependencies.push(
      {
        predecessorIssueId: 'iss_1',
        successorIssueId: 'iss_external',
        type: 'finish-to-start',
        lagMinutes: 0,
      },
      {
        predecessorIssueId: 'iss_1',
        successorIssueId: 'iss_1',
        type: 'finish-to-start',
        lagMinutes: 0,
      },
    )
    const definition = captureDefinition(inputs)
    expect(definition.dependencies).toHaveLength(1)
    expect(definition.dependencies?.[0]).toMatchObject({
      fromRef: 'work-item-1',
      toRef: 'work-item-2',
      type: 'finish-to-start',
      lagDays: 2,
    })
  })

  it('captures project and milestone budgets but never user budgets', () => {
    const definition = captureDefinition(baseInputs())
    expect(definition.budgetDefaults).toHaveLength(2)
    expect(definition.budgetDefaults?.[0]).toMatchObject({
      scope: 'project',
      phaseRef: null,
      amountMinor: 50000,
      periodStartOffsetDays: 0,
      periodEndOffsetDays: 30,
    })
    expect(definition.budgetDefaults?.[1]).toMatchObject({
      scope: 'milestone',
      phaseRef: 'phase-foundations',
      hours: 40,
    })
  })

  it('captures only custom fields referenced by issues', () => {
    const definition = captureDefinition(baseInputs())
    expect(definition.customFieldDefinitions).toHaveLength(1)
    expect(definition.customFieldDefinitions?.[0]).toMatchObject({
      key: 'severity',
      fieldType: 'select',
      typeKeys: ['task'],
    })
  })

  it('captures billing settings from the project', () => {
    const definition = captureDefinition(baseInputs())
    expect(definition.project).toMatchObject({
      description: 'Source project',
      status: 'active',
      health: 'on-track',
      billingMethod: 'time-and-materials',
      currency: 'USD',
    })
  })

  it('captures an empty project as empty collections', () => {
    const inputs = baseInputs()
    inputs.phases = []
    inputs.taskLists = []
    inputs.issues = []
    inputs.dependencies = []
    inputs.budgets = []
    inputs.customFields = []
    const definition = captureDefinition(inputs)
    expect(definition.schemaVersion).toBe(1)
    expect(definition.phases).toEqual([])
    expect(definition.taskLists).toEqual([])
    expect(definition.workItems).toEqual([])
    expect(definition.dependencies).toEqual([])
  })
})
