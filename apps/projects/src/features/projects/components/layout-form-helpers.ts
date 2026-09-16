import type { LayoutFieldDescriptor } from '@876/projects-ui/layouts/layout-renderer'
import type { Layout, LayoutValues } from '@876/projects/layout-rules'
import { evaluateLayoutRules } from '@876/projects/layout-rules'
import type {
  CustomField,
  MilestoneCustomField,
  ProjectCustomField,
} from '@876/projects/contracts'

export const LAYOUT_RULE_ERROR_CODES = [
  'projects/layout-required-fields',
  'projects/layout-field-disabled',
] as const

export function isLayoutRuleError(code: string | undefined): boolean {
  return (
    code === 'projects/layout-required-fields' ||
    code === 'projects/layout-field-disabled'
  )
}

type TypedCustomField = Pick<
  CustomField,
  'key' | 'label' | 'fieldType' | 'options'
>

function customFieldControl(field: TypedCustomField): LayoutFieldDescriptor['control'] {
  const options = Array.isArray(field.options)
    ? field.options.filter(
        (option): option is { key: string; label: string } =>
          typeof option === 'object' &&
          option !== null &&
          'key' in option &&
          'label' in option &&
          typeof option.key === 'string' &&
          typeof option.label === 'string'
      )
    : []
  const choices = options.map((option) => ({
    value: option.key,
    label: option.label,
  }))
  switch (field.fieldType) {
    case 'textarea':
      return { kind: 'textarea' }
    case 'number':
    case 'decimal':
      return { kind: 'number' }
    case 'boolean':
      return { kind: 'boolean' }
    case 'date':
      return { kind: 'date' }
    case 'select':
      return { kind: 'select', options: choices }
    case 'multi-select':
      return { kind: 'multi-select', options: choices }
    case 'user':
      return { kind: 'select', options: choices }
    default:
      return { kind: 'text' }
  }
}

export function customFieldDescriptor(
  field: TypedCustomField
): LayoutFieldDescriptor {
  return {
    fieldKey: `cf:${field.key}`,
    label: field.label,
    control: customFieldControl(field),
  }
}

type SelectOption = { value: string; label: string }

function selectDescriptor(
  fieldKey: string,
  label: string,
  options: readonly SelectOption[]
): LayoutFieldDescriptor {
  return {
    fieldKey,
    label,
    control: {
      kind: 'select',
      options: options.map((option) => ({ ...option })),
    },
  }
}

export function projectLayoutDescriptors(
  fields: readonly ProjectCustomField[]
): LayoutFieldDescriptor[] {
  return [
    { fieldKey: 'title', label: 'Name', control: { kind: 'text' } },
    { fieldKey: 'description', label: 'Description', control: { kind: 'textarea' } },
    ...fields.map(customFieldDescriptor),
  ]
}

export function phaseLayoutDescriptors(
  fields: readonly MilestoneCustomField[],
  members: readonly { userId: string; label: string }[]
): LayoutFieldDescriptor[] {
  return [
    { fieldKey: 'title', label: 'Name', control: { kind: 'text' } },
    { fieldKey: 'description', label: 'Description', control: { kind: 'textarea' } },
    selectDescriptor('state', 'Status', [
      { value: 'open', label: 'Open' },
      { value: 'completed', label: 'Completed' },
      { value: 'canceled', label: 'Canceled' },
    ]),
    selectDescriptor(
      'assignee',
      'Owner',
      members.map((member) => ({ value: member.userId, label: member.label }))
    ),
    { fieldKey: 'startDate', label: 'Start date', control: { kind: 'date' } },
    { fieldKey: 'dueDate', label: 'Target date', control: { kind: 'date' } },
    ...fields.map(customFieldDescriptor),
  ]
}

