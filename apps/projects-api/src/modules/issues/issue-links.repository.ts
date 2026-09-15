import { prisma } from '../../db/index.js'
import type {
  IssueDependencyRow,
  IssueRelationRow,
} from './issue-links.serializers.js'

export type CreateRelationParams = {
  id: string
  tenantId: string
  sourceIssueId: string
  targetIssueId: string
  type: string
  createdBy: string | null
  createdAt: bigint
}

export type CreateDependencyParams = {
  id: string
  tenantId: string
  predecessorIssueId: string
  successorIssueId: string
  type: string
  lagMinutes: number
  createdBy: string | null
  createdAt: bigint
}

export type UpdateDependencyParams = {
  type?: string
  lagMinutes?: number
}

export type PredecessorIssuePlan = {
  id: string
  identifier: string
  plannedStartDate: bigint | number | null
  plannedFinishDate: bigint | number | null
}

export type DependencyWithPredecessor = IssueDependencyRow & {
  predecessor: PredecessorIssuePlan
}

export type IssueStatusRow = {
  id: string
  status: string
}

export async function listRelations(
  tenantId: string,
  issueId: string
): Promise<IssueRelationRow[]> {
  const rows = await prisma.issueRelation.findMany({
    where: {
      tenantId,
      OR: [{ sourceIssueId: issueId }, { targetIssueId: issueId }],
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as IssueRelationRow[]
}

export async function findRelation(
  tenantId: string,
  id: string
): Promise<IssueRelationRow | null> {
  const row = await prisma.issueRelation.findFirst({
    where: { tenantId, id },
  })
  return row as unknown as IssueRelationRow | null
}

export async function findRelationBetween(
  tenantId: string,
  sourceIssueId: string,
  targetIssueId: string,
  type: string
): Promise<IssueRelationRow | null> {
  const row = await prisma.issueRelation.findFirst({
    where: { tenantId, sourceIssueId, targetIssueId, type },
  })
  return row as unknown as IssueRelationRow | null
}

export async function findUnorderedRelation(
  tenantId: string,
  firstIssueId: string,
  secondIssueId: string,
  type: string
): Promise<IssueRelationRow | null> {
  const row = await prisma.issueRelation.findFirst({
    where: {
      tenantId,
      type,
      OR: [
        { sourceIssueId: firstIssueId, targetIssueId: secondIssueId },
        { sourceIssueId: secondIssueId, targetIssueId: firstIssueId },
      ],
    },
  })
  return row as unknown as IssueRelationRow | null
}

export async function createRelation(
  params: CreateRelationParams
): Promise<IssueRelationRow> {
  const row = await prisma.issueRelation.create({ data: params })
  return row as unknown as IssueRelationRow
}

export async function deleteRelation(id: string): Promise<void> {
  await prisma.issueRelation.delete({ where: { id } })
}

export async function listPredecessorLinks(
  tenantId: string,
  issueId: string
): Promise<IssueDependencyRow[]> {
  const rows = await prisma.issueDependency.findMany({
    where: { tenantId, successorIssueId: issueId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as IssueDependencyRow[]
}

export async function listSuccessorLinks(
  tenantId: string,
  issueId: string
): Promise<IssueDependencyRow[]> {
  const rows = await prisma.issueDependency.findMany({
    where: { tenantId, predecessorIssueId: issueId },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as IssueDependencyRow[]
}

export async function listSuccessorDependencies(
  tenantId: string,
  successorIssueId: string
): Promise<DependencyWithPredecessor[]> {
  const rows = await prisma.issueDependency.findMany({
    where: { tenantId, successorIssueId },
    include: {
      predecessor: {
        select: {
          id: true,
          identifier: true,
          plannedStartDate: true,
          plannedFinishDate: true,
        },
      },
    },
    orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
  })
  return rows as unknown as DependencyWithPredecessor[]
}

export async function findDependency(
  tenantId: string,
  id: string
): Promise<IssueDependencyRow | null> {
  const row = await prisma.issueDependency.findFirst({
    where: { tenantId, id },
  })
  return row as unknown as IssueDependencyRow | null
}

export async function findDependencyBetween(
  tenantId: string,
  predecessorIssueId: string,
  successorIssueId: string
): Promise<IssueDependencyRow | null> {
  const row = await prisma.issueDependency.findFirst({
    where: { tenantId, predecessorIssueId, successorIssueId },
  })
  return row as unknown as IssueDependencyRow | null
}

export async function createDependency(
  params: CreateDependencyParams
): Promise<IssueDependencyRow> {
  const row = await prisma.issueDependency.create({ data: params })
  return row as unknown as IssueDependencyRow
}

export async function updateDependency(
  id: string,
  params: UpdateDependencyParams
): Promise<IssueDependencyRow> {
  const row = await prisma.issueDependency.update({
    where: { id },
    data: params,
  })
  return row as unknown as IssueDependencyRow
}

export async function deleteDependency(id: string): Promise<void> {
  await prisma.issueDependency.delete({ where: { id } })
}

export async function listSuccessorIds(
  tenantId: string,
  predecessorIssueIds: string[]
): Promise<string[]> {
  if (predecessorIssueIds.length === 0) return []
  const rows = await prisma.issueDependency.findMany({
    where: {
      tenantId,
      predecessorIssueId: { in: predecessorIssueIds },
    },
    select: { successorIssueId: true },
  })
  return rows.map((row) => row.successorIssueId)
}

export async function listRelationsForIssues(
  tenantId: string,
  issueIds: string[]
): Promise<IssueRelationRow[]> {
  if (issueIds.length === 0) return []
  const rows = await prisma.issueRelation.findMany({
    where: {
      tenantId,
      OR: [
        { sourceIssueId: { in: issueIds } },
        { targetIssueId: { in: issueIds } },
      ],
    },
    select: {
      id: true,
      tenantId: true,
      sourceIssueId: true,
      targetIssueId: true,
      type: true,
      createdBy: true,
      createdAt: true,
    },
  })
  return rows as unknown as IssueRelationRow[]
}

export async function listDependenciesForIssues(
  tenantId: string,
  issueIds: string[]
): Promise<IssueDependencyRow[]> {
  if (issueIds.length === 0) return []
  const rows = await prisma.issueDependency.findMany({
    where: {
      tenantId,
      OR: [
        { predecessorIssueId: { in: issueIds } },
        { successorIssueId: { in: issueIds } },
      ],
    },
    select: {
      id: true,
      tenantId: true,
      predecessorIssueId: true,
      successorIssueId: true,
      type: true,
      lagMinutes: true,
      createdBy: true,
      createdAt: true,
    },
  })
  return rows as unknown as IssueDependencyRow[]
}

export async function listIssueStatuses(
  tenantId: string,
  issueIds: string[]
): Promise<Map<string, string>> {
  if (issueIds.length === 0) return new Map()
  const rows: IssueStatusRow[] = await prisma.issue.findMany({
    where: { tenantId, id: { in: issueIds }, deletedAt: null },
    select: { id: true, status: true },
  })
  return new Map(rows.map((row) => [row.id, row.status]))
}
