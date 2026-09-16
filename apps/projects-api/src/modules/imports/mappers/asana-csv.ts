import type {
  ImportRowInput,
  ImportRowError,
  MapperResult,
} from '../import.types.js'
import {
  normalizeHeader,
  parseCsv,
  rowToRecord,
} from './csv.js'
import { parseUnixDate, splitList } from './normalize.js'

// Vendor reference: Asana CSV exporter column layout.
// https://help.asana.com/s/article/csv-importer
const KNOWN = new Set([
  'taskid',
  'createdat',
  'completedat',
  'lastmodified',
  'name',
  'section/column',
  'section',
  'column',
  'assignee',
  'assigneeemail',
  'startdate',
  'duedate',
  'tags',
  'notes',
  'projects',
  'parenttask',
])

const COLUMN_ALIASES: Record<string, string> = {
  'task-id': 'taskid',
  'created-at': 'createdat',
  'completed-at': 'completedat',
  'last-modified': 'lastmodified',
  'sectioncolumn': 'section/column',
  'assignee-email': 'assigneeemail',
  'start-date': 'startdate',
  'due-date': 'duedate',
  'parent-task': 'parenttask',
}

function canonical(header: string): string {
  const normalized = normalizeHeader(header)
  return COLUMN_ALIASES[normalized] ?? normalized
}

export function mapAsanaCsv(text: string): MapperResult {
  const table = parseCsv(text)
  const unmappedFields = table.headers.filter(
    (header) => !KNOWN.has(canonical(header))
  )
  const rows: ImportRowInput[] = []
  const rowErrors: ImportRowError[] = []
  const notes: string[] = [
    'Asana assignees export as names or emails, which are not 876 user ids; they are appended to the description instead of assigned.',
    'Asana sections map to status only when they name a known state; otherwise rows fall back to todo.',
  ]
  table.rows.forEach((sourceRow, rowIndex) => {
    const raw = rowToRecord(table.headers, sourceRow)
    const record: Record<string, string> = {}
    for (const [key, value] of Object.entries(raw)) record[canonical(key)] = value
    const title = record.name ?? ''
    if (title === '') {
      rowErrors.push({ rowIndex, message: 'Name is required.' })
      return
    }
    const completed = (record.completedat ?? '') !== ''
    const section = (record['section/column'] ?? record.section ?? record.column ?? '')
      .trim()
      .toLowerCase()
    const status = completed
      ? 'done'
      : section === 'in progress'
        ? 'in-progress'
        : section === 'in review'
          ? 'in-review'
          : section === 'done'
            ? 'done'
            : 'todo'
    const assignee = record.assignee ?? record.assigneeemail ?? ''
    const descriptionParts = [record.notes ?? '']
    if (assignee !== '') descriptionParts.push(`Asana assignee: ${assignee}`)
    if ((record.projects ?? '') !== '')
      descriptionParts.push(`Asana projects: ${record.projects}`)
    rows.push({
      kind: 'work-item',
      workItem: {
        title,
        description: descriptionParts.filter((part) => part !== '').join('\n') || null,
        status,
        priority: null,
        labels: record.tags ? splitList(record.tags) : null,
        dueDate: record.duedate ? parseUnixDate(record.duedate) : null,
        externalRef: record.taskid || null,
      },
    })
  })
  return { bundle: { rows }, rowErrors, unmappedFields, notes }
}
