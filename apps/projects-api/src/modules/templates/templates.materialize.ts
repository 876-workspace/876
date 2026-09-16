import { DAY_SECONDS } from './templates.schemas.js'
import type { TemplateDefinition } from './templates.schemas.js'

export type MaterializeOptions = {
  startDate: number
  includeWorkItems: boolean
  includeDependencies: boolean
  includeBudgets: boolean
}

export type MaterializeCatalogs = {
  workItemTypes: Map<string, { id: string; hierarchyLevel: number }>
  workflowStates: Map<string, { id: string; category: string }>
  labels: Map<string, string>
}

export type MissingReferences = {
  workItemTypes: string[]
  workflowStates: string[]
  labels: string[]
}

export type PlannedPhase = {
  ref: string
  key: string
  name: string
  description: string | null
  start: number | null
  end: number | null
  position: number
}

export type PlannedTaskList = {
  ref: string
  name: string
  description: string | null
  phaseIndex: number | null
  start: number | null
  end: number | null
  position: number
}

export type PlannedWorkItem = {
  ref: string
  title: string
  description: string | null
  typeKey: string
  workItemTypeId: string
  stateKey: string
  workflowStateId: string
  statusCategory: string
  priority: string
  estimate: number | null
  labelIds: string[]
  phaseIndex: number | null
  taskListIndex: number | null
  parentPlanIndex: number | null
  plannedStart: number | null
  plannedFinish: number | null
  plannedDurationMinutes: number | null
  dueDate: number | null
  position: number
}

export type PlannedDependency = {
  fromPlanIndex: number
  toPlanIndex: number
  type: string
  lagMinutes: number
}

export type PlannedBudget = {
  scope: string
  phaseIndex: number | null
  amountMinor: number | null
  hours: number | null
  thresholdPercent: number
  periodStart: number | null
  periodEnd: number | null
}

export type PlannedCustomField = {
  key: string
  label: string
  fieldType: string
  options: Array<{ key: string; label: string }>
  required: boolean
  description: string | null
  workItemTypeIds: string[]
}

export type MaterializePlan = {
  startDate: number
  phases: PlannedPhase[]
  taskLists: PlannedTaskList[]
  workItems: PlannedWorkItem[]
  dependencies: PlannedDependency[]
  budgets: PlannedBudget[]
  customFields: PlannedCustomField[]
}

export type MaterializeResult =
  | { status: 'ok'; plan: MaterializePlan; missing: MissingReferences }
  | { status: 'dependency-cycle'; cycle: string[] }
  | { status: 'invalid-refs'; message: string }

function emptyMissing(): MissingReferences {
  return { workItemTypes: [], workflowStates: [], labels: [] }
}

function collectMissing(missing: MissingReferences): MissingReferences {
  return {
    workItemTypes: [...new Set(missing.workItemTypes)].sort(),
    workflowStates: [...new Set(missing.workflowStates)].sort(),
    labels: [...new Set(missing.labels)].sort(),
  }
}

export function addDays(startDate: number, days: number): number {
  return startDate + days * DAY_SECONDS
}

function absoluteAt(
  startDate: number,
  offsetDays: number | undefined,
): number | null {
  return offsetDays === undefined ? null : addDays(startDate, offsetDays)
}

function spanEnd(
  start: number | null,
  durationDays: number | null | undefined,
): number | null {
  if (start === null || durationDays === null || durationDays === undefined)
    return null
  return addDays(start, durationDays)
}

function findDependencyCycle(edges: Array<[number, number]>): number[] | null {
  const adjacency = new Map<number, number[]>()
  for (const [from, to] of edges) {
    const targets = adjacency.get(from) ?? []
    targets.push(to)
    adjacency.set(from, targets)
  }
  const visiting = new Set<number>()
  const visited = new Set<number>()
  const stack: number[] = []

  function visit(node: number): number[] | null {
    if (visiting.has(node)) return [...stack.slice(stack.indexOf(node)), node]
    if (visited.has(node)) return null
    visiting.add(node)
    stack.push(node)
    for (const next of adjacency.get(node) ?? []) {
      const cycle = visit(next)
      if (cycle) return cycle
    }
    stack.pop()
    visiting.delete(node)
    visited.add(node)
    return null
  }

  for (const node of adjacency.keys()) {
    const cycle = visit(node)
    if (cycle) return cycle
  }
  return null
}

