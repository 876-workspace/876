export type ImportWorkItem = {
  title: string
  description?: string | null
  status?: string | null
  priority?: 'none' | 'low' | 'medium' | 'high' | 'urgent' | null
  typeKey?: string | null
  assigneeUserId?: string | null
  projectId?: string | null
  projectKey?: string | null
  milestoneId?: string | null
  estimate?: number | null
  dueDate?: number | null
  labels?: string[] | null
  externalRef?: string | null
}

export type ImportTimeEntry = {
  userId: string
  projectId?: string | null
  projectKey?: string | null
  issueRef?: string | null
  startedAt?: number | null
  endedAt?: number | null
  durationMinutes?: number | null
  billable?: boolean | null
  note?: string | null
  externalRef?: string | null
}

export type ImportRowInput =
  | { kind: 'work-item'; workItem: ImportWorkItem }
  | { kind: 'time-entry'; timeEntry: ImportTimeEntry }

export type ImportBundle = {
  rows: ImportRowInput[]
}

export type ImportRowError = {
  rowIndex: number
  message: string
}

export type MapperResult = {
  bundle: ImportBundle
  rowErrors: ImportRowError[]
  unmappedFields: string[]
  notes: string[]
}

export const IMPORT_SOURCES = [
  'csv',
  'jira-csv',
  'jira-json',
  'trello-json',
  'asana-csv',
  'zoho-csv',
] as const

export type ImportSource = (typeof IMPORT_SOURCES)[number]
