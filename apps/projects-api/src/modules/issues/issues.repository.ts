import { prisma } from '../../db/index.js'
import type { LabelRow } from '../labels/labels.serializers.js'
import type { IssueEventRow, IssueRow } from './issues.serializers.js'

export type ListIssuesOptions = {
  project?: string
  milestoneId?: string
  typeKey?: string
  status?: string[]
  priority?: string[]
  assignee?: string
  label?: string[]
  parent?: string
  q?: string
  updatedSince?: number
  includeDeleted: boolean
  order: 'manual' | 'updated' | 'created' | 'priority'
  limit: number
  startingAfter?: string
  endingBefore?: string
}

export type CountIssuesOptions = {
  project?: string
  milestoneId?: string
  typeKey?: string
  status?: string[]
  priority?: string[]
  assignee?: string
  label?: string[]
  parent?: string
  q?: string
  updatedSince?: number
  includeDeleted: boolean
}

export type CreateIssueParams = {
  id: string
  tenantId: string
  projectId: string
  number: number
  identifier: string
  title: string
  description?: string | null
  status: string
  workflowStateId?: string | null
  typeKey: string
  workItemTypeId?: string | null
  milestoneId?: string | null
  priority: string
  assigneeUserId?: string | null
  creatorUserId?: string | null
  parentIssueId?: string | null
  estimate?: number | null
  dueDate?: bigint | null
  position: number
  startedAt?: bigint | null
  completedAt?: bigint | null
  canceledAt?: bigint | null
  createdAt: bigint
  updatedAt: bigint
}

export type CreateEventParams = {
  id: string
  tenantId: string
  issueId: string
  actorUserId?: string | null
  type: string
  fromValue?: string | null
  toValue?: string | null
  createdAt: bigint
}

export type UpdateIssueParams = {
  projectId?: string
  title?: string
  description?: string | null
  status?: string
  workflowStateId?: string | null
  typeKey?: string
  workItemTypeId?: string | null
  milestoneId?: string | null
  priority?: string
  assigneeUserId?: string | null
  creatorUserId?: string | null
  parentIssueId?: string | null
  estimate?: number | null
  dueDate?: bigint | null
  position?: number
  startedAt?: bigint | null
  completedAt?: bigint | null
  canceledAt?: bigint | null
  updatedAt: bigint
}

export type IssueNumberAllocation = {
  projectId: string
  key: string
  number: number
}

export type IssueTransactionClient = Omit<
  typeof prisma,
  '$connect' | '$disconnect' | '$extends' | '$on' | '$transaction' | '$use'
>

export type TransactionRepo = {
  transactionClient: IssueTransactionClient
  allocateIssueNumber: (projectId: string) => Promise<IssueNumberAllocation>
  createIssue: (params: CreateIssueParams) => Promise<IssueRow>
  createEvent: (params: CreateEventParams) => Promise<IssueEventRow>
  setLabels: (issueId: string, labelIds: string[]) => Promise<void>
  updateIssue: (issueId: string, params: UpdateIssueParams) => Promise<IssueRow>
}

