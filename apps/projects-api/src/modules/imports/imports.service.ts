import { createHash } from 'node:crypto'

import { getError, type ProjectsError } from '../../http/errors.js'
import { generateId } from '../../platform/ids.js'
import { getLogger } from '../../platform/logger.js'
import {
  nowUnixSeconds,
  toDbUnixSeconds,
} from '../../platform/timestamps.js'
import * as issues from '../issues/index.js'
import * as tenants from '../tenants/index.js'
import * as time from '../time/index.js'
import * as repository from './imports.repository.js'
import type {
  CreateImportJobBody,
  ListImportJobsQuery,
} from './imports.schemas.js'
import {
  serializeImportJob,
  serializeImportJobRow,
  type PreviewRow,
  type SerializedImportJob,
  type SerializedImportJobRow,
} from './imports.serializers.js'
import type {
  ImportBundle,
  ImportRowInput,
  ImportSource,
  MapperResult,
} from './import.types.js'
import { mapGenericCsv } from './mappers/csv-mapper.js'
import { mapAsanaCsv } from './mappers/asana-csv.js'
import { mapJiraCsv } from './mappers/jira-csv.js'
import { mapJiraJson } from './mappers/jira-json.js'
import { mapTrelloJson } from './mappers/trello-json.js'
import { mapZohoCsv } from './mappers/zoho-csv.js'
import { isKnownStatus } from './mappers/normalize.js'

export type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: ProjectsError }

export const MAX_IMPORT_BYTES = 5 * 1024 * 1024
export const IMPORT_COMMIT_BATCH_SIZE = 200

const log = getLogger('imports')

const MAPPERS: Record<ImportSource, (text: string) => MapperResult> = {
  csv: mapGenericCsv,
  'jira-csv': mapJiraCsv,
  'jira-json': mapJiraJson,
  'trello-json': mapTrelloJson,
  'asana-csv': mapAsanaCsv,
  'zoho-csv': mapZohoCsv,
}

type TenantResolution =
  | { tenant: { id: string }; error: null }
  | { tenant: null; error: ProjectsError }

async function resolveTenant(
  organizationId: string
): Promise<TenantResolution> {
  const tenant = await tenants.resolveTenant(organizationId)
  if (!tenant)
    return { tenant: null, error: getError('projects/tenant-not-found') }
  return { tenant, error: null }
}

function validateRow(
  row: ImportRowInput,
  jobProjectId: string | null
): string[] {
  const errors: string[] = []
  if (row.kind === 'work-item') {
    const item = row.workItem
    if (item.title.trim() === '') errors.push('title is required.')
    if (item.status !== null && item.status !== undefined && !isKnownStatus(item.status))
      errors.push(`status '${item.status}' is not a valid key.`)
    if (
      item.estimate !== null &&
      item.estimate !== undefined &&
      (!Number.isInteger(item.estimate) || item.estimate < 0)
    )
      errors.push('estimate must be a non-negative integer.')
    if (
      item.dueDate !== null &&
      item.dueDate !== undefined &&
      !Number.isInteger(item.dueDate)
    )
      errors.push('dueDate must be a unix timestamp.')
    return errors
  }
  const entry = row.timeEntry
  if (entry.userId.trim() === '') errors.push('userId is required.')
  if (entry.startedAt === null || entry.startedAt === undefined)
    errors.push('startedAt is required.')
  if (
    entry.startedAt !== null &&
    entry.startedAt !== undefined &&
    entry.endedAt !== null &&
    entry.endedAt !== undefined &&
    entry.endedAt < entry.startedAt
  )
    errors.push('endedAt must be at or after startedAt.')
  if (
    (entry.projectId ?? jobProjectId ?? entry.projectKey ?? null) === null
  )
    errors.push('project is required: set a job projectId or a row project.')
  return errors
}

function rowTitle(row: ImportRowInput): string {
  return row.kind === 'work-item'
    ? row.workItem.title
    : (row.timeEntry.note ?? row.timeEntry.userId)
}

function rowExternalRef(row: ImportRowInput): string | null {
  return row.kind === 'work-item'
    ? (row.workItem.externalRef ?? null)
    : (row.timeEntry.externalRef ?? null)
}

