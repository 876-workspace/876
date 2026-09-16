import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'

type Timestamp = bigint | number

export type GanttMilestoneRow = {
  id: string
  tenantId: string
  projectId: string
  key: string
  name: string
  startDate: Timestamp | null
  targetDate: Timestamp | null
  position: number
}

export type GanttTaskListRow = {
  id: string
  tenantId: string
  projectId: string
  milestoneId: string | null
  name: string
  startDate: Timestamp | null
  targetDate: Timestamp | null
  position: number
}

export type GanttIssueRow = {
  id: string
  tenantId: string
  projectId: string
  identifier: string
  title: string
  status: string
  taskListId: string | null
  milestoneId: string | null
  parentIssueId: string | null
  plannedStartDate: Timestamp | null
  plannedFinishDate: Timestamp | null
  plannedDurationMinutes: number | null
  position: number
  startedAt: Timestamp | null
  completedAt: Timestamp | null
  canceledAt: Timestamp | null
}

export type GanttDependencyRow = {
  id: string
  predecessorIssueId: string
  successorIssueId: string
  type: string
  lagMinutes: number
}

export type GanttRowKind = 'phase' | 'task-list' | 'work-item' | 'sub-item'

export type SerializedGanttRow = {
  object: 'gantt-row'
  id: string
  kind: GanttRowKind
  parentRowId: string | null
  issueId: string | null
  name: string
  plannedStart: number | null
  plannedFinish: number | null
  actualStart: number | null
  actualFinish: number | null
  percentComplete: number
  isCritical: boolean
}

export type SerializedGanttEdge = {
  object: 'gantt-edge'
  id: string
  predecessorIssueId: string
  successorIssueId: string
  type: string
  lagMinutes: number
}

export type SerializedGantt = {
  object: 'gantt'
  rows: SerializedGanttRow[]
  edges: SerializedGanttEdge[]
  criticalIssueIds: string[]
  range: { start: number | null; end: number | null }
}

// A leaf work item reports only what is actually known: finished or not.
// Part-way progress is not tracked per item, so an in-progress item must not
// claim an invented percentage — group rows derive theirs from their members.
export function percentCompleteForStatus(status: string): number {
  return status === 'done' || status === 'canceled' ? 100 : 0
}

export function actualFinishFor(row: GanttIssueRow): number | null {
  const completed = nullableFromDbUnixSeconds(row.completedAt)
  if (completed !== null) return completed
  return nullableFromDbUnixSeconds(row.canceledAt)
}

export function serializeGanttEdge(
  row: GanttDependencyRow
): SerializedGanttEdge {
  return {
    object: 'gantt-edge',
    id: row.id,
    predecessorIssueId: row.predecessorIssueId,
    successorIssueId: row.successorIssueId,
    type: row.type,
    lagMinutes: row.lagMinutes,
  }
}

export function phaseRowId(milestoneId: string): string {
  return `phase:${milestoneId}`
}

export function taskListRowId(taskListId: string): string {
  return `task-list:${taskListId}`
}

export function workItemRowId(issueId: string): string {
  return `work-item:${issueId}`
}

export function subItemRowId(issueId: string): string {
  return `sub-item:${issueId}`
}

export function toPlanned(value: Timestamp | null): number | null {
  return nullableFromDbUnixSeconds(value)
}

export function toFinish(value: Timestamp | null): number | null {
  return nullableFromDbUnixSeconds(value)
}

export function fromMilestoneStart(row: GanttMilestoneRow): number | null {
  return nullableFromDbUnixSeconds(row.startDate)
}

export function fromMilestoneTarget(row: GanttMilestoneRow): number | null {
  return nullableFromDbUnixSeconds(row.targetDate)
}

export function fromTaskListStart(row: GanttTaskListRow): number | null {
  return nullableFromDbUnixSeconds(row.startDate)
}

export function fromTaskListTarget(row: GanttTaskListRow): number | null {
  return nullableFromDbUnixSeconds(row.targetDate)
}

export function issuePlannedStart(row: GanttIssueRow): number | null {
  return nullableFromDbUnixSeconds(row.plannedStartDate)
}

export function issuePlannedFinish(row: GanttIssueRow): number | null {
  return nullableFromDbUnixSeconds(row.plannedFinishDate)
}

export function issueActualStart(row: GanttIssueRow): number | null {
  return nullableFromDbUnixSeconds(row.startedAt)
}

export function issueActualFinish(row: GanttIssueRow): number | null {
  return actualFinishFor(row)
}

export function createdSeconds(value: Timestamp): number {
  return fromDbUnixSeconds(value)
}