export function buildWhereClause(
  tenantId: string,
  options: {
    project?: string
    milestoneId?: string
    typeKey?: string
    status?: string[]
    priority?: string[]
    assignee?: string
    label?: string[]
    parent?: string
    q?: string
    updatedSince?: number
    includeDeleted?: boolean
  }
) {
  const where: Record<string, unknown> = { tenantId }

  if (!options.includeDeleted) where.deletedAt = null

  if (options.project) {
    if (options.project.startsWith('prj_')) {
      where.projectId = options.project
    } else {
      where.project = {
        key: {
          equals: options.project,
          mode: 'insensitive',
        },
      }
    }
  }

  if (options.status && options.status.length > 0)
    where.status = { in: options.status }
  if (options.milestoneId) where.milestoneId = options.milestoneId
  if (options.typeKey) where.typeKey = options.typeKey
  if (options.priority && options.priority.length > 0)
    where.priority = { in: options.priority }

  if (options.assignee !== undefined)
    where.assigneeUserId = options.assignee === 'none' ? null : options.assignee
  if (options.parent !== undefined)
    where.parentIssueId = options.parent === 'none' ? null : options.parent
  if (options.updatedSince !== undefined)
    where.updatedAt = { gte: BigInt(options.updatedSince) }

  const andConditions: Array<Record<string, unknown>> = []

  if (options.q) {
    andConditions.push({
      OR: [
        { title: { contains: options.q, mode: 'insensitive' } },
        { identifier: { contains: options.q, mode: 'insensitive' } },
        { description: { contains: options.q, mode: 'insensitive' } },
      ],
    })
  }

  if (options.label && options.label.length > 0) {
    const labelOrConditions = options.label.map((term) =>
      term.startsWith('lbl_')
        ? { labelId: term }
        : { label: { name: { equals: term, mode: 'insensitive' } } }
    )
    andConditions.push({
      labels: {
        some: {
          OR: labelOrConditions,
        },
      },
    })
  }

  if (andConditions.length > 0) where.AND = andConditions
  return where
}

function getOrderBy(order: 'manual' | 'updated' | 'created' | 'priority') {
  switch (order) {
    case 'manual':
      return [{ position: 'asc' as const }, { createdAt: 'asc' as const }]
    case 'created':
      return [{ createdAt: 'desc' as const }, { id: 'desc' as const }]
    case 'priority':
    case 'updated':
    default:
      return [{ updatedAt: 'desc' as const }, { id: 'desc' as const }]
  }
}

const PRIORITY_ORDER: Record<string, number> = {
  urgent: 1,
  high: 2,
  medium: 3,
  low: 4,
  none: 5,
}

export async function list(
  tenantId: string,
  options: ListIssuesOptions
): Promise<IssueRow[]> {
  const where = buildWhereClause(tenantId, options)
  const cursorId = options.startingAfter ?? options.endingBefore
  const orderBy = getOrderBy(options.order)

  const rows = await prisma.issue.findMany({
    where,
    cursor: cursorId ? { id: cursorId } : undefined,
    skip: cursorId ? 1 : 0,
    take: options.endingBefore ? -(options.limit + 1) : options.limit + 1,
    orderBy,
    include: {
      project: {
        select: { key: true },
      },
    },
  })

  const issueRows = rows as unknown as IssueRow[]

  if (options.order === 'priority') {
    issueRows.sort((a, b) => {
      const rankA = PRIORITY_ORDER[a.priority] ?? 6
      const rankB = PRIORITY_ORDER[b.priority] ?? 6
      if (rankA !== rankB) return rankA - rankB
      return Number(BigInt(b.updatedAt) - BigInt(a.updatedAt))
    })
  }

  return issueRows
}

export async function count(
  tenantId: string,
  options: CountIssuesOptions
): Promise<number> {
  return prisma.issue.count({ where: buildWhereClause(tenantId, options) })
}

export async function retrieve(
  tenantId: string,
  id: string
): Promise<IssueRow | null> {
  const row = await prisma.issue.findFirst({
    where: { tenantId, id },
    include: {
      project: { select: { key: true } },
      labels: {
        include: { label: true },
        orderBy: { label: { name: 'asc' } },
      },
    },
  })
  return row as unknown as IssueRow | null
}

export async function retrieveByIdentifier(
  tenantId: string,
  identifier: string
): Promise<IssueRow | null> {
  const row = await prisma.issue.findUnique({
    where: { tenantId_identifier: { tenantId, identifier } },
    include: {
      project: { select: { key: true } },
      labels: {
        include: { label: true },
        orderBy: { label: { name: 'asc' } },
      },
    },
  })
  return row as unknown as IssueRow | null
}

export async function retrieveByRef(
  tenantId: string,
  ref: string
): Promise<IssueRow | null> {
  return ref.startsWith('iss_')
    ? retrieve(tenantId, ref)
    : retrieveByIdentifier(tenantId, ref.toUpperCase())
}

