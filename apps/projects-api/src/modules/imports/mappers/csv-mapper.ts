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
  parseBoolean,
  parseInteger,
  parseUnixDate,
  splitList,
} from './normalize.js'

const KNOWN_HEADERS = new Set([
  'title',
  'name',
  'summary',
  'subject',
  'description',
  'details',
  'notes',
  'status',
  'state',
  'priority',
  'type',
  'issuetype',
  'workitemtype',
  'assignee',
  'assigneeuserid',
  'project',
  'projectid',
  'projectkey',
  'milestone',
  'milestoneid',
  'estimate',
  'duedate',
  'due',
  'labels',
  'tags',
  'externalid',
  'externalref',
  'key',
  'id',
  'userid',
  'startedat',
  'endedat',
  'durationminutes',
  'billable',
  'note',
  'issueref',
])

function pick(record: Record<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key] ?? ''
    if (value !== '') return value
  }
  return ''
}

function cell(record: Record<string, string>, key: string): string {
  return record[key] ?? ''
}

export function mapGenericCsv(text: string): MapperResult {
  const table = parseCsv(text)
  const normalized = table.headers.map(normalizeHeader)
  const unmappedFields = table.headers.filter(
    (_, index) => !KNOWN_HEADERS.has(normalized[index] ?? '')
  )
  const rows: ImportRowInput[] = []
  const rowErrors: ImportRowError[] = []
  const notes: string[] = [
    'Rows carrying userId + startedAt are imported as time entries; all other rows become work items.',
  ]
  table.rows.forEach((row, rowIndex) => {
    const record = rowToRecord(table.headers, row)
    if (
      (record.userid ?? '') !== '' &&
      (record.startedat ?? '') !== ''
    ) {
      const startedAt = parseUnixDate(cell(record, 'startedat'))
      const endedAt = cell(record, 'endedat') !== '' ? parseUnixDate(cell(record, 'endedat')) : null
      if (startedAt === null) {
        rowErrors.push({ rowIndex, message: 'startedAt is not a valid date.' })
        return
      }
      if (cell(record, 'endedat') !== '' && endedAt === null) {
        rowErrors.push({ rowIndex, message: 'endedAt is not a valid date.' })
        return
      }
      rows.push({
        kind: 'time-entry',
        timeEntry: {
          userId: cell(record, 'userid'),
          projectId: pick(record, 'projectid') || null,
          projectKey: pick(record, 'projectkey', 'project') || null,
          issueRef: pick(record, 'issueref') || null,
          startedAt,
          endedAt,
          durationMinutes:
            cell(record, 'durationminutes') !== ''
              ? parseInteger(cell(record, 'durationminutes'))
              : null,
          billable:
            cell(record, 'billable') !== '' ? parseBoolean(cell(record, 'billable')) : null,
          note: pick(record, 'note', 'notes', 'description') || null,
          externalRef: pick(record, 'externalid', 'externalref') || null,
        },
      })
      return
    }
    const title = pick(record, 'title', 'name', 'summary', 'subject')
    if (title === '') {
      rowErrors.push({ rowIndex, message: 'title is required.' })
      return
    }
    const rawPriority = pick(record, 'priority')
    const priority =
      rawPriority === '' ? null : normalizePriority(rawPriority)
    if (rawPriority !== '' && priority === null)
      notes.push(`Row ${rowIndex}: priority '${rawPriority}' is not recognized and was dropped.`)
    const project = pick(record, 'projectid', 'projectkey', 'project')
    rows.push({
      kind: 'work-item',
      workItem: {
        title,
        description: pick(record, 'description', 'details', 'notes') || null,
        status: pick(record, 'status', 'state')
          ? normalizeStatus(pick(record, 'status', 'state'))
          : null,
        priority,
        typeKey: pick(record, 'type', 'issuetype', 'workitemtype')
          ? pick(record, 'type', 'issuetype', 'workitemtype').toLowerCase().replaceAll(/[\s_]+/g, '-')
          : null,
        assigneeUserId: pick(record, 'assignee', 'assigneeuserid') || null,
        projectId: project.startsWith('prj_') ? project : null,
        projectKey: project !== '' && !project.startsWith('prj_') ? project : null,
        milestoneId: pick(record, 'milestone', 'milestoneid') || null,
        estimate:
          cell(record, 'estimate') !== '' ? parseInteger(cell(record, 'estimate')) : null,
        dueDate:
          pick(record, 'duedate', 'due') !== ''
            ? parseUnixDate(pick(record, 'duedate', 'due'))
            : null,
        labels: pick(record, 'labels', 'tags')
          ? splitList(pick(record, 'labels', 'tags'))
          : null,
        externalRef: pick(record, 'externalid', 'externalref', 'key', 'id') || null,
      },
    })
  })
  return { bundle: { rows }, rowErrors, unmappedFields, notes }
}
