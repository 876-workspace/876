import { describe, expect, it } from 'vitest'

import {
  orderParentsBeforeChildren,
  planMaterialization,
  type MaterializeCatalogs,
  type MaterializePlan,
} from '../templates.materialize.js'
import { DAY_SECONDS } from '../templates.schemas.js'
import type { TemplateDefinition } from '../templates.schemas.js'

const catalogs: MaterializeCatalogs = {
  workItemTypes: new Map([
    ['epic', { id: 'wit_epic', hierarchyLevel: 2 }],
    ['task', { id: 'wit_task', hierarchyLevel: 1 }],
    ['subtask', { id: 'wit_sub', hierarchyLevel: 0 }],
  ]),
  workflowStates: new Map([
    ['todo', { id: 'wfs_todo', category: 'unstarted' }],
    ['in-progress', { id: 'wfs_prog', category: 'started' }],
    ['done', { id: 'wfs_done', category: 'completed' }],
  ]),
  labels: new Map([
    ['frontend', 'lbl_front'],
    ['backend', 'lbl_back'],
  ]),
}

const START = Date.UTC(2026, 8, 1) / 1000

function baseDefinition(): TemplateDefinition {
  return {
    schemaVersion: 1,
    project: { description: null, status: 'active', health: 'on-track' },
    phases: [
      {
        ref: 'phase-foundations',
        key: 'foundations',
        name: 'Foundations',
        startOffsetDays: 0,
        durationDays: 14,
        position: 0,
      },
    ],
    taskLists: [
      {
        ref: 'task-list-1',
        name: 'Build',
        phaseRef: 'phase-foundations',
        position: 0,
      },
    ],
    workItems: [
      {
        ref: 'work-item-1',
        title: 'Ship it',
        typeKey: 'task',
        stateKey: 'todo',
        priority: 'high',
        estimate: 3,
        labels: ['frontend'],
        phaseRef: 'phase-foundations',
        taskListRef: 'task-list-1',
        startOffsetDays: 1,
        dueOffsetDays: 5,
        durationDays: 2,
      },
    ],
    dependencies: [],
    customFieldDefinitions: [],
    budgetDefaults: [],
  }
}

function planOf(definition: TemplateDefinition): MaterializePlan {
  const result = planMaterialization(
    definition,
    {
      startDate: START,
      includeWorkItems: true,
      includeDependencies: true,
      includeBudgets: true,
    },
    catalogs,
  )
  if (result.status !== 'ok') throw new Error(`expected ok, got ${result.status}`)
  expect(result.missing).toEqual({
    workItemTypes: [],
    workflowStates: [],
    labels: [],
  })
  return result.plan
}

describe('planMaterialization date maths', () => {
  it('converts phase offsets to absolute seconds', () => {
    const plan = planOf(baseDefinition())
    expect(plan.phases[0]?.start).toBe(START)
    expect(plan.phases[0]?.end).toBe(START + 14 * DAY_SECONDS)
  })

  it('crosses a month boundary with whole-day arithmetic', () => {
    const anchor = Date.UTC(2026, 0, 31) / 1000
    const definition = baseDefinition()
    definition.phases = [
      {
        ref: 'phase-x',
        key: 'x',
        name: 'X',
        startOffsetDays: 0,
        durationDays: 2,
      },
    ]
    definition.taskLists = []
    definition.workItems = []
    const result = planMaterialization(
      definition,
      {
        startDate: anchor,
        includeWorkItems: false,
        includeDependencies: false,
        includeBudgets: false,
      },
      catalogs,
    )
    if (result.status !== 'ok') throw new Error('expected ok')
    expect(result.plan.phases[0]?.start).toBe(Date.UTC(2026, 0, 31) / 1000)
    expect(result.plan.phases[0]?.end).toBe(Date.UTC(2026, 1, 2) / 1000)
  })

  it('crosses the leap day boundary', () => {
    const anchor = Date.UTC(2024, 1, 28) / 1000
    const definition = baseDefinition()
    definition.workItems = [
      {
        ref: 'work-item-1',
        title: 'Leap',
        typeKey: 'task',
        stateKey: 'todo',
        startOffsetDays: 0,
        durationDays: 2,
      },
    ]
    const result = planMaterialization(
      definition,
      {
        startDate: anchor,
        includeWorkItems: true,
        includeDependencies: false,
        includeBudgets: false,
      },
      catalogs,
    )
    if (result.status !== 'ok') throw new Error('expected ok')
    expect(result.plan.workItems[0]?.plannedStart).toBe(
      Date.UTC(2024, 1, 28) / 1000,
    )
    expect(result.plan.workItems[0]?.plannedFinish).toBe(
      Date.UTC(2024, 2, 1) / 1000,
    )
  })

  it('maps due offsets and duration days to issue fields', () => {
    const plan = planOf(baseDefinition())
    const item = plan.workItems[0]
    expect(item?.plannedStart).toBe(START + DAY_SECONDS)
    expect(item?.dueDate).toBe(START + 5 * DAY_SECONDS)
    expect(item?.plannedFinish).toBe(START + 3 * DAY_SECONDS)
    expect(item?.plannedDurationMinutes).toBe(2 * 1440)
  })

  it('converts lag days to lag minutes on dependencies', () => {
    const definition = baseDefinition()
    definition.workItems = [
      { ref: 'a', title: 'A', typeKey: 'task', stateKey: 'todo' },
      { ref: 'b', title: 'B', typeKey: 'task', stateKey: 'todo' },
    ]
    definition.dependencies = [
      { fromRef: 'a', toRef: 'b', type: 'start-to-start', lagDays: 2 },
    ]
    const plan = planOf(definition)
    expect(plan.dependencies).toHaveLength(1)
    expect(plan.dependencies[0]).toMatchObject({
      fromPlanIndex: 0,
      toPlanIndex: 1,
      type: 'start-to-start',
      lagMinutes: 2880,
    })
  })

  it('leaves dates null when the definition carries no offsets', () => {
    const definition = baseDefinition()
    definition.phases = [{ ref: 'p', key: 'p', name: 'P' }]
    definition.taskLists = []
    definition.workItems = [
      { ref: 'a', title: 'A', typeKey: 'task', stateKey: 'todo' },
    ]
    const plan = planOf(definition)
    expect(plan.phases[0]?.start).toBeNull()
    expect(plan.phases[0]?.end).toBeNull()
    expect(plan.workItems[0]?.plannedStart).toBeNull()
    expect(plan.workItems[0]?.dueDate).toBeNull()
  })
})