export async function createJob(
  organizationId: string,
  body: CreateImportJobBody
): Promise<ServiceResult<SerializedImportJob>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  if (Buffer.byteLength(body.content, 'utf8') > MAX_IMPORT_BYTES)
    return { data: null, error: getError('projects/import-too-large') }
  const mapper = MAPPERS[body.source]
  let mapped: MapperResult
  try {
    mapped = mapper(body.content)
  } catch {
    return { data: null, error: getError('projects/import-parse-failed') }
  }
  const bundle: ImportBundle = mapped.bundle
  const errorByRow = new Map<number, string[]>()
  for (const rowError of mapped.rowErrors) {
    const list = errorByRow.get(rowError.rowIndex) ?? []
    list.push(rowError.message)
    errorByRow.set(rowError.rowIndex, list)
  }
  const preview: PreviewRow[] = bundle.rows.map((row, rowIndex) => {
    const errors = [
      ...(errorByRow.get(rowIndex) ?? []),
      ...validateRow(row, body.projectId ?? null),
    ]
    return {
      rowIndex,
      kind: row.kind,
      title: rowTitle(row),
      valid: errors.length === 0,
      errors,
    }
  })
  const timestamp = toDbUnixSeconds(nowUnixSeconds())
  const jobId = generateId('importJob')
  const tenantId = resolved.tenant.id
  const saved = await repository.createJob({
    id: jobId,
    tenantId,
    source: body.source,
    projectId: body.projectId ?? null,
    status: 'preview',
    rowCount: bundle.rows.length,
    contentHash: createHash('sha256').update(body.content, 'utf8').digest('hex'),
    bundle: { rows: bundle.rows },
    preview: { rows: preview, notes: mapped.notes },
    unmappedFields: mapped.unmappedFields,
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  await repository.createJobRows(
    bundle.rows.map((row, rowIndex) => ({
      id: generateId('importJobRow'),
      tenantId,
      jobId,
      rowIndex,
      kind: row.kind,
      status: (preview[rowIndex]?.valid ?? false) ? 'pending' : 'invalid',
      externalRef: rowExternalRef(row),
      createdAt: timestamp,
      updatedAt: timestamp,
    }))
  )
  const job = saved
  log.info(
    {
      job_id: jobId,
      source: body.source,
      rows: bundle.rows.length,
      invalid: preview.filter((row) => !row.valid).length,
    },
    'imports.job_created'
  )
  return { data: serializeImportJob(job), error: null }
}

export async function listJobs(
  organizationId: string,
  query: ListImportJobsQuery
): Promise<ServiceResult<SerializedImportJob[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const rows = await repository.listJobs(resolved.tenant.id, {
    status: query.status,
    limit: query.limit ?? 25,
  })
  return { data: rows.map(serializeImportJob), error: null }
}

export async function retrieveJob(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedImportJob>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const row = await repository.retrieveJob(resolved.tenant.id, id)
  if (!row) return { data: null, error: getError('projects/import-job-not-found') }
  return { data: serializeImportJob(row), error: null }
}

export async function listJobRows(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedImportJobRow[]>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const job = await repository.retrieveJob(resolved.tenant.id, id)
  if (!job) return { data: null, error: getError('projects/import-job-not-found') }
  const rows = await repository.listJobRows(job.id)
  return { data: rows.map(serializeImportJobRow), error: null }
}

type StoredBundleRow = ImportRowInput & { rowIndex?: number }

function storedRows(bundle: unknown): StoredBundleRow[] {
  if (typeof bundle !== 'object' || bundle === null) return []
  const rows = (bundle as Record<string, unknown>).rows
  return Array.isArray(rows) ? (rows as StoredBundleRow[]) : []
}

export async function commitJob(
  organizationId: string,
  id: string
): Promise<ServiceResult<SerializedImportJob>> {
  const resolved = await resolveTenant(organizationId)
  if (resolved.error) return { data: null, error: resolved.error }
  const job = await repository.retrieveJob(resolved.tenant.id, id)
  if (!job) return { data: null, error: getError('projects/import-job-not-found') }
  if (job.status !== 'preview' && job.status !== 'partial')
    return { data: null, error: getError('projects/import-job-not-ready') }
  await repository.updateJob(job.id, {
    status: 'committing',
    updatedAt: toDbUnixSeconds(nowUnixSeconds()),
  })
  const persistedRows = await repository.listJobRows(job.id)
  const bundleRows = storedRows(job.bundle)
  let successCount = job.successCount
  let failureCount = job.failureCount
  const committable = persistedRows.filter(
    (row) => row.status === 'pending' || row.status === 'failed'
  )
  for (let offset = 0; offset < committable.length; offset += IMPORT_COMMIT_BATCH_SIZE) {
    const batch = committable.slice(offset, offset + IMPORT_COMMIT_BATCH_SIZE)
    for (const persisted of batch) {
      if (persisted.status === 'succeeded') continue
      const input = bundleRows[persisted.rowIndex]
      if (!input) {
        failureCount += 1
        await repository.updateJobRow(persisted.id, {
          status: 'failed',
          error: { code: 'projects/invalid-request', message: 'Row payload is missing.' },
          updatedAt: toDbUnixSeconds(nowUnixSeconds()),
        })
        continue
      }
      const outcome = await commitRow(
        organizationId,
        resolved.tenant.id,
        job.projectId,
        input
      )
      if (outcome.error) {
        failureCount += 1
        await repository.updateJobRow(persisted.id, {
          status: 'failed',
          error: { code: outcome.error.code, message: outcome.error.message },
          updatedAt: toDbUnixSeconds(nowUnixSeconds()),
        })
      } else {
        successCount += 1
        await repository.updateJobRow(persisted.id, {
          status: 'succeeded',
          createdId: outcome.createdId,
          error: null,
          updatedAt: toDbUnixSeconds(nowUnixSeconds()),
        })
      }
    }
  }
  const updated = await repository.updateJob(job.id, {
    status: failureCount > 0 ? 'partial' : 'committed',
    successCount,
    failureCount,
    updatedAt: toDbUnixSeconds(nowUnixSeconds()),
  })
  log.info(
    { job_id: job.id, succeeded: successCount, failed: failureCount },
    'imports.job_committed'
  )
  return { data: serializeImportJob(updated), error: null }
}

async function commitRow(
  organizationId: string,
  tenantId: string,
  jobProjectId: string | null,
  input: ImportRowInput
): Promise<{ createdId: string; error: null } | { createdId: null; error: ProjectsError }> {
  if (input.kind === 'work-item') {
    const item = input.workItem
    const result = await issues.create(organizationId, {
      projectId: item.projectId ?? item.projectKey ?? jobProjectId ?? undefined,
      title: item.title,
      ...(item.description !== null && item.description !== undefined
        ? { description: item.description }
        : {}),
      ...(item.status ? { status: item.status } : {}),
      ...(item.priority ? { priority: item.priority } : {}),
      ...(item.typeKey ? { typeKey: item.typeKey } : {}),
      ...(item.assigneeUserId ? { assigneeUserId: item.assigneeUserId } : {}),
      ...(item.milestoneId ? { milestoneId: item.milestoneId } : {}),
      ...(item.estimate !== null && item.estimate !== undefined
        ? { estimate: item.estimate }
        : {}),
      ...(item.dueDate !== null && item.dueDate !== undefined
        ? { dueDate: item.dueDate }
        : {}),
      ...(item.labels && item.labels.length > 0 ? { labelIds: item.labels } : {}),
    })
    if (result.error) return { createdId: null, error: result.error }
    return { createdId: result.data.id, error: null }
  }
  const entry = input.timeEntry
  let issueId: string | null = null
  if (entry.issueRef) {
    const issue = await issues.resolveIssue(tenantId, entry.issueRef)
    if (!issue)
      return {
        createdId: null,
        error: getError('projects/issue-not-found'),
      }
    issueId = issue.id
  }
  const projectId =
    entry.projectId ?? entry.projectKey ?? jobProjectId ?? undefined
  if (!projectId || entry.startedAt === null || entry.startedAt === undefined)
    return {
      createdId: null,
      error: getError('projects/invalid-request', {
        description: 'Time entry rows require a project and startedAt.',
      }),
    }
  const result = await time.createTimeEntry(organizationId, {
    userId: entry.userId,
    projectId,
    ...(issueId ? { issueId } : {}),
    startedAt: entry.startedAt,
    endedAt: entry.endedAt ?? entry.startedAt,
    ...(entry.durationMinutes !== null && entry.durationMinutes !== undefined
      ? { durationMinutes: entry.durationMinutes }
      : {}),
    ...(entry.billable !== null && entry.billable !== undefined
      ? { billable: entry.billable }
      : {}),
    ...(entry.note ? { note: entry.note } : {}),
  })
  if (result.error) return { createdId: null, error: result.error }
  return { createdId: result.data.id, error: null }
}
