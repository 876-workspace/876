import {
  fromDbUnixSeconds,
  nullableFromDbUnixSeconds,
} from '../../platform/timestamps.js'
import type { LabelRow, SerializedLabel } from '../labels/labels.serializers.js'
import { serializeLabel } from '../labels/labels.serializers.js'

export type IssueRow = {
  id: string
  tenantId: string
  projectId: string
  number: number
  identifier: string
  title: string
  description: string | null
  status: string
  priority: string
  assigneeUserId: string | null
  creatorUserId: string | null
  parentIssueId: string | null
  estimate: number | null
  dueDate: bigint | number | null
  position: number
  startedAt: bigint | number | null
  completedAt: bigint | number | null
  canceledAt: bigint | number | null
  deletedAt: bigint | number | null
  createdAt: bigint | number
  updatedAt: bigint | number
  project?: {
    key: string
  }
  labels?: Array<{
    label: LabelRow
  }>
  _count?: {
    comments?: number
    children?: number
  }
}

export type IssueEventRow = {
  id: string
  tenantId?: string
  issueId: string
  actorUserId: string | null
  type: string
  fromValue: string | null
  toValue: string | null
  createdAt: bigint | number
}

export type SerializedIssue = {
  object: 'projects.issue'
  id: string
  tenantId: string
  projectId: string
  projectKey: string
  number: number
  identifier: string
  title: string
  description: string | null
  status: string
  priority: string
  assigneeUserId: string | null
  creatorUserId: string | null
  parentIssueId: string | null
  estimate: number | null
  dueDate: number | null
  position: number
  labels: SerializedLabel[]
  commentCount: number
  subIssueCount: number
  startedAt: number | null
  completedAt: number | null
  canceledAt: number | null
  createdAt: number
  updatedAt: number
}

export type SerializedIssueTombstone = {
  object: 'projects.issue'
  id: string
  deleted: true
}

export type SerializedIssueEvent = {
  object: 'projects.issue-event'
  id: string
  issueId: string
  actorUserId: string | null
  type: string
  fromValue: string | null
  toValue: string | null
  createdAt: number
}

export function serializeIssue(
  row: IssueRow,
  options?: {
    projectKey?: string
    labels?: LabelRow[] | SerializedLabel[]
    commentCount?: number
    subIssueCount?: number
  }
): SerializedIssue {
  const projectKey = options?.projectKey ?? row.project?.key ?? ''
  const labels = options?.labels
    ? options.labels.map((l) => ('object' in l ? l : serializeLabel(l)))
    : (row.labels?.map((il) => serializeLabel(il.label)) ?? [])
  const commentCount =
    options?.commentCount !== undefined
      ? options.commentCount
      : (row._count?.comments ?? 0)
  const subIssueCount =
    options?.subIssueCount !== undefined
      ? options.subIssueCount
      : (row._count?.children ?? 0)

  return {
    object: 'projects.issue',
    id: row.id,
    tenantId: row.tenantId,
    projectId: row.projectId,
    projectKey,
    number: row.number,
    identifier: row.identifier,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assigneeUserId: row.assigneeUserId,
    creatorUserId: row.creatorUserId,
    parentIssueId: row.parentIssueId,
    estimate: row.estimate,
    dueDate: nullableFromDbUnixSeconds(row.dueDate),
    position: row.position,
    labels,
    commentCount,
    subIssueCount,
    startedAt: nullableFromDbUnixSeconds(row.startedAt),
    completedAt: nullableFromDbUnixSeconds(row.completedAt),
    canceledAt: nullableFromDbUnixSeconds(row.canceledAt),
    createdAt: fromDbUnixSeconds(row.createdAt),
    updatedAt: fromDbUnixSeconds(row.updatedAt),
  }
}

export function serializeIssueEvent(row: IssueEventRow): SerializedIssueEvent {
  return {
    object: 'projects.issue-event',
    id: row.id,
    issueId: row.issueId,
    actorUserId: row.actorUserId,
    type: row.type,
    fromValue: row.fromValue,
    toValue: row.toValue,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }
}