describe('planMaterialization ref resolution order', () => {
  it('orders parents before children regardless of definition order', () => {
    const definition = baseDefinition()
    definition.workItems = [
      {
        ref: 'child',
        title: 'Child',
        typeKey: 'subtask',
        stateKey: 'todo',
        parentRef: 'parent',
      },
      { ref: 'parent', title: 'Parent', typeKey: 'task', stateKey: 'todo' },
    ]
    const plan = planOf(definition)
    expect(plan.workItems.map((item) => item.ref)).toEqual([
      'parent',
      'child',
    ])
    expect(plan.workItems[1]?.parentPlanIndex).toBe(0)
  })

  it('orders grandparent chains oldest first', () => {
    const definition = baseDefinition()
    definition.workItems = [
      {
        ref: 'leaf',
        title: 'Leaf',
        typeKey: 'subtask',
        stateKey: 'todo',
        parentRef: 'mid',
      },
      {
        ref: 'mid',
        title: 'Mid',
        typeKey: 'task',
        stateKey: 'todo',
        parentRef: 'root',
      },
      { ref: 'root', title: 'Root', typeKey: 'epic', stateKey: 'todo' },
    ]
    const plan = planOf(definition)
    expect(plan.workItems.map((item) => item.ref)).toEqual([
      'root',
      'mid',
      'leaf',
    ])
  })

  it('resolves phase and task list refs to creation indexes', () => {
    const plan = planOf(baseDefinition())
    expect(plan.taskLists[0]?.phaseIndex).toBe(0)
    expect(plan.workItems[0]?.phaseIndex).toBe(0)
    expect(plan.workItems[0]?.taskListIndex).toBe(0)
  })

  it('remaps dependency refs to work-item plan indexes', () => {
    const definition = baseDefinition()
    definition.workItems = [
      { ref: 'first', title: 'First', typeKey: 'task', stateKey: 'todo' },
      { ref: 'second', title: 'Second', typeKey: 'task', stateKey: 'todo' },
      { ref: 'third', title: 'Third', typeKey: 'task', stateKey: 'todo' },
    ]
    definition.dependencies = [
      { fromRef: 'first', toRef: 'third' },
      { fromRef: 'second', toRef: 'third' },
    ]
    const plan = planOf(definition)
    expect(plan.dependencies).toHaveLength(2)
    expect(plan.dependencies[0]?.toPlanIndex).toBe(2)
    expect(plan.dependencies[1]?.toPlanIndex).toBe(2)
  })

  it('resolves label names to ids and catalog entries to ids', () => {
    const plan = planOf(baseDefinition())
    expect(plan.workItems[0]?.labelIds).toEqual(['lbl_front'])
    expect(plan.workItems[0]?.workItemTypeId).toBe('wit_task')
    expect(plan.workItems[0]?.workflowStateId).toBe('wfs_todo')
    expect(plan.workItems[0]?.statusCategory).toBe('unstarted')
  })
})