export async function listEvents(
  tenantId: string,
  issueId: string
): Promise<IssueEventRow[]> {
  const rows = await prisma.issueEvent.findMany({
    where: { tenantId, issueId },
    orderBy: { createdAt: 'desc' },
  })
  return rows as unknown as IssueEventRow[]
}

export async function softDelete(
  tenantId: string,
  id: string,
  deletedAt: bigint
): Promise<void> {
  await prisma.issue.update({
    where: { id },
    data: { deletedAt, updatedAt: deletedAt },
  })
}

export async function hardDelete(tenantId: string, id: string): Promise<void> {
  await prisma.issue.delete({ where: { id } })
}

export async function getBatchEnrichment(issueIds: string[]): Promise<
  Map<
    string,
    {
      labels: LabelRow[]
      commentCount: number
      subIssueCount: number
    }
  >
> {
  const map = new Map<
    string,
    {
      labels: LabelRow[]
      commentCount: number
      subIssueCount: number
    }
  >()

  if (issueIds.length === 0) return map

  for (const id of issueIds)
    map.set(id, { labels: [], commentCount: 0, subIssueCount: 0 })

  const commentCounts = await prisma.comment.groupBy({
    by: ['issueId'],
    where: { issueId: { in: issueIds }, deletedAt: null },
    _count: { id: true },
  })
  for (const countRow of commentCounts) {
    const entry = map.get(countRow.issueId)
    if (entry) entry.commentCount = countRow._count.id
  }

  const subIssueCounts = await prisma.issue.groupBy({
    by: ['parentIssueId'],
    where: { parentIssueId: { in: issueIds }, deletedAt: null },
    _count: { id: true },
  })
  for (const countRow of subIssueCounts) {
    if (!countRow.parentIssueId) continue
    const entry = map.get(countRow.parentIssueId)
    if (entry) entry.subIssueCount = countRow._count.id
  }

  const issueLabels = await prisma.issueLabel.findMany({
    where: { issueId: { in: issueIds } },
    include: { label: true },
    orderBy: { label: { name: 'asc' } },
  })
  for (const issueLabel of issueLabels) {
    const entry = map.get(issueLabel.issueId)
    if (entry) entry.labels.push(issueLabel.label as LabelRow)
  }

  return map
}

export async function transaction<T>(
  callback: (tx: TransactionRepo) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (txPrisma) => {
    const transactionClient = txPrisma as IssueTransactionClient
    const txRepo: TransactionRepo = {
      transactionClient,
      allocateIssueNumber: async (projectId: string) => {
        const updated = await txPrisma.project.update({
          where: { id: projectId },
          data: { nextIssueNumber: { increment: 1 } },
          select: { id: true, key: true, nextIssueNumber: true },
        })
        return {
          projectId: updated.id,
          key: updated.key,
          number: updated.nextIssueNumber - 1,
        }
      },
      createIssue: async (params: CreateIssueParams) => {
        const row = await txPrisma.issue.create({
          data: params,
          include: { project: { select: { key: true } } },
        })
        return row as unknown as IssueRow
      },
      createEvent: async (params: CreateEventParams) => {
        const row = await txPrisma.issueEvent.create({ data: params })
        return row as unknown as IssueEventRow
      },
      setLabels: async (issueId: string, labelIds: string[]) => {
        await txPrisma.issueLabel.deleteMany({ where: { issueId } })
        if (labelIds.length > 0) {
          await txPrisma.issueLabel.createMany({
            data: labelIds.map((labelId) => ({ issueId, labelId })),
          })
        }
      },
      updateIssue: async (issueId: string, params: UpdateIssueParams) => {
        const row = await txPrisma.issue.update({
          where: { id: issueId },
          data: params,
          include: { project: { select: { key: true } } },
        })
        return row as unknown as IssueRow
      },
    }
    return callback(txRepo)
  })
}
