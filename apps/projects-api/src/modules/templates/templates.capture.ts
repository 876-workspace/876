import { nowUnixSeconds } from '../../platform/timestamps.js'
import { DAY_SECONDS } from './templates.schemas.js'
import type {
  TemplateBudgetDefault,
  TemplateCustomFieldDefinition,
  TemplateDefinition,
  TemplateDependency,
  TemplateProjectSettings,
  TemplateWorkItem,
} from './templates.schemas.js'

export type CaptureProjectInput = {
  description: string | null
  status: string
  health: string
  startDate: number | null
  targetDate: number | null
  billingMethod?: string | null
  billingCurrency?: string | null
  billingFixedFeeAmount?: number | null
}

export type CapturePhaseInput = {
  id: string
  key: string
  name: string
  description: string | null
  startDate: number | null
  targetDate: number | null
  position: number
}

export type CaptureTaskListInput = {
  id: string
  milestoneId: string | null
  name: string
  description: string | null
  startDate: number | null
  targetDate: number | null
  position: number
}

export type CaptureIssueInput = {
  id: string
  identifier: string
  title: string
  description: string | null
  stateKey: string
  typeKey: string
  priority: string
  estimate: number | null
  labelNames: string[]
  milestoneId: string | null
  taskListId: string | null
  parentIssueId: string | null
  plannedStartDate: number | null
  plannedFinishDate: number | null
  plannedDurationMinutes: number | null
  dueDate: number | null
  customFieldKeys: string[]
}

export type CaptureDependencyInput = {
  predecessorIssueId: string
  successorIssueId: string
  type: string
  lagMinutes: number
}

export type CaptureBudgetInput = {
  scope: string
  milestoneId: string | null
  amountMinor: number | null
  hours: number | null
  thresholdPercent: number
  periodStart: number | null
  periodEnd: number | null
}

export type CaptureCustomFieldInput = {
  key: string
  label: string
  fieldType: string
  options: Array<{ key: string; label: string }>
  required: boolean
  description: string | null
  typeKeys: string[]
}

export type CaptureInputs = {
  project: CaptureProjectInput
  phases: CapturePhaseInput[]
  taskLists: CaptureTaskListInput[]
  issues: CaptureIssueInput[]
  dependencies: CaptureDependencyInput[]
  budgets: CaptureBudgetInput[]
  customFields: CaptureCustomFieldInput[]
  now?: number
}

export function offsetDays(anchor: number, timestamp: number): number {
  return Math.round((timestamp - anchor) / DAY_SECONDS)
}

function spanDays(
  anchor: number,
  start: number | null,
  end: number | null,
): number | undefined {
  if (start === null || end === null) return undefined
  return Math.max(0, offsetDays(anchor, end) - offsetDays(anchor, start))
}

export function anchorStartFor(
  project: CaptureProjectInput,
  phases: CapturePhaseInput[],
  taskLists: CaptureTaskListInput[],
  issues: CaptureIssueInput[],
  budgets: CaptureBudgetInput[],
  now?: number,
): number {
  if (project.startDate !== null) return project.startDate
  const candidates: number[] = []
  for (const phase of phases) {
    if (phase.startDate !== null) candidates.push(phase.startDate)
  }
  for (const list of taskLists) {
    if (list.startDate !== null) candidates.push(list.startDate)
  }
  for (const issue of issues) {
    if (issue.plannedStartDate !== null)
      candidates.push(issue.plannedStartDate)
    if (issue.dueDate !== null) candidates.push(issue.dueDate)
  }
  for (const budget of budgets) {
    if (budget.periodStart !== null) candidates.push(budget.periodStart)
  }
  if (candidates.length === 0) return now ?? nowUnixSeconds()
  return Math.min(...candidates)
}

function toProjectSettings(
  project: CaptureProjectInput,
): TemplateProjectSettings {
  return {
    description: project.description,
    status: project.status as TemplateProjectSettings['status'],
    health: project.health as TemplateProjectSettings['health'],
    billingMethod:
      project.billingMethod as TemplateProjectSettings['billingMethod'],
    currency: project.billingCurrency ?? undefined,
    fixedFeeAmount: project.billingFixedFeeAmount ?? undefined,
  }
}

/**
 * Builds a versioned template definition from live project rows.
 *
 * The capture inputs carry no user ids, comments, attachments, or time
 * entries by construction, so none of them can leak into the definition.
 * Cross-project dependencies and user-scoped budgets reference rows outside
 * the captured project and are left out for the same reason.
 */
