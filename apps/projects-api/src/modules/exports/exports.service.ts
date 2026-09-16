import type { ProjectsError } from '../../http/errors.js'
import { getLogger } from '../../platform/logger.js'
import * as issues from '../issues/index.js'
import { toCsv } from '../reports/index.js'
import * as time from '../time/index.js'
import type {
  ExportTimeEntriesQuery,
  ExportWorkItemsQuery,
} from './exports.schemas.js'

const log = getLogger('exports')

const MAX_EXPORT_ROWS = 5000

export async function buildWorkItemsCsv(
  organizationId: string,
  query: ExportWorkItemsQuery
): Promise<{ csv: string; count: number } | { error: ProjectsError }> {
  const headers = [
    'identifier',
    'title',
    'status',
    'typeKey',
    'priority',
    'assigneeUserId',
    'dueDate',
    'projectKey',
    'createdAt',
    'updatedAt',
  ]
  const rows: Array<Array<string | number | null>> = []
  let startingAfter: string | undefined
  for (;;) {
    const result = await issues.list(organizationId, {
      ...(query.project ? { project: query.project } : {}),
      limit: 100,
      ...(startingAfter ? { starting_after: startingAfter } : {}),
    })
    if (result.error) return { error: result.error }
    for (const item of result.data.items) {
      rows.push([
        item.identifier,
        item.title,
        item.status,
        item.typeKey,
        item.priority,
        item.assigneeUserId,
        item.dueDate,
        item.projectKey,
        item.createdAt,
        item.updatedAt,
      ])
      if (rows.length >= MAX_EXPORT_ROWS) break
    }
    if (!result.data.hasMore || rows.length >= MAX_EXPORT_ROWS) break
    const last = result.data.items[result.data.items.length - 1]
    if (!last) break
    startingAfter = last.id
  }
  log.info({ organization: organizationId, rows: rows.length }, 'exports.work_items')
  return { csv: toCsv(headers, rows), count: rows.length }
}

export async function buildTimeEntriesCsv(
  organizationId: string,
  query: ExportTimeEntriesQuery
): Promise<{ csv: string; count: number } | { error: ProjectsError }> {
  const result = await time.listTimeEntries(organizationId, {
    ...(query.projectId ? { projectId: query.projectId } : {}),
    ...(query.userId ? { userId: query.userId } : {}),
    ...(query.from !== undefined ? { from: query.from } : {}),
    ...(query.to !== undefined ? { to: query.to } : {}),
  })
  if (result.error) return { error: result.error }
  const headers = [
    'id',
    'userId',
    'projectId',
    'issueId',
    'startedAt',
    'endedAt',
    'durationMinutes',
    'billable',
    'note',
  ]
  const rows = result.data
    .slice(0, MAX_EXPORT_ROWS)
    .map((entry) => [
      entry.id,
      entry.userId,
      entry.projectId,
      entry.issueId,
      entry.startedAt,
      entry.endedAt,
      entry.durationMinutes,
      entry.billable ? 'true' : 'false',
      entry.note,
    ])
  log.info({ organization: organizationId, rows: rows.length }, 'exports.time_entries')
  return { csv: toCsv(headers, rows), count: rows.length }
}