export function issueLayoutDescriptors(args: {
  customFields: readonly CustomField[]
  workflowStates: readonly { key: string; name: string }[]
  milestones: readonly { id: string; name: string }[]
  taskLists: readonly { id: string; name: string }[]
  labels: readonly { id: string; name: string }[]
  members: readonly { userId: string; label: string }[]
}): LayoutFieldDescriptor[] {
  return [
    { fieldKey: 'title', label: 'Title', control: { kind: 'text' } },
    {
      fieldKey: 'description',
      label: 'Description',
      control: { kind: 'textarea' },
    },
    selectDescriptor(
      'state',
      'Status',
      args.workflowStates.map((state) => ({
        value: state.key,
        label: state.name,
      }))
    ),
    selectDescriptor('priority', 'Priority', [
      { value: 'none', label: 'none' },
      { value: 'low', label: 'low' },
      { value: 'medium', label: 'medium' },
      { value: 'high', label: 'high' },
      { value: 'urgent', label: 'urgent' },
    ]),
    selectDescriptor(
      'assignee',
      'Assignee',
      args.members.map((member) => ({
        value: member.userId,
        label: member.label,
      }))
    ),
    { fieldKey: 'dueDate', label: 'Due date', control: { kind: 'date' } },
    { fieldKey: 'startDate', label: 'Planned start', control: { kind: 'date' } },
    { fieldKey: 'estimate', label: 'Estimate', control: { kind: 'number' } },
    {
      fieldKey: 'labels',
      label: 'Labels',
      control: {
        kind: 'multi-select',
        options: args.labels.map((label) => ({
          value: label.id,
          label: label.name,
        })),
      },
    },
    selectDescriptor(
      'phase',
      'Phase',
      args.milestones.map((milestone) => ({
        value: milestone.id,
        label: milestone.name,
      }))
    ),
    selectDescriptor(
      'taskList',
      'Task list',
      args.taskLists.map((taskList) => ({
        value: taskList.id,
        label: taskList.name,
      }))
    ),
    ...args.customFields.map(customFieldDescriptor),
  ]
}

export function descriptorLabel(
  descriptors: readonly LayoutFieldDescriptor[],
  fieldKey: string
): string {
  return descriptors.find((entry) => entry.fieldKey === fieldKey)?.label ?? fieldKey
}

/**
 * Reads the named inputs a `LayoutRenderer` rendered inside `form`.
 * Multi-select groups share one name, so their values are collected with
 * `getAll`; a lone `true`-valued checkbox is a boolean switch.
 */
export function readLayoutFormValues(
  form: HTMLFormElement,
  layout: Layout
): LayoutValues {
  const data = new FormData(form)
  const values: LayoutValues = {}
  for (const section of layout.sections) {
    for (const field of section.fields) {
      const all = data.getAll(field.fieldKey)
      if (all.length > 1) {
        values[field.fieldKey] = all.map((entry) => String(entry))
        continue
      }
      if (all.length === 0) {
        values[field.fieldKey] = null
        continue
      }
      const single = all[0]
      const element = form.elements.namedItem(field.fieldKey)
      if (
        element instanceof HTMLInputElement &&
        element.type === 'checkbox' &&
        element.value === 'true' &&
        all.length === 1
      ) {
        values[field.fieldKey] = element.checked ? 'true' : 'false'
        continue
      }
      const text = String(single)
      values[field.fieldKey] = text === '' ? null : text
    }
  }
  return values
}

/** Required-but-empty fields under the active rules, for the error summary. */
export function missingLayoutFields(
  layout: Layout,
  values: LayoutValues
): string[] {
  const states = evaluateLayoutRules(layout, values)
  return Object.entries(states)
    .filter(([, state]) => state.required)
    .map(([fieldKey]) => fieldKey)
    .filter((fieldKey) => {
      const value = values[fieldKey]
      return (
        value === null ||
        value === undefined ||
        value === '' ||
        (Array.isArray(value) && value.length === 0)
      )
    })
    .sort()
}

export function layoutRuleErrorTitle(code: string | undefined): string {
  if (code === 'projects/layout-field-disabled')
    return 'The active layout does not allow changing these fields.'
  return 'The active layout requires additional fields.'
}

export function customFieldInputValue(
  fieldType: string,
  value: string | string[] | null | undefined
): string | number | boolean | string[] | null {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) return value
  if (fieldType === 'boolean') return value === 'true'
  if (fieldType === 'number' || fieldType === 'decimal') {
    const parsed = Number(value)
    return Number.isNaN(parsed) ? value : parsed
  }
  return value
}

