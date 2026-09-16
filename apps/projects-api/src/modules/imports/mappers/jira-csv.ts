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
  parseInteger,
  parseUnixDate,
  splitList,
} from './normalize.js'

// Vendor reference: Jira Cloud CSV import/export column layout.
// https://support.atlassian.com/jira-cloud/docs/import-data-from-a-csv-file/
const KNOWN = new Set([
  'summary',
  'description',
  'issuekey',
  'issueid',
  'issuetype',
  'status',
  'priority',
  'assignee',
  'reporter',
  'duedate',
  'created',
  'updated',
  'labels',
  'projectkey',
  'projectname',
  'projectid',
  'parentid',
  'estimate',
  'originalestimate',
])

const COLUMN_ALIASES: Record<string, string> = {
  'issue-key': 'issuekey',
  'issue-id': 'issueid',
  'issue-type': 'issuetype',
  'due-date': 'duedate',
  'project-key': 'projectkey',
  'project-name': 'projectname',
  'project-id': 'projectid',
  'parent-id': 'parentid',
  'original-estimate': 'originalestimate',
}

function canonical(header: string): string {
  const normalized = normalizeHeader(header)
  return COLUMN_ALIASES[normalized] ?? normalized
}

export function mapJiraCsv(text: string): MapperResult {
  const table = parseCsv(text)
  const unmappedFields = table.headers.filter(
    (header) => !KNOWN.has(canonical(header))
  )
  const rows: ImportRowInput[] = []
  const rowErrors: ImportRowError[] = []
  const notes: string[] = [
    'Jira issue keys are preserved as externalRef; the importer does not reuse Jira identifiers.',
  ]
  table.rows.forEach((sourceRow, rowIndex) => {
    const raw = rowToRecord(table.headers, sourceRow)
    const record: Record<string, string> = {}
    for (const [key, value] of Object.entries(raw)) record[canonical(key)] = value
    const title = record.summary ?? ''
    if (title === '') {
      rowErrors.push({ rowIndex, message: 'Summary is required.' })
      return
    }
    const rawPriority = record.priority ?? ''
    const priority =
      rawPriority === '' ? null : normalizePriority(rawPriority)
    if (rawPriority !== '' && priority === null)
      notes.push(`Row ${rowIndex}: Jira priority '${rawPriority}' is not recognized and was dropped.`)
    const estimateRaw = record.estimate ?? record.originalestimate ?? ''
    rows.push({
      kind: 'work-item',
      workItem: {
        title,
        description: record.description || null,
        status: record.status ? normalizeStatus(record.status) : null,
        priority,
        typeKey: record.issuetype
          ? record.issuetype.toLowerCase().replaceAll(/[\s_]+/g, '-')
          : null,
        projectKey: record.projectkey || null,
        dueDate: record.duedate ? parseUnixDate(record.duedate) : null,
        estimate: estimateRaw !== '' ? parseInteger(estimateRaw) : null,
        labels: record.labels ? splitList(record.labels) : null,
        externalRef: record.issuekey || record.issueid || null,
      },
    })
  })
  return { bundle: { rows }, rowErrors, unmappedFields, notes }
}