describe('orderParentsBeforeChildren', () => {
  it('returns null when parents form a cycle', () => {
    expect(
      orderParentsBeforeChildren(
        new Map([
          [0, 1],
          [1, 0],
        ]),
      ),
    ).toBeNull()
  })
})

describe('planMaterialization missing references', () => {
  it('reports a missing work item type while keeping a partial plan', () => {
    const definition = baseDefinition()
    definition.workItems = [
      { ref: 'ghost', title: 'Ghost', typeKey: 'ghost', stateKey: 'todo' },
    ]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    if (result.status !== 'ok') throw new Error('expected ok')
    expect(result.missing.workItemTypes).toEqual(['ghost'])
    expect(result.plan.workItems).toHaveLength(0)
  })

  it('reports missing workflow states and labels together', () => {
    const definition = baseDefinition()
    definition.workItems = [
      {
        ref: 'a',
        title: 'A',
        typeKey: 'task',
        stateKey: 'ghost-state',
        labels: ['ghost-label'],
      },
    ]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    if (result.status !== 'ok') throw new Error('expected ok')
    expect(result.missing.workflowStates).toEqual(['ghost-state'])
    expect(result.missing.labels).toEqual(['ghost-label'])
  })

  it('reports unknown custom-field type keys as missing types', () => {
    const definition = baseDefinition()
    definition.workItems = []
    definition.customFieldDefinitions = [
      {
        key: 'severity',
        label: 'Severity',
        fieldType: 'select',
        options: [{ key: 'high', label: 'High' }],
        typeKeys: ['ghost'],
      },
    ]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    if (result.status !== 'ok') throw new Error('expected ok')
    expect(result.missing.workItemTypes).toEqual(['ghost'])
  })

  it('leaves dependencies on missing items out of the partial plan', () => {
    const definition = baseDefinition()
    definition.workItems = [
      { ref: 'kept', title: 'Kept', typeKey: 'task', stateKey: 'todo' },
      { ref: 'gone', title: 'Gone', typeKey: 'ghost', stateKey: 'todo' },
    ]
    definition.dependencies = [{ fromRef: 'kept', toRef: 'gone' }]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    if (result.status !== 'ok') throw new Error('expected ok')
    expect(result.missing.workItemTypes).toEqual(['ghost'])
    expect(result.plan.dependencies).toHaveLength(0)
  })
})

describe('planMaterialization invalid graphs', () => {
  it('rejects dependency cycles with the ref path', () => {
    const definition = baseDefinition()
    definition.workItems = [
      { ref: 'a', title: 'A', typeKey: 'task', stateKey: 'todo' },
      { ref: 'b', title: 'B', typeKey: 'task', stateKey: 'todo' },
    ]
    definition.dependencies = [
      { fromRef: 'a', toRef: 'b' },
      { fromRef: 'b', toRef: 'a' },
    ]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    expect(result.status).toBe('dependency-cycle')
    if (result.status !== 'dependency-cycle') throw new Error('expected cycle')
    expect(result.cycle[0]).toBe('a')
    expect(result.cycle[result.cycle.length - 1]).toBe('a')
  })

  it('rejects self dependencies', () => {
    const definition = baseDefinition()
    definition.workItems = [
      { ref: 'a', title: 'A', typeKey: 'task', stateKey: 'todo' },
    ]
    definition.dependencies = [{ fromRef: 'a', toRef: 'a' }]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    expect(result.status).toBe('invalid-refs')
  })

  it('rejects duplicate work item refs', () => {
    const definition = baseDefinition()
    definition.workItems = [
      { ref: 'a', title: 'A', typeKey: 'task', stateKey: 'todo' },
      { ref: 'a', title: 'A again', typeKey: 'task', stateKey: 'todo' },
    ]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    expect(result.status).toBe('invalid-refs')
    if (result.status !== 'invalid-refs') throw new Error('expected invalid')
    expect(result.message).toContain('Duplicate work item ref')
  })

  it('rejects duplicate phase keys that would collide on write', () => {
    const definition = baseDefinition()
    definition.phases = [
      { ref: 'p-one', key: 'same', name: 'One' },
      { ref: 'p-two', key: 'same', name: 'Two' },
    ]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: false,
        includeDependencies: false,
        includeBudgets: false,
      },
      catalogs,
    )
    expect(result.status).toBe('invalid-refs')
  })

  it('rejects unknown parent refs', () => {
    const definition = baseDefinition()
    definition.workItems = [
      {
        ref: 'a',
        title: 'A',
        typeKey: 'task',
        stateKey: 'todo',
        parentRef: 'missing',
      },
    ]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    expect(result.status).toBe('invalid-refs')
  })

  it('rejects parent cycles', () => {
    const definition = baseDefinition()
    definition.workItems = [
      {
        ref: 'a',
        title: 'A',
        typeKey: 'task',
        stateKey: 'todo',
        parentRef: 'b',
      },
      {
        ref: 'b',
        title: 'B',
        typeKey: 'epic',
        stateKey: 'todo',
        parentRef: 'a',
      },
    ]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    expect(result.status).toBe('invalid-refs')
  })

  it('rejects children nested above their parent hierarchy', () => {
    const definition = baseDefinition()
    definition.workItems = [
      { ref: 'parent', title: 'Parent', typeKey: 'subtask', stateKey: 'todo' },
      {
        ref: 'child',
        title: 'Child',
        typeKey: 'task',
        stateKey: 'todo',
        parentRef: 'parent',
      },
    ]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    expect(result.status).toBe('invalid-refs')
  })

  it('rejects unknown dependency refs', () => {
    const definition = baseDefinition()
    definition.workItems = [
      { ref: 'a', title: 'A', typeKey: 'task', stateKey: 'todo' },
    ]
    definition.dependencies = [{ fromRef: 'a', toRef: 'missing' }]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    expect(result.status).toBe('invalid-refs')
  })

  it('rejects duplicate dependency pairs', () => {
    const definition = baseDefinition()
    definition.workItems = [
      { ref: 'a', title: 'A', typeKey: 'task', stateKey: 'todo' },
      { ref: 'b', title: 'B', typeKey: 'task', stateKey: 'todo' },
    ]
    definition.dependencies = [
      { fromRef: 'a', toRef: 'b' },
      { fromRef: 'a', toRef: 'b' },
    ]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    expect(result.status).toBe('invalid-refs')
  })

  it('rejects unknown task list phase refs', () => {
    const definition = baseDefinition()
    definition.taskLists = [
      { ref: 'task-list-9', name: 'Lost', phaseRef: 'missing' },
    ]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: false,
        includeDependencies: false,
        includeBudgets: false,
      },
      catalogs,
    )
    expect(result.status).toBe('invalid-refs')
  })
})

