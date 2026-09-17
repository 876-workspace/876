import type {
  CustomField,
  MilestoneCustomField,
  ProjectCustomField,
} from '@876/projects/contracts'

import type { AvailableLayoutField } from '@/types/layouts'

const SYSTEM_LABELS: Record<string, string> = {
  title: 'Title',
  description: 'Description',
  state: 'Status',
  priority: 'Priority',
  assignee: 'Assignee',
  dueDate: 'Due date',
  startDate: 'Start date',
  estimate: 'Estimate',
  labels: 'Labels',
  phase: 'Phase',
  taskList: 'Task list',
}

const ENTITY_SYSTEM_KEYS: Record<string, readonly string[]> = {
  project: ['title', 'description'],
  phase: ['title', 'description', 'state', 'assignee', 'startDate', 'dueDate'],
  'work-item': [
    'title',
    'description',
    'state',
    'priority',
    'assignee',
    'dueDate',
    'startDate',
    'estimate',
    'labels',
    'phase',
    'taskList',
  ],
}

function systemFields(entity: string): AvailableLayoutField[] {
  return (ENTITY_SYSTEM_KEYS[entity] ?? []).map((fieldKey) => ({
    fieldKey,
    label: SYSTEM_LABELS[fieldKey] ?? fieldKey,
  }))
}

function customFields(
  fields: readonly { key: string; label: string }[]
): AvailableLayoutField[] {
  return fields.map((field) => ({
    fieldKey: `cf:${field.key}`,
    label: field.label,
  }))
}

export function availableLayoutFields(args: {
  projectFields: readonly ProjectCustomField[]
  phaseFields: readonly MilestoneCustomField[]
  workItemFields: readonly CustomField[]
}): Record<string, readonly AvailableLayoutField[]> {
  return {
    project: [...systemFields('project'), ...customFields(args.projectFields)],
    phase: [...systemFields('phase'), ...customFields(args.phaseFields)],
    'work-item': [
      ...systemFields('work-item'),
      ...customFields(args.workItemFields),
    ],
  }
}
