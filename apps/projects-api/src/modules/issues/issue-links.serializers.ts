import { fromDbUnixSeconds } from '../../platform/timestamps.js'

type Timestamp = bigint | number

export type IssueRelationRow = {
  id: string
  tenantId: string
  sourceIssueId: string
  targetIssueId: string
  type: string
  createdBy: string | null
  createdAt: Timestamp
}

export type SerializedIssueRelation = {
  object: 'issue-relation'
  id: string
  tenantId: string
  sourceIssueId: string
  targetIssueId: string
  type: string
  createdBy: string | null
  createdAt: number
}

export function serializeIssueRelation(
  row: IssueRelationRow
): SerializedIssueRelation {
  return {
    object: 'issue-relation',
    id: row.id,
    tenantId: row.tenantId,
    sourceIssueId: row.sourceIssueId,
    targetIssueId: row.targetIssueId,
    type: row.type,
    createdBy: row.createdBy,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }
}

export type IssueDependencyRow = {
  id: string
  tenantId: string
  predecessorIssueId: string
  successorIssueId: string
  type: string
  lagMinutes: number
  createdBy: string | null
  createdAt: Timestamp
}

export type SerializedIssueDependency = {
  object: 'issue-dependency'
  id: string
  tenantId: string
  predecessorIssueId: string
  successorIssueId: string
  type: string
  lagMinutes: number
  createdBy: string | null
  createdAt: number
}

export function serializeIssueDependency(
  row: IssueDependencyRow
): SerializedIssueDependency {
  return {
    object: 'issue-dependency',
    id: row.id,
    tenantId: row.tenantId,
    predecessorIssueId: row.predecessorIssueId,
    successorIssueId: row.successorIssueId,
    type: row.type,
    lagMinutes: row.lagMinutes,
    createdBy: row.createdBy,
    createdAt: fromDbUnixSeconds(row.createdAt),
  }
}

export type IssueDependencyView = {
  predecessors: SerializedIssueDependency[]
  successors: SerializedIssueDependency[]
}

export type ScheduleConstraint = {
  issueId: string
  identifier: string
  type: string
  lagMinutes: number
}

export type ScheduleSuggestion = {
  earliestStart: number | null
  earliestFinish: number | null
  constrainedBy: ScheduleConstraint[]
}
