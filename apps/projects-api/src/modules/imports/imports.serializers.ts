import { fromDbUnixSeconds } from '../../platform/timestamps.js'

export type ImportJobRow = {
  id: string
  tenantId: string
  source: string
  projectId: string | null
  status: string
  rowCount: number
  successCount: number
  failureCount: number
  contentHash: string
  bundle: unknown
  preview: unknown
  unmappedFields: unknown
  createdAt: bigint | number
  updatedAt: bigint | number
}

export type PreviewRow = {
  rowIndex: number
  kind: string
  title: string
  valid: boolean
  errors: string[]
}

export type SerializedImportJob = {
  object: 'projects.import-job'
  id: string
  tenantId: string
  source: string
  projectId: string | null
  status: string
  rowCount: number
  successCount: number
  failureCount: number
  contentHash: string
  unmappedFields: string[]
  preview: PreviewRow[]
  notes: string[]
  createdAt: number
  updatedAt: number
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string')
    : []
}

function asPreview(value: unknown): { rows: PreviewRow[]; notes: string[] } {
  if (typeof value !== 'object' || value === null)
    return { rows: [], notes: [] }
  const record = value as Record<string, unknown>
  const rows = Array.isArray(record.rows)
    ? (record.rows as PreviewRow[])
    : []
  const notes = asStringArray(record.notes)
  return { rows, notes }
}

export function serializeImportJob(row: ImportJobRow): SerializedImportJob {
  const preview = asPreview(row.preview)
  return {
    object: 'projects.import-job',
    id: row.id,
    tenantId: row.tenantId,
    source: row.source,
    projectId: row.projectId,
    status: row.status,
    rowCount: row.rowCount,
    successCount: row.successCount,
    failureCount: row.failureCount,
    contentHash: row.contentHash,
    unmappedFields: asStringArray(row.unmappedFields),
    preview: preview.rows,
    notes: preview.notes,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export type ImportJobRowRow = {
  id: string
  tenantId: string
  jobId: string
  rowIndex: number
  kind: string
  status: string
  externalRef: string | null
  createdId: string | null
  error: unknown
  createdAt: bigint | number
  updatedAt: bigint | number
}

export type SerializedImportJobRow = {
  object: 'projects.import-job-row'
  id: string
  jobId: string
  rowIndex: number
  kind: string
  status: string
  externalRef: string | null
  createdId: string | null
  error: { code: string; message: string } | null
  createdAt: number
  updatedAt: number
}

export function serializeImportJobRow(
  row: ImportJobRowRow
): SerializedImportJobRow {
  const error =
    typeof row.error === 'object' && row.error !== null
      ? (row.error as { code: string; message: string })
      : null
  return {
    object: 'projects.import-job-row',
    id: row.id,
    jobId: row.jobId,
    rowIndex: row.rowIndex,
    kind: row.kind,
    status: row.status,
    externalRef: row.externalRef,
    createdId: row.createdId,
    error,
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}