export function captureDefinition(inputs: CaptureInputs): TemplateDefinition {
  const anchor = anchorStartFor(
    inputs.project,
    inputs.phases,
    inputs.taskLists,
    inputs.issues,
    inputs.budgets,
    inputs.now,
  )

  const orderedPhases = [...inputs.phases].sort(
    (a, b) => a.position - b.position || (a.key < b.key ? -1 : 1),
  )
  const phaseRefById = new Map<string, string>()
  const phases = orderedPhases.map((phase) => {
    const ref = `phase-${phase.key}`
    phaseRefById.set(phase.id, ref)
    return {
      ref,
      key: phase.key,
      name: phase.name,
      description: phase.description,
      startOffsetDays:
        phase.startDate === null
          ? undefined
          : offsetDays(anchor, phase.startDate),
      durationDays: spanDays(anchor, phase.startDate, phase.targetDate),
      position: phase.position,
    }
  })

  const orderedLists = [...inputs.taskLists].sort(
    (a, b) => a.position - b.position || (a.name < b.name ? -1 : 1),
  )
  const taskListRefById = new Map<string, string>()
  const taskLists = orderedLists.map((list, index) => {
    const ref = `task-list-${index + 1}`
    taskListRefById.set(list.id, ref)
    return {
      ref,
      name: list.name,
      description: list.description,
      phaseRef: list.milestoneId
        ? (phaseRefById.get(list.milestoneId) ?? null)
        : null,
      startOffsetDays:
        list.startDate === null
          ? undefined
          : offsetDays(anchor, list.startDate),
      durationDays: spanDays(anchor, list.startDate, list.targetDate),
      position: list.position,
    }
  })

  const orderedIssues = [...inputs.issues].sort((a, b) =>
    a.identifier < b.identifier ? -1 : a.identifier > b.identifier ? 1 : 0,
  )
  const itemRefById = new Map<string, string>()
  orderedIssues.forEach((issue, index) => {
    itemRefById.set(issue.id, `work-item-${index + 1}`)
  })
  const workItems: TemplateWorkItem[] = orderedIssues.map((issue) => ({
    ref: itemRefById.get(issue.id) as string,
    title: issue.title,
    description: issue.description,
    typeKey: issue.typeKey,
    stateKey: issue.stateKey,
    priority: issue.priority as TemplateWorkItem['priority'],
    estimate: issue.estimate,
    labels: [...issue.labelNames].sort(),
    phaseRef: issue.milestoneId
      ? (phaseRefById.get(issue.milestoneId) ?? null)
      : null,
    taskListRef: issue.taskListId
      ? (taskListRefById.get(issue.taskListId) ?? null)
      : null,
    parentRef: issue.parentIssueId
      ? (itemRefById.get(issue.parentIssueId) ?? null)
      : null,
    startOffsetDays:
      issue.plannedStartDate === null
        ? undefined
        : offsetDays(anchor, issue.plannedStartDate),
    dueOffsetDays:
      issue.dueDate === null ? undefined : offsetDays(anchor, issue.dueDate),
    durationDays:
      issue.plannedDurationMinutes === null
        ? spanDays(anchor, issue.plannedStartDate, issue.plannedFinishDate)
        : Math.max(0, Math.round(issue.plannedDurationMinutes / 1440)),
  }))

  const dependencies: TemplateDependency[] = inputs.dependencies
    .filter(
      (link) =>
        itemRefById.has(link.predecessorIssueId) &&
        itemRefById.has(link.successorIssueId) &&
        link.predecessorIssueId !== link.successorIssueId,
    )
    .map((link) => ({
      fromRef: itemRefById.get(link.predecessorIssueId) as string,
      toRef: itemRefById.get(link.successorIssueId) as string,
      type: link.type as TemplateDependency['type'],
      lagDays: Math.max(0, Math.round(link.lagMinutes / 1440)),
    }))

  const usedFieldKeys = new Set<string>()
  for (const issue of inputs.issues) {
    for (const key of issue.customFieldKeys) usedFieldKeys.add(key)
  }
  const customFieldDefinitions: TemplateCustomFieldDefinition[] =
    inputs.customFields
      .filter((field) => usedFieldKeys.has(field.key))
      .map((field) => ({
        key: field.key,
        label: field.label,
        fieldType:
          field.fieldType as TemplateCustomFieldDefinition['fieldType'],
        options: field.options,
        required: field.required,
        description: field.description,
        typeKeys: field.typeKeys,
      }))

  const budgetDefaults: TemplateBudgetDefault[] = inputs.budgets
    .filter(
      (budget) => budget.scope === 'project' || budget.scope === 'milestone',
    )
    .filter((budget) =>
      budget.scope === 'project'
        ? true
        : budget.milestoneId !== null && phaseRefById.has(budget.milestoneId),
    )
    .map((budget) => ({
      scope: budget.scope as TemplateBudgetDefault['scope'],
      phaseRef:
        budget.scope === 'milestone' && budget.milestoneId !== null
          ? (phaseRefById.get(budget.milestoneId) ?? null)
          : null,
      amountMinor: budget.amountMinor,
      hours: budget.hours,
      thresholdPercent: budget.thresholdPercent,
      periodStartOffsetDays:
        budget.periodStart === null
          ? null
          : offsetDays(anchor, budget.periodStart),
      periodEndOffsetDays:
        budget.periodEnd === null ? null : offsetDays(anchor, budget.periodEnd),
    }))

  return {
    schemaVersion: 1,
    project: toProjectSettings(inputs.project),
    phases,
    taskLists,
    workItems,
    dependencies,
    customFieldDefinitions,
    budgetDefaults,
  }
}
