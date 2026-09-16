import type {
  ImportRowError,
  ImportRowInput,
  MapperResult,
} from '../import.types.js'
import { normalizePriority, normalizeStatus, splitList } from './normalize.js'

// Vendor reference: Jira Cloud REST v3 issue payloads.
// https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/
type JsonRecord = Record<string, unknown>

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === 'object' && value !== null
    ? (value as JsonRecord)
    : null
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function adfToText(node: unknown): string {
  if (typeof node === 'string') return node
  const record = asRecord(node)
  if (!record) return ''
  if (typeof record.text === 'string') return record.text
  const content = record.content
  if (!Array.isArray(content)) return ''
  return content
    .map((child) => adfToText(child))
    .filter((part) => part !== '')
    .join('\n')
}

function collectFields(input: JsonRecord): string[] {
  const out = new Set<string>()
  const visit = (value: unknown, prefix: string) => {
    const record = asRecord(value)
    if (!record) return
    for (const key of Object.keys(record)) {
      const path = prefix === '' ? key : `${prefix}.${key}`
      out.add(path)
      if (path.split('.').length < 3) visit(record[key], path)
    }
  }
  visit(input, '')
  return [...out]
}

const KNOWN_PATHS = new Set([
  'key',
  'id',
  'fields',
  'fields.summary',
  'fields.description',
  'fields.issuetype',
  'fields.issuetype.name',
  'fields.status',
  'fields.status.name',
  'fields.priority',
  'fields.priority.name',
  'fields.assignee',
  'fields.assignee.accountId',
  'fields.duedate',
  'fields.labels',
  'fields.project',
  'fields.project.key',
  'fields.parent',
  'fields.parent.key',
])

export function mapJiraJson(text: string): MapperResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(text) as unknown
  } catch {
    return {
      bundle: { rows: [] },
      rowErrors: [{ rowIndex: 0, message: 'Payload is not valid JSON.' }],
      unmappedFields: [],
      notes: [],
    }
  }
  const root = asRecord(parsed)
  const candidates: unknown[] = root && Array.isArray(root.issues)
    ? (root.issues as unknown[])
    : Array.isArray(parsed)
      ? (parsed as unknown[])
      : [parsed]
  const rows: ImportRowInput[] = []
  const rowErrors: ImportRowError[] = []
  const unmapped = new Set<string>()
  const notes: string[] = [
    'Jira rich-text descriptions arrive as Atlassian Document Format and are flattened to plain text.',
  ]
  candidates.forEach((candidate, rowIndex) => {
    const issue = asRecord(candidate)
    if (!issue) {
      rowErrors.push({ rowIndex, message: 'Issue entry is not an object.' })
      return
    }
    for (const path of collectFields(issue))
      if (!KNOWN_PATHS.has(path)) unmapped.add(path)
    const fields = asRecord(issue.fields) ?? {}
    const title = asString(fields.summary)
    if (title === '') {
      rowErrors.push({ rowIndex, message: 'fields.summary is required.' })
      return
    }
    const statusName = asString(asRecord(fields.status)?.name)
    const priorityName = asString(asRecord(fields.priority)?.name)
    const priority =
      priorityName === '' ? null : normalizePriority(priorityName)
    if (priorityName !== '' && priority === null)
      notes.push(`Row ${rowIndex}: Jira priority '${priorityName}' is not recognized and was dropped.`)
    const typeName = asString(asRecord(fields.issuetype)?.name)
    const projectKey = asString(asRecord(fields.project)?.key)
    const labels = Array.isArray(fields.labels)
      ? (fields.labels as unknown[]).map((label) => String(label))
      : []
    rows.push({
      kind: 'work-item',
      workItem: {
        title,
        description: fields.description === undefined || fields.description === null
          ? null
          : adfToText(fields.description) || null,
        status: statusName === '' ? null : normalizeStatus(statusName),
        priority,
        typeKey:
          typeName === ''
            ? null
            : typeName.toLowerCase().replaceAll(/[\s_]+/g, '-'),
        projectKey: projectKey === '' ? null : projectKey,
        dueDate:
          typeof fields.duedate === 'string' && fields.duedate !== ''
            ? Math.floor(Date.parse(fields.duedate) / 1000)
            : null,
        labels: labels.length > 0 ? labels.flatMap((label) => splitList(label)) : null,
        externalRef: asString(issue.key) || asString(issue.id) || null,
      },
    })
  })
  return {
    bundle: { rows },
    rowErrors,
    unmappedFields: [...unmapped].sort(),
    notes,
  }
}
