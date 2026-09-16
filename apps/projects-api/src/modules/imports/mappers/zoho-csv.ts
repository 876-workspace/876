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
import {
  normalizePriority,
  normalizeStatus,
  parseUnixDate,
  splitList,
} from './normalize.js'

// Zoho Projects task-export layout is not verified against vendor docs, so
// this mapper accepts a tolerant set of generic task headers and reports
// everything else as unmapped rather than guessing at Zoho-only columns.
const KNOWN = new Set([
  'taskname',
  'tasktitle',
  'title',
  'name',
  'summary',
  'description',
  'details',
  'status',
  'state',
  'priority',
  'owner',
  'assignee',
  'project',
  'projectname',
  'duedate',
  'deadline',
  'tags',
  'labels',
  'taskid',
  'id',
])

const COLUMN_ALIASES: Record<string, string> = {
  'task-name': 'taskname',
  'task-title': 'tasktitle',
  'due-date': 'duedate',
  'task-id': 'taskid',
  'project-name': 'projectname',
}

function canonical(header: string): string {
  const normalized = normalizeHeader(header)
  return COLUMN_ALIASES[normalized] ?? normalized
}

export function mapZohoCsv(text: string): MapperResult {
  const table = parseCsv(text)
  const unmappedFields = table.headers.filter(
    (header) => !KNOWN.has(canonical(header))
  )
  const rows: ImportRowInput[] = []
  const rowErrors: ImportRowError[] = []
  const notes: string[] = [
    'Zoho Projects export layout is unverified: generic task columns are mapped and every other column is reported as unmapped.',
    'Zoho owners export as display names, which are not 876 user ids; they are appended to the description instead of assigned.',
  ]
  table.rows.forEach((sourceRow, rowIndex) => {
    const raw = rowToRecord(table.headers, sourceRow)
    const record: Record<string, string> = {}
    for (const [key, value] of Object.entries(raw)) record[canonical(key)] = value
    const title =
      record.taskname ?? record.tasktitle ?? record.title ?? record.name ?? record.summary ?? ''
    if (title === '') {
      rowErrors.push({ rowIndex, message: 'Task name is required.' })
      return
    }
    const rawPriority = record.priority ?? ''
    const priority = rawPriority === '' ? null : normalizePriority(rawPriority)
    const owner = record.owner ?? record.assignee ?? ''
    const descriptionParts = [record.description ?? record.details ?? '']
    if (owner !== '') descriptionParts.push(`Zoho owner: ${owner}`)
    rows.push({
      kind: 'work-item',
      workItem: {
        title,
        description: descriptionParts.filter((part) => part !== '').join('\n') || null,
        status: record.status ?? record.state
          ? normalizeStatus(record.status ?? record.state ?? '')
          : null,
        priority,
        projectKey:
          record.project ?? record.projectname
            ? (record.project || record.projectname || null)
            : null,
        dueDate:
          record.duedate ?? record.deadline
            ? parseUnixDate(record.duedate ?? record.deadline ?? '')
            : null,
        labels:
          record.tags ?? record.labels
            ? splitList(record.tags ?? record.labels ?? '')
            : null,
        externalRef: record.taskid ?? record.id ?? null,
      },
    })
  })
  return { bundle: { rows }, rowErrors, unmappedFields, notes }
}
