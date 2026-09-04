export type WorkStructurePreset = {
  key: 'software-development' | 'business-operations' | 'general'
  name: string
  workItemTypes: Array<{
    key: string
    name: string
    iconKey: string
    color: string
    hierarchyLevel: number
    isDefault: boolean
    position: number
  }>
  workflowStates: Array<{
    key: string
    name: string
    category: string
    color: string
    isDefault: boolean
    position: number
  }>
  customFields: Array<{
    key: string
    label: string
    fieldType: string
    position: number
  }>
}

const softwareDevelopment: WorkStructurePreset = {
  key: 'software-development',
  name: 'Software development',
  workItemTypes: [
    {
      key: 'subtask',
      name: 'Subtask',
      iconKey: 'list-tree',
      color: '#6b7280',
      hierarchyLevel: 0,
      isDefault: false,
      position: 0,
    },
    {
      key: 'task',
      name: 'Task',
      iconKey: 'check-square',
      color: '#2563eb',
      hierarchyLevel: 1,
      isDefault: true,
      position: 1,
    },
    {
      key: 'bug',
      name: 'Bug',
      iconKey: 'bug',
      color: '#dc2626',
      hierarchyLevel: 1,
      isDefault: false,
      position: 2,
    },
    {
      key: 'epic',
      name: 'Epic',
      iconKey: 'layers',
      color: '#7c3aed',
      hierarchyLevel: 2,
      isDefault: false,
      position: 3,
    },
  ],
  workflowStates: [
    {
      key: 'backlog',
      name: 'Backlog',
      category: 'backlog',
      color: '#6b7280',
      isDefault: false,
      position: 0,
    },
    {
      key: 'todo',
      name: 'To do',
      category: 'unstarted',
      color: '#64748b',
      isDefault: true,
      position: 1,
    },
    {
      key: 'in-progress',
      name: 'In progress',
      category: 'started',
      color: '#2563eb',
      isDefault: false,
      position: 2,
    },
    {
      key: 'in-review',
      name: 'In review',
      category: 'started',
      color: '#d97706',
      isDefault: false,
      position: 3,
    },
    {
      key: 'done',
      name: 'Done',
      category: 'completed',
      color: '#16a34a',
      isDefault: false,
      position: 4,
    },
    {
      key: 'canceled',
      name: 'Canceled',
      category: 'canceled',
      color: '#6b7280',
      isDefault: false,
      position: 5,
    },
  ],
  customFields: [],
}

const businessOperations: WorkStructurePreset = {
  ...softwareDevelopment,
  key: 'business-operations',
  name: 'Business operations',
  workItemTypes: [
    {
      key: 'task',
      name: 'Task',
      iconKey: 'check-square',
      color: '#2563eb',
      hierarchyLevel: 1,
      isDefault: true,
      position: 0,
    },
    {
      key: 'initiative',
      name: 'Initiative',
      iconKey: 'layers',
      color: '#7c3aed',
      hierarchyLevel: 2,
      isDefault: false,
      position: 1,
    },
  ],
  workflowStates: [
    {
      key: 'backlog',
      name: 'Backlog',
      category: 'backlog',
      color: '#6b7280',
      isDefault: false,
      position: 0,
    },
    {
      key: 'todo',
      name: 'Not started',
      category: 'unstarted',
      color: '#64748b',
      isDefault: true,
      position: 1,
    },
    {
      key: 'in-progress',
      name: 'In progress',
      category: 'started',
      color: '#2563eb',
      isDefault: false,
      position: 2,
    },
    {
      key: 'done',
      name: 'Complete',
      category: 'completed',
      color: '#16a34a',
      isDefault: false,
      position: 3,
    },
    {
      key: 'canceled',
      name: 'Canceled',
      category: 'canceled',
      color: '#6b7280',
      isDefault: false,
      position: 4,
    },
  ],
  customFields: [],
}

const general: WorkStructurePreset = {
  ...businessOperations,
  key: 'general',
  name: 'General',
}

export const workStructurePresets = [
  softwareDevelopment,
  businessOperations,
  general,
] as const

export function getWorkStructurePreset(
  key: string
): WorkStructurePreset | null {
  return workStructurePresets.find((preset) => preset.key === key) ?? null
}