/** Orders work-item indexes so parents are created before their children. */
export function orderParentsBeforeChildren(
  parentByIndex: Map<number, number | null>,
): number[] | null {
  const ordered: number[] = []
  const visiting = new Set<number>()
  const visited = new Set<number>()

  function visit(index: number): boolean {
    if (visited.has(index)) return true
    if (visiting.has(index)) return false
    visiting.add(index)
    const parent = parentByIndex.get(index)
    if (parent !== undefined && parent !== null) {
      if (!visit(parent)) return false
    }
    visiting.delete(index)
    visited.add(index)
    ordered.push(index)
    return true
  }

  for (const index of parentByIndex.keys()) {
    if (!visit(index)) return null
  }
  return ordered
}

/**
 * Pure planning step for template instantiation and cloning: resolves local
 * refs to creation order and relative days to absolute Unix seconds.
 *
 * Missing catalog keys never throw. They are collected alongside a
 * best-effort partial plan so preview can report them while instantiate
 * fails before any row is written.
 */
export function planMaterialization(
  definition: TemplateDefinition,
  options: MaterializeOptions,
  catalogs: MaterializeCatalogs,
): MaterializeResult {
  const phases = definition.phases ?? []
  const taskLists = definition.taskLists ?? []
  const items = options.includeWorkItems ? (definition.workItems ?? []) : []
  const links = options.includeWorkItems && options.includeDependencies
    ? (definition.dependencies ?? [])
    : []

  const phaseIndexByRef = new Map<string, number>()
  const phaseKeys = new Set<string>()
  for (let index = 0; index < phases.length; index += 1) {
    const ref = phases[index]?.ref as string
    if (phaseIndexByRef.has(ref)) {
      return { status: 'invalid-refs', message: `Duplicate phase ref: ${ref}` }
    }
    phaseIndexByRef.set(ref, index)
    const key = phases[index]?.key as string
    if (phaseKeys.has(key)) {
      return { status: 'invalid-refs', message: `Duplicate phase key: ${key}` }
    }
    phaseKeys.add(key)
  }

  const taskListIndexByRef = new Map<string, number>()
  for (let index = 0; index < taskLists.length; index += 1) {
    const ref = taskLists[index]?.ref as string
    if (taskListIndexByRef.has(ref)) {
      return {
        status: 'invalid-refs',
        message: `Duplicate task list ref: ${ref}`,
      }
    }
    taskListIndexByRef.set(ref, index)
  }

  const itemIndexByRef = new Map<string, number>()
  for (let index = 0; index < items.length; index += 1) {
    const ref = items[index]?.ref as string
    if (itemIndexByRef.has(ref)) {
      return {
        status: 'invalid-refs',
        message: `Duplicate work item ref: ${ref}`,
      }
    }
    itemIndexByRef.set(ref, index)
  }

  const plannedPhases: PlannedPhase[] = phases.map((phase, index) => {
    const start = absoluteAt(options.startDate, phase.startOffsetDays)
    return {
      ref: phase.ref,
      key: phase.key,
      name: phase.name,
      description: phase.description ?? null,
      start,
      end: spanEnd(start, phase.durationDays),
      position: phase.position ?? index,
    }
  })

  for (const list of taskLists) {
    if (
      list.phaseRef !== undefined &&
      list.phaseRef !== null &&
      !phaseIndexByRef.has(list.phaseRef)
    ) {
      return {
        status: 'invalid-refs',
        message: `Unknown phase ref: ${list.phaseRef}`,
      }
    }
  }

  const plannedTaskLists: PlannedTaskList[] = taskLists.map((list, index) => {
    const phaseIndex =
      list.phaseRef === undefined || list.phaseRef === null
        ? null
        : (phaseIndexByRef.get(list.phaseRef) as number)
    const start = absoluteAt(options.startDate, list.startOffsetDays)
    return {
      ref: list.ref,
      name: list.name,
      description: list.description ?? null,
      phaseIndex,
      start,
      end: spanEnd(start, list.durationDays),
      position: list.position ?? index,
    }
  })

  const missing = emptyMissing()
  const parentPlanIndex = new Map<number, number | null>()
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index] as (typeof items)[number]
    if (item.phaseRef !== undefined && item.phaseRef !== null) {
      if (!phaseIndexByRef.has(item.phaseRef)) {
        return {
          status: 'invalid-refs',
          message: `Unknown phase ref: ${item.phaseRef}`,
        }
      }
    }
    if (item.taskListRef !== undefined && item.taskListRef !== null) {
      if (!taskListIndexByRef.has(item.taskListRef)) {
        return {
          status: 'invalid-refs',
          message: `Unknown task list ref: ${item.taskListRef}`,
        }
      }
    }
    if (item.parentRef !== undefined && item.parentRef !== null) {
      const parentIndex = itemIndexByRef.get(item.parentRef)
      if (parentIndex === undefined) {
        return {
          status: 'invalid-refs',
          message: `Unknown parent ref: ${item.parentRef}`,
        }
      }
      if (parentIndex === index) {
        return {
          status: 'invalid-refs',
          message: `Work item cannot be its own parent: ${item.ref}`,
        }
      }
      parentPlanIndex.set(index, parentIndex)
    } else {
      parentPlanIndex.set(index, null)
    }
    if (!catalogs.workItemTypes.has(item.typeKey)) {
      missing.workItemTypes.push(item.typeKey)
    }
    if (!catalogs.workflowStates.has(item.stateKey)) {
      missing.workflowStates.push(item.stateKey)
    }
    for (const label of item.labels ?? []) {
      if (!catalogs.labels.has(label)) missing.labels.push(label)
    }
  }

  const orderedIndexes = orderParentsBeforeChildren(parentPlanIndex)
  if (orderedIndexes === null) {
    return { status: 'invalid-refs', message: 'Work item parents form a cycle' }
  }

  // Only resolvable items enter the plan. Instantiate refuses to write
  // while anything is missing, so partial plans only ever reach preview.
  const resolvableIndexes = orderedIndexes.filter((itemIndex) => {
    const item = items[itemIndex] as (typeof items)[number]
    return (
      catalogs.workItemTypes.has(item.typeKey) &&
      catalogs.workflowStates.has(item.stateKey)
    )
  })
  const planIndexByItemIndex = new Map<number, number>()
  resolvableIndexes.forEach((itemIndex, planIndex) => {
    planIndexByItemIndex.set(itemIndex, planIndex)
  })

  const plannedWorkItems: PlannedWorkItem[] = []
  for (const itemIndex of resolvableIndexes) {
    const item = items[itemIndex] as (typeof items)[number]
    const workItemType = catalogs.workItemTypes.get(item.typeKey) as {
      id: string
      hierarchyLevel: number
    }
    const workflowState = catalogs.workflowStates.get(item.stateKey) as {
      id: string
      category: string
    }
    const parentIndex = parentPlanIndex.get(itemIndex) ?? null
    if (parentIndex !== null && planIndexByItemIndex.has(parentIndex)) {
      const parentType = catalogs.workItemTypes.get(
        (items[parentIndex] as (typeof items)[number]).typeKey,
      )
      const childLevel = workItemType.hierarchyLevel
      const parentLevel = parentType?.hierarchyLevel ?? childLevel
      if (!(childLevel < parentLevel)) {
        return {
          status: 'invalid-refs',
          message:
            `Work item ${item.ref} cannot nest under ${items[parentIndex]?.ref}: ` +
            'child hierarchy must be below its parent',
        }
      }
    }
    const plannedStart = absoluteAt(options.startDate, item.startOffsetDays)
    const dueDate = absoluteAt(options.startDate, item.dueOffsetDays)
    const plannedDurationMinutes =
      item.durationDays === undefined || item.durationDays === null
        ? null
        : item.durationDays * 1440
    plannedWorkItems.push({
      ref: item.ref,
      title: item.title,
      description: item.description ?? null,
      typeKey: item.typeKey,
      workItemTypeId: workItemType.id,
      stateKey: item.stateKey,
      workflowStateId: workflowState.id,
      statusCategory: workflowState.category,
      priority: item.priority ?? 'none',
      estimate: item.estimate ?? null,
      labelIds: (item.labels ?? []).map(
        (label) => catalogs.labels.get(label) as string,
      ),
      phaseIndex:
        item.phaseRef === undefined || item.phaseRef === null
          ? null
          : (phaseIndexByRef.get(item.phaseRef) as number),
      taskListIndex:
        item.taskListRef === undefined || item.taskListRef === null
          ? null
          : (taskListIndexByRef.get(item.taskListRef) as number),
      parentPlanIndex:
        parentIndex === null
          ? null
          : (planIndexByItemIndex.get(parentIndex) ?? null),
      plannedStart,
      plannedFinish: spanEnd(plannedStart, item.durationDays),
      plannedDurationMinutes,
      dueDate,
      position: itemIndex,
    })
  }

  const plannedDependencies: PlannedDependency[] = []
  const seenPairs = new Set<string>()
  for (const link of links) {
    const fromItemIndex = itemIndexByRef.get(link.fromRef)
    const toItemIndex = itemIndexByRef.get(link.toRef)
    if (fromItemIndex === undefined || toItemIndex === undefined) {
      return {
        status: 'invalid-refs',
        message: `Unknown dependency ref: ${link.fromRef} -> ${link.toRef}`,
      }
    }
    if (fromItemIndex === toItemIndex) {
      return {
        status: 'invalid-refs',
        message: `Dependency cannot link a work item to itself: ${link.fromRef}`,
      }
    }
    const fromPlanIndex = planIndexByItemIndex.get(fromItemIndex)
    const toPlanIndex = planIndexByItemIndex.get(toItemIndex)
    // Endpoints skipped for missing catalog keys cannot materialize, and
    // instantiate refuses to write while anything is missing, so preview
    // simply leaves those edges out of the partial plan.
    if (fromPlanIndex === undefined || toPlanIndex === undefined) continue
    const pair = `${fromPlanIndex}->${toPlanIndex}`
    if (seenPairs.has(pair)) {
      return {
        status: 'invalid-refs',
        message: `Duplicate dependency: ${link.fromRef} -> ${link.toRef}`,
      }
    }
    seenPairs.add(pair)
    plannedDependencies.push({
      fromPlanIndex,
      toPlanIndex,
      type: link.type ?? 'finish-to-start',
      lagMinutes: (link.lagDays ?? 0) * 1440,
    })
  }

  const cycle = findDependencyCycle(
    plannedDependencies.map((link) => [link.fromPlanIndex, link.toPlanIndex]),
  )
  if (cycle !== null) {
    return {
      status: 'dependency-cycle',
      cycle: cycle.map(
        (planIndex) => plannedWorkItems[planIndex]?.ref ?? `#${planIndex}`,
      ),
    }
  }

  const plannedBudgets: PlannedBudget[] = []
  if (options.includeBudgets) {
    for (const budget of definition.budgetDefaults ?? []) {
      let phaseIndex: number | null = null
      if (budget.scope === 'milestone') {
        if (budget.phaseRef === undefined || budget.phaseRef === null) {
          return {
            status: 'invalid-refs',
            message: 'Milestone budget is missing its phase ref',
          }
        }
        const resolved = phaseIndexByRef.get(budget.phaseRef)
        if (resolved === undefined) {
          return {
            status: 'invalid-refs',
            message: `Unknown phase ref: ${budget.phaseRef}`,
          }
        }
        phaseIndex = resolved
      }
      plannedBudgets.push({
        scope: budget.scope,
        phaseIndex,
        amountMinor: budget.amountMinor ?? null,
        hours: budget.hours ?? null,
        thresholdPercent: budget.thresholdPercent ?? 80,
        periodStart: absoluteAt(
          options.startDate,
          budget.periodStartOffsetDays ?? undefined,
        ),
        periodEnd: absoluteAt(
          options.startDate,
          budget.periodEndOffsetDays ?? undefined,
        ),
      })
    }
  }

  for (const field of definition.customFieldDefinitions ?? []) {
    for (const typeKey of field.typeKeys ?? []) {
      if (!catalogs.workItemTypes.has(typeKey)) {
        missing.workItemTypes.push(typeKey)
      }
    }
  }

  const plannedCustomFields: PlannedCustomField[] = (
    definition.customFieldDefinitions ?? []
  ).map((field) => ({
    key: field.key,
    label: field.label,
    fieldType: field.fieldType,
    options: field.options ?? [],
    required: field.required ?? false,
    description: field.description ?? null,
    workItemTypeIds: (field.typeKeys ?? []).map(
      (typeKey) => catalogs.workItemTypes.get(typeKey)?.id ?? typeKey,
    ),
  }))

  const plan: MaterializePlan = {
    startDate: options.startDate,
    phases: plannedPhases,
    taskLists: plannedTaskLists,
    workItems: plannedWorkItems,
    dependencies: plannedDependencies,
    budgets: plannedBudgets,
    customFields: plannedCustomFields,
  }
  return { status: 'ok', plan, missing: collectMissing(missing) }
}