export function layoutDateInput(timestamp: number | null | undefined): string {
  if (!timestamp) return ''
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

export function layoutDateTimestamp(value: string | null | undefined): number | null {
  if (!value) return null
  const timestamp = Date.parse(`${value}T00:00:00Z`)
  return Number.isNaN(timestamp) ? null : Math.floor(timestamp / 1000)
}

function singleText(value: string | string[] | null | undefined): string | null {
  if (value === null || value === undefined) return null
  return Array.isArray(value) ? (value[0] ?? null) : value === '' ? null : value
}

export function customFieldToLayoutValue(
  fieldType: string,
  value: string | number | boolean | string[] | null | undefined
): string | string[] | null {
  if (value === null || value === undefined) return null
  if (Array.isArray(value)) return value
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (typeof value === 'number') return String(value)
  return value === '' ? null : value
}

export function issueToLayoutValues(issue?: {
  title?: string
  description?: string | null
  status?: string
  priority?: string
  assigneeUserId?: string | null
  dueDate?: number | null
  plannedStartDate?: number | null
  estimate?: number | null
  labels?: readonly { id: string }[]
  milestone?: { id: string } | null
  taskListId?: string | null
  customFields?: readonly {
    fieldId: string
    fieldKey?: string
    fieldType?: string
    value: string | number | boolean | string[] | null
  }[]
}): LayoutValues {
  if (!issue) return {}
  const values: LayoutValues = {
    title: issue.title ?? null,
    description: issue.description ?? null,
    state: issue.status ?? null,
    priority: issue.priority ?? null,
    assignee: issue.assigneeUserId ?? null,
    dueDate: layoutDateInput(issue.dueDate) || null,
    startDate: layoutDateInput(issue.plannedStartDate) || null,
    estimate:
      issue.estimate === null || issue.estimate === undefined
        ? null
        : String(issue.estimate),
    labels: (issue.labels ?? []).map((label) => label.id),
    phase: issue.milestone?.id ?? null,
    taskList: issue.taskListId ?? null,
  }
  for (const field of issue.customFields ?? []) {
    if (!field.fieldKey) continue
    values[`cf:${field.fieldKey}`] = customFieldToLayoutValue(
      field.fieldType ?? 'text',
      field.value
    )
  }
  return values
}

export function phaseToLayoutValues(phase?: {
  name?: string
  description?: string | null
  status?: string
  ownerUserId?: string | null
  startDate?: number | null
  targetDate?: number | null
  customFields?: readonly {
    fieldKey: string
    fieldType?: string
    value: string | number | boolean | string[] | null
  }[]
}): LayoutValues {
  if (!phase) return {}
  const values: LayoutValues = {
    title: phase.name ?? null,
    description: phase.description ?? null,
    state: phase.status ?? null,
    assignee: phase.ownerUserId ?? null,
    startDate: layoutDateInput(phase.startDate) || null,
    dueDate: layoutDateInput(phase.targetDate) || null,
  }
  for (const field of phase.customFields ?? []) {
    values[`cf:${field.fieldKey}`] = customFieldToLayoutValue(
      field.fieldType ?? 'text',
      field.value
    )
  }
  return values
}

export function projectToLayoutValues(project?: {
  name?: string
  description?: string | null
  customFields?: readonly {
    fieldKey: string
    fieldType?: string
    value: string | number | boolean | string[] | null
  }[]
}): LayoutValues {
  if (!project) return {}
  const values: LayoutValues = {
    title: project.name ?? null,
    description: project.description ?? null,
  }
  for (const field of project.customFields ?? []) {
    values[`cf:${field.fieldKey}`] = customFieldToLayoutValue(
      field.fieldType ?? 'text',
      field.value
    )
  }
  return values
}

export type LayoutCustomFieldRef = {
  id: string
  key: string
  fieldType: string
}

/**
 * Splits renderer values into a system body and custom-field writes.
 * `fieldByKey` maps a custom field's `key` (without the `cf:` prefix) to
 * its identity for the values API.
 */
export function splitLayoutCustomValues(
  values: LayoutValues,
  fieldByKey: Map<string, LayoutCustomFieldRef>,
  includeEmpty: boolean
): { fieldId: string; value: string | number | boolean | string[] | null }[] {
  const writes: {
    fieldId: string
    value: string | number | boolean | string[] | null
  }[] = []
  for (const [fieldKey, field] of fieldByKey) {
    const raw = values[`cf:${fieldKey}`]
    if (!includeEmpty) {
      if (
        raw === undefined ||
        raw === null ||
        raw === '' ||
        (Array.isArray(raw) && raw.length === 0)
      )
        continue
    }
    writes.push({
      fieldId: field.id,
      value: customFieldInputValue(field.fieldType, raw),
    })
  }
  return writes
}

export function layoutText(value: string | string[] | null | undefined): string {
  const single = singleText(value)
  return single ?? ''
}

export function layoutTextOrNull(
  value: string | string[] | null | undefined
): string | null {
  return singleText(value)
}