describe('planMaterialization include flags', () => {
  it('drops work items and dependencies when work items are excluded', () => {
    const definition = baseDefinition()
    definition.dependencies = []
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: false,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    if (result.status !== 'ok') throw new Error('expected ok')
    expect(result.plan.workItems).toHaveLength(0)
    expect(result.plan.dependencies).toHaveLength(0)
    expect(result.plan.phases).toHaveLength(1)
  })

  it('keeps work items while dropping dependencies when excluded', () => {
    const definition = baseDefinition()
    definition.workItems = [
      { ref: 'a', title: 'A', typeKey: 'task', stateKey: 'todo' },
      { ref: 'b', title: 'B', typeKey: 'task', stateKey: 'todo' },
    ]
    definition.dependencies = [{ fromRef: 'a', toRef: 'b' }]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: false,
        includeBudgets: true,
      },
      catalogs,
    )
    if (result.status !== 'ok') throw new Error('expected ok')
    expect(result.plan.workItems).toHaveLength(2)
    expect(result.plan.dependencies).toHaveLength(0)
  })

  it('plans project and milestone budgets with relative periods', () => {
    const definition = baseDefinition()
    definition.workItems = []
    definition.budgetDefaults = [
      {
        scope: 'project',
        amountMinor: 50000,
        thresholdPercent: 80,
        periodStartOffsetDays: 0,
        periodEndOffsetDays: 30,
      },
      {
        scope: 'milestone',
        phaseRef: 'phase-foundations',
        hours: 120,
      },
    ]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: true,
      },
      catalogs,
    )
    if (result.status !== 'ok') throw new Error('expected ok')
    expect(result.plan.budgets).toHaveLength(2)
    expect(result.plan.budgets[0]).toMatchObject({
      scope: 'project',
      phaseIndex: null,
      amountMinor: 50000,
      periodStart: START,
      periodEnd: START + 30 * DAY_SECONDS,
    })
    expect(result.plan.budgets[1]).toMatchObject({
      scope: 'milestone',
      phaseIndex: 0,
      hours: 120,
    })
  })

  it('drops budgets when budgets are excluded', () => {
    const definition = baseDefinition()
    definition.workItems = []
    definition.budgetDefaults = [{ scope: 'project', amountMinor: 100 }]
    const result = planMaterialization(
      definition,
      {
        startDate: START,
        includeWorkItems: true,
        includeDependencies: true,
        includeBudgets: false,
      },
      catalogs,
    )
    if (result.status !== 'ok') throw new Error('expected ok')
    expect(result.plan.budgets).toHaveLength(0)
  })
})
