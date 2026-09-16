import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'

type Timestamp = bigint | number

export type ProjectBaselineRow = {
  id: string
  tenantId: string
  projectId: string
  name: string
  capturedBy: string | null
  capturedAt: Timestamp
  note: string | null
}

export type ProjectBaselineItemRow = {
  id: string
  tenantId: string
  baselineId: string
  issueId: string
  plannedStartDate: Timestamp | null
  plannedFinishDate: Timestamp | null
  plannedDurationMinutes: number | null
  status: string
}

export type SerializedBaseline = {
  object: 'projects.baseline'
  id: string
  tenantId: string
  projectId: string
  name: string
  capturedBy: string | null
  capturedAt: number
  note: string | null
  itemCount: number
}

export type SerializedBaselineItem = {
  object: 'projects.baseline-item'
  id: string
  baselineId: string
  issueId: string
  plannedStartDate: number | null
  plannedFinishDate: number | null
  plannedDurationMinutes: number | null
  status: string
}

export type SerializedBaselineDetail = SerializedBaseline & {
  items: SerializedBaselineItem[]
}

export type SerializedBaselineComparisonItem = {
  object: 'baseline-comparison-item'
  issueId: string
  identifier: string
  baselineStart: number | null
  baselineFinish: number | null
  currentStart: number | null
  currentFinish: number | null
  startVarianceMinutes: number | null
  finishVarianceMinutes: number | null
}

export type SerializedBaselineComparison = {
  object: 'baseline-comparison'
  baselineId: string
  projectId: string
  items: SerializedBaselineComparisonItem[]
}

export type SerializedBaselineTombstone = {
  object: 'projects.baseline'
  id: string
  deleted: true
}

export function serializeBaseline(
  row: ProjectBaselineRow,
  itemCount: number
): SerializedBaseline {
  return {
    object: 'projects.baseline',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    name: row.name,
    capturedBy: row.capturedBy,
    capturedAt: fromDbUnixSeconds(row.capturedAt),
    note: row.note,
    itemCount,
  }
}

export function serializeBaselineItem(
  row: ProjectBaselineItemRow
): SerializedBaselineItem {
  return {
    object: 'projects.baseline-item',
    id: row.id,
    baselineId: row.baselineId,
    issueId: row.issueId,
    plannedStartDate: nullableFromDbUnixSeconds(row.plannedStartDate),
    plannedFinishDate: nullableFromDbUnixSeconds(row.plannedFinishDate),
    plannedDurationMinutes: row.plannedDurationMinutes,
    status: row.status,
  }
}

export function serializeBaselineDetail(
  row: ProjectBaselineRow,
  items: ProjectBaselineItemRow[]
): SerializedBaselineDetail {
  return {
    ...serializeBaseline(row, items.length),
    items: items.map(serializeBaselineItem),
  }
}

export function varianceMinutes(
  baseline: number | null,
  current: number | null
): number | null {
  if (baseline === null || current === null) return null
  return Math.round((current - baseline) / 60)
}
